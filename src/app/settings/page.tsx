'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import { createScopedTranslator } from '@/features/i18n'
import {
  Bell,
  CheckCircle,
  Copy,
  Database,
  Download,
  Globe,
  Key,
  Loader2,
  Mail,
  MessageSquare,
  Monitor,
  Plus,
  Save,
  Settings,
  Shield,
  Smartphone,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react'
import { Suspense, useState } from 'react'

interface APIToken {
  id: string
  name: string
  token: string
  permissions: string[]
  createdAt: string
  lastUsed?: string
  status: 'active' | 'revoked'
}

interface NotificationSettings {
  email: {
    enabled: boolean
    frequency: 'realtime' | 'hourly' | 'daily'
    events: string[]
  }
  push: {
    enabled: boolean
    events: string[]
  }
  inApp: {
    enabled: boolean
    events: string[]
  }
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: string
  autoRefresh: boolean
  refreshInterval: number
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeout: number
  allowedIPs: string[]
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireNumbers: boolean
    requireSymbols: boolean
  }
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: any
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-blue-500" />
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function UserPreferencesSection() {
  const t = createScopedTranslator('en', 'settings')
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
    autoRefresh: true,
    refreshInterval: 30,
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const _response = await fetch('/api/settings/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      })
      // Handle response
    } catch (_error) {
      // Intentionally empty - save errors handled silently
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsSection
      title={t('userSettingsTitle')}
      description={t('userSettingsDesc')}
      icon={User}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="pref-theme"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {t('theme')}
            </label>
            <select
              id="pref-theme"
              value={preferences.theme}
              onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as any })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="light">{t('themeLight')}</option>
              <option value="dark">{t('themeDark')}</option>
              <option value="system">{t('themeSystem')}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="pref-language"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {t('language')}
            </label>
            <select
              id="pref-language"
              value={preferences.language}
              onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="en">{t('langEnglish')}</option>
              <option value="es">{t('langSpanish')}</option>
              <option value="fr">{t('langFrench')}</option>
              <option value="de">{t('langGerman')}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="pref-timezone"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {t('timezone')}
            </label>
            <select
              id="pref-timezone"
              value={preferences.timezone}
              onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="UTC">{t('tzUTC')}</option>
              <option value="America/New_York">{t('tzEastern')}</option>
              <option value="America/Los_Angeles">{t('tzPacific')}</option>
              <option value="Europe/London">{t('tzLondon')}</option>
              <option value="Asia/Tokyo">{t('tzTokyo')}</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="pref-date-format"
              className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {t('dateFormat')}
            </label>
            <select
              id="pref-date-format"
              value={preferences.dateFormat}
              onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('autoRefresh')}
              </label>
              <p className="text-xs text-zinc-500">{t('autoRefreshDesc')}</p>
            </div>
            <input
              type="checkbox"
              checked={preferences.autoRefresh}
              onChange={(e) =>
                setPreferences({
                  ...preferences,
                  autoRefresh: e.target.checked,
                })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
          </div>

          {preferences.autoRefresh && (
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {t('refreshInterval')}
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={preferences.refreshInterval}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    refreshInterval: parseInt(e.target.value),
                  })
                }
                className="w-32 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('savePreferences')}
        </Button>
      </div>
    </SettingsSection>
  )
}

function NotificationSettingsSection() {
  const t = createScopedTranslator('en', 'settings')
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: {
      enabled: true,
      frequency: 'realtime',
      events: ['system_alerts', 'service_down', 'deployment_complete'],
    },
    push: {
      enabled: false,
      events: ['critical_alerts'],
    },
    inApp: {
      enabled: true,
      events: ['all'],
    },
  })

  const eventTypes = [
    {
      id: 'system_alerts',
      label: 'System Alerts',
      description: 'Critical system issues',
    },
    {
      id: 'service_down',
      label: 'Service Down',
      description: 'When services become unavailable',
    },
    {
      id: 'deployment_complete',
      label: 'Deployment Complete',
      description: 'Successful deployments',
    },
    {
      id: 'high_resource_usage',
      label: 'High Resource Usage',
      description: 'CPU/Memory warnings',
    },
    {
      id: 'security_events',
      label: 'Security Events',
      description: 'Login attempts, permission changes',
    },
    {
      id: 'backup_status',
      label: 'Backup Status',
      description: 'Backup success/failure notifications',
    },
  ]

  return (
    <SettingsSection
      title={t('notificationsTitle')}
      description={t('notificationsDesc')}
      icon={Bell}
    >
      <div className="space-y-8">
        {/* Email Notifications */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-zinc-500" />
              <h4 className="font-medium">{t('emailNotifications')}</h4>
            </div>
            <input
              type="checkbox"
              checked={notifications.email.enabled}
              onChange={(e) =>
                setNotifications({
                  ...notifications,
                  email: { ...notifications.email, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
          </div>

          {notifications.email.enabled && (
            <div className="ml-6 space-y-4">
              <div>
                <label
                  htmlFor="notif-email-frequency"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  {t('emailFrequency')}
                </label>
                <select
                  id="notif-email-frequency"
                  value={notifications.email.frequency}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      email: {
                        ...notifications.email,
                        frequency: e.target.value as any,
                      },
                    })
                  }
                  className="w-40 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="realtime">{t('emailFreqRealtime')}</option>
                  <option value="hourly">{t('emailFreqHourly')}</option>
                  <option value="daily">{t('emailFreqDaily')}</option>
                </select>
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('emailEventTypes')}
                </label>
                <div className="space-y-2">
                  {eventTypes.map((event) => (
                    <label key={event.id} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={notifications.email.events.includes(event.id)}
                        onChange={(e) => {
                          const events = e.target.checked
                            ? [...notifications.email.events, event.id]
                            : notifications.email.events.filter((id) => id !== event.id)
                          setNotifications({
                            ...notifications,
                            email: { ...notifications.email, events },
                          })
                        }}
                        className="mt-1 h-4 w-4 rounded text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium">{event.label}</div>
                        <div className="text-xs text-zinc-500">{event.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Push Notifications */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-zinc-500" />
              <h4 className="font-medium">{t('pushNotifications')}</h4>
            </div>
            <input
              type="checkbox"
              checked={notifications.push.enabled}
              onChange={(e) =>
                setNotifications({
                  ...notifications,
                  push: { ...notifications.push, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
          </div>

          {notifications.push.enabled && (
            <div className="ml-6">
              <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                {t('pushSelectEvents')}
              </p>
              <div className="space-y-2">
                {eventTypes.slice(0, 3).map((event) => (
                  <label key={event.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={notifications.push.events.includes(event.id)}
                      onChange={(e) => {
                        const events = e.target.checked
                          ? [...notifications.push.events, event.id]
                          : notifications.push.events.filter((id) => id !== event.id)
                        setNotifications({
                          ...notifications,
                          push: { ...notifications.push, events },
                        })
                      }}
                      className="h-4 w-4 rounded text-blue-600"
                    />
                    <span className="text-sm">{event.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* In-App Notifications */}
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-zinc-500" />
              <h4 className="font-medium">{t('inAppNotifications')}</h4>
            </div>
            <input
              type="checkbox"
              checked={notifications.inApp.enabled}
              onChange={(e) =>
                setNotifications({
                  ...notifications,
                  inApp: { ...notifications.inApp, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
          </div>
        </div>

        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {t('saveNotifications')}
        </Button>
      </div>
    </SettingsSection>
  )
}

function APITokensSection() {
  const t = createScopedTranslator('en', 'settings')
  const [tokens, setTokens] = useState<APIToken[]>([
    {
      id: '1',
      name: 'Development Token',
      token: 'nsf_dev_1234567890abcdef',
      permissions: ['read', 'write'],
      createdAt: '2024-01-15T10:00:00Z',
      lastUsed: '2024-01-20T14:30:00Z',
      status: 'active',
    },
    {
      id: '2',
      name: 'CI/CD Pipeline',
      token: 'nsf_ci_abcdef1234567890',
      permissions: ['read', 'deploy'],
      createdAt: '2024-01-10T09:00:00Z',
      status: 'active',
    },
  ])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newToken, setNewToken] = useState({
    name: '',
    permissions: [] as string[],
  })

  const permissionOptions = [
    { id: 'read', label: 'Read', description: 'View resources and data' },
    { id: 'write', label: 'Write', description: 'Create and update resources' },
    { id: 'delete', label: 'Delete', description: 'Remove resources' },
    { id: 'deploy', label: 'Deploy', description: 'Trigger deployments' },
    { id: 'admin', label: 'Admin', description: 'Full administrative access' },
  ]

  const createToken = async () => {
    try {
      const response = await fetch('/api/settings/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newToken),
      })
      const data = await response.json()
      if (data.success) {
        setTokens([...tokens, data.token])
        setNewToken({ name: '', permissions: [] })
        setShowCreateForm(false)
      }
    } catch (error) {
      console.error('[Settings] Error creating token:', error)
    }
  }

  const revokeToken = async (tokenId: string) => {
    try {
      await fetch(`/api/settings/tokens/${tokenId}`, { method: 'DELETE' })
      setTokens(tokens.map((t) => (t.id === tokenId ? { ...t, status: 'revoked' as const } : t)))
    } catch (error) {
      console.error('[Settings] Error revoking token:', error)
    }
  }

  return (
    <SettingsSection
      title={t('apiKeysTitle')}
      description={t('apiKeysDesc')}
      icon={Key}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t('apiKeysIntro')}
          </p>
          <Button onClick={() => setShowCreateForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Token
          </Button>
        </div>

        {showCreateForm && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
            <h4 className="mb-4 font-medium">{t('createToken')}</h4>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('tokenName')}
                </label>
                <input
                  type="text"
                  value={newToken.name}
                  onChange={(e) => setNewToken({ ...newToken, name: e.target.value })}
                  placeholder="e.g., Mobile App, CI/CD Pipeline"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {t('tokenPermissions')}
                </label>
                <div className="space-y-2">
                  {permissionOptions.map((permission) => (
                    <label key={permission.id} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={newToken.permissions.includes(permission.id)}
                        onChange={(e) => {
                          const permissions = e.target.checked
                            ? [...newToken.permissions, permission.id]
                            : newToken.permissions.filter((p) => p !== permission.id)
                          setNewToken({ ...newToken, permissions })
                        }}
                        className="mt-1 h-4 w-4 rounded text-blue-600"
                      />
                      <div>
                        <div className="text-sm font-medium">{permission.label}</div>
                        <div className="text-xs text-zinc-500">{permission.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={createToken}
                  disabled={!newToken.name || newToken.permissions.length === 0}
                >
                  {t('createTokenBtn')}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                  {t('cancelCreate')}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50"
            >
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <h4 className="font-medium">{token.name}</h4>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      token.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}
                  >
                    {token.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                  <p>Permissions: {token.permissions.join(', ')}</p>
                  <p>Created: {new Date(token.createdAt).toLocaleDateString()}</p>
                  {token.lastUsed && (
                    <p>Last used: {new Date(token.lastUsed).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700">
                  <Copy className="h-4 w-4" />
                </button>
                {token.status === 'active' && (
                  <button
                    onClick={() => revokeToken(token.id)}
                    className="rounded p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SettingsSection>
  )
}

function SecuritySettingsSection() {
  const t = createScopedTranslator('en', 'settings')
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    allowedIPs: [],
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
    },
  })
  const [newIP, setNewIP] = useState('')

  const addAllowedIP = () => {
    if (newIP && !security.allowedIPs.includes(newIP)) {
      setSecurity({
        ...security,
        allowedIPs: [...security.allowedIPs, newIP],
      })
      setNewIP('')
    }
  }

  const removeAllowedIP = (ip: string) => {
    setSecurity({
      ...security,
      allowedIPs: security.allowedIPs.filter((allowedIP) => allowedIP !== ip),
    })
  }

  return (
    <SettingsSection
      title={t('securityTitle')}
      description={t('securityDesc')}
      icon={Shield}
    >
      <div className="space-y-8">
        {/* Two-Factor Authentication */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h4 className="font-medium">{t('twoFactor')}</h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('twoFactorDesc')}
              </p>
            </div>
            <Button
              variant={security.twoFactorEnabled ? 'outline' : 'primary'}
              onClick={() =>
                setSecurity({
                  ...security,
                  twoFactorEnabled: !security.twoFactorEnabled,
                })
              }
            >
              {security.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </Button>
          </div>
          {security.twoFactorEnabled && (
            <div className="ml-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-400">
                  Two-factor authentication is enabled
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Session Timeout */}
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {t('sessionTimeoutLabel')}
          </label>
          <input
            type="number"
            min="5"
            max="480"
            value={security.sessionTimeout}
            onChange={(e) =>
              setSecurity({
                ...security,
                sessionTimeout: parseInt(e.target.value),
              })
            }
            className="w-32 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <p className="mt-1 text-xs text-zinc-500">
            {t('sessionTimeoutDesc')}
          </p>
        </div>

        {/* Active Sessions */}
        <div>
          <h4 className="mb-2 font-medium">Active Sessions</h4>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            View and manage your active login sessions across devices
          </p>
          <Button variant="outline" onClick={() => (window.location.href = '/settings/sessions')}>
            <Smartphone className="mr-2 h-4 w-4" />
            View Active Sessions
          </Button>
        </div>

        {/* IP Allowlist */}
        <div>
          <h4 className="mb-4 font-medium">IP Allowlist</h4>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Restrict access to specific IP addresses (leave empty to allow all)
          </p>

          <div className="mb-4 flex gap-2">
            <input
              type="text"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              placeholder="192.168.1.1 or 192.168.1.0/24"
              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            />
            <Button onClick={addAllowedIP} disabled={!newIP}>
              Add IP
            </Button>
          </div>

          {security.allowedIPs.length > 0 && (
            <div className="space-y-2">
              {security.allowedIPs.map((ip) => (
                <div
                  key={ip}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 p-3 dark:bg-zinc-900/50"
                >
                  <span className="font-mono text-sm">{ip}</span>
                  <button
                    onClick={() => removeAllowedIP(ip)}
                    className="rounded p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password Policy */}
        <div>
          <h4 className="mb-4 font-medium">Password Policy</h4>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Minimum Length
              </label>
              <input
                type="number"
                min="6"
                max="50"
                value={security.passwordPolicy.minLength}
                onChange={(e) =>
                  setSecurity({
                    ...security,
                    passwordPolicy: {
                      ...security.passwordPolicy,
                      minLength: parseInt(e.target.value),
                    },
                  })
                }
                className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>

            <div className="space-y-3">
              {[
                { key: 'requireUppercase', label: 'Require uppercase letters' },
                { key: 'requireNumbers', label: 'Require numbers' },
                { key: 'requireSymbols', label: 'Require symbols' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={
                      security.passwordPolicy[
                        key as keyof typeof security.passwordPolicy
                      ] as boolean
                    }
                    onChange={(e) =>
                      setSecurity({
                        ...security,
                        passwordPolicy: {
                          ...security.passwordPolicy,
                          [key]: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4 rounded text-blue-600"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {t('saveSecurity')}
        </Button>
      </div>
    </SettingsSection>
  )
}

function IntegrationSettingsSection() {
  const t = createScopedTranslator('en', 'settings')
  const [integrations, setIntegrations] = useState({
    slack: { enabled: false, webhook: '', channel: '#alerts' },
    discord: { enabled: false, webhook: '', channel: 'alerts' },
    pagerduty: { enabled: false, apiKey: '', serviceKey: '' },
    datadog: { enabled: false, apiKey: '', site: 'us1' },
  })

  return (
    <SettingsSection
      title={t('integrationsTitle')}
      description={t('integrationsDesc')}
      icon={Globe}
    >
      <div className="space-y-6">
        {/* Slack Integration */}
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/20">
                <MessageSquare className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <h4 className="font-medium">Slack</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Send alerts to Slack channels
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={integrations.slack.enabled}
              onChange={(e) =>
                setIntegrations({
                  ...integrations,
                  slack: { ...integrations.slack, enabled: e.target.checked },
                })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
          </div>

          {integrations.slack.enabled && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={integrations.slack.webhook}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      slack: { ...integrations.slack, webhook: e.target.value },
                    })
                  }
                  placeholder="https://hooks.slack.com/..."
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Channel
                </label>
                <input
                  type="text"
                  value={integrations.slack.channel}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      slack: { ...integrations.slack, channel: e.target.value },
                    })
                  }
                  placeholder="#alerts"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>
          )}
        </div>

        {/* Discord Integration */}
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/20">
                <MessageSquare className="h-4 w-4 text-sky-500" />
              </div>
              <div>
                <h4 className="font-medium">Discord</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Send alerts to Discord channels
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={integrations.discord.enabled}
              onChange={(e) =>
                setIntegrations({
                  ...integrations,
                  discord: {
                    ...integrations.discord,
                    enabled: e.target.checked,
                  },
                })
              }
              className="h-4 w-4 rounded text-blue-600"
            />
          </div>

          {integrations.discord.enabled && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={integrations.discord.webhook}
                  onChange={(e) =>
                    setIntegrations({
                      ...integrations,
                      discord: {
                        ...integrations.discord,
                        webhook: e.target.value,
                      },
                    })
                  }
                  placeholder="https://discord.com/api/webhooks/..."
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                />
              </div>
            </div>
          )}
        </div>

        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {t('saveIntegrations')}
        </Button>
      </div>
    </SettingsSection>
  )
}

function ExportImportSection() {
  const t = createScopedTranslator('en', 'settings')
  const [exportOptions, setExportOptions] = useState({
    configuration: true,
    userPreferences: true,
    apiTokens: false,
    securitySettings: false,
  })

  const handleExport = async () => {
    try {
      const response = await fetch('/api/settings/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportOptions),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `nself-settings-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('[Settings] Error exporting settings:', error)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/settings/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.success) {
        // Refresh settings data
        window.location.reload()
      }
    } catch (error) {
      console.error('[Settings] Error importing settings:', error)
    }
  }

  return (
    <SettingsSection
      title={t('backupRestoreTitle')}
      description={t('backupRestoreDesc')}
      icon={Database}
    >
      <div className="space-y-6">
        <div>
          <h4 className="mb-4 font-medium">{t('exportSettings')}</h4>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {t('exportDesc')}
          </p>

          <div className="mb-6 space-y-3">
            {[
              {
                key: 'configuration',
                label: 'System Configuration',
                description: 'Environment variables, service configs',
              },
              {
                key: 'userPreferences',
                label: 'User Preferences',
                description: 'Theme, language, display settings',
              },
              {
                key: 'apiTokens',
                label: 'API Tokens',
                description: 'Active API tokens (security risk)',
              },
              {
                key: 'securitySettings',
                label: 'Security Settings',
                description: 'Password policies, 2FA settings',
              },
            ].map(({ key, label, description }) => (
              <label key={key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={exportOptions[key as keyof typeof exportOptions]}
                  onChange={(e) =>
                    setExportOptions({
                      ...exportOptions,
                      [key]: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 rounded text-blue-600"
                />
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-zinc-500">{description}</div>
                </div>
              </label>
            ))}
          </div>

          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t('exportBtn')}
          </Button>
        </div>

        <div className="border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <h4 className="mb-4 font-medium">{t('importSettings')}</h4>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            {t('importDesc')}
          </p>

          <div className="rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center dark:border-zinc-600">
            <Upload className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              Drag and drop a settings file here, or click to browse
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Upload className="h-4 w-4" />
              {t('importBtn')}
            </label>
          </div>
        </div>
      </div>
    </SettingsSection>
  )
}

function SettingsContent() {
  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Settings</h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Configure your preferences, security, and integration settings
          </p>
        </div>

        <div className="space-y-8">
          <UserPreferencesSection />
          <NotificationSettingsSection />
          <APITokensSection />
          <SecuritySettingsSection />
          <IntegrationSettingsSection />
          <ExportImportSection />
        </div>
      </div>
    </>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SettingsContent />
    </Suspense>
  )
}
