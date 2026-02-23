import { exec } from 'child_process'
import { NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(): Promise<NextResponse> {
  try {
    // Get the primary network interface
    const { stdout: primaryInterface } = await execAsync(
      "route get default 2>/dev/null | grep interface | awk '{print $2}' || echo 'en0'",
    )
    const iface = primaryInterface.trim() || 'en0'

    // Get network statistics for the interface
    // On macOS: netstat -ibn
    // On Linux: cat /sys/class/net/{iface}/statistics/rx_bytes

    let rxBytes = 0
    let txBytes = 0

    try {
      // Try macOS method first
      const { stdout } = await execAsync(
        `netstat -ibn | grep -E "^${iface}\\s" | awk '{print $7 " " $10}'`,
      )
      const parts = stdout.trim().split(' ')
      rxBytes = parseInt(parts[0]) || 0
      txBytes = parseInt(parts[1]) || 0
    } catch {
      // Try Linux method
      try {
        const { stdout: rxOut } = await execAsync(
          `cat /sys/class/net/${iface}/statistics/rx_bytes`,
        )
        const { stdout: txOut } = await execAsync(
          `cat /sys/class/net/${iface}/statistics/tx_bytes`,
        )
        rxBytes = parseInt(rxOut.trim()) || 0
        txBytes = parseInt(txOut.trim()) || 0
      } catch {
        // Fallback: try to get from ifconfig
        try {
          const { stdout } = await execAsync(
            `ifconfig ${iface} | grep 'RX bytes\\|TX bytes'`,
          )
          const rxMatch = stdout.match(/RX bytes[:\s]+(\d+)/)
          const txMatch = stdout.match(/TX bytes[:\s]+(\d+)/)
          rxBytes = rxMatch ? parseInt(rxMatch[1]) : 0
          txBytes = txMatch ? parseInt(txMatch[1]) : 0
        } catch {
          // No method worked
        }
      }
    }

    return NextResponse.json({
      success: true,
      stdout: {
        interface: iface,
        rxBytes,
        txBytes,
        timestamp: Date.now(),
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to get network statistics' },
      { status: 500 },
    )
  }
}
