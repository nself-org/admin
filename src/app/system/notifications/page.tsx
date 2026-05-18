'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  Bell,
  Check,
  Loader2,
  Mail,
  MessageSquare,
  Plus,
  Send,
  Settings,
  Webhook,
} from 'lucide-react'
import { Suspense, useState } from 'react'

function SystemNotificationsContent() {
  const [email, setEmail] = useState({
    enabled: true,
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'admin@example.com',
    smtpPassword: '',
  })
  const [slack, setSlack] = useState({
    enabled: false,
    webhookUrl: '',
    channel: '#alerts',
  })
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)

  const testNotification = async (_type: string) => {
    setTesting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setTesting(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setSaving(false)
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
                <Bell className="h-8 w-8 text-blue-500" />
                Notification Settings
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Configure notification channels and alert preferences
              </p>
            </div>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-6 w-6 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold">Email Notifications</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Send alerts via SMTP email
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={email.enabled}
                  onChange={(e) => setEmail({ ...email, enabled: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm">Enabled</span>
              </label>
            </div>

            {email.enabled && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">SMTP Host</label>
                    <input
                      type="text"
                      value={email.smtpHost}
                      onChange={(e) => setEmail({ ...email, smtpHost: e.target.value })}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">SMTP Port</label>
                    <input
                      type="number"
                      value={email.smtpPort}
                      onChange={(e) =>
                        setEmail({
                          ...email,
                          smtpPort: parseInt(e.target.value),
                        })
                      }
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Username</label>
                    <input
                      type="text"
                      value={email.smtpUser}
                      onChange={(e) => setEmail({ ...email, smtpUser: e.target.value })}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Password</label>
                    <input
                      type="password"
                      value={email.smtpPassword}
                      onChange={(e) => setEmail({ ...email, smtpPassword: e.target.value })}
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => testNotification('email')}
                  disabled={testing}
                  variant="outline"
                  className="text-sm"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-3 w-3" />
                      Send Test Email
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold">Slack Integration</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Send alerts to Slack channels
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={slack.enabled}
                  onChange={(e) => setSlack({ ...slack, enabled: e.target.checked })}
                  className="h-4 w-4 rounded text-blue-600"
                />
                <span className="text-sm">Enabled</span>
              </label>
            </div>

            {slack.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Webhook URL</label>
                  <input
                    type="text"
                    value={slack.webhookUrl}
                    onChange={(e) => setSlack({ ...slack, webhookUrl: e.target.value })}
                    placeholder="https://hooks.slack.com/services/..."
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Channel</label>
                  <input
                    type="text"
                    value={slack.channel}
                    onChange={(e) => setSlack({ ...slack, channel: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>

                <Button
                  onClick={() => testNotification('slack')}
                  disabled={testing}
                  variant="outline"
                  className="text-sm"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-3 w-3" />
                      Send Test Message
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Webhook className="h-6 w-6 text-blue-500" />
                <div>
                  <h3 className="text-lg font-semibold">Custom Webhooks</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Send alerts to custom endpoints
                  </p>
                </div>
              </div>
              <Button variant="outline" className="text-sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Webhook
              </Button>
            </div>

            <div className="rounded-lg border border-zinc-200 p-4 text-center dark:border-zinc-700">
              <p className="text-sm text-zinc-500">No webhooks configured yet</p>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold">Notification Rules</h3>

            <div className="space-y-3">
              {[
                'Service Down',
                'High CPU Usage',
                'Low Disk Space',
                'Failed Backup',
                'Security Alert',
              ].map((rule) => (
                <div
                  key={rule}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                >
                  <span className="text-sm">{rule}</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      <Check className="h-3 w-3" />
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function SystemNotificationsPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <SystemNotificationsContent />
    </Suspense>
  )
}
