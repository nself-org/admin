'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  Trash2,
} from 'lucide-react'
import { Suspense, useEffect, useState } from 'react'

interface SecuritySettings {
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
    expiryDays: number
    preventReuse: number
  }
  sessionSettings: {
    timeout: number
    maxConcurrent: number
    forceReauth: boolean
  }
  twoFactorAuth: {
    enabled: boolean
    enforceAll: boolean
    allowedMethods: string[]
  }
  ipWhitelist: {
    enabled: boolean
    addresses: string[]
  }
  auditLog: {
    retentionDays: number
    logFailedAttempts: boolean
    logSuccessfulLogins: boolean
  }
}

interface SecurityScan {
  id: string
  timestamp: string
  status: 'running' | 'completed' | 'failed'
  issues: SecurityIssue[]
}

interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  category: string
  description: string
  recommendation: string
}

function SecurityOverview({ settings }: { settings: SecuritySettings | null }) {
  const getPasswordStrength = () => {
    if (!settings) return { score: 0, label: 'Unknown', color: 'gray' }
    const policy = settings.passwordPolicy
    let score = 0
    if (policy.minLength >= 12) score++
    if (policy.requireUppercase) score++
    if (policy.requireLowercase) score++
    if (policy.requireNumbers) score++
    if (policy.requireSpecialChars) score++

    if (score >= 4) return { score, label: 'Strong', color: 'text-green-600' }
    if (score >= 3) return { score, label: 'Medium', color: 'text-yellow-600' }
    return { score, label: 'Weak', color: 'text-red-600' }
  }

  const strength = getPasswordStrength()

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Password Policy
            </p>
            <p className={`text-2xl font-bold ${strength.color}`}>
              {strength.label}
            </p>
          </div>
          <Lock className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              2FA Status
            </p>
            <p
              className={`text-2xl font-bold ${settings?.twoFactorAuth.enabled ? 'text-green-600' : 'text-red-600'}`}
            >
              {settings?.twoFactorAuth.enabled ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <Key className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Session Timeout
            </p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {settings?.sessionSettings.timeout || 0}m
            </p>
          </div>
          <Clock className="h-8 w-8 text-blue-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              IP Whitelist
            </p>
            <p className="text-2xl font-bold text-zinc-900 dark:text-white">
              {settings?.ipWhitelist.addresses.length || 0}
            </p>
          </div>
          <Shield className="h-8 w-8 text-blue-500" />
        </div>
      </div>
    </div>
  )
}

function PasswordPolicySettings({
  policy,
  onChange,
}: {
  policy: SecuritySettings['passwordPolicy']
  onChange: (policy: SecuritySettings['passwordPolicy']) => void
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
        Password Policy
      </h3>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Minimum Length
          </label>
          <input
            type="number"
            min="3"
            max="128"
            value={policy.minLength}
            onChange={(e) =>
              onChange({ ...policy, minLength: parseInt(e.target.value) })
            }
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={policy.requireUppercase}
              onChange={(e) =>
                onChange({ ...policy, requireUppercase: e.target.checked })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
            <span className="text-sm">Require uppercase letters</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={policy.requireLowercase}
              onChange={(e) =>
                onChange({ ...policy, requireLowercase: e.target.checked })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
            <span className="text-sm">Require lowercase letters</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={policy.requireNumbers}
              onChange={(e) =>
                onChange({ ...policy, requireNumbers: e.target.checked })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
            <span className="text-sm">Require numbers</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={policy.requireSpecialChars}
              onChange={(e) =>
                onChange({ ...policy, requireSpecialChars: e.target.checked })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
            <span className="text-sm">Require special characters</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Expiry (days)
            </label>
            <input
              type="number"
              min="0"
              max="365"
              value={policy.expiryDays}
              onChange={(e) =>
                onChange({ ...policy, expiryDays: parseInt(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500">0 = never expire</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Prevent Reuse
            </label>
            <input
              type="number"
              min="0"
              max="24"
              value={policy.preventReuse}
              onChange={(e) =>
                onChange({ ...policy, preventReuse: parseInt(e.target.value) })
              }
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <p className="mt-1 text-xs text-zinc-500">Last N passwords</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function IPWhitelistManager({
  whitelist,
  onChange,
}: {
  whitelist: { enabled: boolean; addresses: string[] }
  onChange: (whitelist: { enabled: boolean; addresses: string[] }) => void
}) {
  const [newIP, setNewIP] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const addIP = () => {
    if (newIP && !whitelist.addresses.includes(newIP)) {
      onChange({
        ...whitelist,
        addresses: [...whitelist.addresses, newIP],
      })
      setNewIP('')
      setShowAddForm(false)
    }
  }

  const removeIP = (ip: string) => {
    onChange({
      ...whitelist,
      addresses: whitelist.addresses.filter((a) => a !== ip),
    })
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          IP Whitelist
        </h3>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={whitelist.enabled}
            onChange={(e) =>
              onChange({ ...whitelist, enabled: e.target.checked })
            }
            className="h-4 w-4 rounded text-blue-600"
          />
          <span className="text-sm">Enabled</span>
        </label>
      </div>

      {whitelist.enabled && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {whitelist.addresses.length} addresses whitelisted
            </p>
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              className="text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add IP
            </Button>
          </div>

          {showAddForm && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                placeholder="192.168.1.1 or 10.0.0.0/24"
                className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
              <Button onClick={addIP} className="text-sm">
                Add
              </Button>
              <Button
                onClick={() => setShowAddForm(false)}
                variant="outline"
                className="text-sm"
              >
                Cancel
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {whitelist.addresses.map((ip) => (
              <div
                key={ip}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50"
              >
                <span className="font-mono text-sm">{ip}</span>
                <button
                  onClick={() => removeIP(ip)}
                  className="rounded p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SecurityScanPanel({
  onRunScan,
  scanning,
}: {
  onRunScan: () => void
  scanning: boolean
}) {
  const [lastScan, setLastScan] = useState<SecurityScan | null>(null)

  useEffect(() => {
    const mockScan: SecurityScan = {
      id: '1',
      timestamp: new Date().toISOString(),
      status: 'completed',
      issues: [
        {
          severity: 'medium',
          category: 'Authentication',
          description: 'Password expiry not configured',
          recommendation: 'Set password expiry to 90 days',
        },
        {
          severity: 'low',
          category: 'Session Management',
          description: 'Session timeout is set to 24 hours',
          recommendation: 'Consider reducing to 1-2 hours for better security',
        },
      ],
    }
    setLastScan(mockScan)
  }, [])

  const severityColors = {
    critical:
      'bg-sky-100 text-sky-800 dark:bg-sky-900/20 dark:text-sky-400',
    high: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    medium:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
          Security Scan
        </h3>
        <Button onClick={onRunScan} disabled={scanning}>
          {scanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Run Scan
            </>
          )}
        </Button>
      </div>

      {lastScan && (
        <div className="space-y-4">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Last scan: {new Date(lastScan.timestamp).toLocaleString()}
          </div>

          {lastScan.issues.length === 0 ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-900 dark:text-green-100">
                  No security issues found
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {lastScan.issues.map((issue, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-medium ${severityColors[issue.severity]}`}
                      >
                        {issue.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium">
                        {issue.category}
                      </span>
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-zinc-900 dark:text-white">
                    {issue.description}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    <strong>Recommendation:</strong> {issue.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" className="w-full text-sm">
            <Download className="mr-2 h-4 w-4" />
            Download Full Report
          </Button>
        </div>
      )}
    </div>
  )
}

function SystemSecurityContent() {
  const [settings, setSettings] = useState<SecuritySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    const mockSettings: SecuritySettings = {
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expiryDays: 0,
        preventReuse: 3,
      },
      sessionSettings: {
        timeout: 1440,
        maxConcurrent: 5,
        forceReauth: false,
      },
      twoFactorAuth: {
        enabled: false,
        enforceAll: false,
        allowedMethods: ['totp', 'sms'],
      },
      ipWhitelist: {
        enabled: false,
        addresses: [],
      },
      auditLog: {
        retentionDays: 30,
        logFailedAttempts: true,
        logSuccessfulLogins: true,
      },
    }

    setSettings(mockSettings)
    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
  }

  const handleRunScan = async () => {
    setScanning(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setScanning(false)
  }

  if (loading) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-zinc-600 dark:text-zinc-400">
              Loading security settings...
            </span>
          </div>
        </div>
      </>
    )
  }

  if (!settings) {
    return (
      <>
        <HeroPattern />
        <div className="mx-auto max-w-7xl">
          <div className="py-12 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h2 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-white">
              Unable to load security settings
            </h2>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
                <Shield className="h-8 w-8 text-blue-500" />
                Security Settings
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Manage authentication, authorization, and security policies
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowPasswords(!showPasswords)}
                variant="outline"
              >
                {showPasswords ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {showPasswords ? 'Hide' : 'Show'} Passwords
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>

          <SecurityOverview settings={settings} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PasswordPolicySettings
            policy={settings.passwordPolicy}
            onChange={(policy) =>
              setSettings({ ...settings, passwordPolicy: policy })
            }
          />

          <div className="space-y-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Session Settings
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10080"
                    value={settings.sessionSettings.timeout}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sessionSettings: {
                          ...settings.sessionSettings,
                          timeout: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Max Concurrent Sessions
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.sessionSettings.maxConcurrent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sessionSettings: {
                          ...settings.sessionSettings,
                          maxConcurrent: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.sessionSettings.forceReauth}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        sessionSettings: {
                          ...settings.sessionSettings,
                          forceReauth: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span className="text-sm">
                    Force re-authentication for sensitive actions
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Two-Factor Authentication
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.twoFactorAuth.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        twoFactorAuth: {
                          ...settings.twoFactorAuth,
                          enabled: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span className="text-sm font-medium">
                    Enable Two-Factor Authentication
                  </span>
                </label>

                {settings.twoFactorAuth.enabled && (
                  <div className="ml-6 space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.twoFactorAuth.enforceAll}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            twoFactorAuth: {
                              ...settings.twoFactorAuth,
                              enforceAll: e.target.checked,
                            },
                          })
                        }
                        className="h-4 w-4 rounded text-blue-600"
                      />
                      <span className="text-sm">Enforce for all users</span>
                    </label>

                    <div>
                      <p className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Allowed Methods
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.twoFactorAuth.allowedMethods.includes(
                              'totp',
                            )}
                            onChange={(e) => {
                              const methods = e.target.checked
                                ? [
                                    ...settings.twoFactorAuth.allowedMethods,
                                    'totp',
                                  ]
                                : settings.twoFactorAuth.allowedMethods.filter(
                                    (m) => m !== 'totp',
                                  )
                              setSettings({
                                ...settings,
                                twoFactorAuth: {
                                  ...settings.twoFactorAuth,
                                  allowedMethods: methods,
                                },
                              })
                            }}
                            className="h-4 w-4 rounded text-blue-600"
                          />
                          <span className="text-sm">
                            Authenticator App (TOTP)
                          </span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={settings.twoFactorAuth.allowedMethods.includes(
                              'sms',
                            )}
                            onChange={(e) => {
                              const methods = e.target.checked
                                ? [
                                    ...settings.twoFactorAuth.allowedMethods,
                                    'sms',
                                  ]
                                : settings.twoFactorAuth.allowedMethods.filter(
                                    (m) => m !== 'sms',
                                  )
                              setSettings({
                                ...settings,
                                twoFactorAuth: {
                                  ...settings.twoFactorAuth,
                                  allowedMethods: methods,
                                },
                              })
                            }}
                            className="h-4 w-4 rounded text-blue-600"
                          />
                          <span className="text-sm">SMS</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <IPWhitelistManager
            whitelist={settings.ipWhitelist}
            onChange={(whitelist) =>
              setSettings({ ...settings, ipWhitelist: whitelist })
            }
          />

          <SecurityScanPanel onRunScan={handleRunScan} scanning={scanning} />
        </div>
      </div>
    </>
  )
}

export default function SystemSecurityPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SystemSecurityContent />
    </Suspense>
  )
}
