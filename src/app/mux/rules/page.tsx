'use client'

import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Edit2,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

// ── Constants ──────────────────────────────────────────────────────────────────

const MUX_API = 'http://127.0.0.1:3711'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RuleConditions {
  from?: string
  subject_contains?: string
  body_contains?: string
  has_attachment?: boolean
  has_words?: string[]
  labels?: string[]
  silent_trash_orgs?: string[]
}

type ActionType =
  | 'forward_to'
  | 'webhook'
  | 'store_only'
  | 'leave_inbox'
  | 'discard'
  | 'ai_classify'
  | 'ai_summarize'
  | 'telegram_notify'
  | 'sheets_log'
  | 'forward_action'
  | 'silent_trash'
  | 'auto_reply'
  | 'companion_notify'
  | 'incident_response'
  | 'claw_delegate'
  | 'calendar_sync'
  | 'donor_action'

// Flat form representation for the action discriminated union
interface ActionForm {
  type: ActionType
  url?: string
  fallback_url?: string
  prompt_template?: string
  extractor?: string
  max_chars?: string
  chat_id?: string
  tg_chat_id?: string
  template?: string
  spreadsheet_id?: string
  sheet_name?: string
  columns_csv?: string
  to?: string
  also_notify?: string
  delay_seconds?: string
  subject_prefix?: string
  card_type?: string
  card_priority?: string
  title_template?: string
  body_template?: string
  user_id?: string
  alert_text?: string
  timeout_secs?: string
  context_hint?: string
  auto_reply_flag?: boolean
  reply_channel?: string
  calendar_id?: string
  campaign_id?: string
}

interface MuxRule {
  id?: string
  name: string
  priority: number
  conditions: RuleConditions
  action: ActionForm
  enabled: boolean
  cooldown_secs?: string
  account_id?: string
  created_at?: string
}

interface GmailAccount {
  id: string
  gmail_address: string
  tg_chat_id?: string
  enabled: boolean
  history_id?: number
  watch_renewal_due?: string
}

// ── Action serialization ───────────────────────────────────────────────────────

function actionFormToApi(a: ActionForm): Record<string, unknown> {
  switch (a.type) {
    case 'store_only':
      return { store_only: {} }
    case 'leave_inbox':
      return { leave_inbox: {} }
    case 'discard':
      return { discard: {} }
    case 'forward_to':
      return { forward_to: { url: a.url ?? '' } }
    case 'webhook':
      return { webhook: { url: a.url ?? '' } }
    case 'ai_classify':
      return { ai_classify: { fallback_url: a.fallback_url || null } }
    case 'ai_summarize':
      return {
        ai_summarize: {
          prompt_template: a.prompt_template ?? '',
          extractor: a.extractor || null,
          max_chars: a.max_chars ? parseInt(a.max_chars) : null,
          tg_chat_id: a.tg_chat_id || null,
        },
      }
    case 'telegram_notify':
      return {
        telegram_notify: {
          chat_id: a.chat_id || null,
          template: a.template || null,
        },
      }
    case 'sheets_log':
      return {
        sheets_log: {
          spreadsheet_id: a.spreadsheet_id ?? '',
          sheet_name: a.sheet_name || null,
          columns: a.columns_csv
            ? a.columns_csv.split(',').map((s) => s.trim())
            : [],
        },
      }
    case 'forward_action':
      return {
        forward_action: {
          to: a.to ?? '',
          also_notify: a.also_notify || null,
        },
      }
    case 'silent_trash':
      return {
        silent_trash: {
          delay_seconds: a.delay_seconds ? parseInt(a.delay_seconds) : 0,
        },
      }
    case 'auto_reply':
      return {
        auto_reply: {
          template: a.template ?? '',
          subject_prefix: a.subject_prefix || null,
          delay_seconds: a.delay_seconds ? parseInt(a.delay_seconds) : null,
        },
      }
    case 'companion_notify':
      return {
        companion_notify: {
          card_type: a.card_type ?? 'email_summary',
          priority: a.card_priority || null,
          title_template: a.title_template || null,
          body_template: a.body_template || null,
          user_id: a.user_id || null,
        },
      }
    case 'incident_response':
      return {
        incident_response: {
          alert_text: a.alert_text || null,
          tg_chat_id: a.tg_chat_id || null,
          timeout_secs: a.timeout_secs ? parseInt(a.timeout_secs) : null,
        },
      }
    case 'claw_delegate':
      return {
        claw_delegate: {
          context_hint: a.context_hint || null,
          auto_reply: a.auto_reply_flag ?? false,
          reply_channel: a.reply_channel || null,
          tg_chat_id: a.tg_chat_id || null,
          timeout_secs: a.timeout_secs ? parseInt(a.timeout_secs) : null,
        },
      }
    case 'calendar_sync':
      return { calendar_sync: { calendar_id: a.calendar_id || null } }
    case 'donor_action':
      return { donor_action: { campaign_id: a.campaign_id || null } }
    default:
      return { store_only: {} }
  }
}

function apiActionToForm(raw: Record<string, unknown>): ActionForm {
  const entries = Object.entries(raw)
  if (entries.length === 0) return { type: 'store_only' }
  const [type, cfg] = entries[0] as [string, Record<string, unknown>]
  const c = cfg ?? {}
  const base = { type: type as ActionType }
  switch (type) {
    case 'forward_to':
    case 'webhook':
      return { ...base, url: c.url as string }
    case 'ai_classify':
      return { ...base, fallback_url: c.fallback_url as string }
    case 'ai_summarize':
      return {
        ...base,
        prompt_template: c.prompt_template as string,
        extractor: c.extractor as string,
        max_chars: c.max_chars ? String(c.max_chars) : undefined,
        tg_chat_id: c.tg_chat_id as string,
      }
    case 'telegram_notify':
      return {
        ...base,
        chat_id: c.chat_id as string,
        template: c.template as string,
      }
    case 'sheets_log':
      return {
        ...base,
        spreadsheet_id: c.spreadsheet_id as string,
        sheet_name: c.sheet_name as string,
        columns_csv: Array.isArray(c.columns)
          ? (c.columns as string[]).join(', ')
          : '',
      }
    case 'forward_action':
      return {
        ...base,
        to: c.to as string,
        also_notify: c.also_notify as string,
      }
    case 'silent_trash':
      return {
        ...base,
        delay_seconds: c.delay_seconds ? String(c.delay_seconds) : '0',
      }
    case 'auto_reply':
      return {
        ...base,
        template: c.template as string,
        subject_prefix: c.subject_prefix as string,
        delay_seconds: c.delay_seconds ? String(c.delay_seconds) : undefined,
      }
    case 'companion_notify':
      return {
        ...base,
        card_type: c.card_type as string,
        card_priority: c.priority as string,
        title_template: c.title_template as string,
        body_template: c.body_template as string,
        user_id: c.user_id as string,
      }
    case 'incident_response':
      return {
        ...base,
        alert_text: c.alert_text as string,
        tg_chat_id: c.tg_chat_id as string,
        timeout_secs: c.timeout_secs ? String(c.timeout_secs) : undefined,
      }
    case 'claw_delegate':
      return {
        ...base,
        context_hint: c.context_hint as string,
        auto_reply_flag: c.auto_reply as boolean,
        reply_channel: c.reply_channel as string,
        tg_chat_id: c.tg_chat_id as string,
        timeout_secs: c.timeout_secs ? String(c.timeout_secs) : undefined,
      }
    case 'calendar_sync':
      return { ...base, calendar_id: c.calendar_id as string }
    case 'donor_action':
      return { ...base, campaign_id: c.campaign_id as string }
    default:
      return base
  }
}

// ── YAML preview ──────────────────────────────────────────────────────────────

function condToYaml(c: RuleConditions, indent: string): string {
  const lines: string[] = []
  if (c.from) lines.push(`${indent}from: "${c.from}"`)
  if (c.subject_contains) lines.push(`${indent}subject_contains: "${c.subject_contains}"`)
  if (c.body_contains) lines.push(`${indent}body_contains: "${c.body_contains}"`)
  if (c.has_attachment !== undefined)
    lines.push(`${indent}has_attachment: ${c.has_attachment}`)
  if (c.has_words?.length)
    lines.push(
      `${indent}has_words: [${c.has_words.map((w) => `"${w}"`).join(', ')}]`,
    )
  if (c.labels?.length)
    lines.push(
      `${indent}labels: [${c.labels.map((l) => `"${l}"`).join(', ')}]`,
    )
  if (c.silent_trash_orgs?.length)
    lines.push(
      `${indent}silent_trash_orgs: [${c.silent_trash_orgs.map((o) => `"${o}"`).join(', ')}]`,
    )
  return lines.join('\n')
}

function actionToYaml(a: ActionForm, indent: string): string {
  const i2 = indent + '  '
  switch (a.type) {
    case 'store_only':
      return `${indent}store_only: {}`
    case 'leave_inbox':
      return `${indent}leave_inbox: {}`
    case 'discard':
      return `${indent}discard: {}`
    case 'forward_to':
      return `${indent}forward_to:\n${i2}url: "${a.url ?? ''}"`
    case 'webhook':
      return `${indent}webhook:\n${i2}url: "${a.url ?? ''}"`
    case 'ai_classify':
      return a.fallback_url
        ? `${indent}ai_classify:\n${i2}fallback_url: "${a.fallback_url}"`
        : `${indent}ai_classify: {}`
    case 'ai_summarize': {
      const lines = [`${indent}ai_summarize:`]
      lines.push(`${i2}prompt_template: "${a.prompt_template ?? ''}"`)
      if (a.tg_chat_id) lines.push(`${i2}tg_chat_id: "${a.tg_chat_id}"`)
      if (a.extractor) lines.push(`${i2}extractor: "${a.extractor}"`)
      if (a.max_chars) lines.push(`${i2}max_chars: ${a.max_chars}`)
      return lines.join('\n')
    }
    case 'telegram_notify': {
      const lines = [`${indent}telegram_notify:`]
      if (a.chat_id) lines.push(`${i2}chat_id: "${a.chat_id}"`)
      if (a.template) lines.push(`${i2}template: "${a.template}"`)
      return lines.join('\n')
    }
    case 'forward_action': {
      const lines = [`${indent}forward_action:`, `${i2}to: "${a.to ?? ''}"`]
      if (a.also_notify) lines.push(`${i2}also_notify: "${a.also_notify}"`)
      return lines.join('\n')
    }
    case 'silent_trash':
      return `${indent}silent_trash:\n${i2}delay_seconds: ${a.delay_seconds ?? 0}`
    case 'auto_reply': {
      const lines = [`${indent}auto_reply:`, `${i2}template: "${a.template ?? ''}"`]
      if (a.subject_prefix) lines.push(`${i2}subject_prefix: "${a.subject_prefix}"`)
      if (a.delay_seconds) lines.push(`${i2}delay_seconds: ${a.delay_seconds}`)
      return lines.join('\n')
    }
    case 'sheets_log': {
      const cols = a.columns_csv
        ? a.columns_csv.split(',').map((s) => `"${s.trim()}"`)
        : []
      const lines = [
        `${indent}sheets_log:`,
        `${i2}spreadsheet_id: "${a.spreadsheet_id ?? ''}"`,
        `${i2}columns: [${cols.join(', ')}]`,
      ]
      if (a.sheet_name) lines.push(`${i2}sheet_name: "${a.sheet_name}"`)
      return lines.join('\n')
    }
    case 'claw_delegate': {
      const lines = [
        `${indent}claw_delegate:`,
        `${i2}auto_reply: ${a.auto_reply_flag ?? false}`,
      ]
      if (a.context_hint) lines.push(`${i2}context_hint: "${a.context_hint}"`)
      if (a.reply_channel) lines.push(`${i2}reply_channel: "${a.reply_channel}"`)
      if (a.tg_chat_id) lines.push(`${i2}tg_chat_id: "${a.tg_chat_id}"`)
      if (a.timeout_secs) lines.push(`${i2}timeout_secs: ${a.timeout_secs}`)
      return lines.join('\n')
    }
    case 'calendar_sync':
      return a.calendar_id
        ? `${indent}calendar_sync:\n${i2}calendar_id: "${a.calendar_id}"`
        : `${indent}calendar_sync: {}`
    case 'donor_action':
      return a.campaign_id
        ? `${indent}donor_action:\n${i2}campaign_id: "${a.campaign_id}"`
        : `${indent}donor_action: {}`
    default:
      return `${indent}${a.type}: {}`
  }
}

function ruleToYaml(rule: MuxRule): string {
  const lines: string[] = []
  lines.push(`- name: ${rule.name || '(unnamed)'}`)
  lines.push(`  priority: ${rule.priority}`)
  if (!rule.enabled) lines.push(`  enabled: false`)
  if (rule.cooldown_secs) lines.push(`  cooldown_secs: ${rule.cooldown_secs}`)
  if (rule.account_id) lines.push(`  account_id: "${rule.account_id}"`)

  const condLines = condToYaml(rule.conditions, '    ')
  if (condLines) {
    lines.push(`  conditions:`)
    lines.push(condLines)
  }

  lines.push(`  action:`)
  lines.push(actionToYaml(rule.action, '    '))
  return lines.join('\n')
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyRule(): MuxRule {
  return {
    name: '',
    priority: 100,
    conditions: {},
    action: { type: 'forward_to', url: '' },
    enabled: true,
  }
}

const INPUT =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none'

const SELECT =
  'rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-white focus:border-indigo-500 focus:outline-none'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-zinc-400">
      {children}
    </label>
  )
}

// ── ActionConfig form ─────────────────────────────────────────────────────────

function ActionConfig({
  action,
  onChange,
}: {
  action: ActionForm
  onChange: (a: ActionForm) => void
}) {
  const up = (patch: Partial<ActionForm>) => onChange({ ...action, ...patch })

  switch (action.type) {
    case 'store_only':
    case 'leave_inbox':
    case 'discard':
      return (
        <p className="text-xs text-zinc-500 italic">No additional config needed.</p>
      )
    case 'forward_to':
    case 'webhook':
      return (
        <div>
          <Label>URL</Label>
          <input
            className={INPUT}
            value={action.url ?? ''}
            onChange={(e) => up({ url: e.target.value })}
            placeholder="https://example.com/hook"
          />
        </div>
      )
    case 'ai_classify':
      return (
        <div>
          <Label>Fallback URL (optional)</Label>
          <input
            className={INPUT}
            value={action.fallback_url ?? ''}
            onChange={(e) => up({ fallback_url: e.target.value })}
            placeholder="https://example.com/fallback"
          />
        </div>
      )
    case 'ai_summarize':
      return (
        <div className="space-y-3">
          <div>
            <Label>Prompt template (required)</Label>
            <input
              className={INPUT}
              value={action.prompt_template ?? ''}
              onChange={(e) => up({ prompt_template: e.target.value })}
              placeholder="Summarize: {subject} — {body}"
            />
          </div>
          <div>
            <Label>Telegram chat_id (optional)</Label>
            <input
              className={INPUT}
              value={action.tg_chat_id ?? ''}
              onChange={(e) => up({ tg_chat_id: e.target.value })}
              placeholder="-100123456789"
            />
          </div>
        </div>
      )
    case 'telegram_notify':
      return (
        <div className="space-y-3">
          <div>
            <Label>Chat ID (optional, falls back to account)</Label>
            <input
              className={INPUT}
              value={action.chat_id ?? ''}
              onChange={(e) => up({ chat_id: e.target.value })}
              placeholder="-100123456789"
            />
          </div>
          <div>
            <Label>Template (optional)</Label>
            <input
              className={INPUT}
              value={action.template ?? ''}
              onChange={(e) => up({ template: e.target.value })}
              placeholder="*{from_name}*: {subject}"
            />
          </div>
        </div>
      )
    case 'sheets_log':
      return (
        <div className="space-y-3">
          <div>
            <Label>Spreadsheet ID (required)</Label>
            <input
              className={INPUT}
              value={action.spreadsheet_id ?? ''}
              onChange={(e) => up({ spreadsheet_id: e.target.value })}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            />
          </div>
          <div>
            <Label>Columns CSV — vars: {'{from}'}, {'{subject}'}, {'{date}'}, {'{rule}'}</Label>
            <input
              className={INPUT}
              value={action.columns_csv ?? ''}
              onChange={(e) => up({ columns_csv: e.target.value })}
              placeholder="{from}, {subject}, {date}"
            />
          </div>
          <div>
            <Label>Sheet name (optional, default Sheet1)</Label>
            <input
              className={INPUT}
              value={action.sheet_name ?? ''}
              onChange={(e) => up({ sheet_name: e.target.value })}
              placeholder="Sheet1"
            />
          </div>
        </div>
      )
    case 'forward_action':
      return (
        <div className="space-y-3">
          <div>
            <Label>Forward to email (required)</Label>
            <input
              className={INPUT}
              value={action.to ?? ''}
              onChange={(e) => up({ to: e.target.value })}
              placeholder="team@example.com"
            />
          </div>
          <div>
            <Label>Also notify (Telegram chat_id, optional)</Label>
            <input
              className={INPUT}
              value={action.also_notify ?? ''}
              onChange={(e) => up({ also_notify: e.target.value })}
              placeholder="-100123456789"
            />
          </div>
        </div>
      )
    case 'silent_trash':
      return (
        <div>
          <Label>Delay seconds before trashing (0 = immediate)</Label>
          <input
            type="number"
            title="Delay seconds before trashing"
            placeholder="0"
            className={INPUT}
            value={action.delay_seconds ?? '0'}
            onChange={(e) => up({ delay_seconds: e.target.value })}
            min={0}
          />
        </div>
      )
    case 'auto_reply':
      return (
        <div className="space-y-3">
          <div>
            <Label>Reply template (required)</Label>
            <input
              className={INPUT}
              value={action.template ?? ''}
              onChange={(e) => up({ template: e.target.value })}
              placeholder="Thank you for your message. We will respond within 24h."
            />
          </div>
          <div>
            <Label>Subject prefix (optional)</Label>
            <input
              className={INPUT}
              value={action.subject_prefix ?? ''}
              onChange={(e) => up({ subject_prefix: e.target.value })}
              placeholder="Re: "
            />
          </div>
        </div>
      )
    case 'companion_notify':
      return (
        <div className="space-y-3">
          <div>
            <Label>Card type</Label>
            <select
              title="Card type"
              className={SELECT}
              value={action.card_type ?? 'email_summary'}
              onChange={(e) => up({ card_type: e.target.value })}
            >
              {[
                'email_summary',
                'twofa_code',
                'package_update',
                'alert',
                'chat_message',
                'system',
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Title template (optional)</Label>
            <input
              className={INPUT}
              value={action.title_template ?? ''}
              onChange={(e) => up({ title_template: e.target.value })}
              placeholder="{from_name}: {subject}"
            />
          </div>
        </div>
      )
    case 'incident_response':
      return (
        <div className="space-y-3">
          <div>
            <Label>Alert text override (optional)</Label>
            <input
              className={INPUT}
              value={action.alert_text ?? ''}
              onChange={(e) => up({ alert_text: e.target.value })}
              placeholder="Leave empty to use subject + body preview"
            />
          </div>
          <div>
            <Label>Telegram chat_id (optional)</Label>
            <input
              className={INPUT}
              value={action.tg_chat_id ?? ''}
              onChange={(e) => up({ tg_chat_id: e.target.value })}
              placeholder="-100123456789"
            />
          </div>
        </div>
      )
    case 'claw_delegate':
      return (
        <div className="space-y-3">
          <div>
            <Label>Context hint (optional)</Label>
            <input
              className={INPUT}
              value={action.context_hint ?? ''}
              onChange={(e) => up({ context_hint: e.target.value })}
              placeholder="This email came to support@. Reply professionally."
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto-reply-flag"
              checked={action.auto_reply_flag ?? false}
              onChange={(e) => up({ auto_reply_flag: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500"
            />
            <label
              htmlFor="auto-reply-flag"
              className="text-sm text-zinc-300 cursor-pointer"
            >
              Auto-send reply via Gmail (otherwise sends draft to Telegram)
            </label>
          </div>
        </div>
      )
    case 'calendar_sync':
      return (
        <div>
          <Label>Calendar ID (optional, default: primary)</Label>
          <input
            className={INPUT}
            value={action.calendar_id ?? ''}
            onChange={(e) => up({ calendar_id: e.target.value })}
            placeholder="primary"
          />
        </div>
      )
    case 'donor_action':
      return (
        <div>
          <Label>Campaign ID (optional)</Label>
          <input
            className={INPUT}
            value={action.campaign_id ?? ''}
            onChange={(e) => up({ campaign_id: e.target.value })}
            placeholder="campaign-uuid"
          />
        </div>
      )
    default:
      return null
  }
}

// ── RuleForm ──────────────────────────────────────────────────────────────────

const ACTION_LABELS: { value: ActionType; label: string }[] = [
  { value: 'forward_to', label: 'Forward to URL' },
  { value: 'webhook', label: 'Webhook (fire-and-forget)' },
  { value: 'store_only', label: 'Store only (no delivery)' },
  { value: 'leave_inbox', label: 'Leave in inbox (observe)' },
  { value: 'discard', label: 'Discard (Gmail trash)' },
  { value: 'telegram_notify', label: 'Telegram notify' },
  { value: 'ai_summarize', label: 'AI summarize → Telegram' },
  { value: 'ai_classify', label: 'AI classify + route' },
  { value: 'auto_reply', label: 'Auto-reply' },
  { value: 'forward_action', label: 'Forward email (via Google plugin)' },
  { value: 'silent_trash', label: 'Silent trash (delayed)' },
  { value: 'sheets_log', label: 'Log to Google Sheets' },
  { value: 'companion_notify', label: 'Companion app notify (ɳClaw)' },
  { value: 'claw_delegate', label: 'Delegate to ɳClaw AI' },
  { value: 'incident_response', label: 'Incident response playbook' },
  { value: 'calendar_sync', label: 'Calendar sync' },
  { value: 'donor_action', label: 'Donor action (Donorbox)' },
]

function RuleForm({
  initial,
  accounts,
  onSave,
  onCancel,
  saving,
}: {
  initial: MuxRule
  accounts: GmailAccount[]
  onSave: (rule: MuxRule) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [rule, setRule] = useState<MuxRule>(initial)
  const up = (patch: Partial<MuxRule>) => setRule((r) => ({ ...r, ...patch }))
  const upCond = (patch: Partial<RuleConditions>) =>
    setRule((r) => ({ ...r, conditions: { ...r.conditions, ...patch } }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(rule)
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Left: form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Name</Label>
            <input
              required
              className={INPUT}
              value={rule.name}
              onChange={(e) => up({ name: e.target.value })}
              placeholder="e.g. Forward billing emails"
            />
          </div>

          <div>
            <Label>Priority (lower = higher priority)</Label>
            <input
              type="number"
              title="Rule priority"
              placeholder="100"
              className={INPUT}
              value={rule.priority}
              onChange={(e) => up({ priority: parseInt(e.target.value) || 100 })}
              min={1}
            />
          </div>

          <div>
            <Label>Cooldown (seconds, optional)</Label>
            <input
              type="number"
              className={INPUT}
              value={rule.cooldown_secs ?? ''}
              onChange={(e) => up({ cooldown_secs: e.target.value || undefined })}
              placeholder="300"
              min={0}
            />
          </div>
        </div>

        {/* Conditions */}
        <div className="space-y-3 rounded-lg border border-zinc-700/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Conditions
          </p>
          <div>
            <Label>From (regex pattern, e.g. &quot;noreply|billing&quot;)</Label>
            <input
              className={INPUT}
              value={rule.conditions.from ?? ''}
              onChange={(e) => upCond({ from: e.target.value || undefined })}
              placeholder="noreply@example\.com"
            />
          </div>
          <div>
            <Label>Subject contains</Label>
            <input
              className={INPUT}
              value={rule.conditions.subject_contains ?? ''}
              onChange={(e) =>
                upCond({ subject_contains: e.target.value || undefined })
              }
              placeholder="invoice"
            />
          </div>
          <div>
            <Label>Body contains</Label>
            <input
              className={INPUT}
              value={rule.conditions.body_contains ?? ''}
              onChange={(e) =>
                upCond({ body_contains: e.target.value || undefined })
              }
              placeholder="unsubscribe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Has words (comma-separated, all required)</Label>
              <input
                className={INPUT}
                value={rule.conditions.has_words?.join(', ') ?? ''}
                onChange={(e) =>
                  upCond({
                    has_words: e.target.value
                      ? e.target.value.split(',').map((s) => s.trim())
                      : undefined,
                  })
                }
                placeholder="tracking, package"
              />
            </div>
            <div>
              <Label>Labels (comma-separated, e.g. INBOX,UNREAD)</Label>
              <input
                className={INPUT}
                value={rule.conditions.labels?.join(', ') ?? ''}
                onChange={(e) =>
                  upCond({
                    labels: e.target.value
                      ? e.target.value.split(',').map((s) => s.trim())
                      : undefined,
                  })
                }
                placeholder="INBOX, CATEGORY_PROMOTIONS"
              />
            </div>
          </div>
          <div>
            <Label>Silent trash orgs (comma-separated, match in From field)</Label>
            <input
              className={INPUT}
              value={rule.conditions.silent_trash_orgs?.join(', ') ?? ''}
              onChange={(e) =>
                upCond({
                  silent_trash_orgs: e.target.value
                    ? e.target.value.split(',').map((s) => s.trim())
                    : undefined,
                })
              }
              placeholder="marketing-platform.io, mass-mailer.com"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="has-attachment"
              checked={rule.conditions.has_attachment ?? false}
              onChange={(e) =>
                upCond({
                  has_attachment: e.target.checked ? true : undefined,
                })
              }
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500"
            />
            <label
              htmlFor="has-attachment"
              className="text-sm text-zinc-300 cursor-pointer"
            >
              Has attachment
            </label>
          </div>
        </div>

        {/* Action */}
        <div className="space-y-3 rounded-lg border border-zinc-700/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Action
          </p>
          <div>
            <Label>Action type</Label>
            <select
              title="Action type"
              className={`${SELECT} w-full`}
              value={rule.action.type}
              onChange={(e) =>
                up({ action: { type: e.target.value as ActionType } })
              }
            >
              {ACTION_LABELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <ActionConfig
            action={rule.action}
            onChange={(action) => up({ action })}
          />
        </div>

        {/* Account scope + enabled */}
        <div className="grid grid-cols-2 gap-3">
          {accounts.length > 0 && (
            <div>
              <Label>Account scope (optional — blank = all accounts)</Label>
              <select
                title="Account scope"
                className={`${SELECT} w-full`}
                value={rule.account_id ?? ''}
                onChange={(e) =>
                  up({ account_id: e.target.value || undefined })
                }
              >
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.gmail_address}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              id="enabled"
              checked={rule.enabled}
              onChange={(e) => up({ enabled: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-500"
            />
            <label
              htmlFor="enabled"
              className="text-sm text-zinc-300 cursor-pointer"
            >
              Enabled
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-700/50 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Saving…' : 'Save Rule'}
          </button>
        </div>
      </form>

      {/* Right: YAML preview */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/80 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          YAML preview
        </p>
        <pre className="overflow-x-auto whitespace-pre text-xs leading-relaxed text-emerald-300 font-mono">
          {ruleToYaml(rule)}
        </pre>
      </div>
    </div>
  )
}

// ── AccountsSection ───────────────────────────────────────────────────────────

function AccountsSection({
  accounts,
  onRefresh,
}: {
  accounts: GmailAccount[]
  onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ gmail_address: '', refresh_token: '', tg_chat_id: '' })
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await fetch(`${MUX_API}/mux/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gmail_address: form.gmail_address,
          refresh_token: form.refresh_token,
          tg_chat_id: form.tg_chat_id || null,
        }),
      })
      setForm({ gmail_address: '', refresh_token: '', tg_chat_id: '' })
      setAdding(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const toggleAccount = async (id: string, enabled: boolean) => {
    await fetch(`${MUX_API}/mux/accounts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    onRefresh()
  }

  const deleteAccount = async (id: string) => {
    await fetch(`${MUX_API}/mux/accounts/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    onRefresh()
  }

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">Gmail Accounts</span>
          <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs text-zinc-300">
            {accounts.length}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-700/50 px-5 pb-5 pt-4 space-y-4">
          {accounts.length === 0 && !adding && (
            <p className="text-sm text-zinc-500">
              No accounts connected. Add one below to enable Gmail Pub/Sub processing.
            </p>
          )}

          {accounts.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-zinc-700/50">
              <table className="w-full">
                <thead className="bg-zinc-900/50 border-b border-zinc-700/50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                      Address
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                      Telegram chat_id
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-zinc-500 uppercase">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-zinc-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-zinc-700/50 last:border-0"
                    >
                      <td className="px-3 py-2 text-sm text-zinc-200">
                        {a.gmail_address}
                      </td>
                      <td className="px-3 py-2 text-sm text-zinc-400">
                        {a.tg_chat_id ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {a.enabled ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <CheckCircle className="h-3 w-3" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <XCircle className="h-3 w-3" /> Disabled
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => toggleAccount(a.id, !a.enabled)}
                            className="rounded p-1 text-xs text-zinc-400 hover:text-white"
                            title={a.enabled ? 'Disable' : 'Enable'}
                          >
                            {a.enabled ? (
                              <Minus className="h-3.5 w-3.5" />
                            ) : (
                              <Plus className="h-3.5 w-3.5" />
                            )}
                          </button>
                          {deleteConfirm === a.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => deleteAccount(a.id)}
                                className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-900/20"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(null)}
                                className="rounded px-2 py-0.5 text-xs text-zinc-400"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(a.id)}
                              className="rounded p-1 text-zinc-400 hover:text-red-400"
                              aria-label={`Delete account ${a.gmail_address}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {adding ? (
            <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-4">
              <p className="text-xs font-medium text-zinc-300">Add Gmail account</p>
              <div>
                <Label>Gmail address</Label>
                <input
                  required
                  className={INPUT}
                  value={form.gmail_address}
                  onChange={(e) => setForm((f) => ({ ...f, gmail_address: e.target.value }))}
                  placeholder="you@gmail.com"
                />
              </div>
              <div>
                <Label>OAuth refresh token</Label>
                <input
                  required
                  type="password"
                  className={INPUT}
                  value={form.refresh_token}
                  onChange={(e) => setForm((f) => ({ ...f, refresh_token: e.target.value }))}
                  placeholder="1//0g…"
                />
              </div>
              <div>
                <Label>Telegram chat_id (optional)</Label>
                <input
                  className={INPUT}
                  value={form.tg_chat_id}
                  onChange={(e) => setForm((f) => ({ ...f, tg_chat_id: e.target.value }))}
                  placeholder="-100123456789"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? 'Saving…' : 'Save Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white"
            >
              <UserPlus className="h-4 w-4" />
              Connect account
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MuxRulesPage() {
  const [rules, setRules] = useState<MuxRule[]>([])
  const [accounts, setAccounts] = useState<GmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [muxDown, setMuxDown] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRule, setEditingRule] = useState<MuxRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [reloading, setReloading] = useState(false)
  const [reloadMsg, setReloadMsg] = useState<string | null>(null)

  const fetchAll = async () => {
    try {
      const [rulesRes, accountsRes] = await Promise.all([
        fetch(`${MUX_API}/mux/rules`),
        fetch(`${MUX_API}/mux/accounts`),
      ])
      if (!rulesRes.ok) {
        setMuxDown(true)
        return
      }
      const rulesData = (await rulesRes.json()) as { rules: Array<Record<string, unknown>> }
      const accountsData = accountsRes.ok
        ? ((await accountsRes.json()) as { accounts: GmailAccount[] })
        : { accounts: [] }

      setRules(
        (rulesData.rules ?? []).map((r) => ({
          id: r.id as string,
          name: r.name as string,
          priority: r.priority as number,
          conditions: (r.conditions ?? {}) as RuleConditions,
          action: apiActionToForm(r.action as Record<string, unknown>),
          enabled: r.enabled as boolean,
          cooldown_secs: r.cooldown_secs ? String(r.cooldown_secs) : undefined,
          account_id: r.account_id as string | undefined,
          created_at: r.created_at as string,
        })),
      )
      setAccounts(accountsData.accounts ?? [])
      setMuxDown(false)
    } catch (_err) {
      setMuxDown(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleSave = async (ruleData: MuxRule) => {
    setSaving(true)
    try {
      const payload = {
        name: ruleData.name,
        priority: ruleData.priority,
        conditions: ruleData.conditions,
        action: actionFormToApi(ruleData.action),
        enabled: ruleData.enabled,
        cooldown_secs: ruleData.cooldown_secs
          ? parseInt(ruleData.cooldown_secs)
          : undefined,
        account_id: ruleData.account_id || undefined,
      }

      if (editingRule?.id) {
        await fetch(`${MUX_API}/mux/rules/${editingRule.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: payload.name, enabled: payload.enabled }),
        })
      } else {
        await fetch(`${MUX_API}/mux/rules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowForm(false)
      setEditingRule(null)
      await fetchAll()
    } finally {
      setSaving(false)
    }
  }

  const handleToggleEnabled = async (rule: MuxRule) => {
    await fetch(`${MUX_API}/mux/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !rule.enabled }),
    })
    await fetchAll()
  }

  const handleDelete = async (id: string) => {
    await fetch(`${MUX_API}/mux/rules/${id}`, { method: 'DELETE' })
    setDeleteConfirm(null)
    await fetchAll()
  }

  const handleReload = async () => {
    setReloading(true)
    setReloadMsg(null)
    try {
      const res = await fetch(`${MUX_API}/mux/reload`, { method: 'POST' })
      if (res.ok) {
        setReloadMsg('Rules reloaded.')
      } else {
        setReloadMsg('Reload failed.')
      }
    } catch (_err) {
      setReloadMsg('Reload failed — mux unreachable.')
    } finally {
      setReloading(false)
      setTimeout(() => setReloadMsg(null), 4000)
    }
  }

  if (!loading && muxDown) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Mux Rules</h1>
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">nself-mux is not running</p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the mux plugin to use the rule editor.
              </p>
              <pre className="mt-3 rounded-lg bg-zinc-900/80 px-4 py-3 text-sm font-mono text-zinc-300">
                nself plugin install mux
              </pre>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mux Rules</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Route and transform incoming Gmail messages with rule-based logic
          </p>
        </div>
        <div className="flex items-center gap-2">
          {reloadMsg && (
            <span className="text-xs text-zinc-400">{reloadMsg}</span>
          )}
          <button
            type="button"
            onClick={handleReload}
            disabled={reloading}
            className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {reloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reload YAML
          </button>
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                setEditingRule(null)
                setShowForm(true)
              }}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              New Rule
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <RuleForm
          initial={
            editingRule ??
            emptyRule()
          }
          accounts={accounts}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingRule(null)
          }}
          saving={saving}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 animate-pulse rounded-xl bg-zinc-800/50" />
          ))}
        </div>
      )}

      {/* Rules table */}
      {!loading && !muxDown && rules.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-700/50 bg-zinc-800/30 py-16">
          <AlertCircle className="mb-4 h-10 w-10 text-zinc-600" />
          <p className="text-sm text-zinc-400">No rules yet</p>
          <button
            type="button"
            onClick={() => {
              setEditingRule(null)
              setShowForm(true)
            }}
            className="mt-4 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Create your first rule
          </button>
        </div>
      )}

      {!loading && rules.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/50">
          <table className="w-full">
            <thead className="border-b border-zinc-700/50 bg-zinc-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  Match
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">
                  Controls
                </th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const condSummary = [
                  rule.conditions.from && `from: ${rule.conditions.from}`,
                  rule.conditions.subject_contains &&
                    `subject: ${rule.conditions.subject_contains}`,
                ]
                  .filter(Boolean)
                  .join(', ')

                return (
                  <tr
                    key={rule.id}
                    className="border-b border-zinc-700/50 last:border-0 hover:bg-zinc-800/50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-white">{rule.name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400">
                      {rule.priority}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-400 max-w-[200px] truncate">
                      {condSummary || <span className="italic text-zinc-600">all messages</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-indigo-900/30 px-2 py-0.5 text-xs text-indigo-300">
                        {ACTION_LABELS.find((a) => a.value === rule.action.type)
                          ?.label ?? rule.action.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(rule)}
                        className="flex items-center gap-1.5 text-xs transition-colors"
                      >
                        {rule.enabled ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-400">
                            <XCircle className="h-3.5 w-3.5" />
                            Disabled
                          </span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRule(rule)
                            setShowForm(true)
                          }}
                          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-white"
                          aria-label={`Edit ${rule.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {deleteConfirm === rule.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => rule.id && handleDelete(rule.id)}
                              className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-900/30"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded px-2 py-1 text-xs text-zinc-400 hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              rule.id && setDeleteConfirm(rule.id)
                            }
                            className="rounded p-1.5 text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400"
                            aria-label={`Delete ${rule.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Accounts section */}
      {!loading && !muxDown && (
        <AccountsSection accounts={accounts} onRefresh={fetchAll} />
      )}
    </div>
  )
}
