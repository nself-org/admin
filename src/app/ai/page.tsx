'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Sparkles,
  XCircle,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'

const AI_API = 'http://127.0.0.1:8010'

// ── Types ──────────────────────────────────────────────────────────────────────

type PluginStatus = 'checking' | 'running' | 'stopped'
type Provider = 'openai' | 'anthropic' | 'gemini' | 'ollama'

interface ConfiguredProvider {
  provider: Provider
  default_model: string
  tier: 'Free' | 'Pro' | 'Max'
  configured_at: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  ollama: 'Ollama (local)',
}

const PROVIDER_MODELS: Record<Exclude<Provider, 'ollama'>, string[]> = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: [
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-haiku-3-5',
    'claude-3-5-sonnet-20241022',
  ],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
}

const TIER_COLORS: Record<string, string> = {
  Free: 'border-zinc-600/50 bg-zinc-700/40 text-zinc-400',
  Pro: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
  Max: 'border-purple-500/30 bg-purple-500/10 text-purple-300',
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PluginStatus }) {
  if (status === 'checking') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-zinc-600/50 bg-zinc-800/50 px-3 py-1 text-xs font-medium text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking
      </span>
    )
  }
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-900/20 px-3 py-1 text-xs font-medium text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Running
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-900/20 px-3 py-1 text-xs font-medium text-red-400">
      <XCircle className="h-3 w-3" />
      Offline
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AIProvidersPage() {
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  // Provider form state
  const [selectedProvider, setSelectedProvider] = useState<Provider>('openai')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [selectedModel, setSelectedModel] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [ollamaModel, setOllamaModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{
    ok: boolean
    msg: string
  } | null>(null)

  // Test connection state
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    ok: boolean
    latency?: number
    error?: string
  } | null>(null)

  // Configured providers list
  const [providers, setProviders] = useState<ConfiguredProvider[]>([])
  const [providersLoading, setProvidersLoading] = useState(true)

  // ── Load persisted tab ──────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ai_selected_provider') as Provider | null
      if (stored && stored in PROVIDER_LABELS) {
        setSelectedProvider(stored)
      }
    } catch {
      // localStorage unavailable
    }
  }, [])

  // ── Set default model when provider changes ─────────────────────────────────

  useEffect(() => {
    if (selectedProvider !== 'ollama') {
      const models = PROVIDER_MODELS[selectedProvider]
      setSelectedModel(models[0] ?? '')
    }
    setSaveResult(null)
    setTestResult(null)
  }, [selectedProvider])

  // ── Health check ────────────────────────────────────────────────────────────

  const checkHealth = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshingStatus(true)
    else setPluginStatus('checking')
    try {
      const res = await fetch(`${AI_API}/health`, {
        signal: AbortSignal.timeout(4000),
      })
      setPluginStatus(res.ok ? 'running' : 'stopped')
    } catch {
      setPluginStatus('stopped')
    } finally {
      setRefreshingStatus(false)
    }
  }

  // ── Fetch configured providers ──────────────────────────────────────────────

  const fetchProviders = async () => {
    try {
      const res = await fetch(`${AI_API}/admin/providers`, { cache: 'no-store' })
      if (!res.ok) {
        setProviders([])
        return
      }
      const data = (await res.json()) as { providers: ConfiguredProvider[] }
      setProviders(data.providers ?? [])
    } catch {
      setProviders([])
    } finally {
      setProvidersLoading(false)
    }
  }

  // ── Initial load + polling ──────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      await checkHealth()
      await fetchProviders()
    }
    void init()

    const interval = setInterval(() => {
      void checkHealth()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // ── Provider tab change ─────────────────────────────────────────────────────

  const handleProviderChange = (p: Provider) => {
    setSelectedProvider(p)
    setApiKey('')
    try {
      localStorage.setItem('ai_selected_provider', p)
    } catch {
      // ignore
    }
  }

  // ── Save provider config ────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)
    try {
      const body =
        selectedProvider === 'ollama'
          ? {
              provider: selectedProvider,
              ollama_url: ollamaUrl,
              default_model: ollamaModel,
            }
          : {
              provider: selectedProvider,
              api_key: apiKey,
              default_model: selectedModel,
            }

      const res = await fetch(`${AI_API}/admin/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setSaveResult({ ok: true, msg: 'API key saved (encrypted)' })
        setApiKey('')
        void fetchProviders()
      } else {
        const text = await res.text().catch(() => '')
        setSaveResult({
          ok: false,
          msg: `Save failed (HTTP ${res.status})${text ? ': ' + text.slice(0, 120) : ''}`,
        })
      }
    } catch {
      setSaveResult({ ok: false, msg: 'Could not reach nself-ai. Is it running?' })
    } finally {
      setSaving(false)
    }
  }

  // ── Test connection ─────────────────────────────────────────────────────────

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const start = Date.now()
    try {
      const res = await fetch(`${AI_API}/admin/providers/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedProvider === 'ollama' ? ollamaModel : selectedModel,
        }),
      })
      const latency = Date.now() - start
      if (res.ok) {
        setTestResult({ ok: true, latency })
      } else {
        const text = await res.text().catch(() => '')
        setTestResult({
          ok: false,
          error: `HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`,
        })
      }
    } catch {
      setTestResult({ ok: false, error: 'Could not reach nself-ai.' })
    } finally {
      setTesting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isOllama = selectedProvider === 'ollama'
  const canSave = isOllama
    ? ollamaModel.trim().length > 0
    : apiKey.trim().length > 0 && selectedModel.length > 0

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Providers</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Configure AI provider keys for nself-ai
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={pluginStatus} />
          <button
            type="button"
            onClick={() => checkHealth(true)}
            disabled={refreshingStatus}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-600 bg-zinc-700/50 px-3 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          >
            {refreshingStatus ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Plugin offline warning */}
      {pluginStatus === 'stopped' && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">nself-ai is not running</p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the AI plugin to configure providers.
              </p>
              <div className="mt-3 rounded-lg bg-zinc-900/50 px-3 py-2 font-mono text-xs text-zinc-300">
                nself plugin install ai
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Provider selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-300">Provider</p>
        <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-1 w-fit">
          {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleProviderChange(p)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                selectedProvider === p
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Config section */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5 space-y-5">
        <h2 className="text-base font-semibold text-white">
          {PROVIDER_LABELS[selectedProvider]} Settings
        </h2>

        {isOllama ? (
          <>
            {/* Ollama URL */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Ollama URL</label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            {/* Ollama model */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Model name</label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="llama3.2, mistral, phi3, ..."
                className="w-full rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </>
        ) : (
          <>
            {/* API key */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    selectedProvider === 'openai'
                      ? 'sk-...'
                      : selectedProvider === 'anthropic'
                        ? 'sk-ant-...'
                        : 'AIza...'
                  }
                  className="w-full rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute inset-y-0 right-2.5 flex items-center text-zinc-500 hover:text-zinc-300"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-zinc-600">
                Stored encrypted in the database. The key will not be displayed after saving.
              </p>
            </div>

            {/* Model selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Default Model</label>
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 pr-8 text-sm text-zinc-100 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                >
                  {PROVIDER_MODELS[selectedProvider as Exclude<Provider, 'ollama'>].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute inset-y-0 right-2.5 my-auto h-4 w-4 text-zinc-500" />
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {saving ? 'Saving…' : 'Save'}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || pluginStatus !== 'running'}
            className="flex items-center gap-2 rounded-lg border border-zinc-600 bg-zinc-700/50 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>

        {/* Save result */}
        {saveResult && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${
              saveResult.ok
                ? 'border-green-500/30 bg-green-900/20'
                : 'border-red-500/30 bg-red-900/20'
            }`}
          >
            {saveResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            )}
            <p className={`text-sm ${saveResult.ok ? 'text-green-300' : 'text-red-300'}`}>
              {saveResult.msg}
            </p>
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-4 py-3 ${
              testResult.ok
                ? 'border-green-500/30 bg-green-900/20'
                : 'border-red-500/30 bg-red-900/20'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            )}
            <p className={`text-sm ${testResult.ok ? 'text-green-300' : 'text-red-300'}`}>
              {testResult.ok
                ? `Connection successful — ${testResult.latency}ms`
                : `Test failed: ${testResult.error}`}
            </p>
          </div>
        )}
      </div>

      {/* Configured providers list */}
      <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50">
        <div className="border-b border-zinc-700/50 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">Configured Providers</h2>
        </div>

        {providersLoading ? (
          <div className="space-y-2 p-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-12 animate-pulse rounded-lg bg-zinc-700/40" />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="mb-2 h-7 w-7 text-zinc-700" />
            <p className="text-sm text-zinc-500">No providers configured</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              Add a provider above to get started
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-700/50">
            {providers.map((p) => (
              <div key={p.provider} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-200">
                    {PROVIDER_LABELS[p.provider] ?? p.provider}
                  </p>
                  <p className="text-xs text-zinc-500">{p.default_model}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_COLORS[p.tier] ?? TIER_COLORS.Free}`}
                >
                  {p.tier}
                </span>
                <p className="shrink-0 text-xs text-zinc-600">
                  {new Date(p.configured_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
