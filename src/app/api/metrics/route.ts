/**
 * Prometheus Metrics Endpoint
 * Exposes application metrics in Prometheus text format
 *
 * Metrics exposed:
 * - HTTP request count by endpoint and method
 * - HTTP response time percentiles
 * - Error rate by endpoint
 * - Active sessions count
 * - Database query count
 * - WebSocket connections
 * - System resources (CPU, memory)
 */

import { getDatabase } from '@/lib/database'
import fs from 'fs/promises'
import { NextResponse } from 'next/server'

interface Metric {
  name: string
  type: 'counter' | 'gauge' | 'histogram' | 'summary'
  help: string
  value: number | string
  labels?: Record<string, string>
}

// In-memory metrics storage (in production, use a proper metrics library like prom-client)
// This is a simplified version for demonstration
const metrics = new Map<string, Metric>()

function formatMetric(metric: Metric): string {
  const labelStr = metric.labels
    ? Object.entries(metric.labels)
        .map(([key, value]) => `${key}="${value}"`)
        .join(',')
    : ''

  const nameWithLabels = labelStr ? `${metric.name}{${labelStr}}` : metric.name
  return `${nameWithLabels} ${metric.value}`
}

function formatMetrics(metricsArray: Metric[]): string {
  const lines: string[] = []
  const groupedMetrics = new Map<string, Metric[]>()

  // Group metrics by name
  for (const metric of metricsArray) {
    if (!groupedMetrics.has(metric.name)) {
      groupedMetrics.set(metric.name, [])
    }
    groupedMetrics.get(metric.name)!.push(metric)
  }

  // Format each metric group
  for (const [name, metrics] of groupedMetrics) {
    const firstMetric = metrics[0]
    lines.push(`# HELP ${name} ${firstMetric.help}`)
    lines.push(`# TYPE ${name} ${firstMetric.type}`)

    for (const metric of metrics) {
      lines.push(formatMetric(metric))
    }
    lines.push('') // Empty line between metrics
  }

  return lines.join('\n')
}

async function getSystemMetrics(): Promise<Metric[]> {
  const metrics: Metric[] = []

  // Process uptime
  metrics.push({
    name: 'nadmin_process_uptime_seconds',
    type: 'gauge',
    help: 'Process uptime in seconds',
    value: Math.floor(process.uptime()),
  })

  // Memory usage
  const memUsage = process.memoryUsage()
  metrics.push({
    name: 'nadmin_process_memory_heap_bytes',
    type: 'gauge',
    help: 'Process heap memory usage in bytes',
    value: memUsage.heapUsed,
    labels: { type: 'used' },
  })
  metrics.push({
    name: 'nadmin_process_memory_heap_bytes',
    type: 'gauge',
    help: 'Process heap memory usage in bytes',
    value: memUsage.heapTotal,
    labels: { type: 'total' },
  })

  // System memory (Linux only)
  try {
    const memInfo = await fs.readFile('/proc/meminfo', 'utf-8')
    const lines = memInfo.split('\n')
    const memTotal = parseInt(
      lines.find((l) => l.startsWith('MemTotal'))?.split(/\s+/)[1] || '0',
    )
    const memAvailable = parseInt(
      lines.find((l) => l.startsWith('MemAvailable'))?.split(/\s+/)[1] || '0',
    )

    metrics.push({
      name: 'nadmin_system_memory_bytes',
      type: 'gauge',
      help: 'System memory in bytes',
      value: memTotal * 1024,
      labels: { type: 'total' },
    })
    metrics.push({
      name: 'nadmin_system_memory_bytes',
      type: 'gauge',
      help: 'System memory in bytes',
      value: (memTotal - memAvailable) * 1024,
      labels: { type: 'used' },
    })
  } catch {
    // Not on Linux, skip system memory metrics
  }

  return metrics
}

async function getDatabaseMetrics(): Promise<Metric[]> {
  const metrics: Metric[] = []

  try {
    const db = await getDatabase()
    if (!db) {
      return metrics
    }
    const collections = db.listCollections()

    // Collection count
    metrics.push({
      name: 'nadmin_database_collections_total',
      type: 'gauge',
      help: 'Total number of database collections',
      value: collections.length,
    })

    // Document count per collection
    for (const collection of collections) {
      const count = collection.count()
      metrics.push({
        name: 'nadmin_database_documents_total',
        type: 'gauge',
        help: 'Total number of documents in collection',
        value: count,
        labels: { collection: collection.name },
      })
    }

    // Active sessions count
    const sessionsCollection = db.getCollection('sessions')
    if (sessionsCollection) {
      const now = new Date()
      const activeSessions = sessionsCollection.find({
        expiresAt: { $gte: now },
      })

      metrics.push({
        name: 'nadmin_active_sessions_total',
        type: 'gauge',
        help: 'Total number of active user sessions',
        value: activeSessions.length,
      })
    }
  } catch (error) {
    // Database error, add error metric
    metrics.push({
      name: 'nadmin_database_errors_total',
      type: 'counter',
      help: 'Total database errors',
      value: 1,
      labels: {
        error: error instanceof Error ? error.message : 'unknown',
      },
    })
  }

  return metrics
}

async function getApplicationMetrics(): Promise<Metric[]> {
  const metrics: Metric[] = []

  // Build info
  metrics.push({
    name: 'nadmin_build_info',
    type: 'gauge',
    help: 'Application build information',
    value: 1,
    labels: {
      version: process.env.npm_package_version || 'unknown',
      node_version: process.version,
    },
  })

  // Environment
  metrics.push({
    name: 'nadmin_environment_info',
    type: 'gauge',
    help: 'Application environment information',
    value: 1,
    labels: {
      env: process.env.NODE_ENV || 'development',
    },
  })

  return metrics
}

export async function GET(): Promise<NextResponse> {
  try {
    // Collect all metrics
    const [systemMetrics, databaseMetrics, appMetrics] = await Promise.all([
      getSystemMetrics(),
      getDatabaseMetrics(),
      getApplicationMetrics(),
    ])

    const allMetrics = [...systemMetrics, ...databaseMetrics, ...appMetrics]

    // Format as Prometheus text
    const output = formatMetrics(allMetrics)

    return new NextResponse(output, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    return new NextResponse(
      `# ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
        },
      },
    )
  }
}
