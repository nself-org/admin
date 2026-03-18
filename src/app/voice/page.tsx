'use client'

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff,
  Loader2,
  Mic,
  RefreshCw,
  Volume2,
  XCircle,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const VOICE_API = 'http://127.0.0.1:3714'
const DEFAULT_SAMPLE_TEXT = 'Hello, this is a test of the nself voice plugin.'

// ── Types ──────────────────────────────────────────────────────────────────────

type Provider = 'elevenlabs' | 'piper'
type PluginStatus = 'checking' | 'running' | 'stopped'

interface ElevenLabsVoice {
  voice_id: string
  name: string
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
      Stopped
    </span>
  )
}

// ── Speed slider ──────────────────────────────────────────────────────────────

function SpeedSlider({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">Speed</label>
        <span className="text-sm font-medium text-indigo-300">
          {value.toFixed(1)}×
        </span>
      </div>
      <input
        type="range"
        min="0.5"
        max="2.0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-700 accent-indigo-500"
      />
      <div className="flex justify-between text-xs text-zinc-600">
        <span>0.5×</span>
        <span>1.0×</span>
        <span>1.5×</span>
        <span>2.0×</span>
      </div>
    </div>
  )
}

// ── Audio player ──────────────────────────────────────────────────────────────

function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current && src) {
      audioRef.current.load()
      audioRef.current.play().catch(() => {
        // autoplay blocked — user can use controls
      })
    }
  }, [src])

  return (
    <div className="rounded-lg border border-indigo-500/30 bg-indigo-900/10 p-3">
      <div className="mb-2 flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-indigo-400" />
        <span className="text-xs font-medium tracking-wide text-indigo-300 uppercase">
          Audio Output
        </span>
      </div>
      <audio
        ref={audioRef}
        src={src}
        controls
        className="h-8 w-full"
        style={{ colorScheme: 'dark' }}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VoiceConfigPage() {
  const [provider, setProvider] = useState<Provider>('elevenlabs')
  const [pluginStatus, setPluginStatus] = useState<PluginStatus>('checking')
  const [refreshingStatus, setRefreshingStatus] = useState(false)

  // ElevenLabs state
  const [elevenKey, setElevenKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [fetchingVoices, setFetchingVoices] = useState(false)
  const [voiceError, setVoiceError] = useState('')

  // Piper state
  const [piperModelPath, setPiperModelPath] = useState('')

  // Shared state
  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE_TEXT)
  const [speed, setSpeed] = useState(1.0)
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState('')
  const [audioSrc, setAudioSrc] = useState('')

  // ── Load from localStorage on mount ──────────────────────────────────────────

  useEffect(() => {
    try {
      const storedProvider = localStorage.getItem(
        'voice_provider',
      ) as Provider | null
      const storedKey = localStorage.getItem('voice_elevenlabs_key') ?? ''
      const storedVoiceId =
        localStorage.getItem('voice_elevenlabs_voice_id') ?? ''

      if (storedProvider === 'elevenlabs' || storedProvider === 'piper') {
        setProvider(storedProvider)
      }
      if (storedKey) setElevenKey(storedKey)
      if (storedVoiceId) setSelectedVoiceId(storedVoiceId)
    } catch {
      // localStorage unavailable
    }
  }, [])

  // ── Check plugin health ────────────────────────────────────────────────────

  const checkPluginHealth = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshingStatus(true)
    else setPluginStatus('checking')
    try {
      const res = await fetch(`${VOICE_API}/health`, {
        signal: AbortSignal.timeout(4000),
      })
      setPluginStatus(res.ok ? 'running' : 'stopped')
    } catch {
      setPluginStatus('stopped')
    } finally {
      setRefreshingStatus(false)
    }
  }

  useEffect(() => {
    checkPluginHealth()
  }, [])

  // ── Persist provider preference ────────────────────────────────────────────

  const handleProviderChange = (p: Provider) => {
    setProvider(p)
    setAudioSrc('')
    setTestError('')
    try {
      localStorage.setItem('voice_provider', p)
    } catch {
      // ignore
    }
  }

  // ── Persist ElevenLabs key ─────────────────────────────────────────────────

  const handleKeyChange = (value: string) => {
    setElevenKey(value)
    try {
      localStorage.setItem('voice_elevenlabs_key', value)
    } catch {
      // ignore
    }
  }

  // ── Fetch ElevenLabs voices ────────────────────────────────────────────────

  const fetchVoices = async () => {
    if (!elevenKey.trim()) {
      setVoiceError('Enter your ElevenLabs API key first.')
      return
    }
    setFetchingVoices(true)
    setVoiceError('')
    setVoices([])
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': elevenKey.trim() },
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setVoiceError(
          `ElevenLabs API error ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`,
        )
        return
      }
      const data = (await res.json()) as { voices: ElevenLabsVoice[] }
      const list = data.voices ?? []
      setVoices(list)
      if (list.length > 0 && !selectedVoiceId) {
        setSelectedVoiceId(list[0].voice_id)
        try {
          localStorage.setItem('voice_elevenlabs_voice_id', list[0].voice_id)
        } catch {
          // ignore
        }
      }
    } catch {
      setVoiceError(
        'Failed to reach ElevenLabs API. Check your network connection.',
      )
    } finally {
      setFetchingVoices(false)
    }
  }

  // ── Handle voice select ────────────────────────────────────────────────────

  const handleVoiceSelect = (voiceId: string) => {
    setSelectedVoiceId(voiceId)
    try {
      localStorage.setItem('voice_elevenlabs_voice_id', voiceId)
    } catch {
      // ignore
    }
  }

  // ── Test voice ─────────────────────────────────────────────────────────────

  const handleTestVoice = async () => {
    if (!sampleText.trim()) return
    setTesting(true)
    setTestError('')
    setAudioSrc('')

    const body: { text: string; speed: number; voice?: string } = {
      text: sampleText.trim(),
      speed,
    }
    if (provider === 'elevenlabs' && selectedVoiceId) {
      body.voice = selectedVoiceId
    }

    try {
      const res = await fetch(`${VOICE_API}/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        setTestError(
          `Voice synthesis failed (HTTP ${res.status})${text ? ': ' + text.slice(0, 200) : ''}.`,
        )
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      setAudioSrc(url)
    } catch {
      setTestError(
        'Could not reach the voice plugin. Make sure nself-voice is running.',
      )
    } finally {
      setTesting(false)
    }
  }

  // ── Plugin down banner ─────────────────────────────────────────────────────

  const pluginDown = pluginStatus === 'stopped'

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Voice Config</h1>
          <p className="mt-0.5 text-sm text-zinc-400">
            Configure text-to-speech synthesis via nself-voice
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={pluginStatus} />
          <button
            type="button"
            onClick={() => checkPluginHealth(true)}
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

      {/* Plugin down warning */}
      {pluginDown && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
            <div>
              <p className="font-medium text-yellow-300">
                nself-voice is not running
              </p>
              <p className="mt-1 text-sm text-yellow-400/80">
                Install and start the voice plugin to test synthesis. You can
                still configure settings below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Provider toggle */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-300">Provider</p>
        <div className="flex w-fit gap-1 rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-1">
          {(['elevenlabs', 'piper'] as Provider[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => handleProviderChange(p)}
              className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                provider === p
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {p === 'elevenlabs' ? (
                <>
                  <Mic className="h-3.5 w-3.5" />
                  ElevenLabs
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  Piper
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ElevenLabs section */}
      {provider === 'elevenlabs' && (
        <div className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5">
          <h2 className="text-base font-semibold text-white">
            ElevenLabs Settings
          </h2>

          {/* API key */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={elevenKey}
                  onChange={(e) => handleKeyChange(e.target.value)}
                  placeholder="sk-..."
                  className="w-full rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 pr-10 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute inset-y-0 right-2.5 flex items-center text-zinc-500 hover:text-zinc-300"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={fetchVoices}
                disabled={fetchingVoices || !elevenKey.trim()}
                className="flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {fetchingVoices ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Fetch Voices
              </button>
            </div>
            {voiceError && (
              <p className="mt-1 text-xs text-red-400">{voiceError}</p>
            )}
          </div>

          {/* Voice dropdown */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">Voice</label>
            <div className="relative">
              <select
                value={selectedVoiceId}
                onChange={(e) => handleVoiceSelect(e.target.value)}
                disabled={voices.length === 0}
                className="w-full appearance-none rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 pr-8 text-sm text-zinc-100 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              >
                {voices.length === 0 ? (
                  <option value="">— Fetch voices first —</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute inset-y-0 right-2.5 my-auto h-4 w-4 text-zinc-500" />
            </div>
            {voices.length > 0 && (
              <p className="text-xs text-zinc-600">
                {voices.length} voices loaded
              </p>
            )}
          </div>

          {/* Sample text */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Sample Text
            </label>
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
            />
          </div>

          {/* Speed */}
          <SpeedSlider value={speed} onChange={setSpeed} />

          {/* Test button */}
          <button
            type="button"
            onClick={handleTestVoice}
            disabled={testing || !sampleText.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            {testing ? 'Synthesizing…' : 'Test Voice'}
          </button>

          {testError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{testError}</p>
            </div>
          )}

          {audioSrc && <AudioPlayer src={audioSrc} />}
        </div>
      )}

      {/* Piper section */}
      {provider === 'piper' && (
        <div className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/30 p-5">
          <h2 className="text-base font-semibold text-white">Piper Settings</h2>

          {/* Model path */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Model File Path
            </label>
            <input
              type="text"
              value={piperModelPath}
              onChange={(e) => setPiperModelPath(e.target.value)}
              placeholder="/path/to/model.onnx"
              className="w-full rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
            />
            <p className="text-xs text-zinc-600">
              Absolute path to the .onnx model file on the server running
              nself-voice.
            </p>
          </div>

          {/* Sample text */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-300">
              Sample Text
            </label>
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-zinc-600/50 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 focus:outline-none"
            />
          </div>

          {/* Speed */}
          <SpeedSlider value={speed} onChange={setSpeed} />

          {/* Test button */}
          <button
            type="button"
            onClick={handleTestVoice}
            disabled={testing || !sampleText.trim()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
            {testing ? 'Synthesizing…' : 'Test Voice'}
          </button>

          {testError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{testError}</p>
            </div>
          )}

          {audioSrc && <AudioPlayer src={audioSrc} />}
        </div>
      )}
    </div>
  )
}
