// Real Network Traffic Monitor
// Tracks actual network bytes and calculates real-time transfer rates

interface NetworkSnapshot {
  timestamp: number
  rxBytes: number
  txBytes: number
}

interface DockerNetworkSnapshot {
  timestamp: number
  containers: Map<string, { rx: number; tx: number }>
}

class NetworkMonitor {
  private lastSystemSnapshot: NetworkSnapshot | null = null
  private lastDockerSnapshot: DockerNetworkSnapshot | null = null

  // Get real system network stats
  async getSystemNetworkStats(): Promise<{ rx: number; tx: number }> {
    try {
      // Get current network bytes from primary interface
      const { stdout } = await fetch('/api/system/network/bytes').then((r) => r.json())

      const currentSnapshot: NetworkSnapshot = {
        timestamp: Date.now(),
        rxBytes: stdout.rxBytes || 0,
        txBytes: stdout.txBytes || 0,
      }

      // Calculate rate if we have a previous snapshot
      if (this.lastSystemSnapshot) {
        const timeDelta = (currentSnapshot.timestamp - this.lastSystemSnapshot.timestamp) / 1000 // seconds

        if (timeDelta > 0) {
          const rxBytesPerSec =
            (currentSnapshot.rxBytes - this.lastSystemSnapshot.rxBytes) / timeDelta
          const txBytesPerSec =
            (currentSnapshot.txBytes - this.lastSystemSnapshot.txBytes) / timeDelta

          // Convert to Mbps
          const rxMbps = (rxBytesPerSec * 8) / 1000000
          const txMbps = (txBytesPerSec * 8) / 1000000

          this.lastSystemSnapshot = currentSnapshot

          return {
            rx: Math.max(0, rxMbps), // Ensure non-negative
            tx: Math.max(0, txMbps),
          }
        }
      }

      this.lastSystemSnapshot = currentSnapshot
      return { rx: 0, tx: 0 }
    } catch (_error) {
      return { rx: 0, tx: 0 }
    }
  }

  // Get real Docker network stats
  async getDockerNetworkStats(): Promise<{ rx: number; tx: number }> {
    try {
      // Get current Docker network bytes
      const response = await fetch('/api/docker/network/bytes')
      const data = await response.json()

      if (!data.success) {
        return { rx: 0, tx: 0 }
      }

      const currentSnapshot: DockerNetworkSnapshot = {
        timestamp: Date.now(),
        containers: new Map(
          data.containers.map((c: any) => [c.name, { rx: c.rxBytes, tx: c.txBytes }])
        ),
      }

      // Calculate aggregate rate if we have a previous snapshot
      if (this.lastDockerSnapshot) {
        const timeDelta = (currentSnapshot.timestamp - this.lastDockerSnapshot.timestamp) / 1000 // seconds

        if (timeDelta > 0) {
          let totalRxBytesPerSec = 0
          let totalTxBytesPerSec = 0

          currentSnapshot.containers.forEach((current, name) => {
            const previous = this.lastDockerSnapshot!.containers.get(name)
            if (previous) {
              totalRxBytesPerSec += (current.rx - previous.rx) / timeDelta
              totalTxBytesPerSec += (current.tx - previous.tx) / timeDelta
            }
          })

          // Convert to Mbps
          const rxMbps = (totalRxBytesPerSec * 8) / 1000000
          const txMbps = (totalTxBytesPerSec * 8) / 1000000

          this.lastDockerSnapshot = currentSnapshot

          return {
            rx: Math.max(0, rxMbps),
            tx: Math.max(0, txMbps),
          }
        }
      }

      this.lastDockerSnapshot = currentSnapshot
      return { rx: 0, tx: 0 }
    } catch (_error) {
      return { rx: 0, tx: 0 }
    }
  }

  // Reset snapshots (useful when starting fresh)
  reset() {
    this.lastSystemSnapshot = null
    this.lastDockerSnapshot = null
  }
}

// Singleton instance
export const networkMonitor = new NetworkMonitor()
