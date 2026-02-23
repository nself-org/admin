import { exec } from 'child_process'
import { NextRequest, NextResponse } from 'next/server'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'info'

    switch (action) {
      case 'info':
        return await getRedisInfo()
      case 'keys':
        return await getRedisKeys()
      case 'stats':
        return await getRedisStats()
      case 'memory':
        return await getRedisMemory()
      case 'clients':
        return await getRedisClients()
      case 'config':
        return await getRedisConfig()
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
        error: 'Redis operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { action, key, value, ttl, pattern, command } = body

    switch (action) {
      case 'set':
        return await setRedisKey(key, value, ttl)
      case 'delete':
        return await deleteRedisKey(key)
      case 'flush':
        return await flushRedis(pattern)
      case 'execute':
        return await executeRedisCommand(command)
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
        error: 'Redis operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

async function getRedisInfo() {
  const { stdout } = await execAsync('docker exec nself-redis redis-cli INFO')

  const info = stdout.split('\n').reduce((acc: any, line) => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':')
      if (key && value) {
        acc[key.trim()] = value.trim()
      }
    }
    return acc
  }, {})

  return NextResponse.json({
    success: true,
    data: {
      server: {
        version: info.redis_version,
        mode: info.redis_mode,
        uptime: parseInt(info.uptime_in_seconds || '0'),
        config_file: info.config_file,
      },
      clients: {
        connected: parseInt(info.connected_clients || '0'),
        blocked: parseInt(info.blocked_clients || '0'),
        tracking: parseInt(info.tracking_clients || '0'),
      },
      memory: {
        used: parseInt(info.used_memory || '0'),
        human: info.used_memory_human,
        peak: parseInt(info.used_memory_peak || '0'),
        peakHuman: info.used_memory_peak_human,
        rss: parseInt(info.used_memory_rss || '0'),
        fragmentation: parseFloat(info.mem_fragmentation_ratio || '0'),
      },
      stats: {
        connections: parseInt(info.total_connections_received || '0'),
        commands: parseInt(info.total_commands_processed || '0'),
        instantaneousOps: parseInt(info.instantaneous_ops_per_sec || '0'),
        networkIn: parseInt(info.total_net_input_bytes || '0'),
        networkOut: parseInt(info.total_net_output_bytes || '0'),
        rejectedConnections: parseInt(info.rejected_connections || '0'),
      },
      persistence: {
        loading: info.loading === '1',
        aofEnabled: info.aof_enabled === '1',
        changes: parseInt(info.rdb_changes_since_last_save || '0'),
        lastSave: parseInt(info.rdb_last_save_time || '0'),
        aofRewriteInProgress: info.aof_rewrite_in_progress === '1',
      },
      keyspace: Object.keys(info)
        .filter((key) => key.startsWith('db'))
        .reduce((acc: any, key) => {
          const dbInfo = info[key]
            .split(',')
            .reduce((dbAcc: any, item: string) => {
              const [k, v] = item.split('=')
              dbAcc[k] = parseInt(v)
              return dbAcc
            }, {})
          acc[key] = dbInfo
          return acc
        }, {}),
      timestamp: new Date().toISOString(),
    },
  })
}

async function getRedisKeys() {
  const { stdout: keysOutput } = await execAsync(
    'docker exec nself-redis redis-cli --scan --pattern "*" | head -100',
  )

  const keys = keysOutput.trim().split('\n').filter(Boolean)

  const keyDetails = await Promise.all(
    keys.slice(0, 20).map(async (key) => {
      try {
        const { stdout: typeOutput } = await execAsync(
          `docker exec nself-redis redis-cli TYPE "${key}"`,
        )
        const { stdout: ttlOutput } = await execAsync(
          `docker exec nself-redis redis-cli TTL "${key}"`,
        )
        const { stdout: sizeOutput } = await execAsync(
          `docker exec nself-redis redis-cli MEMORY USAGE "${key}"`,
        )

        let value = null
        const type = typeOutput.trim()

        if (type === 'string') {
          const { stdout: valueOutput } = await execAsync(
            `docker exec nself-redis redis-cli GET "${key}"`,
          )
          value = valueOutput.trim()
        } else if (type === 'list') {
          const { stdout: lenOutput } = await execAsync(
            `docker exec nself-redis redis-cli LLEN "${key}"`,
          )
          value = `List with ${lenOutput.trim()} items`
        } else if (type === 'set') {
          const { stdout: cardOutput } = await execAsync(
            `docker exec nself-redis redis-cli SCARD "${key}"`,
          )
          value = `Set with ${cardOutput.trim()} members`
        } else if (type === 'hash') {
          const { stdout: lenOutput } = await execAsync(
            `docker exec nself-redis redis-cli HLEN "${key}"`,
          )
          value = `Hash with ${lenOutput.trim()} fields`
        }

        return {
          key,
          type: type,
          ttl: parseInt(ttlOutput.trim()),
          size: parseInt(sizeOutput.trim() || '0'),
          value: value?.substring(0, 100),
        }
      } catch {
        return {
          key,
          type: 'unknown',
          ttl: -1,
          size: 0,
          value: null,
        }
      }
    }),
  )

  return NextResponse.json({
    success: true,
    data: {
      totalKeys: keys.length,
      keys: keyDetails,
      hasMore: keys.length > 20,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getRedisStats() {
  const { stdout } = await execAsync(
    'docker exec nself-redis redis-cli INFO stats',
  )

  const stats = stdout.split('\n').reduce((acc: any, line) => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':')
      if (key && value) {
        acc[key.trim()] = value.trim()
      }
    }
    return acc
  }, {})

  return NextResponse.json({
    success: true,
    data: {
      connections: parseInt(stats.total_connections_received || '0'),
      commands: parseInt(stats.total_commands_processed || '0'),
      opsPerSec: parseInt(stats.instantaneous_ops_per_sec || '0'),
      networkIn: parseInt(stats.total_net_input_bytes || '0'),
      networkOut: parseInt(stats.total_net_output_bytes || '0'),
      keyspaceHits: parseInt(stats.keyspace_hits || '0'),
      keyspaceMisses: parseInt(stats.keyspace_misses || '0'),
      hitRate:
        stats.keyspace_hits && stats.keyspace_misses
          ? Math.round(
              (parseInt(stats.keyspace_hits) /
                (parseInt(stats.keyspace_hits) +
                  parseInt(stats.keyspace_misses))) *
                100,
            )
          : 0,
      expiredKeys: parseInt(stats.expired_keys || '0'),
      evictedKeys: parseInt(stats.evicted_keys || '0'),
      timestamp: new Date().toISOString(),
    },
  })
}

async function getRedisMemory() {
  const { stdout } = await execAsync(
    'docker exec nself-redis redis-cli MEMORY STATS',
  )

  const lines = stdout.trim().split('\n')
  const memory: any = {}

  for (let i = 0; i < lines.length; i += 2) {
    const key = lines[i].replace(/^\d+\) "/, '').replace(/"$/, '')
    const value = lines[i + 1]?.replace(/^\d+\) /, '')
    if (key && value) {
      memory[key] = isNaN(Number(value)) ? value : parseInt(value)
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      peakAllocated: memory['peak.allocated'] || 0,
      totalAllocated: memory['total.allocated'] || 0,
      startupAllocated: memory['startup.allocated'] || 0,
      replicationBacklog: memory['replication.backlog'] || 0,
      clientsNormal: memory['clients.normal'] || 0,
      aofBuffer: memory['aof.buffer'] || 0,
      dbDict: memory['db.0'] || 0,
      overhead: memory['overhead.total'] || 0,
      keysCount: memory['keys.count'] || 0,
      keysBytesPerKey: memory['keys.bytes-per-key'] || 0,
      datasetBytes: memory['dataset.bytes'] || 0,
      datasetPercentage: memory['dataset.percentage']
        ? parseFloat(memory['dataset.percentage'])
        : 0,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getRedisClients() {
  const { stdout } = await execAsync(
    'docker exec nself-redis redis-cli CLIENT LIST',
  )

  const clients = stdout
    .trim()
    .split('\n')
    .map((line) => {
      const client: any = {}
      line.split(' ').forEach((pair) => {
        const [key, value] = pair.split('=')
        if (key && value) {
          client[key] = value
        }
      })
      return client
    })

  return NextResponse.json({
    success: true,
    data: {
      clients: clients.map((c) => ({
        id: c.id,
        addr: c.addr,
        name: c.name || 'unnamed',
        age: parseInt(c.age || '0'),
        idle: parseInt(c.idle || '0'),
        flags: c.flags,
        db: parseInt(c.db || '0'),
        sub: parseInt(c.sub || '0'),
        psub: parseInt(c.psub || '0'),
        cmd: c.cmd,
      })),
      total: clients.length,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getRedisConfig() {
  const { stdout } = await execAsync(
    'docker exec nself-redis redis-cli CONFIG GET "*"',
  )

  const lines = stdout.trim().split('\n')
  const config: any = {}

  for (let i = 0; i < lines.length; i += 2) {
    const key = lines[i]
    const value = lines[i + 1]
    if (key && value !== undefined) {
      config[key] = value
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      config,
      timestamp: new Date().toISOString(),
    },
  })
}

async function setRedisKey(key: string, value: string, ttl?: number) {
  if (!key || value === undefined) {
    return NextResponse.json(
      { success: false, error: 'Key and value are required' },
      { status: 400 },
    )
  }

  let command = `docker exec nself-redis redis-cli SET "${key}" "${value}"`
  if (ttl) {
    command += ` EX ${ttl}`
  }

  const { stdout } = await execAsync(command)

  return NextResponse.json({
    success: true,
    data: {
      key,
      value,
      ttl,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}

async function deleteRedisKey(key: string) {
  if (!key) {
    return NextResponse.json(
      { success: false, error: 'Key is required' },
      { status: 400 },
    )
  }

  const { stdout } = await execAsync(
    `docker exec nself-redis redis-cli DEL "${key}"`,
  )

  return NextResponse.json({
    success: true,
    data: {
      key,
      deleted: parseInt(stdout.trim()),
      timestamp: new Date().toISOString(),
    },
  })
}

async function flushRedis(pattern?: string) {
  const _command = 'docker exec nself-redis redis-cli '

  if (pattern) {
    const { stdout: keysOutput } = await execAsync(
      `docker exec nself-redis redis-cli --scan --pattern "${pattern}"`,
    )
    const keys = keysOutput.trim().split('\n').filter(Boolean)

    if (keys.length > 0) {
      const { stdout } = await execAsync(
        `docker exec nself-redis redis-cli DEL ${keys.join(' ')}`,
      )

      return NextResponse.json({
        success: true,
        data: {
          pattern,
          deleted: parseInt(stdout.trim()),
          timestamp: new Date().toISOString(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        pattern,
        deleted: 0,
        timestamp: new Date().toISOString(),
      },
    })
  } else {
    const { stdout } = await execAsync(
      'docker exec nself-redis redis-cli FLUSHDB',
    )

    return NextResponse.json({
      success: true,
      data: {
        result: stdout.trim(),
        timestamp: new Date().toISOString(),
      },
    })
  }
}

async function executeRedisCommand(command: string) {
  if (!command) {
    return NextResponse.json(
      { success: false, error: 'Command is required' },
      { status: 400 },
    )
  }

  const dangerousCommands = [
    'FLUSHALL',
    'SHUTDOWN',
    'CONFIG SET',
    'SLAVEOF',
    'REPLICAOF',
  ]
  if (dangerousCommands.some((cmd) => command.toUpperCase().includes(cmd))) {
    return NextResponse.json(
      { success: false, error: 'Command not allowed for security reasons' },
      { status: 403 },
    )
  }

  const { stdout } = await execAsync(
    `docker exec nself-redis redis-cli ${command}`,
  )

  return NextResponse.json({
    success: true,
    data: {
      command,
      result: stdout.trim(),
      timestamp: new Date().toISOString(),
    },
  })
}
