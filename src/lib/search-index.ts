/**
 * Advanced Search Indexing Service
 * Provides full-text search across logs, configs, audit logs, and system data
 */

import { execFile } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { getAuditLogs, initDatabase } from './database'
import { getProjectPath } from './paths'

const execFileAsync = promisify(execFile)

// Search result types
export type SearchResultType =
  | 'log'
  | 'audit'
  | 'config'
  | 'service'
  | 'database'
  | 'navigation'
  | 'file'

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  description: string
  content?: string
  url?: string
  timestamp?: Date
  service?: string
  level?: 'error' | 'warn' | 'info' | 'debug'
  score: number
  highlights?: string[]
  metadata?: Record<string, unknown>
}

export interface SearchFilters {
  types?: SearchResultType[]
  services?: string[]
  levels?: string[]
  dateFrom?: Date
  dateTo?: Date
  regex?: boolean
  caseSensitive?: boolean
}

export interface SearchOptions extends SearchFilters {
  limit?: number
  offset?: number
}

/**
 * Main search function with ranking and filtering
 */
export async function search(
  query: string,
  options: SearchOptions = {}
): Promise<{
  results: SearchResult[]
  total: number
  took: number
}> {
  const startTime = Date.now()
  const {
    types,
    services,
    levels,
    dateFrom,
    dateTo,
    regex = false,
    caseSensitive = false,
    limit = 50,
    offset = 0,
  } = options

  if (!query || query.trim().length === 0) {
    return { results: [], total: 0, took: 0 }
  }

  const allResults: SearchResult[] = []

  // Search across different data sources in parallel
  const searchPromises: Promise<SearchResult[]>[] = []

  if (!types || types.includes('audit')) {
    searchPromises.push(searchAuditLogs(query, { caseSensitive, dateFrom, dateTo }))
  }

  if (!types || types.includes('log')) {
    searchPromises.push(
      searchContainerLogs(query, {
        services,
        levels,
        dateFrom,
        dateTo,
        regex,
        caseSensitive,
      })
    )
  }

  if (!types || types.includes('config')) {
    searchPromises.push(searchConfigs(query, { caseSensitive }))
  }

  if (!types || types.includes('file')) {
    searchPromises.push(searchFiles(query, { caseSensitive, regex }))
  }

  // Wait for all searches to complete
  const results = await Promise.all(searchPromises)
  allResults.push(...results.flat())

  // Rank and sort results by score
  const rankedResults = rankResults(allResults, query)

  // Apply pagination
  const paginatedResults = rankedResults.slice(offset, offset + limit)

  const took = Date.now() - startTime

  return {
    results: paginatedResults,
    total: rankedResults.length,
    took,
  }
}

/**
 * Search audit logs
 */
async function searchAuditLogs(
  query: string,
  options: { caseSensitive?: boolean; dateFrom?: Date; dateTo?: Date }
): Promise<SearchResult[]> {
  await initDatabase()
  const logs = await getAuditLogs(1000, 0)

  const searchQuery = options.caseSensitive ? query : query.toLowerCase()
  const results: SearchResult[] = []

  for (const log of logs) {
    // Filter by date range
    if (options.dateFrom && new Date(log.timestamp) < options.dateFrom) continue
    if (options.dateTo && new Date(log.timestamp) > options.dateTo) continue

    const searchText = options.caseSensitive
      ? JSON.stringify(log)
      : JSON.stringify(log).toLowerCase()

    if (searchText.includes(searchQuery)) {
      results.push({
        id: `audit-${log.timestamp}`,
        type: 'audit',
        title: log.action,
        description: `${log.success ? 'Success' : 'Failed'} - ${JSON.stringify(log.details || {})}`,
        timestamp: new Date(log.timestamp),
        level: log.success ? 'info' : 'error',
        score: 0,
        url: '/audit',
        metadata: log as unknown as Record<string, unknown>,
      })
    }
  }

  return results
}

/**
 * Search container logs using docker logs
 */
async function searchContainerLogs(
  query: string,
  options: {
    services?: string[]
    levels?: string[]
    dateFrom?: Date
    dateTo?: Date
    regex?: boolean
    caseSensitive?: boolean
  }
): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    // Get list of running containers
    const { stdout } = await execFileAsync('docker', ['ps', '--format', '{{.Names}}'])

    const containers = stdout.trim().split('\n').filter(Boolean)

    // Filter by service names if specified
    const targetContainers = options.services
      ? containers.filter((c) => options.services!.some((s) => c.includes(s)))
      : containers

    // Search logs for each container (limit to first 5 for performance)
    const searchPromises = targetContainers.slice(0, 5).map(async (container) => {
      try {
        const { stdout: logs } = await execFileAsync('docker', [
          'logs',
          container,
          '--tail',
          '500',
          '--timestamps',
        ])

        const lines = logs.split('\n').filter(Boolean)
        const searchQuery = options.caseSensitive ? query : query.toLowerCase()

        for (const line of lines) {
          const searchLine = options.caseSensitive ? line : line.toLowerCase()

          if (
            options.regex
              ? new RegExp(query, options.caseSensitive ? '' : 'i').test(line)
              : searchLine.includes(searchQuery)
          ) {
            // Extract timestamp and message
            const timestampMatch = line.match(/^(\S+)\s+(.+)$/)
            const timestamp = timestampMatch ? new Date(timestampMatch[1] ?? '') : new Date()
            const message = timestampMatch ? (timestampMatch[2] ?? line) : line

            // Detect log level
            let level: 'error' | 'warn' | 'info' | 'debug' = 'info'
            if (/error|err|fatal|critical/i.test(message)) level = 'error'
            else if (/warn|warning/i.test(message)) level = 'warn'
            else if (/debug|trace/i.test(message)) level = 'debug'

            // Filter by level if specified
            if (options.levels && !options.levels.includes(level)) continue

            // Filter by date range
            if (options.dateFrom && timestamp < options.dateFrom) continue
            if (options.dateTo && timestamp > options.dateTo) continue

            results.push({
              id: `log-${container}-${timestamp.getTime()}`,
              type: 'log',
              title: container,
              description: message.substring(0, 200),
              content: message,
              timestamp,
              service: container,
              level,
              score: 0,
              url: `/services/logs?container=${container}`,
            })
          }
        }
      } catch {
        // Ignore errors for individual containers
      }
    })

    await Promise.all(searchPromises)
  } catch {
    // Ignore Docker errors
  }

  return results
}

/**
 * Search environment configuration files
 */
async function searchConfigs(
  query: string,
  options: { caseSensitive?: boolean }
): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    const projectPath = getProjectPath()
    const envFiles = ['.env.local', '.env.dev', '.env.stage', '.env.prod']

    for (const file of envFiles) {
      try {
        const filePath = path.join(projectPath, file)
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.split('\n')

        const searchQuery = options.caseSensitive ? query : query.toLowerCase()

        lines.forEach((line, index) => {
          const searchLine = options.caseSensitive ? line : line.toLowerCase()

          if (searchLine.includes(searchQuery) && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=')
            const value = valueParts.join('=')

            results.push({
              id: `config-${file}-${index}`,
              type: 'config',
              title: key?.trim() || 'Config',
              description: `${file}: ${value?.substring(0, 50) || ''}`,
              content: line,
              score: 0,
              url: `/config/env?file=${file}`,
              metadata: { file, line: index + 1 },
            })
          }
        })
      } catch {
        // Ignore missing files
      }
    }
  } catch {
    // Ignore errors
  }

  return results
}

/**
 * Search project files
 */
async function searchFiles(
  query: string,
  options: { caseSensitive?: boolean; regex?: boolean }
): Promise<SearchResult[]> {
  const results: SearchResult[] = []

  try {
    const projectPath = getProjectPath()

    // Use ripgrep for fast file search if available, otherwise use grep
    const grepArgs = [
      options.caseSensitive ? '' : '-i',
      '-r',
      '-n',
      '--include=*.yml',
      '--include=*.yaml',
      '--include=*.json',
      '--include=*.sh',
      '--include=*.md',
      query,
      projectPath,
    ].filter(Boolean)

    try {
      const { stdout } = await execFileAsync('grep', grepArgs, {
        maxBuffer: 1024 * 1024 * 10, // 10MB
      })

      const lines = stdout.split('\n').filter(Boolean).slice(0, 50)

      for (const line of lines) {
        const [filePath, lineNum, ...contentParts] = line.split(':')
        const content = contentParts.join(':')
        const safeFilePath = filePath ?? ''
        const safeLineNum = lineNum ?? '0'

        results.push({
          id: `file-${safeFilePath}-${safeLineNum}`,
          type: 'file',
          title: path.basename(safeFilePath),
          description: content.substring(0, 200),
          content,
          score: 0,
          metadata: {
            file: safeFilePath,
            line: parseInt(safeLineNum, 10),
          },
        })
      }
    } catch {
      // grep might fail if no results
    }
  } catch {
    // Ignore errors
  }

  return results
}

/**
 * Rank search results by relevance
 */
function rankResults(results: SearchResult[], query: string): SearchResult[] {
  const queryLower = query.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(Boolean)

  return results
    .map((result) => {
      let score = 0

      const titleLower = result.title.toLowerCase()
      const descLower = result.description.toLowerCase()

      // Exact title match: highest score
      if (titleLower === queryLower) score += 100

      // Title starts with query
      if (titleLower.startsWith(queryLower)) score += 50

      // Title contains query
      if (titleLower.includes(queryLower)) score += 30

      // Description contains query
      if (descLower.includes(queryLower)) score += 10

      // Count word matches
      for (const word of queryWords) {
        if (titleLower.includes(word)) score += 5
        if (descLower.includes(word)) score += 2
      }

      // Boost recent results
      if (result.timestamp) {
        const age = Date.now() - result.timestamp.getTime()
        const dayInMs = 24 * 60 * 60 * 1000
        if (age < dayInMs) score += 10
        else if (age < 7 * dayInMs) score += 5
      }

      // Boost errors
      if (result.level === 'error') score += 5

      // Type-based boosting
      if (result.type === 'navigation') score += 20
      if (result.type === 'service') score += 15

      return { ...result, score }
    })
    .sort((a, b) => b.score - a.score)
}

/**
 * Get search suggestions based on partial query
 */
export async function getSuggestions(query: string, limit = 5): Promise<string[]> {
  if (!query || query.length < 2) return []

  const { results } = await search(query, { limit: 20 })
  const suggestions = new Set<string>()

  for (const result of results) {
    // Add title as suggestion
    if (result.title.toLowerCase().includes(query.toLowerCase())) {
      suggestions.add(result.title)
    }

    // Add service names
    if (result.service && result.service.toLowerCase().includes(query.toLowerCase())) {
      suggestions.add(result.service)
    }

    if (suggestions.size >= limit) break
  }

  return Array.from(suggestions)
}

/**
 * Get available filters for search UI
 */
export async function getSearchFilters(): Promise<{
  services: string[]
  types: SearchResultType[]
  levels: string[]
}> {
  try {
    const { stdout } = await execFileAsync('docker', ['ps', '--format', '{{.Names}}'])

    const services = stdout.trim().split('\n').filter(Boolean)

    return {
      services,
      types: ['log', 'audit', 'config', 'service', 'database', 'navigation', 'file'],
      levels: ['error', 'warn', 'info', 'debug'],
    }
  } catch {
    return {
      services: [],
      types: ['log', 'audit', 'config', 'service', 'database', 'navigation', 'file'],
      levels: ['error', 'warn', 'info', 'debug'],
    }
  }
}
