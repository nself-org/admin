'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { ChartSkeleton } from '@/components/skeletons'
import type { BenchmarkResult } from '@/types/performance'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Database,
  Globe,
  Play,
  RefreshCw,
  Server,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { Suspense, useState } from 'react'

type BenchmarkTarget = 'api' | 'database' | 'full'

interface BenchmarkConfig {
  target: BenchmarkTarget
  duration: number
  concurrency: number
  warmup: number
  endpoint?: string
}

function RunBenchmarkContent() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<
    'idle' | 'warmup' | 'running' | 'complete'
  >('idle')
  const [result, setResult] = useState<BenchmarkResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<BenchmarkConfig>({
    target: 'api',
    duration: 60,
    concurrency: 10,
    warmup: 5,
    endpoint: '/api/graphql',
  })

  const runBenchmark = async () => {
    setIsRunning(true)
    setProgress(0)
    setPhase('warmup')
    setResult(null)
    setError(null)

    try {
      // Simulate warmup
      for (let i = 0; i <= config.warmup; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setProgress((i / config.warmup) * 20)
      }

      setPhase('running')

      // Simulate benchmark
      for (let i = 0; i <= config.duration; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        setProgress(20 + (i / config.duration) * 80)
      }

      // Mock result
      const mockResult: BenchmarkResult = {
        id: Date.now().toString(),
        target: `${config.target === 'api' ? 'API' : config.target === 'database' ? 'Database' : 'Full System'}`,
        type: config.target,
        timestamp: new Date().toISOString(),
        duration: config.duration * 1000,
        requests: {
          total: config.concurrency * config.duration * 10,
          successful: Math.floor(
            config.concurrency * config.duration * 10 * 0.999,
          ),
          failed: Math.floor(config.concurrency * config.duration * 10 * 0.001),
          perSecond: config.concurrency * 10,
        },
        latency: {
          min: 5 + Math.random() * 5,
          max: 250 + Math.random() * 200,
          avg: 30 + Math.random() * 20,
          p50: 25 + Math.random() * 15,
          p95: 100 + Math.random() * 50,
          p99: 200 + Math.random() * 100,
        },
        throughput: {
          bytesPerSecond: config.concurrency * 10 * 1024,
          requestsPerSecond: config.concurrency * 10,
        },
      }

      setResult(mockResult)
      setPhase('complete')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Benchmark failed')
      setPhase('idle')
    } finally {
      setIsRunning(false)
    }
  }

  const getTargetIcon = (target: BenchmarkTarget) => {
    switch (target) {
      case 'api':
        return Globe
      case 'database':
        return Database
      case 'full':
        return Server
    }
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <Link
            href="/benchmark"
            className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Benchmarks
          </Link>
          <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-pink-300">
            Run Benchmark
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Configure and execute performance benchmarks
          </p>
        </div>

        {/* Configuration */}
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-6 flex items-center gap-3">
            <Settings className="h-5 w-5 text-zinc-500" />
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Benchmark Configuration
            </h2>
          </div>

          {/* Target Selection */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Benchmark Target
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {(['api', 'database', 'full'] as BenchmarkTarget[]).map(
                (target) => {
                  const Icon = getTargetIcon(target)
                  return (
                    <button
                      key={target}
                      onClick={() => setConfig({ ...config, target })}
                      disabled={isRunning}
                      className={`flex items-center gap-3 rounded-lg border p-4 transition-all ${
                        config.target === target
                          ? 'border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-900/20'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${
                          config.target === target
                            ? 'text-sky-500 dark:text-sky-400'
                            : 'text-zinc-400'
                        }`}
                      />
                      <div className="text-left">
                        <p
                          className={`font-medium capitalize ${
                            config.target === target
                              ? 'text-sky-600 dark:text-sky-300'
                              : 'text-zinc-900 dark:text-white'
                          }`}
                        >
                          {target === 'api'
                            ? 'API'
                            : target === 'database'
                              ? 'Database'
                              : 'Full System'}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {target === 'api'
                            ? 'GraphQL & REST'
                            : target === 'database'
                              ? 'PostgreSQL'
                              : 'End-to-end'}
                        </p>
                      </div>
                    </button>
                  )
                },
              )}
            </div>
          </div>

          {/* Parameters */}
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={config.duration}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    duration: parseInt(e.target.value) || 60,
                  })
                }
                disabled={isRunning}
                min={10}
                max={300}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Concurrency
              </label>
              <input
                type="number"
                value={config.concurrency}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    concurrency: parseInt(e.target.value) || 10,
                  })
                }
                disabled={isRunning}
                min={1}
                max={100}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Warmup (seconds)
              </label>
              <input
                type="number"
                value={config.warmup}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    warmup: parseInt(e.target.value) || 5,
                  })
                }
                disabled={isRunning}
                min={0}
                max={30}
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          {config.target === 'api' && (
            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Endpoint
              </label>
              <input
                type="text"
                value={config.endpoint}
                onChange={(e) =>
                  setConfig({ ...config, endpoint: e.target.value })
                }
                disabled={isRunning}
                placeholder="/api/graphql"
                className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-sky-500 focus:outline-none disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Progress */}
        {phase !== 'idle' && phase !== 'complete' && (
          <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin text-sky-500" />
                <span className="font-medium text-zinc-900 dark:text-white">
                  {phase === 'warmup'
                    ? 'Warming up...'
                    : 'Running benchmark...'}
                </span>
              </div>
              <span className="text-sm text-zinc-500">
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-3 rounded-full bg-sky-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-8 rounded-xl border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mb-8 rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
            <div className="mb-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                Benchmark Complete
              </h3>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-white p-4 dark:bg-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Requests
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {result.requests.total.toLocaleString()}
                </p>
                <p className="text-sm text-zinc-500">
                  {result.requests.failed} failed
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 dark:bg-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Avg Latency
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {result.latency.avg.toFixed(1)}ms
                </p>
                <p className="text-sm text-zinc-500">
                  P95: {result.latency.p95.toFixed(1)}ms
                </p>
              </div>
              <div className="rounded-lg bg-white p-4 dark:bg-zinc-800">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Throughput
                </p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {result.throughput.requestsPerSecond.toLocaleString()} req/s
                </p>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Link
                href="/benchmark/baseline"
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                Save as Baseline
              </Link>
              <Link
                href="/benchmark/compare"
                className="flex items-center gap-2 rounded-lg border border-green-300 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
              >
                Compare with Baseline
              </Link>
            </div>
          </div>
        )}

        {/* Run Button */}
        <div className="flex justify-center">
          <button
            onClick={runBenchmark}
            disabled={isRunning}
            className="flex items-center gap-3 rounded-xl bg-sky-500 px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RefreshCw className="h-6 w-6 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-6 w-6" />
                Start Benchmark
              </>
            )}
          </button>
        </div>

        {/* CLI Reference */}
        <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
            CLI Commands Reference
          </h3>
          <div className="space-y-2 font-mono text-sm">
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself bench --target={config.target}
              </span>{' '}
              - Run {config.target} benchmark
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself bench --duration={config.duration}
              </span>{' '}
              - Set duration
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              <span className="text-sky-500">
                nself bench --concurrency={config.concurrency}
              </span>{' '}
              - Set concurrency
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

export default function RunBenchmarkPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <RunBenchmarkContent />
    </Suspense>
  )
}
