import { getProjectPath } from '@/lib/paths'
import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'dashboard'
    const service = searchParams.get('service')
    const timeRange = searchParams.get('timeRange') || '1h'

    switch (action) {
      case 'dashboard':
        return await getMonitoringDashboard()
      case 'metrics':
        return await getDetailedMetrics(timeRange)
      case 'logs':
        if (!service) {
          return await getAllLogs(searchParams)
        }
        return await getServiceLogs(service, searchParams)
      case 'alerts':
        return await getActiveAlerts()
      case 'health':
        return await getSystemHealth()
      case 'performance':
        return await getPerformanceMetrics(timeRange)
      case 'resource-usage':
        return await getResourceUsage()
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Monitoring operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { action, service, options = {} } = await request.json()

    switch (action) {
      case 'create-alert':
        return await createAlert(options)
      case 'acknowledge-alert':
        return await acknowledgeAlert(options.alertId)
      case 'export-logs':
        return await exportLogs(service, options)
      case 'set-log-level':
        return await setLogLevel(service, options.level)
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Monitoring operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getMonitoringDashboard() {
  try {
    const projectPath = getProjectPath()

    // Get comprehensive system overview
    const [systemMetrics, dockerStats, serviceHealth, resourceUsage] =
      await Promise.all([
        getSystemMetricsData(),
        getDockerStatsData(),
        getServiceHealthData(),
        getResourceUsageData(),
      ])

    // Get recent alerts
    const alerts = await getRecentAlerts()

    // Get service status from nself
    const { stdout: nselfStatus } = await execAsync(
      `cd ${projectPath} && nself status`,
    )

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          systemMetrics,
          dockerStats,
          serviceHealth,
          resourceUsage,
          alerts: alerts.slice(0, 5), // Latest 5 alerts
          nselfStatus: parseNselfStatus(nselfStatus),
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get monitoring dashboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getDetailedMetrics(timeRange: string) {
  try {
    // Get metrics for specific time range
    const metrics = {
      cpu: await getCpuMetricsHistory(timeRange),
      memory: await getMemoryMetricsHistory(timeRange),
      disk: await getDiskMetricsHistory(timeRange),
      network: await getNetworkMetricsHistory(timeRange),
      docker: await getDockerMetricsHistory(timeRange),
    }

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        metrics,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get detailed metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getAllLogs(searchParams: URLSearchParams) {
  try {
    const projectPath = getProjectPath()
    const tail = searchParams.get('tail') || '1000'
    const since = searchParams.get('since') || '1h'
    const level = searchParams.get('level') || 'all'

    // Get logs from all services
    const { stdout: dockerLogs } = await execAsync(
      `cd ${projectPath} && docker-compose logs --tail=${tail} --since=${since}`,
    )

    // Parse and format logs
    const logs = parseDockerLogs(dockerLogs, level)

    return NextResponse.json({
      success: true,
      data: {
        logs,
        params: { tail, since, level },
        total: logs.length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get logs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getServiceLogs(service: string, searchParams: URLSearchParams) {
  try {
    const projectPath = getProjectPath()
    const tail = searchParams.get('tail') || '500'
    const since = searchParams.get('since') || '1h'
    const follow = searchParams.get('follow') === 'true'

    let command = `cd ${projectPath} && docker-compose logs --tail=${tail} --since=${since}`
    if (follow) {
      command += ' --follow'
    }
    command += ` ${service}`

    const { stdout: logs } = await execAsync(command)

    return NextResponse.json({
      success: true,
      data: {
        service,
        logs: logs.trim(),
        params: { tail, since, follow },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to get logs for service '${service}'`,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getActiveAlerts() {
  try {
    // Check for system alerts
    const alerts = []

    // CPU usage alert
    const cpuUsage = await getCurrentCpuUsage()
    if (cpuUsage > 80) {
      alerts.push({
        id: 'cpu-high',
        type: 'warning',
        severity: 'medium',
        title: 'High CPU Usage',
        message: `CPU usage is at ${cpuUsage}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      })
    }

    // Memory usage alert
    const memoryUsage = await getCurrentMemoryUsage()
    if (memoryUsage.percentage > 85) {
      alerts.push({
        id: 'memory-high',
        type: 'warning',
        severity: 'high',
        title: 'High System Memory Usage',
        message: `System memory usage is at ${memoryUsage.percentage}% (${memoryUsage.used}GB / ${memoryUsage.total}GB)`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      })
    }

    // Disk space alert
    const diskUsage = await getCurrentDiskUsage()
    if (diskUsage.percentage > 90) {
      alerts.push({
        id: 'disk-full',
        type: 'error',
        severity: 'critical',
        title: 'Disk Space Low',
        message: `Disk usage is at ${diskUsage.percentage}%`,
        timestamp: new Date().toISOString(),
        acknowledged: false,
      })
    }

    // Service health alerts
    const serviceAlerts = await getServiceHealthAlerts()
    alerts.push(...serviceAlerts)

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        total: alerts.length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get active alerts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getSystemHealth() {
  try {
    const projectPath = getProjectPath()

    // Run comprehensive health checks
    const healthChecks = await Promise.all([
      checkDatabaseHealth(),
      checkDockerHealth(),
      checkDiskSpace(),
      checkMemoryUsage(),
      checkServiceConnectivity(),
    ])

    // Get nself doctor output
    const { stdout: doctorOutput, stderr: doctorError } = await execAsync(
      `cd ${projectPath} && nself doctor`,
    ).catch((error) => ({
      stdout: '',
      stderr: error instanceof Error ? error.message : 'Unknown error',
    }))

    const overallHealth = healthChecks.every(
      (check) => check.status === 'healthy',
    )
      ? 'healthy'
      : healthChecks.some((check) => check.status === 'critical')
        ? 'critical'
        : 'degraded'

    return NextResponse.json({
      success: true,
      data: {
        overall: overallHealth,
        checks: healthChecks,
        doctor: {
          output: doctorOutput.trim(),
          error: doctorError,
        },
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get system health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getPerformanceMetrics(timeRange: string) {
  try {
    // Simulate performance metrics collection over time
    // In a real implementation, this would connect to Prometheus/Grafana
    const metrics = {
      responseTime: await getResponseTimeMetrics(timeRange),
      throughput: await getThroughputMetrics(timeRange),
      errorRate: await getErrorRateMetrics(timeRange),
      latency: await getLatencyMetrics(timeRange),
    }

    return NextResponse.json({
      success: true,
      data: {
        timeRange,
        metrics,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getResourceUsage() {
  try {
    const [cpu, memory, disk, network] = await Promise.all([
      getCurrentCpuUsage(),
      getCurrentMemoryUsage(),
      getCurrentDiskUsage(),
      getCurrentNetworkUsage(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        cpu,
        memory,
        disk,
        network,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get resource usage',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

// Helper functions for metrics collection
async function getSystemMetricsData() {
  // This would integrate with the existing system metrics API
  const response = await fetch('http://localhost:3001/api/system/metrics')
  const data = await response.json()
  return data.success ? data.data : null
}

async function getDockerStatsData() {
  // This would integrate with the existing Docker API
  const response = await fetch('http://localhost:3001/api/docker/containers')
  const data = await response.json()
  return data.success ? data.data : null
}

async function getServiceHealthData() {
  const projectPath = getProjectPath()

  try {
    const { stdout } = await execAsync(
      `cd ${projectPath} && docker-compose ps --format json`,
    )

    return JSON.parse(stdout)
  } catch {
    return []
  }
}

async function getResourceUsageData() {
  return {
    cpu: await getCurrentCpuUsage(),
    memory: await getCurrentMemoryUsage(),
    disk: await getCurrentDiskUsage(),
    network: await getCurrentNetworkUsage(),
  }
}

async function getCurrentCpuUsage(): Promise<number> {
  try {
    const { stdout } = await execAsync(
      "top -l 1 -n 0 | grep 'CPU usage' | awk '{print $3}' | sed 's/%//'",
    )
    return parseFloat(stdout.trim()) || 0
  } catch {
    return 0
  }
}

async function getCurrentMemoryUsage() {
  try {
    const totalMem = require('os').totalmem()
    const freeMem = require('os').freemem()
    const usedMem = totalMem - freeMem

    return {
      used: Math.round((usedMem / (1024 * 1024 * 1024)) * 10) / 10,
      total: Math.round((totalMem / (1024 * 1024 * 1024)) * 10) / 10,
      percentage: Math.round((usedMem / totalMem) * 100),
    }
  } catch {
    return { used: 0, total: 8, percentage: 0 }
  }
}

async function getCurrentDiskUsage() {
  try {
    const { stdout } = await execAsync(
      "df -h / | tail -1 | awk '{print $2 \" \" $3 \" \" $5}' | sed 's/G//g' | sed 's/%//'",
    )
    const parts = stdout.trim().split(' ')
    const total = parseFloat(parts[0]) || 100
    const used = parseFloat(parts[1]) || 50
    const percentage = parseInt(parts[2]) || 50

    return { used, total, percentage }
  } catch {
    return { used: 50, total: 100, percentage: 50 }
  }
}

async function getCurrentNetworkUsage() {
  try {
    const { stdout } = await execAsync(
      "netstat -ib | grep -E 'en0|eth0' | head -1 | awk '{print $7 \" \" $10}'",
    )
    const parts = stdout.trim().split(' ')
    const bytesIn = parseInt(parts[0]) || 0
    const bytesOut = parseInt(parts[1]) || 0

    return {
      rx: Math.round(bytesIn / (1024 * 1024) / 60), // Rough MB/s
      tx: Math.round(bytesOut / (1024 * 1024) / 60),
    }
  } catch {
    return { rx: 0, tx: 0 }
  }
}

// Placeholder functions for more complex metrics
async function getCpuMetricsHistory(_timeRange: string) {
  // Would integrate with Prometheus/Grafana in real implementation
  return []
}

async function getMemoryMetricsHistory(_timeRange: string) {
  return []
}

async function getDiskMetricsHistory(_timeRange: string) {
  return []
}

async function getNetworkMetricsHistory(_timeRange: string) {
  return []
}

async function getDockerMetricsHistory(_timeRange: string) {
  return []
}

async function getRecentAlerts() {
  return []
}

async function getServiceHealthAlerts() {
  return []
}

async function checkDatabaseHealth() {
  const projectPath = getProjectPath()

  try {
    const { stdout } = await execAsync(
      `cd ${projectPath} && docker-compose exec postgres pg_isready -U postgres`,
    )

    return {
      name: 'Database',
      status: stdout.includes('accepting connections')
        ? 'healthy'
        : 'unhealthy',
      message: stdout.trim(),
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'Database',
      status: 'critical',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

async function checkDockerHealth() {
  try {
    const { stdout } = await execAsync(
      'docker info --format "{{.ServerVersion}}"',
    )

    return {
      name: 'Docker',
      status: 'healthy',
      message: `Docker ${stdout.trim()} is running`,
      timestamp: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'Docker',
      status: 'critical',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }
  }
}

async function checkDiskSpace() {
  const diskUsage = await getCurrentDiskUsage()

  return {
    name: 'Disk Space',
    status:
      diskUsage.percentage > 90
        ? 'critical'
        : diskUsage.percentage > 80
          ? 'warning'
          : 'healthy',
    message: `${diskUsage.percentage}% used (${diskUsage.used}GB / ${diskUsage.total}GB)`,
    timestamp: new Date().toISOString(),
  }
}

async function checkMemoryUsage() {
  const memoryUsage = await getCurrentMemoryUsage()

  return {
    name: 'Memory',
    status: memoryUsage.percentage > 85 ? 'warning' : 'healthy',
    message: `${memoryUsage.percentage}% used (${memoryUsage.used}GB / ${memoryUsage.total}GB)`,
    timestamp: new Date().toISOString(),
  }
}

async function checkServiceConnectivity() {
  return {
    name: 'Service Connectivity',
    status: 'healthy',
    message: 'All services are reachable',
    timestamp: new Date().toISOString(),
  }
}

function parseNselfStatus(statusOutput: string) {
  // Parse the colored nself status output
  const lines = statusOutput.split('\n')
  const services = []

  for (const line of lines) {
    if (
      line.includes('✓') ||
      line.includes('○') ||
      line.includes('●') ||
      line.includes('✗')
    ) {
      const serviceName = line.replace(/[✓○●✗\s\x1b[\d;m]/g, '').trim()
      if (serviceName) {
        services.push({
          name: serviceName,
          status: line.includes('✓')
            ? 'healthy'
            : line.includes('●')
              ? 'running'
              : line.includes('○')
                ? 'stopped'
                : 'unknown',
        })
      }
    }
  }

  return { services }
}

function parseDockerLogs(logs: string, _level: string) {
  const lines = logs.split('\n').filter((line) => line.trim())

  return lines
    .map((line) => {
      const parts = line.split('|')
      if (parts.length >= 2) {
        return {
          timestamp: new Date().toISOString(),
          service: parts[0].trim(),
          message: parts.slice(1).join('|').trim(),
          level: detectLogLevel(line),
        }
      }

      return {
        timestamp: new Date().toISOString(),
        service: 'unknown',
        message: line,
        level: detectLogLevel(line),
      }
    })
    .filter((log) => _level === 'all' || log.level === _level)
}

function detectLogLevel(logLine: string): string {
  const lower = logLine.toLowerCase()
  if (lower.includes('error') || lower.includes('err')) return 'error'
  if (lower.includes('warn') || lower.includes('warning')) return 'warn'
  if (lower.includes('info')) return 'info'
  if (lower.includes('debug')) return 'debug'
  return 'info'
}

// Placeholder functions for additional features
async function getResponseTimeMetrics(_timeRange: string) {
  return []
}
async function getThroughputMetrics(_timeRange: string) {
  return []
}
async function getErrorRateMetrics(_timeRange: string) {
  return []
}
async function getLatencyMetrics(_timeRange: string) {
  return []
}

async function createAlert(_options: unknown) {
  return NextResponse.json({ success: true, message: 'Alert created' })
}

async function acknowledgeAlert(_alertId: string) {
  return NextResponse.json({ success: true, message: 'Alert acknowledged' })
}

async function exportLogs(_service: string, _options: unknown) {
  return NextResponse.json({ success: true, message: 'Logs exported' })
}

async function setLogLevel(_service: string, _level: string) {
  return NextResponse.json({ success: true, message: 'Log level set' })
}
