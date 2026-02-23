import { orchestrator } from '@/services/globalOrchestrator'
import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import os from 'os'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Store previous network stats for calculating delta
interface NetworkSnapshot {
  timestamp: number
  rx: number // bytes
  tx: number // bytes
}

let lastNetworkSnapshot: NetworkSnapshot | null = null

export async function GET(): Promise<NextResponse> {
  try {
    // Get data from our orchestrator
    // Use global orchestrator instance

    // Ensure orchestrator is running
    if (!orchestrator.isActive()) {
      await orchestrator.start()
      // Wait a moment for initial data collection
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    const state = orchestrator.getState()

    // Get system-level metrics (not Docker-specific)
    const getSystemMetrics = async () => {
      // CPU usage
      const getCpuUsage = async () => {
        try {
          const { stdout } = await execAsync(
            "top -l 1 -n 0 | grep 'CPU usage' | awk '{print $3}' | sed 's/%//'",
          )
          return parseFloat(stdout.trim()) || 0
        } catch {
          const load = os.loadavg()[0]
          const cpus = os.cpus().length
          return Math.min(Math.round((load / cpus) * 100), 100)
        }
      }

      // Memory usage
      const getMemoryUsage = async () => {
        const totalMem = os.totalmem()
        const freeMem = os.freemem()
        const usedMem = totalMem - freeMem

        return {
          used: Math.round((usedMem / (1024 * 1024 * 1024)) * 10) / 10,
          total: Math.round((totalMem / (1024 * 1024 * 1024)) * 10) / 10,
          percentage: Math.round((usedMem / totalMem) * 100),
        }
      }

      // Disk usage
      const getDiskUsage = async () => {
        try {
          const { stdout } = await execAsync(
            "df -h / | tail -1 | awk '{print $2 \" \" $3 \" \" $5}' | sed 's/G//g' | sed 's/%//'",
          )
          const parts = stdout.trim().split(' ')
          const total = parseFloat(parts[0]) || 100
          const used = parseFloat(parts[1]) || 50
          const percentage = parseInt(parts[2]) || 50

          return { used, total, percentage }
        } catch {
          return { used: 50, total: 100, percentage: 50 }
        }
      }

      // Network speed
      const getNetworkSpeed = async () => {
        try {
          const { stdout: wifiInfo } = await execAsync(
            "system_profiler SPAirPortDataType 2>/dev/null | grep 'Transmit Rate:' | head -1 | awk '{print $3}'",
          )
          const wifiRate = parseInt(wifiInfo.trim())
          if (wifiRate && wifiRate > 0) {
            return wifiRate
          }
        } catch {
          // Default to 1 Gbps
        }
        return 1000
      }

      return Promise.all([
        getCpuUsage(),
        getMemoryUsage(),
        getDiskUsage(),
        getNetworkSpeed(),
      ])
    }

    const [systemCpu, systemMemory, systemDisk, maxSpeed] =
      await getSystemMetrics()

    // Get current network bytes from docker stats
    let currentNetworkRx = 0
    let currentNetworkTx = 0

    try {
      // Get network stats from all running containers
      const { stdout } = await execAsync(
        `docker stats --no-stream --format "table {{.NetIO}}" | tail -n +2 | awk -F'/' '{print $1 " " $2}'`,
      )
      const lines = stdout
        .trim()
        .split('\n')
        .filter((l) => l)

      for (const line of lines) {
        const parts = line.trim().split(/\s+/)
        if (parts.length >= 2) {
          // Parse network I/O (e.g., "1.2MB", "500kB")
          const rxStr = parts[0]
          const txStr = parts[1]

          // Convert to bytes
          const parseBytes = (str: string): number => {
            const num = parseFloat(str)
            if (str.includes('GB')) return num * 1024 * 1024 * 1024
            if (str.includes('MB')) return num * 1024 * 1024
            if (str.includes('kB')) return num * 1024
            return num
          }

          currentNetworkRx += parseBytes(rxStr)
          currentNetworkTx += parseBytes(txStr)
        }
      }
    } catch {
      // Fallback to orchestrator data if docker stats fails
      currentNetworkRx = state.metrics.totalNetwork.rx * 1024 * 1024 // Convert MB to bytes
      currentNetworkTx = state.metrics.totalNetwork.tx * 1024 * 1024
    }

    // Calculate network rate (Mbps) based on delta
    let networkRxRate = 0
    let networkTxRate = 0

    const now = Date.now()
    if (lastNetworkSnapshot) {
      const timeDeltaSeconds = (now - lastNetworkSnapshot.timestamp) / 1000
      if (timeDeltaSeconds > 0) {
        // Calculate bytes per second, then convert to Mbps
        const rxBytesPerSecond =
          (currentNetworkRx - lastNetworkSnapshot.rx) / timeDeltaSeconds
        const txBytesPerSecond =
          (currentNetworkTx - lastNetworkSnapshot.tx) / timeDeltaSeconds

        // Convert to Mbps (megabits per second)
        networkRxRate = Math.max(0, (rxBytesPerSecond * 8) / (1024 * 1024))
        networkTxRate = Math.max(0, (txBytesPerSecond * 8) / (1024 * 1024))

        // Round to 2 decimal places
        networkRxRate = Math.round(networkRxRate * 100) / 100
        networkTxRate = Math.round(networkTxRate * 100) / 100
      }
    }

    // Update snapshot for next calculation
    lastNetworkSnapshot = {
      timestamp: now,
      rx: currentNetworkRx,
      tx: currentNetworkTx,
    }

    // Calculate Docker metrics from orchestrator data
    const dockerMetrics = {
      cpu: state.metrics.totalCpu,
      memory: {
        used: state.metrics.totalMemory.used,
        total: state.metrics.totalMemory.total || systemMemory.total, // Use system memory as fallback
        percentage: state.metrics.totalMemory.percentage,
      },
      network: {
        rx: networkRxRate, // Mbps rate
        tx: networkTxRate, // Mbps rate
      },
      storage: {
        used: state.docker.containers.reduce((sum, _c) => {
          // Estimate storage based on container count (rough estimate)
          return sum + 0.5 // Each container ~500MB
        }, 0),
        total: systemDisk.total,
      },
      containers: state.docker.containers.length,
    }

    // Get Docker storage for THIS PROJECT only (volumes + containers, not images)
    try {
      const { stdout } = await execAsync('docker system df --format json')
      // Parse newline-delimited JSON
      const lines = stdout
        .trim()
        .split('\n')
        .filter((l) => l)
      let totalUsed = 0

      for (const line of lines) {
        try {
          const item = JSON.parse(line)

          // Only count Containers and Volumes (project-specific data)
          // Skip Images as they're shared across all projects
          if (item.Type === 'Images' || item.Type === 'Build Cache') {
            continue
          }

          // Parse size string (e.g., "416.7MB", "167.9kB")
          const sizeStr = item.Size || '0B'
          let sizeInGB = 0

          if (sizeStr.includes('GB')) {
            sizeInGB = parseFloat(sizeStr.replace('GB', ''))
          } else if (sizeStr.includes('MB')) {
            sizeInGB = parseFloat(sizeStr.replace('MB', '')) / 1024
          } else if (sizeStr.includes('kB')) {
            sizeInGB = parseFloat(sizeStr.replace('kB', '')) / (1024 * 1024)
          } else if (sizeStr.includes('B')) {
            sizeInGB =
              parseFloat(sizeStr.replace('B', '')) / (1024 * 1024 * 1024)
          }

          totalUsed += sizeInGB
        } catch {
          // Skip invalid lines
        }
      }

      // Round to 3 decimal places for better precision with small values
      dockerMetrics.storage.used = Math.round(totalUsed * 1000) / 1000

      // Set a reasonable total for project data storage (10GB for volumes/containers)
      // This is more realistic for project-specific data
      dockerMetrics.storage.total = 10
    } catch {
      // Fallback: use simpler parsing (only Containers and Volumes)
      try {
        const { stdout } = await execAsync(
          "docker system df | grep -E 'Containers|Volumes' | awk '{print $4}'",
        )
        const lines = stdout.trim().split('\n')
        let totalUsed = 0

        for (const line of lines) {
          const size = line.trim()
          if (size.includes('GB')) {
            totalUsed += parseFloat(size.replace('GB', ''))
          } else if (size.includes('MB')) {
            totalUsed += parseFloat(size.replace('MB', '')) / 1024
          } else if (size.includes('kB')) {
            totalUsed += parseFloat(size.replace('kB', '')) / (1024 * 1024)
          }
        }

        dockerMetrics.storage.used = Math.round(totalUsed * 1000) / 1000
        dockerMetrics.storage.total = 10 // 10GB for project data
      } catch {
        // Keep a minimal estimate based on container count
        dockerMetrics.storage.used = state.docker.containers.length * 0.05 // ~50MB per container
        dockerMetrics.storage.total = 10
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        system: {
          cpu: systemCpu,
          memory: systemMemory,
          disk: systemDisk,
          network: {
            rx: networkRxRate, // Use the same rate for system
            tx: networkTxRate, // Use the same rate for system
            maxSpeed,
          },
        },
        docker: dockerMetrics,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch system metrics',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
