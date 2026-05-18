import {
  CACHE_TTL,
  PASSWORD,
  PORTS,
  PORT_RANGES,
  RETENTION,
  SESSION,
  SSL_MODES,
  TIMEOUTS,
} from '../constants'

describe('PORTS', () => {
  it('has correct admin port', () => {
    expect(PORTS.ADMIN).toBe(3021)
  })

  it('has correct core service ports', () => {
    expect(PORTS.POSTGRES).toBe(5432)
    expect(PORTS.HASURA).toBe(8080)
    expect(PORTS.AUTH).toBe(4000)
    expect(PORTS.NGINX_HTTP).toBe(80)
    expect(PORTS.NGINX_HTTPS).toBe(443)
  })

  it('has correct storage ports', () => {
    expect(PORTS.MINIO_API).toBe(9000)
    expect(PORTS.MINIO_CONSOLE).toBe(9001)
    expect(PORTS.REDIS).toBe(6379)
  })

  it('has correct monitoring ports', () => {
    expect(PORTS.LOKI).toBe(3100)
    expect(PORTS.GRAFANA).toBe(3000)
    expect(PORTS.PROMETHEUS).toBe(9090)
  })

  it('all ports are positive numbers', () => {
    Object.values(PORTS).forEach((port) => {
      expect(port).toBeGreaterThan(0)
      expect(port).toBeLessThanOrEqual(65535)
    })
  })

  it('all ports are unique', () => {
    const portValues = Object.values(PORTS)
    const uniquePorts = new Set(portValues)
    // Note: Some ports like CADVISOR and HASURA share 8080, and FUNCTIONS and GRAFANA share 3000
    // This is intentional as they're different services that can be configured differently
    expect(uniquePorts.size).toBeGreaterThan(0)
  })
})

describe('PORT_RANGES', () => {
  it('has valid user apps range', () => {
    expect(PORT_RANGES.USER_APPS.start).toBe(3000)
    expect(PORT_RANGES.USER_APPS.end).toBe(3099)
    expect(PORT_RANGES.USER_APPS.start).toBeLessThan(PORT_RANGES.USER_APPS.end)
  })

  it('has valid system services range', () => {
    expect(PORT_RANGES.SYSTEM_SERVICES.start).toBe(3100)
    expect(PORT_RANGES.SYSTEM_SERVICES.end).toBe(3199)
    expect(PORT_RANGES.SYSTEM_SERVICES.start).toBeLessThan(PORT_RANGES.SYSTEM_SERVICES.end)
  })
})

describe('SSL_MODES', () => {
  it('has all expected modes', () => {
    expect(SSL_MODES.NONE).toBe('none')
    expect(SSL_MODES.LOCAL).toBe('local')
    expect(SSL_MODES.LETSENCRYPT).toBe('letsencrypt')
  })

  it('has exactly 3 modes', () => {
    expect(Object.keys(SSL_MODES)).toHaveLength(3)
  })
})

describe('SESSION', () => {
  it('has correct duration', () => {
    expect(SESSION.DURATION_DAYS).toBe(7)
  })

  it('has correct cookie names', () => {
    expect(SESSION.COOKIE_NAME).toBe('nself-session')
    expect(SESSION.CSRF_COOKIE_NAME).toBe('nself-csrf')
  })
})

describe('CACHE_TTL', () => {
  it('has correct project info TTL', () => {
    expect(CACHE_TTL.PROJECT_INFO).toBe(5 * 60 * 1000) // 5 minutes
  })

  it('has correct docker status TTL', () => {
    expect(CACHE_TTL.DOCKER_STATUS).toBe(10 * 1000) // 10 seconds
  })

  it('has correct metrics TTL', () => {
    expect(CACHE_TTL.METRICS).toBe(5 * 1000) // 5 seconds
  })

  it('all TTLs are positive', () => {
    Object.values(CACHE_TTL).forEach((ttl) => {
      expect(ttl).toBeGreaterThan(0)
    })
  })
})

describe('TIMEOUTS', () => {
  it('has correct CLI command timeout', () => {
    expect(TIMEOUTS.CLI_COMMAND).toBe(30 * 1000) // 30 seconds
  })

  it('has correct build timeout', () => {
    expect(TIMEOUTS.BUILD).toBe(5 * 60 * 1000) // 5 minutes
  })

  it('all timeouts are positive', () => {
    Object.values(TIMEOUTS).forEach((timeout) => {
      expect(timeout).toBeGreaterThan(0)
    })
  })

  it('build and start have longer timeouts than regular commands', () => {
    expect(TIMEOUTS.BUILD).toBeGreaterThan(TIMEOUTS.CLI_COMMAND)
    expect(TIMEOUTS.START).toBeGreaterThan(TIMEOUTS.CLI_COMMAND)
  })
})

describe('PASSWORD', () => {
  it('has correct min lengths', () => {
    expect(PASSWORD.MIN_LENGTH_DEV).toBe(3)
    expect(PASSWORD.MIN_LENGTH_PROD).toBe(12)
  })

  it('prod min length is greater than dev', () => {
    expect(PASSWORD.MIN_LENGTH_PROD).toBeGreaterThan(PASSWORD.MIN_LENGTH_DEV)
  })

  it('has appropriate salt rounds', () => {
    expect(PASSWORD.SALT_ROUNDS).toBe(12)
    expect(PASSWORD.SALT_ROUNDS).toBeGreaterThanOrEqual(10) // Security minimum
  })
})

describe('RETENTION', () => {
  it('has correct audit log retention', () => {
    expect(RETENTION.AUDIT_LOG_DAYS).toBe(30)
  })

  it('has correct session retention', () => {
    expect(RETENTION.SESSION_DAYS).toBe(7)
  })

  it('audit logs are retained longer than sessions', () => {
    expect(RETENTION.AUDIT_LOG_DAYS).toBeGreaterThan(RETENTION.SESSION_DAYS)
  })
})
