import { getProjectPath } from '@/lib/paths'
import { execFile } from 'child_process'
import fs from 'fs/promises'
import { NextResponse } from 'next/server'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Valid container name pattern
const VALID_CONTAINER_NAME = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/

function validateContainerName(name: string): boolean {
  return name.length <= 64 && VALID_CONTAINER_NAME.test(name)
}

export async function GET(): Promise<NextResponse> {
  try {
    // Get project prefix for filtering containers
    let projectPrefix = 'nproj' // Default fallback
    try {
      const projectPath = getProjectPath()
      const dockerComposePath = path.join(projectPath, 'docker-compose.yml')

      try {
        const dockerComposeContent = await fs.readFile(
          dockerComposePath,
          'utf8',
        )
        const projectMatch = dockerComposeContent.match(/# Project: ([^\s\n]+)/)
        if (projectMatch) {
          projectPrefix = projectMatch[1].trim()
        }
      } catch {
        // File doesn't exist or can't read, use default
      }
    } catch {
      // Path error, use default
    }

    // Get list of project containers using execFile (safe)
    const { stdout: containerList } = await execFileAsync('docker', [
      'ps',
      '--format',
      '{{.Names}}',
    ])
    const projectContainers = containerList.split('\n').filter((name) => {
      if (!name) return false
      // Validate container name format
      if (!validateContainerName(name)) return false

      const lowerName = name.toLowerCase()
      return (
        lowerName.startsWith(projectPrefix.toLowerCase() + '_') ||
        lowerName.startsWith(projectPrefix.toLowerCase() + '-') ||
        lowerName.startsWith('nself_') ||
        lowerName.startsWith('nself-') ||
        // Also check if container name contains common nself service names
        ['postgres', 'hasura', 'grafana', 'prometheus'].some((service) =>
          lowerName.includes(service),
        )
      )
    })

    if (projectContainers.length === 0) {
      return NextResponse.json({
        success: true,
        containers: [],
      })
    }

    // Get network stats for each container from /proc/net/dev inside container
    const containerStats = await Promise.all(
      projectContainers.map(async (containerName) => {
        try {
          // Get network stats from inside the container using execFile (safe)
          const { stdout } = await execFileAsync('docker', [
            'exec',
            containerName,
            'cat',
            '/proc/net/dev',
          ])

          // Filter for network interface lines (eth0, eth1, ens1, etc.)
          const lines = stdout.split('\n')
          const interfaceLine = lines.find((line) =>
            /^\s*(eth[0-9]+|ens[0-9]+):/.test(line),
          )

          if (interfaceLine) {
            // Parse the network stats line
            // Format: interface: rx_bytes rx_packets ... tx_bytes tx_packets ...
            const parts = interfaceLine.trim().split(/\s+/)

            if (parts.length >= 10) {
              // rx_bytes is at index 1, tx_bytes is at index 9
              const rxBytes = parseInt(parts[1]) || 0
              const txBytes = parseInt(parts[9]) || 0

              return {
                name: containerName,
                rxBytes,
                txBytes,
              }
            }
          }

          return {
            name: containerName,
            rxBytes: 0,
            txBytes: 0,
          }
        } catch {
          return {
            name: containerName,
            rxBytes: 0,
            txBytes: 0,
          }
        }
      }),
    )

    return NextResponse.json({
      success: true,
      containers: containerStats,
      timestamp: Date.now(),
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to get Docker network statistics' },
      { status: 500 },
    )
  }
}
