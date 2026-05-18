'use client'

import { FormSkeleton } from '@/components/skeletons'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Terminal,
  XCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useState } from 'react'

type ResetStatus = 'idle' | 'confirming' | 'resetting' | 'success' | 'error'

function DatabaseResetContent() {
  const router = useRouter()
  const [status, setStatus] = useState<ResetStatus>('idle')
  const [confirmInput, setConfirmInput] = useState('')
  const [output, setOutput] = useState('')
  const [errorDetail, setErrorDetail] = useState('')

  const CONFIRM_PHRASE = 'reset database'
  const confirmValid = confirmInput === CONFIRM_PHRASE

  const handleReset = useCallback(async () => {
    if (!confirmValid) return
    setStatus('resetting')
    setOutput('')
    setErrorDetail('')

    try {
      const response = await fetch('/api/database/cli', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      const data = await response.json()

      if (!response.ok || !data.success) {
        setErrorDetail(data.details || data.error || `Error ${response.status}`)
        setStatus('error')
        return
      }

      setOutput(data.data?.output || 'Database reset completed.')
      setStatus('success')
    } catch (err) {
      setErrorDetail(
        err instanceof Error ? err.message : 'Could not reach the admin API',
      )
      setStatus('error')
    }
  }, [confirmValid, router])

  const handleRetry = useCallback(() => {
    setStatus('idle')
    setConfirmInput('')
    setOutput('')
    setErrorDetail('')
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Reset Database
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Runs{' '}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
            nself db reset
          </code>{' '}
          to drop and recreate the database schema. All data will be lost.
        </p>
      </div>

      {/* Danger Warning */}
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Destructive operation</AlertTitle>
        <AlertDescription>
          This will permanently erase all data in the database and restore the
          schema to its initial state. This cannot be undone. Create a backup
          first if you need to preserve your data.
        </AlertDescription>
      </Alert>

      {/* Success state */}
      {status === 'success' && (
        <Alert className="border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/10">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle className="text-emerald-700 dark:text-emerald-400">
            Reset complete
          </AlertTitle>
          <AlertDescription className="text-emerald-600 dark:text-emerald-300">
            The database has been reset to its initial state.
          </AlertDescription>
        </Alert>
      )}

      {/* Error state */}
      {status === 'error' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Reset failed</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{errorDetail}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mt-2 border-red-300 text-red-700 hover:bg-red-50"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Confirmation form */}
      {(status === 'idle' || status === 'confirming') && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Reset</CardTitle>
            <CardDescription>
              Type{' '}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
                {CONFIRM_PHRASE}
              </code>{' '}
              to enable the reset button.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="confirm"
                className="text-red-600 dark:text-red-400"
              >
                Confirmation phrase
              </Label>
              <Input
                id="confirm"
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value)
                  if (status === 'idle') setStatus('confirming')
                }}
                placeholder={CONFIRM_PHRASE}
                className={
                  confirmValid
                    ? 'border-emerald-500 focus-visible:ring-emerald-500'
                    : 'border-red-300 focus-visible:ring-red-400'
                }
              />
              {confirmValid && (
                <p className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Phrase accepted
                </p>
              )}
            </div>

            {/* Command preview */}
            <div className="rounded-lg bg-zinc-900 p-4 font-mono text-sm text-green-400">
              <div className="flex items-center gap-2 text-zinc-500">
                <Terminal className="h-4 w-4" />
                <span>Command:</span>
              </div>
              <div className="mt-2">$ nself db reset</div>
            </div>

            <Button
              onClick={handleReset}
              disabled={!confirmValid}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Database
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resetting state */}
      {status === 'resetting' && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-red-500" />
            <p className="text-sm text-zinc-500">
              Resetting database — this may take a moment...
            </p>
          </CardContent>
        </Card>
      )}

      {/* CLI output */}
      {output && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Terminal className="h-4 w-4" />
              CLI Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48 rounded-lg bg-zinc-950 p-4">
              <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-300">
                {output}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function DatabaseResetPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DatabaseResetContent />
    </Suspense>
  )
}
