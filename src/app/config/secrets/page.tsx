'use client'

import { FormSkeleton } from '@/components/skeletons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from '@/lib/toast'
import {
  AlertCircle,
  Copy,
  Download,
  Edit2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  WifiOff,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

// SECURITY: secrets list returns masked values only — actual values only retrieved on explicit user reveal
interface Secret {
  key: string
  value: string // always '••••••••' from list endpoint
  masked: boolean
  createdAt?: string
  lastUsed?: string
}

type PageState = 'loading' | 'empty' | 'error' | 'partial' | 'success' | 'offline' | 'unauth'

export default function SecretsPage() {
  const [pageState, setPageState] = useState<PageState>('loading')
  const [offlineMessage, setOfflineMessage] = useState('')
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEnv, setSelectedEnv] = useState('')

  // Add secret dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [adding, setAdding] = useState(false)

  // Edit secret dialog
  const [editDialogKey, setEditDialogKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Revealed secrets — only populated by explicit user reveal action
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [revealedValues, setRevealedValues] = useState<Record<string, string>>({})
  const [revealingKey, setRevealingKey] = useState<string | null>(null)

  // Delete confirmation
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [deleteDialogKey, setDeleteDialogKey] = useState<string | null>(null)

  // Bulk operations
  const [rotatingAll, setRotatingAll] = useState(false)
  const [rotatingKey, setRotatingKey] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchSecrets = useCallback(async () => {
    setPageState('loading')
    setIsRefreshing(true)

    try {
      const params = new URLSearchParams()
      if (selectedEnv) params.set('env', selectedEnv)

      const res = await fetch(`/api/config/secrets?${params.toString()}`)

      if (res.status === 401) {
        setPageState('unauth')
        setIsRefreshing(false)
        return
      }

      const data = await res.json()

      if (data.success) {
        const list = data.data.secrets || []
        setSecrets(list)
        setPageState(list.length === 0 ? 'empty' : 'success')
      } else {
        setSecrets([])
        setPageState('error')
      }
    } catch (_err) {
      setOfflineMessage('Cannot reach admin API. Check your network connection.')
      setPageState('offline')
    } finally {
      setIsRefreshing(false)
    }
  }, [selectedEnv])

  useEffect(() => {
    fetchSecrets()
  }, [fetchSecrets])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKey || !newValue) return

    try {
      setAdding(true)
      const res = await fetch('/api/config/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey, value: newValue, env: selectedEnv || undefined }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Secret added successfully', { description: `Secret '${newKey}' has been added` })
        setNewKey('')
        setNewValue('')
        setShowAddDialog(false)
        await fetchSecrets()
      } else {
        toast.error('Failed to add secret', { description: data.details || data.error })
      }
    } catch (_err) {
      toast.error('Failed to add secret')
    } finally {
      setAdding(false)
    }
  }

  const handleEdit = async () => {
    if (!editDialogKey || !editValue) return

    try {
      setSaving(true)
      const res = await fetch('/api/config/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editDialogKey, value: editValue, env: selectedEnv || undefined }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Secret updated successfully', { description: `Secret '${editDialogKey}' has been updated` })
        setEditDialogKey(null)
        setEditValue('')
        // Clear reveal state for the updated key — user must re-reveal explicitly
        setRevealedKeys((prev) => { const next = new Set(prev); next.delete(editDialogKey!); return next })
        setRevealedValues((prev) => { const next = { ...prev }; delete next[editDialogKey!]; return next })
        await fetchSecrets()
      } else {
        toast.error('Failed to update secret', { description: data.details || data.error })
      }
    } catch (_err) {
      toast.error('Failed to update secret')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (key: string) => {
    try {
      setDeletingKey(key)
      const res = await fetch(`/api/config/secrets/${encodeURIComponent(key)}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        toast.success('Secret deleted successfully', { description: `Secret '${key}' has been deleted` })
        setDeleteDialogKey(null)
        await fetchSecrets()
      } else {
        toast.error('Failed to delete secret', { description: data.details || data.error })
      }
    } catch (_err) {
      toast.error('Failed to delete secret')
    } finally {
      setDeletingKey(null)
    }
  }

  // SECURITY: explicit user-initiated reveal only — calls GET /api/config/secrets/:key
  // The API must return the actual value only after auth; this UI gates it behind a deliberate button press
  const handleReveal = async (key: string) => {
    if (revealedKeys.has(key)) {
      setRevealedKeys((prev) => { const next = new Set(prev); next.delete(key); return next })
      return
    }

    try {
      setRevealingKey(key)
      const res = await fetch(`/api/config/secrets/${encodeURIComponent(key)}`)
      const data = await res.json()

      if (data.success) {
        setRevealedKeys((prev) => new Set(prev).add(key))
        setRevealedValues((prev) => ({ ...prev, [key]: data.data.value }))
      } else {
        toast.error('Failed to reveal secret', { description: data.error })
      }
    } catch (_err) {
      toast.error('Failed to reveal secret')
    } finally {
      setRevealingKey(null)
    }
  }

  const handleRotate = async (key?: string) => {
    try {
      if (key) setRotatingKey(key); else setRotatingAll(true)

      const res = await fetch('/api/config/secrets/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key || undefined, env: selectedEnv || undefined }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('Secret rotated successfully', {
          description: key ? `Secret '${key}' has been rotated` : 'All secrets have been rotated',
        })
        // Clear all reveal state after rotation — values are no longer valid
        setRevealedKeys(new Set())
        setRevealedValues({})
        await fetchSecrets()
      } else {
        toast.error('Failed to rotate secrets', { description: data.details || data.error })
      }
    } catch (_err) {
      toast.error('Failed to rotate secrets')
    } finally {
      setRotatingKey(null)
      setRotatingAll(false)
    }
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Copied to clipboard')
    } catch (_err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleExportKeys = () => {
    // SECURITY: exports KEY NAMES only — never exports values
    const keys = secrets.map((s) => s.key).join('\n')
    const blob = new Blob([keys], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `secrets-keys${selectedEnv ? `-${selectedEnv}` : ''}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Keys list exported')
  }

  const generateRandomSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const filteredSecrets = secrets.filter((s) =>
    s.key.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // --- full-page state renders ---

  if (pageState === 'unauth') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-lg font-medium">Not authenticated</p>
        <p className="text-sm text-muted-foreground">Please log in to manage secrets.</p>
        <Button variant="outline" onClick={() => { window.location.href = '/login' }}>Go to Login</Button>
      </div>
    )
  }

  if (pageState === 'offline') {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <WifiOff className="h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Cannot connect to admin API</p>
        <p className="text-sm text-muted-foreground">{offlineMessage}</p>
        <Button variant="outline" onClick={fetchSecrets}>Retry</Button>
      </div>
    )
  }

  if (pageState === 'loading') {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="h-6 w-6" />
            Secrets Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage application secrets securely.</p>
        </div>
        <FormSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6" />
          Secrets Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage application secrets securely. Values are masked by default — use the reveal button to view them explicitly.
        </p>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search secrets..."
                className="pl-9"
              />
            </div>

            <Select value={selectedEnv} onValueChange={setSelectedEnv}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Environments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Environments</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="dev">Development</SelectItem>
                <SelectItem value="stage">Staging</SelectItem>
                <SelectItem value="prod">Production</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Secret
            </Button>

            <Button variant="outline" onClick={fetchSecrets} disabled={isRefreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Secrets Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="text-primary h-5 w-5" />
              <CardTitle>
                Secrets{' '}
                <span className="text-muted-foreground ml-2 text-sm font-normal">
                  ({filteredSecrets.length})
                </span>
              </CardTitle>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportKeys}
                disabled={secrets.length === 0}
                title="Export key names only — values are never exported"
              >
                <Download className="mr-2 h-3 w-3" />
                Export Keys
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleRotate()}
                disabled={rotatingAll || secrets.length === 0}
              >
                {rotatingAll ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-3 w-3" />
                )}
                Rotate All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pageState === 'error' ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Failed to load secrets. <Button variant="link" className="p-0 h-auto" onClick={fetchSecrets}>Try again</Button></AlertDescription>
            </Alert>
          ) : filteredSecrets.length === 0 ? (
            <div className="py-12 text-center">
              <Key className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'No secrets match your search' : 'No secrets found. Add your first secret.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead className="w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSecrets.map((secret) => (
                  <TableRow key={secret.key}>
                    <TableCell className="font-mono font-medium">{secret.key}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-sm">
                      {/* SECURITY: masked by default; only revealed after explicit button press */}
                      {revealedKeys.has(secret.key)
                        ? revealedValues[secret.key] || '••••••••'
                        : '••••••••••••'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReveal(secret.key)}
                          disabled={revealingKey === secret.key}
                          title={revealedKeys.has(secret.key) ? 'Hide' : 'Reveal'}
                        >
                          {revealingKey === secret.key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : revealedKeys.has(secret.key) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>

                        {revealedKeys.has(secret.key) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(revealedValues[secret.key] || '')}
                            title="Copy value"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditDialogKey(secret.key)
                            // SECURITY: pre-fill only if already revealed — never expose masked placeholder as editable value
                            setEditValue(revealedKeys.has(secret.key) ? revealedValues[secret.key] || '' : '')
                          }}
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRotate(secret.key)}
                          disabled={rotatingKey === secret.key}
                          title="Rotate"
                        >
                          {rotatingKey === secret.key ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialogKey(secret.key)}
                          title="Delete"
                        >
                          <Trash2 className="text-destructive h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* CLI Reference */}
      <Card>
        <CardHeader>
          <CardTitle>CLI Commands</CardTitle>
          <CardDescription>Manage secrets via the nself CLI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 font-mono text-sm">
            <div className="flex items-start gap-3">
              <code className="bg-muted inline-block min-w-[300px] rounded px-2 py-1 text-xs">nself config secrets list</code>
              <span className="text-muted-foreground">List all secret keys</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-muted inline-block min-w-[300px] rounded px-2 py-1 text-xs">nself config secrets get &lt;key&gt;</code>
              <span className="text-muted-foreground">Get a specific secret value</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-muted inline-block min-w-[300px] rounded px-2 py-1 text-xs">nself config secrets set &lt;key&gt; &lt;value&gt;</code>
              <span className="text-muted-foreground">Set or update a secret</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-muted inline-block min-w-[300px] rounded px-2 py-1 text-xs">nself config secrets delete &lt;key&gt;</code>
              <span className="text-muted-foreground">Remove a secret</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="bg-muted inline-block min-w-[300px] rounded px-2 py-1 text-xs">nself config secrets rotate [key]</code>
              <span className="text-muted-foreground">Rotate one or all secrets</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Secret Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Secret</DialogTitle>
            <DialogDescription>Create a new secret with a key and value</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-key">Key</Label>
                <Input
                  id="new-key"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/\s/g, '_'))}
                  placeholder="DATABASE_PASSWORD"
                  className="font-mono"
                />
                <p className="text-muted-foreground text-xs">Letters, numbers, underscores, and hyphens only</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-value">Value</Label>
                <div className="flex gap-2">
                  <Input
                    id="new-value"
                    type="password"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Enter secret value"
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewValue(generateRandomSecret())}
                    title="Generate random secret"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowAddDialog(false); setNewKey(''); setNewValue('') }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={adding || !newKey || !newValue}>
                {adding ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                ) : (
                  <><Plus className="mr-2 h-4 w-4" />Add Secret</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Secret Dialog */}
      <Dialog
        open={editDialogKey !== null}
        onOpenChange={(open) => { if (!open) { setEditDialogKey(null); setEditValue('') } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Secret</DialogTitle>
            <DialogDescription>
              Update the value for <code className="font-mono">{editDialogKey}</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-value">New Value</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-value"
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter new secret value"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setEditValue(generateRandomSecret())}
                  title="Generate random secret"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogKey(null); setEditValue('') }}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={saving || !editValue}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <>Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogKey !== null}
        onOpenChange={(open) => { if (!open) setDeleteDialogKey(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Secret</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the secret{' '}
              <code className="font-mono">{deleteDialogKey}</code>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogKey && handleDelete(deleteDialogKey)}
              disabled={deletingKey !== null}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingKey === deleteDialogKey ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
