'use client'

import { PageShell } from '@/components/PageShell'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
  Database,
  File,
  FolderOpen,
  HardDrive,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Terminal,
  TestTube,
  Upload,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StorageFile {
  name: string
  size: string
  modified: string
  type: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseFilesFromOutput(output: string): StorageFile[] {
  try {
    const parsed = JSON.parse(output)
    if (Array.isArray(parsed)) return parsed
    if (parsed.files && Array.isArray(parsed.files)) return parsed.files
    if (parsed.objects && Array.isArray(parsed.objects)) return parsed.objects
  } catch {
    // Not JSON, return empty
  }
  return []
}

function getFileIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'directory':
    case 'folder':
      return <FolderOpen className="h-4 w-4 text-yellow-500" />
    default:
      return <File className="h-4 w-4 text-zinc-400" />
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function StorageContent() {
  const [files, setFiles] = useState<StorageFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [output, setOutput] = useState('')
  const [lastCommand, setLastCommand] = useState('')

  // Status state
  const [statusLoading, setStatusLoading] = useState(false)
  const [storageStatus, setStorageStatus] = useState<string | null>(null)

  // Init form state
  const [initBucket, setInitBucket] = useState('')
  const [initProvider, setInitProvider] = useState('minio')
  const [initLoading, setInitLoading] = useState(false)

  // Upload form state
  const [uploadFile, setUploadFile] = useState('')
  const [uploadBucket, setUploadBucket] = useState('')
  const [uploadDestination, setUploadDestination] = useState('')
  const [uploadLoading, setUploadLoading] = useState(false)

  // Browse state
  const [browseBucket, setBrowseBucket] = useState('')
  const [browsePrefix, setBrowsePrefix] = useState('')

  // Test state
  const [testBucket, setTestBucket] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<'pass' | 'fail' | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch storage status
  // ---------------------------------------------------------------------------

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true)
    setError(null)
    setLastCommand('nself service storage status')

    try {
      const res = await fetch('/api/services/storage/status')
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to get storage status')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || ''
      setOutput(rawOutput)
      setStorageStatus(rawOutput)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setStatusLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Fetch storage config
  // ---------------------------------------------------------------------------

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLastCommand('nself service storage config')

    try {
      const res = await fetch('/api/services/storage/config')
      const data = await res.json()

      if (!data.success) {
        setError(
          data.details || data.error || 'Failed to get storage configuration',
        )
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Initialize storage
  // ---------------------------------------------------------------------------

  const handleInit = useCallback(async () => {
    setInitLoading(true)
    setError(null)
    const bucketArg = initBucket ? ` --bucket=${initBucket}` : ''
    setLastCommand(
      `nself service storage init --provider=${initProvider}${bucketArg}`,
    )

    try {
      const res = await fetch('/api/services/storage/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: initBucket || undefined,
          provider: initProvider,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to initialize storage')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'Storage initialized successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setInitLoading(false)
    }
  }, [initBucket, initProvider])

  // ---------------------------------------------------------------------------
  // Upload file
  // ---------------------------------------------------------------------------

  const handleUpload = useCallback(async () => {
    if (!uploadFile.trim() || !uploadBucket.trim()) return

    setUploadLoading(true)
    setError(null)
    const destArg = uploadDestination
      ? ` --destination=${uploadDestination}`
      : ''
    setLastCommand(
      `nself service storage upload --file=${uploadFile} --bucket=${uploadBucket}${destArg}`,
    )

    try {
      const res = await fetch('/api/services/storage/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath: uploadFile,
          bucket: uploadBucket,
          destination: uploadDestination || undefined,
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to upload file')
        setOutput(data.details || data.error || '')
        return
      }

      setOutput(data.data?.output || 'File uploaded successfully')
      setUploadFile('')
      setUploadDestination('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUploadLoading(false)
    }
  }, [uploadFile, uploadBucket, uploadDestination])

  // ---------------------------------------------------------------------------
  // List files
  // ---------------------------------------------------------------------------

  const handleListFiles = useCallback(async () => {
    setLoading(true)
    setError(null)
    const bucketArg = browseBucket ? ` --bucket=${browseBucket}` : ''
    const prefixArg = browsePrefix ? ` --prefix=${browsePrefix}` : ''
    setLastCommand(`nself service storage list${bucketArg}${prefixArg}`)

    try {
      const params = new URLSearchParams()
      if (browseBucket) params.set('bucket', browseBucket)
      if (browsePrefix) params.set('prefix', browsePrefix)

      const res = await fetch(`/api/services/storage/list?${params.toString()}`)
      const data = await res.json()

      if (!data.success) {
        setError(data.details || data.error || 'Failed to list storage objects')
        setOutput(data.details || data.error || '')
        return
      }

      const rawOutput = data.data?.output || ''
      setOutput(rawOutput)
      setFiles(parseFilesFromOutput(rawOutput))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [browseBucket, browsePrefix])

  // ---------------------------------------------------------------------------
  // Test storage
  // ---------------------------------------------------------------------------

  const handleTest = useCallback(async () => {
    setTestLoading(true)
    setTestResult(null)
    setError(null)
    const bucketArg = testBucket ? ` --bucket=${testBucket}` : ''
    setLastCommand(`nself service storage test${bucketArg}`)

    try {
      const res = await fetch('/api/services/storage/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bucket: testBucket || undefined }),
      })
      const data = await res.json()

      if (!data.success) {
        setTestResult('fail')
        setError(data.details || data.error || 'Storage test failed')
        setOutput(data.details || data.error || '')
        return
      }

      setTestResult('pass')
      setOutput(data.data?.output || 'Storage test passed')
    } catch (err) {
      setTestResult('fail')
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setTestLoading(false)
    }
  }, [testBucket])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <PageShell
      title="Storage Management"
      description="Manage object storage buckets, files, and configuration via MinIO."
    >
      <div className="space-y-6">
        {/* Storage Metrics Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                  <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Status
                  </p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {storageStatus ? 'Active' : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                  <Database className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Provider
                  </p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                    MinIO
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-sky-100 p-2 dark:bg-sky-900/30">
                  <FolderOpen className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Objects
                  </p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {files.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
                  <TestTube className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Connection
                  </p>
                  <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {testResult === 'pass' ? (
                      <span className="text-green-600 dark:text-green-400">
                        Healthy
                      </span>
                    ) : testResult === 'fail' ? (
                      <span className="text-red-600 dark:text-red-400">
                        Failed
                      </span>
                    ) : (
                      'Untested'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={statusLoading}
          >
            {statusLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Status
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchConfig}
            disabled={loading}
          >
            <Settings className="mr-2 h-4 w-4" />
            View Config
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={testLoading}
          >
            {testLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="mr-2 h-4 w-4" />
            )}
            Test Connection
          </Button>
        </div>

        {/* Initialize Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Initialize Storage
            </CardTitle>
            <CardDescription>
              Initialize a new storage bucket with the specified provider.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="init-bucket">Bucket Name (optional)</Label>
                <Input
                  id="init-bucket"
                  placeholder="my-bucket"
                  value={initBucket}
                  onChange={(e) => setInitBucket(e.target.value)}
                  pattern="^[a-zA-Z0-9._-]+$"
                />
              </div>
              <div className="w-full space-y-2 sm:w-48">
                <Label htmlFor="init-provider">Provider</Label>
                <Select value={initProvider} onValueChange={setInitProvider}>
                  <SelectTrigger id="init-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minio">MinIO</SelectItem>
                    <SelectItem value="s3">AWS S3</SelectItem>
                    <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                    <SelectItem value="azure">Azure Blob Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleInit} disabled={initLoading}>
                {initLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Initialize
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload File */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload File
            </CardTitle>
            <CardDescription>
              Upload a file to a storage bucket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-zinc-300 p-8 text-center dark:border-zinc-600">
                <Upload className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Enter the file path below to upload via the nself CLI.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="upload-file">File Path</Label>
                  <Input
                    id="upload-file"
                    placeholder="/path/to/file.txt"
                    value={uploadFile}
                    onChange={(e) => setUploadFile(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-bucket">Bucket</Label>
                  <Input
                    id="upload-bucket"
                    placeholder="my-bucket"
                    value={uploadBucket}
                    onChange={(e) => setUploadBucket(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-dest">
                    Destination Path (optional)
                  </Label>
                  <Input
                    id="upload-dest"
                    placeholder="uploads/file.txt"
                    value={uploadDestination}
                    onChange={(e) => setUploadDestination(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleUpload}
                disabled={
                  uploadLoading || !uploadFile.trim() || !uploadBucket.trim()
                }
              >
                {uploadLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Upload
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Browser */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5" />
                  File Browser
                </CardTitle>
                <CardDescription>
                  Browse and manage files in storage buckets.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleListFiles}
                disabled={loading}
              >
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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <div className="flex-1 space-y-2">
                <Label htmlFor="browse-bucket">Bucket</Label>
                <Input
                  id="browse-bucket"
                  placeholder="my-bucket"
                  value={browseBucket}
                  onChange={(e) => setBrowseBucket(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="browse-prefix">Prefix (optional)</Label>
                <Input
                  id="browse-prefix"
                  placeholder="uploads/"
                  value={browsePrefix}
                  onChange={(e) => setBrowsePrefix(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {error}
              </div>
            )}

            {files.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file, index) => (
                    <TableRow key={`${file.name}-${index}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.type)}
                          {file.name}
                        </div>
                      </TableCell>
                      <TableCell>{file.size}</TableCell>
                      <TableCell>{file.modified || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{file.type}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                <FolderOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm">No files found.</p>
                <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                  Select a bucket and click Refresh to browse files.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bucket Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Connection Test
            </CardTitle>
            <CardDescription>
              Test connectivity and permissions for a storage bucket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="test-bucket">Bucket (optional)</Label>
                <Input
                  id="test-bucket"
                  placeholder="my-bucket"
                  value={testBucket}
                  onChange={(e) => setTestBucket(e.target.value)}
                />
              </div>
              <Button onClick={handleTest} disabled={testLoading}>
                {testLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                Run Test
              </Button>
            </div>
            {testResult && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
                  testResult === 'pass'
                    ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200'
                    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200'
                }`}
              >
                {testResult === 'pass' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResult === 'pass'
                  ? 'Storage connection test passed.'
                  : 'Storage connection test failed.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CLI Output */}
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

export default function StoragePage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <StorageContent />
    </Suspense>
  )
}
