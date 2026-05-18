'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { CodeEditorSkeleton } from '@/components/skeletons'
import {
  Activity,
  AlertCircle,
  Eye,
  EyeOff,
  MoreHorizontal,
  Play,
  Plus,
  Settings,
  Square,
  Terminal as TerminalIcon,
  X,
} from 'lucide-react'
import { Suspense, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface TerminalSession {
  id: string
  name: string
  status: 'running' | 'stopped' | 'error'
  created: string
  lastActivity: string
  command: string
  pid?: number
  workingDir: string
  environment: string
  user: string
}

interface TerminalOutput {
  id: string
  sessionId: string
  type: 'command' | 'output' | 'error' | 'system'
  content: string
  timestamp: string
  exitCode?: number
}

interface SystemInfo {
  hostname: string
  platform: string
  arch: string
  release: string
  uptime: number
  loadAverage: number[]
  memory: {
    total: number
    free: number
    used: number
  }
  cpu: {
    model: string
    cores: number
    usage: number
  }
}

const EMPTY_SESSIONS: TerminalSession[] = []
const EMPTY_OUTPUTS: TerminalOutput[] = []


function formatSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  return `${days}d ${hours}h ${mins}m`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function SessionTab({
  session,
  isActive,
  onSelect,
  onClose,
  onAction,
}: {
  session: TerminalSession
  isActive: boolean
  onSelect: () => void
  onClose: () => void
  onAction: (action: string, sessionId: string) => void
}) {
  const statusConfig = {
    running: { color: 'text-green-600 dark:text-green-400', icon: Play },
    stopped: { color: 'text-gray-600 dark:text-gray-400', icon: Square },
    error: { color: 'text-red-600 dark:text-red-400', icon: AlertCircle },
  }

  const config = statusConfig[session.status]
  const StatusIcon = config.icon

  return (
    <div
      className={`flex cursor-pointer items-center gap-2 rounded-t-lg border-b-2 px-3 py-2 ${
        isActive
          ? 'border-blue-500 bg-white dark:bg-zinc-800'
          : 'border-transparent bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600'
      }`}
      onClick={onSelect}
    >
      <StatusIcon className={`h-3 w-3 ${config.color}`} />
      <span className="text-sm font-medium">{session.name}</span>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAction(
              session.status === 'running' ? 'stop' : 'start',
              session.id,
            )
          }}
          className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-600"
        >
          {session.status === 'running' ? (
            <Square className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="rounded p-1 hover:bg-zinc-200 dark:hover:bg-zinc-600"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}

function TerminalOutput({
  outputs,
  sessionId,
}: {
  outputs: TerminalOutput[]
  sessionId: string
}) {
  const sessionOutputs = outputs.filter(
    (output) => output.sessionId === sessionId,
  )
  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [sessionOutputs])

  const getOutputStyle = (type: string) => {
    switch (type) {
      case 'command':
        return 'text-green-400 font-medium'
      case 'error':
        return 'text-red-400'
      case 'system':
        return 'text-yellow-400 italic'
      default:
        return 'text-zinc-100'
    }
  }

  return (
    <div
      ref={terminalRef}
      className="flex-1 overflow-y-auto bg-black p-4 font-mono text-sm"
      style={{ minHeight: '400px', maxHeight: '600px' }}
    >
      {sessionOutputs.map((output) => (
        <div key={output.id} className={`mb-1 ${getOutputStyle(output.type)}`}>
          <span className="mr-2 text-xs text-zinc-500">
            {new Date(output.timestamp).toLocaleTimeString()}
          </span>
          <span className="whitespace-pre-wrap">{output.content}</span>
          {output.exitCode !== undefined && (
            <span
              className={`ml-2 text-xs ${output.exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              [exit: {output.exitCode}]
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function CommandInput({
  onExecute,
  isRunning,
  workingDir,
}: {
  onExecute: (command: string) => void
  isRunning: boolean
  workingDir: string
}) {
  const [command, setCommand] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (command.trim() && !isRunning) {
      onExecute(command)
      setHistory((prev) => [...prev, command])
      setCommand('')
      setHistoryIndex(-1)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setCommand(history[history.length - 1 - newIndex] || '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCommand('')
      }
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-zinc-700 bg-zinc-900 p-3"
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-green-400">
          nself@server:{workingDir}$
        </span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRunning ? 'Command running...' : 'Enter command...'}
          disabled={isRunning}
          className="flex-1 bg-transparent font-mono text-sm text-white placeholder-zinc-500 outline-none"
        />
        {isRunning && (
          <div className="flex items-center gap-1 text-yellow-400">
            <Activity className="h-3 w-3 animate-pulse" />
            <span className="text-xs">Running</span>
          </div>
        )}
      </div>
    </form>
  )
}

function SessionInfo({ session }: { session: TerminalSession }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">
        Session Info
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Status:</span>
          <span
            className={`font-medium ${
              session.status === 'running'
                ? 'text-green-600 dark:text-green-400'
                : session.status === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {session.status}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">PID:</span>
          <span className="font-mono">{session.pid || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">User:</span>
          <span className="font-mono">{session.user}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Working Dir:</span>
          <span className="font-mono text-xs">{session.workingDir}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Environment:</span>
          <span className="font-medium">{session.environment}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">Created:</span>
          <span className="text-xs">{formatDate(session.created)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500 dark:text-zinc-400">
            Last Activity:
          </span>
          <span className="text-xs">{formatDate(session.lastActivity)}</span>
        </div>
      </div>
    </div>
  )
}

function SystemStats({ systemInfo }: { systemInfo: SystemInfo | null }) {
  if (!systemInfo) return null
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">
        System Information
      </h3>
      <div className="space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">CPU Usage</span>
            <span className="font-medium">{systemInfo.cpu.usage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-2 rounded-full bg-blue-500"
              style={{ width: `${systemInfo.cpu.usage}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              Memory Usage
            </span>
            <span className="font-medium">
              {formatSize(systemInfo.memory.used)} /{' '}
              {formatSize(systemInfo.memory.total)}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className="h-2 rounded-full bg-green-500"
              style={{
                width: `${(systemInfo.memory.used / systemInfo.memory.total) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Hostname:</span>
            <span className="font-mono">{systemInfo.hostname}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Platform:</span>
            <span>
              {systemInfo.platform} {systemInfo.arch}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Release:</span>
            <span>{systemInfo.release}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Uptime:</span>
            <span>{formatUptime(systemInfo.uptime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">Load Avg:</span>
            <span className="font-mono text-xs">
              {systemInfo.loadAverage.map((load) => load.toFixed(2)).join(', ')}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function TerminalContent() {
  const [sessions, setSessions] = useState<TerminalSession[]>(EMPTY_SESSIONS)
  const [outputs, setOutputs] = useState<TerminalOutput[]>(EMPTY_OUTPUTS)
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)

  const { data: sysData } = useSWR<{ metrics: { loadAverage: number[]; uptime: number; memory: { total: number; free: number; used: number } } }>('/api/system/resources', fetcher, { refreshInterval: 30000 })

  const systemInfo: SystemInfo | null = sysData?.metrics
    ? {
        hostname: 'nself-server',
        platform: 'linux',
        arch: 'x64',
        release: '',
        uptime: sysData.metrics.uptime,
        loadAverage: sysData.metrics.loadAverage,
        memory: sysData.metrics.memory,
        cpu: { model: '', cores: 0, usage: 0 },
      }
    : null

  const activeSession = sessions.find((s) => s.id === activeSessionId)

  const handleSessionAction = (action: string, sessionId: string) => {
    if (action === 'start' || action === 'stop') {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, status: action === 'start' ? 'running' : 'stopped' }
            : session,
        ),
      )
    }
  }

  const handleCloseSession = (sessionId: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (activeSessionId === sessionId && sessions.length > 1) {
      const remainingSessions = sessions.filter((s) => s.id !== sessionId)
      setActiveSessionId(remainingSessions[0].id)
    }
  }

  const handleCreateSession = () => {
    const newSession: TerminalSession = {
      id: Date.now().toString(),
      name: `Terminal ${sessions.length + 1}`,
      status: 'running',
      created: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      command: '',
      pid: Math.floor(Math.random() * 90000) + 10000,
      workingDir: '/var/lib/nself',
      environment: 'production',
      user: 'nself',
    }

    setSessions((prev) => [...prev, newSession])
    setActiveSessionId(newSession.id)
  }

  const handleExecuteCommand = (command: string) => {
    if (!activeSession) return

    setIsRunning(true)

    // Add command to outputs
    const commandOutput: TerminalOutput = {
      id: Date.now().toString(),
      sessionId: activeSessionId ?? '',
      type: 'command',
      content: `$ ${command}`,
      timestamp: new Date().toISOString(),
    }

    setOutputs((prev) => [...prev, commandOutput])

    // Simulate command execution
    setTimeout(
      () => {
        const responseOutput: TerminalOutput = {
          id: (Date.now() + 1).toString(),
          sessionId: activeSessionId ?? '',
          type: command.startsWith('ls') ? 'output' : 'output',
          content: getSimulatedResponse(command),
          timestamp: new Date().toISOString(),
          exitCode: 0,
        }

        setOutputs((prev) => [...prev, responseOutput])
        setIsRunning(false)

        // Update session last activity
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSessionId
              ? { ...session, lastActivity: new Date().toISOString(), command }
              : session,
          ),
        )
      },
      1000 + Math.random() * 2000,
    ) // Random delay between 1-3 seconds
  }

  const getSimulatedResponse = (command: string): string => {
    const cmd = command.toLowerCase().trim()

    if (cmd.startsWith('ls')) {
      return 'docker-compose.yml\ndata/\nlogs/\nREADME.md\nscripts/'
    } else if (cmd.startsWith('pwd')) {
      return '/var/lib/nself'
    } else if (cmd.startsWith('whoami')) {
      return 'nself'
    } else if (cmd.startsWith('date')) {
      return new Date().toString()
    } else if (cmd.startsWith('ps')) {
      return `  PID TTY          TIME CMD
12345 pts/0    00:00:01 bash
12378 pts/1    00:00:00 psql
12456 pts/0    00:00:00 ps`
    } else if (cmd.startsWith('docker')) {
      return 'CONTAINER ID   IMAGE                    STATUS\nb8f2c1d5e4a3   nself/postgres:latest    Up 2 hours\na7e9d3c2b1f0   nself/hasura:latest      Up 2 hours'
    } else if (cmd.startsWith('help')) {
      return `Available commands:
ls, pwd, whoami, date, ps, docker, help, clear
Use 'man <command>' for more information.`
    } else if (cmd === 'clear') {
      // Clear terminal
      setOutputs((prev) =>
        prev.filter((output) => output.sessionId !== activeSessionId),
      )
      return ''
    } else {
      return `Command '${command}' executed successfully.`
    }
  }

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-[95vw]">
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">
                Web Terminal
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                Browser-based terminal with command execution and session
                management
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleCreateSession}
                variant="filled"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Session
              </Button>
              <Button
                onClick={() => setShowSidebar(!showSidebar)}
                variant="outline"
                className="flex items-center gap-2"
              >
                {showSidebar ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
                {showSidebar ? 'Hide' : 'Show'} Sidebar
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>

          {/* Session Tabs */}
          <div className="mb-4 flex items-center gap-1 overflow-x-auto">
            {sessions.map((session) => (
              <SessionTab
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onSelect={() => setActiveSessionId(session.id)}
                onClose={() => handleCloseSession(session.id)}
                onAction={handleSessionAction}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Terminal */}
          <div className={`${showSidebar ? 'flex-1' : 'w-full'}`}>
            <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
              {/* Terminal Header */}
              <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800 px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {activeSession?.name || 'Terminal'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">
                    {activeSession?.user}@{systemInfo?.hostname ?? 'nself-server'}
                  </span>
                  <button className="text-zinc-400 hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Terminal Content */}
              {activeSession ? (
                <>
                  <TerminalOutput
                    outputs={outputs}
                    sessionId={activeSessionId ?? ''}
                  />
                  <CommandInput
                    onExecute={handleExecuteCommand}
                    isRunning={isRunning}
                    workingDir={activeSession.workingDir}
                  />
                </>
              ) : (
                <div className="p-8 text-center text-zinc-400">
                  <TerminalIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
                  <p>No active terminal session</p>
                  <Button onClick={handleCreateSession} className="mt-4">
                    Create New Session
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          {showSidebar && (
            <div className="w-80 space-y-4">
              {activeSession && <SessionInfo session={activeSession} />}
              <SystemStats systemInfo={systemInfo} />

              {/* Quick Commands */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">
                  Quick Commands
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'List Files', command: 'ls -la' },
                    { label: 'System Info', command: 'uname -a' },
                    { label: 'Docker Status', command: 'docker ps' },
                    { label: 'Process List', command: 'ps aux' },
                    { label: 'Disk Usage', command: 'df -h' },
                    { label: 'Memory Info', command: 'free -h' },
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleExecuteCommand(item.command)}
                      disabled={isRunning}
                      className="w-full rounded bg-zinc-50 px-3 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-50 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                    >
                      <div className="font-medium">{item.label}</div>
                      <div className="font-mono text-xs text-zinc-500">
                        {item.command}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Session History */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">
                  Session History
                </h3>
                <div className="max-h-32 space-y-2 overflow-y-auto">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={`cursor-pointer rounded p-2 text-xs ${
                        session.id === activeSessionId
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-700 dark:hover:bg-zinc-600'
                      }`}
                      onClick={() => setActiveSessionId(session.id)}
                    >
                      <div className="font-medium">{session.name}</div>
                      <div className="text-zinc-500">
                        {session.command || 'No command'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<CodeEditorSkeleton />}>
      <TerminalContent />
    </Suspense>
  )
}
