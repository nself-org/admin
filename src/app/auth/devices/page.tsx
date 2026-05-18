'use client'

import { PageShell } from '@/components/PageShell'
import { TableSkeleton } from '@/components/skeletons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Shield,
  ShieldOff,
  Smartphone,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Device {
  id: string
  name: string
  type: string
  lastSeen: string
  trusted: boolean
  status: 'active' | 'inactive' | 'revoked'
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDevicesFromOutput(output: string): Device[] {
  // Try to parse JSON output first
  try {
    const parsed = JSON.parse(output)
    if (Array.isArray(parsed)) return parsed
    if (parsed.devices && Array.isArray(parsed.devices)) return parsed.devices
  } catch {
    // Not JSON, return raw output indication
  }
  return []
}

function getDeviceIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'mobile':
    case 'phone':
      return <Smartphone className="h-4 w-4" />
    case 'desktop':
    case 'laptop':
      return <Monitor className="h-4 w-4" />
    default:
      return <Monitor className="h-4 w-4" />
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function DevicesContent() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [lastCommand, setLastCommand] = useState('')

  // Register form state
  const [newDeviceName, setNewDeviceName] = useState('')
  const [newDeviceType, setNewDeviceType] = useState('desktop')
  const [registering, setRegistering] = useState(false)

  // Action loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch devices
  // ---------------------------------------------------------------------------

  const fetchDevices = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself auth devices list')

    try {
      const res = await fetch('/api/auth/devices')
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to list devices')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || ''
      setOutput(rawOutput)
      setDevices(parseDevicesFromOutput(rawOutput))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Register device
  // ---------------------------------------------------------------------------

  const handleRegister = useCallback(async () => {
    if (!newDeviceName.trim()) return

    setRegistering(true)
    setError(null)
    setLastCommand(`nself auth devices register --name=${newDeviceName} --type=${newDeviceType}`)

    try {
      const res = await fetch('/api/auth/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newDeviceName, type: newDeviceType }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to register device')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'Device registered successfully')
      setNewDeviceName('')
      // Refresh device list
      await fetchDevices()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRegistering(false)
    }
  }, [newDeviceName, newDeviceType, fetchDevices])

  // ---------------------------------------------------------------------------
  // Trust device
  // ---------------------------------------------------------------------------

  const handleTrust = useCallback(
    async (deviceId: string) => {
      setActionLoading(deviceId)
      setError(null)
      setLastCommand(`nself auth devices trust --device=${deviceId}`)

      try {
        const res = await fetch('/api/auth/devices/trust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        })
        const data = await res.json()

        if (!data.success) {
          setError(data.details || data.error || 'Failed to trust device')
          setOutput(data.details || data.error || '')
          return
        }

        setOutput(data.data?.output || 'Device trusted successfully')
        await fetchDevices()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setActionLoading(null)
      }
    },
    [fetchDevices]
  )

  // ---------------------------------------------------------------------------
  // Revoke device
  // ---------------------------------------------------------------------------

  const handleRevoke = useCallback(
    async (deviceId: string) => {
      setActionLoading(deviceId)
      setError(null)
      setLastCommand(`nself auth devices revoke --device=${deviceId}`)

      try {
        const res = await fetch('/api/auth/devices/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        })
        const data = await res.json()

        if (!data.success) {
          setError(data.details || data.error || 'Failed to revoke device')
          setOutput(data.details || data.error || '')
          return
        }

        setOutput(data.data?.output || 'Device revoked successfully')
        await fetchDevices()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setActionLoading(null)
      }
    },
    [fetchDevices]
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      title="Device Management"
      description="Register, trust, and revoke devices for authentication."
    >
      <div className="space-y-6">
        {/* Register New Device */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Register New Device
            </CardTitle>
            <CardDescription>Register a new device for authentication access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  placeholder="my-laptop"
                  value={newDeviceName}
                  onChange={(e) => setNewDeviceName(e.target.value)}
                  pattern="^[a-zA-Z0-9_-]+$"
                />
                <p className="text-xs text-zinc-500">
                  Letters, numbers, hyphens, and underscores only.
                </p>
              </div>
              <div className="w-full space-y-2 sm:w-48">
                <Label htmlFor="device-type">Type</Label>
                <Select value={newDeviceType} onValueChange={setNewDeviceType}>
                  <SelectTrigger id="device-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desktop">Desktop</SelectItem>
                    <SelectItem value="laptop">Laptop</SelectItem>
                    <SelectItem value="mobile">Mobile</SelectItem>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="server">Server</SelectItem>
                    <SelectItem value="ci">CI/CD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleRegister} disabled={registering || !newDeviceName.trim()}>
                {registering ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Register
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Device List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Registered Devices
                </CardTitle>
                <CardDescription>Manage trusted and registered devices.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchDevices} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}

            {devices.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Trust Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.type)}
                          {device.name}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{device.type}</TableCell>
                      <TableCell>{device.lastSeen || 'Never'}</TableCell>
                      <TableCell>
                        {device.trusted ? (
                          <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            Trusted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-zinc-500">
                            <XCircle className="h-4 w-4" />
                            Untrusted
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            device.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : device.status === 'revoked'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {device.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!device.trusted && device.status !== 'revoked' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTrust(device.id)}
                              disabled={actionLoading === device.id}
                            >
                              {actionLoading === device.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Shield className="mr-1 h-3 w-3" />
                              )}
                              Trust
                            </Button>
                          )}
                          {device.status !== 'revoked' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevoke(device.id)}
                              disabled={actionLoading === device.id}
                              className="text-red-600 hover:text-red-700 dark:text-red-400"
                            >
                              {actionLoading === device.id ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="mr-1 h-3 w-3" />
                              )}
                              Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                <ShieldOff className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm">No devices registered yet.</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Click Refresh to load devices, or register a new one above.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CLI Command Preview & Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              CLI Output
            </CardTitle>
            <CardDescription>
              Command preview and execution output from the nself CLI.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lastCommand && (
              <div className="mb-3 rounded-md bg-zinc-100 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                $ {lastCommand}
              </div>
            )}
            <ScrollArea className="h-48 w-full rounded-md border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-700">
              <pre className="font-mono text-sm text-green-400">
                {output || 'No output yet. Run a command to see results.'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}

export default function DevicesPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <DevicesContent />
    </Suspense>
  )
}
