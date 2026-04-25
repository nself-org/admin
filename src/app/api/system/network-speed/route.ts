import { exec } from 'child_process'
import fs from 'fs/promises'
import { NextResponse, NextRequest } from 'next/server'
import path from 'path'
import { promisify } from 'util'
import { requireAuth } from '@/lib/require-auth'

const execAsync = promisify(exec)

// Cache for speed test results
let speedCache: {
  timestamp: number
  ispSpeed?: number
  interfaceSpeed?: number
  effectiveSpeed?: number
} = { timestamp: 0 }

const CACHE_DURATION = 3600000 // 1 hour cache for ISP speed tests

export async function GET(): Promise<NextResponse> {
  try {
    const now = Date.now()

    // Return cached result if recent
    if (speedCache.timestamp && now - speedCache.timestamp < CACHE_DURATION) {
      return NextResponse.json({
        success: true,
        data: speedCache,
        cached: true,
      })
    }

    // Get network interface speed (Wi-Fi or Ethernet)
    const getInterfaceSpeed = async () => {
      try {
        // Try to get Wi-Fi transmit rate
        const { stdout: wifiInfo } = await execAsync(
          "system_profiler SPAirPortDataType 2>/dev/null | grep 'Transmit Rate:' | head -1 | awk '{print $3}'",
        )
        const wifiRate = parseInt(wifiInfo.trim())
        if (wifiRate && wifiRate > 0) {
          return wifiRate
        }
      } catch {
        // Try Ethernet
        try {
          const { stdout: ethernetInfo } = await execAsync(
            "ifconfig | grep 'media:.*baseT' | head -1",
          )
          if (ethernetInfo.includes('10000baseT')) return 10000
          if (ethernetInfo.includes('1000baseT')) return 1000
          if (ethernetInfo.includes('100baseT')) return 100
        } catch {
          // Ignore
        }
      }
      return 1000 // Default 1 Gbps
    }

    // Try to estimate ISP speed using a lightweight method
    const getISPSpeed = async () => {
      try {
        // Method 1: Try a quick download test with multiple CDN samples
        const testUrls = [
          'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css',
          'https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js',
          'https://unpkg.com/react@18/umd/react.production.min.js',
        ]

        const speeds: number[] = []

        for (const url of testUrls) {
          try {
            const { stdout } = await execAsync(
              `curl -s -w '%{speed_download}' -o /dev/null '${url}'`,
              { timeout: 3000 },
            )

            const bytesPerSec = parseFloat(stdout)
            if (bytesPerSec > 0) {
              const mbps = (bytesPerSec * 8) / 1000000
              speeds.push(mbps)
            }
          } catch {
            // Skip failed sample
          }
        }

        if (speeds.length > 0) {
          // Use the best speed and multiply by factor for actual capacity
          const maxSpeed = Math.max(...speeds)
          return Math.round(maxSpeed * 8) // Estimate actual capacity is ~8x burst speed
        }
      } catch {
        // Ignore
      }

      // Method 2: Check if we have a saved ISP speed from previous speed tests
      try {
        const configPath = path.join(
          process.cwd(),
          '.nself-network-config.json',
        )
        const configData = await fs.readFile(configPath, 'utf-8')
        const config = JSON.parse(configData)
        if (config.ispSpeed) {
          return config.ispSpeed
        }
      } catch {
        // No saved config
      }

      return null // Unknown ISP speed
    }

    // Get active network interface info
    const getActiveInterface = async () => {
      try {
        // Get the default route interface
        const { stdout } = await execAsync(
          "route get default 2>/dev/null | grep interface | awk '{print $2}'",
        )
        const interfaceName = stdout.trim()

        if (interfaceName) {
          // Check if it's Wi-Fi or Ethernet
          const { stdout: interfaceInfo } = await execAsync(
            `ifconfig ${interfaceName} 2>/dev/null | head -1`,
          )
          if (interfaceInfo.includes('en0')) {
            return { type: 'wifi', name: interfaceName }
          } else if (interfaceInfo.includes('en')) {
            return { type: 'ethernet', name: interfaceName }
          }
        }
      } catch {
        // Fallback to checking en0 (common Wi-Fi interface)
        try {
          const { stdout } = await execAsync(
            "ifconfig en0 2>/dev/null | grep 'status: active'",
          )
          if (stdout) {
            return { type: 'wifi', name: 'en0' }
          }
        } catch {
          // Not active
        }
      }

      return { type: 'unknown', name: 'unknown' }
    }

    // Gather all speed information
    const [interfaceSpeed, ispSpeed, activeInterface] = await Promise.all([
      getInterfaceSpeed(),
      getISPSpeed(),
      getActiveInterface(),
    ])

    // Calculate effective speed (the bottleneck)
    let effectiveSpeed = interfaceSpeed
    let bottleneck = 'interface'

    if (ispSpeed && ispSpeed < interfaceSpeed) {
      effectiveSpeed = ispSpeed
      bottleneck = 'isp'
    }

    // Update cache
    speedCache = {
      timestamp: now,
      interfaceSpeed,
      ispSpeed,
      effectiveSpeed,
    }

    return NextResponse.json({
      success: true,
      data: {
        interface: {
          type: activeInterface.type,
          name: activeInterface.name,
          speed: interfaceSpeed,
          speedText: `${interfaceSpeed} Mbps`,
        },
        isp: {
          speed: ispSpeed,
          speedText: ispSpeed ? `${ispSpeed} Mbps` : 'Unknown',
          estimated: true,
        },
        effective: {
          speed: effectiveSpeed,
          bottleneck,
          speedText: `${effectiveSpeed} Mbps`,
        },
        timestamp: new Date().toISOString(),
      },
      cached: false,
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to detect network speed',
        details:
          error instanceof Error
            ? error?.message || 'Unknown error'
            : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// POST endpoint to save ISP speed from actual speed tests
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const data = await request.json()
    const { ispSpeed } = data

    if (typeof ispSpeed !== 'number' || ispSpeed <= 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid ISP speed value' },
        { status: 400 },
      )
    }

    // Save to config file
    const configPath = path.join(process.cwd(), '.nself-network-config.json')
    const config = { ispSpeed, updatedAt: new Date().toISOString() }

    await fs.writeFile(configPath, JSON.stringify(config, null, 2))

    // Update cache
    speedCache.ispSpeed = ispSpeed
    speedCache.effectiveSpeed = Math.min(
      speedCache.interfaceSpeed || 1000,
      ispSpeed,
    )

    return NextResponse.json({
      success: true,
      message: 'ISP speed saved',
      data: config,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to save ISP speed' },
      { status: 500 },
    )
  }
}
