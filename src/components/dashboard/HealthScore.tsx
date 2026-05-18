'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export interface HealthMetrics {
  servicesRunning: number
  servicesTotal: number
  errorCount: number
  cpuUsage: number
  memoryUsage: number
  diskUsage?: number
}

interface HealthScoreProps {
  metrics: HealthMetrics
}

export function HealthScore({ metrics }: HealthScoreProps) {
  // Calculate health score (0-100)
  const calculateScore = (): number => {
    let score = 100

    // Service availability (40 points max)
    if (metrics.servicesTotal > 0) {
      const serviceHealth = (metrics.servicesRunning / metrics.servicesTotal) * 40
      score = score - 40 + serviceHealth
    }

    // Error count penalty (20 points max)
    const errorPenalty = Math.min(metrics.errorCount * 5, 20)
    score -= errorPenalty

    // CPU usage penalty (15 points max)
    if (metrics.cpuUsage > 80) {
      score -= ((metrics.cpuUsage - 80) / 20) * 15
    }

    // Memory usage penalty (15 points max)
    if (metrics.memoryUsage > 80) {
      score -= ((metrics.memoryUsage - 80) / 20) * 15
    }

    // Disk usage penalty (10 points max) - if available
    if (metrics.diskUsage !== undefined && metrics.diskUsage > 80) {
      score -= ((metrics.diskUsage - 80) / 20) * 10
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  const score = calculateScore()

  const getScoreColor = (score: number) => {
    if (score >= 90) return { color: '#22c55e', text: 'Excellent' } // green-500
    if (score >= 75) return { color: '#84cc16', text: 'Good' } // lime-500
    if (score >= 50) return { color: '#f59e0b', text: 'Fair' } // amber-500
    if (score >= 25) return { color: '#ef4444', text: 'Poor' } // red-500
    return { color: '#dc2626', text: 'Critical' } // red-600
  }

  const { color, text } = getScoreColor(score)

  const getScoreIcon = () => {
    if (score >= 75) {
      return <CheckCircle className="h-6 w-6" style={{ color }} />
    }
    if (score >= 50) {
      return <AlertTriangle className="h-6 w-6" style={{ color }} />
    }
    return <XCircle className="h-6 w-6" style={{ color }} />
  }

  // Calculate circumference for the circle
  const radius = 60
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900/50">
      <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">System Health</h3>

      <div className="flex flex-col items-center">
        {/* Circular Progress */}
        <div className="relative">
          <svg className="h-36 w-36 -rotate-90 transform">
            {/* Background circle */}
            <circle
              cx="72"
              cy="72"
              r={radius}
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-zinc-200 dark:text-zinc-700"
            />
            {/* Progress circle */}
            <motion.circle
              cx="72"
              cy="72"
              r={radius}
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                strokeDasharray: circumference,
              }}
            />
          </svg>

          {/* Score in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-4xl font-bold"
              style={{ color }}
            >
              {score}
            </motion.div>
            <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{text}</div>
          </div>
        </div>

        {/* Metrics Breakdown */}
        <div className="mt-6 w-full space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Services</span>
            <span className="font-medium text-zinc-900 dark:text-white">
              {metrics.servicesRunning}/{metrics.servicesTotal}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Errors</span>
            <span
              className={`font-medium ${metrics.errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
            >
              {metrics.errorCount}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">CPU</span>
            <span
              className={`font-medium ${metrics.cpuUsage > 80 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}
            >
              {metrics.cpuUsage.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">Memory</span>
            <span
              className={`font-medium ${metrics.memoryUsage > 80 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}
            >
              {metrics.memoryUsage.toFixed(1)}%
            </span>
          </div>

          {metrics.diskUsage !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">Disk</span>
              <span
                className={`font-medium ${metrics.diskUsage > 80 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-white'}`}
              >
                {metrics.diskUsage.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Status Icon */}
        <div className="mt-4">{getScoreIcon()}</div>
      </div>
    </div>
  )
}
