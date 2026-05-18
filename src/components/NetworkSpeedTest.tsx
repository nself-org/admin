'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertCircle, CheckCircle2, Globe, Wifi } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function NetworkSpeedTest() {
  const [speedInfo, setSpeedInfo] = useState<any>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<number | null>(null)

  // Fetch current speed info
  const fetchSpeedInfo = async () => {
    try {
      const res = await fetch('/api/system/network-speed')
      const data = await res.json()
      if (data.success) {
        setSpeedInfo(data.data)
      }
    } catch (error) {
      console.warn('[NetworkSpeedTest] Error fetching speed info:', error)
    }
  }

  // Run a basic speed test
  const runSpeedTest = async () => {
    setTesting(true)
    setTestResult(null)

    try {
      // Test download speed with multiple samples
      const samples: number[] = []

      // Use multiple CDN endpoints for better accuracy
      const testUrls = [
        'https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js',
        'https://unpkg.com/react@18/umd/react.production.min.js',
      ]

      for (const url of testUrls) {
        const startTime = performance.now()

        try {
          const response = await fetch(url, {
            cache: 'no-store',
            mode: 'cors',
          })

          if (response.ok) {
            const blob = await response.blob()
            const endTime = performance.now()
            const duration = (endTime - startTime) / 1000 // seconds
            const bytes = blob.size
            const mbps = (bytes * 8) / (duration * 1000000)
            samples.push(mbps)
          }
        } catch {
          // Skip failed sample
        }
      }

      if (samples.length > 0) {
        // Take the median of samples and multiply by factor for overhead
        samples.sort((a, b) => a - b)
        const median = samples[Math.floor(samples.length / 2)]
        const estimatedSpeed = Math.round(median * 10) // Factor for actual capacity

        setTestResult(estimatedSpeed)

        // Save the result
        await fetch('/api/system/network-speed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ispSpeed: estimatedSpeed }),
        })

        // Refresh speed info
        await fetchSpeedInfo()
      }
    } catch {
      // Intentionally empty - test results are handled above
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    fetchSpeedInfo()
  }, [])

  if (!speedInfo) {
    return null
  }

  const bottleneck = speedInfo.effective.bottleneck

  return (
    <Card className="bg-background/50 p-4 backdrop-blur">
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4" />
          Network Speed Analysis
        </h3>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="text-muted-foreground">Interface (Wi-Fi/Ethernet)</div>
            <div className="flex items-center gap-2">
              <Wifi className="h-3 w-3" />
              <span className={bottleneck === 'interface' ? 'text-yellow-500' : ''}>
                {speedInfo.interface.speedText}
              </span>
              {bottleneck === 'interface' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground">ISP Connection</div>
            <div className="flex items-center gap-2">
              <Globe className="h-3 w-3" />
              <span className={bottleneck === 'isp' ? 'text-yellow-500' : ''}>
                {speedInfo.isp.speedText}
              </span>
              {bottleneck === 'isp' && <AlertCircle className="h-3 w-3 text-yellow-500" />}
            </div>
          </div>
        </div>

        <div className="border-t pt-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-muted-foreground text-xs">Effective Speed</div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {speedInfo.effective.speedText}
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={runSpeedTest}
              disabled={testing}
              className="text-xs"
            >
              {testing ? 'Testing...' : 'Test ISP Speed'}
            </Button>
          </div>

          {testResult && (
            <div className="mt-2 text-xs text-green-500">Speed test result: {testResult} Mbps</div>
          )}

          {speedInfo.isp.estimated && (
            <div className="text-muted-foreground mt-2 text-xs">
              ISP speed is estimated. Run test for accurate measurement.
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
