'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCopy,
  Download,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  XCircle,
} from 'lucide-react'
import { Suspense, useCallback, useState } from 'react'

type MfaStep = 'status' | 'enabling' | 'verify' | 'backup-codes' | 'disabling'

function MfaContent() {
  const [step, setStep] = useState<MfaStep>('status')
  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [method, setMethod] = useState<'totp' | 'sms'>('totp')
  const [verifyCode, setVerifyCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  const cliCommand = useCallback(() => {
    switch (step) {
      case 'enabling':
        return `nself auth mfa enable --method=${method}`
      case 'verify':
        return `nself auth mfa verify --code=${verifyCode || '<code>'}`
      case 'backup-codes':
        return 'nself auth mfa backup-codes'
      case 'disabling':
        return 'nself auth mfa disable'
      default:
        return 'nself auth mfa status'
    }
  }, [step, method, verifyCode])

  const handleEnable = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setOutput('')
    try {
      const response = await fetch('/api/auth/mfa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      })
      const json = await response.json()
      if (json.success) {
        setOutput(json.data.output || '')
        setSuccess('MFA setup initiated. Enter the verification code to confirm.')
        setStep('verify')
      } else {
        setError(json.details || json.error || 'Failed to enable MFA')
        setOutput(json.details || '')
      }
    } catch (_err) {
      setError('Failed to connect to MFA API')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verifyCode.trim()) {
      setError('Please enter a verification code')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verifyCode.trim() }),
      })
      const json = await response.json()
      if (json.success) {
        setOutput(json.data.output || '')
        setSuccess('MFA verified and enabled successfully.')
        setMfaEnabled(true)
        setStep('backup-codes')
        handleBackupCodes()
      } else {
        setError(json.details || json.error || 'Verification failed')
        setOutput(json.details || '')
      }
    } catch (_err) {
      setError('Failed to connect to MFA API')
    } finally {
      setLoading(false)
    }
  }

  const handleBackupCodes = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/mfa/backup-codes')
      const json = await response.json()
      if (json.success) {
        const raw = json.data.output || ''
        setOutput(raw)
        const codes = raw
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => /^[A-Za-z0-9-]+$/.test(line) && line.length >= 6)
        setBackupCodes(codes)
      } else {
        setError(json.details || json.error || 'Failed to retrieve backup codes')
      }
    } catch (_err) {
      setError('Failed to connect to MFA API')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setOutput('')
    try {
      const response = await fetch('/api/auth/mfa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await response.json()
      if (json.success) {
        setOutput(json.data.output || '')
        setSuccess('MFA has been disabled.')
        setMfaEnabled(false)
        setStep('status')
        setConfirmDisable(false)
        setBackupCodes([])
      } else {
        setError(json.details || json.error || 'Failed to disable MFA')
        setOutput(json.details || '')
      }
    } catch (_err) {
      setError('Failed to connect to MFA API')
    } finally {
      setLoading(false)
    }
  }

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mfa-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <h1 className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-blue-400 dark:to-white">
            Multi-Factor Authentication
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Configure MFA to add an extra layer of security to your account
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Status Card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${
                      mfaEnabled
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-zinc-100 dark:bg-zinc-700'
                    }`}
                  >
                    {mfaEnabled ? (
                      <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <ShieldOff className="h-5 w-5 text-zinc-500 dark:text-zinc-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                      MFA Status
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      {mfaEnabled ? 'MFA is currently enabled' : 'MFA is currently disabled'}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                    mfaEnabled
                      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  {mfaEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            {/* Enable MFA Section */}
            {!mfaEnabled && step === 'status' && (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
                  Enable MFA
                </h3>
                <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                  Choose your preferred MFA method and enable two-factor authentication.
                </p>

                <div className="mb-6 grid gap-4 sm:grid-cols-2">
                  <button
                    onClick={() => setMethod('totp')}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      method === 'totp'
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    <Smartphone
                      className={`mt-0.5 h-5 w-5 ${
                        method === 'totp' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        Authenticator App (TOTP)
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Use an app like Google Authenticator or Authy
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => setMethod('sms')}
                    className={`flex items-start gap-3 rounded-lg border p-4 text-left transition-colors ${
                      method === 'sms'
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                        : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    <Lock
                      className={`mt-0.5 h-5 w-5 ${
                        method === 'sms' ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">
                        SMS Verification
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Receive verification codes via text message
                      </p>
                    </div>
                  </button>
                </div>

                <Button onClick={handleEnable} variant="primary" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  {loading ? 'Enabling...' : 'Enable MFA'}
                </Button>
              </div>
            )}

            {/* Verification Step */}
            {step === 'verify' && (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-4 text-base font-semibold text-zinc-900 dark:text-white">
                  Verify Setup
                </h3>
                <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
                  {method === 'totp'
                    ? 'Scan the QR code with your authenticator app and enter the verification code below.'
                    : 'Enter the verification code sent to your phone.'}
                </p>

                {/* QR code area for TOTP */}
                {method === 'totp' && output && (
                  <div className="mb-6 flex justify-center rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="text-center">
                      <KeyRound className="mx-auto mb-2 h-12 w-12 text-zinc-400" />
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        QR code / setup key provided in CLI output below
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={10}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 font-mono text-lg tracking-widest text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-600 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500"
                  />
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleVerify} variant="primary" disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Verifying...' : 'Verify Code'}
                  </Button>
                  <Button
                    onClick={() => {
                      setStep('status')
                      setOutput('')
                      setError(null)
                      setSuccess(null)
                    }}
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Backup Codes Section */}
            {step === 'backup-codes' && backupCodes.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="mb-4 flex items-center gap-3">
                  <KeyRound className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
                    Backup Codes
                  </h3>
                </div>
                <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                      Save these backup codes in a secure location. Each code can only be used once.
                      You will not be able to see them again.
                    </p>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 p-4 font-mono text-sm dark:bg-zinc-900">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="rounded border border-zinc-200 px-3 py-1.5 text-center text-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                    >
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button onClick={copyBackupCodes} variant="secondary">
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy All'}
                  </Button>
                  <Button onClick={downloadBackupCodes} variant="secondary">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    onClick={() => {
                      setStep('status')
                      setOutput('')
                      setSuccess(null)
                    }}
                    variant="primary"
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}

            {/* Disable MFA Section */}
            {mfaEnabled && step === 'status' && (
              <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-800/50 dark:bg-zinc-800">
                <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">
                  Disable MFA
                </h3>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Removing MFA will reduce the security of your account. This action requires
                  confirmation.
                </p>

                {!confirmDisable ? (
                  <Button onClick={() => setConfirmDisable(true)} variant="outline">
                    <ShieldOff className="mr-2 h-4 w-4" />
                    Disable MFA
                  </Button>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <p className="mb-3 text-sm font-medium text-red-800 dark:text-red-300">
                      Are you sure you want to disable MFA?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDisable}
                        disabled={loading}
                        className="inline-flex items-center rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="mr-2 h-4 w-4" />
                        )}
                        {loading ? 'Disabling...' : 'Confirm Disable'}
                      </button>
                      <Button onClick={() => setConfirmDisable(false)} variant="secondary">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* View Backup Codes (when MFA enabled) */}
            {mfaEnabled && step === 'status' && (
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-2 text-base font-semibold text-zinc-900 dark:text-white">
                  Backup Codes
                </h3>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  View or regenerate your backup recovery codes.
                </p>
                <Button
                  onClick={() => {
                    setStep('backup-codes')
                    handleBackupCodes()
                  }}
                  variant="secondary"
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  View Backup Codes
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CLI Command Preview */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                CLI Command
              </h3>
              <div className="rounded-lg bg-zinc-900 p-4">
                <code className="font-mono text-xs text-green-400">$ {cliCommand()}</code>
              </div>
            </div>

            {/* Feedback Messages */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              </div>
            )}
            {success && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
                </div>
              </div>
            )}

            {/* CLI Output */}
            {output && (
              <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    CLI Output
                  </h3>
                </div>
                <div className="max-h-64 overflow-y-auto p-4">
                  <pre className="font-mono text-xs whitespace-pre-wrap text-zinc-600 dark:text-zinc-300">
                    {output}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function MfaPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <MfaContent />
    </Suspense>
  )
}
