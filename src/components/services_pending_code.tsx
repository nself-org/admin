// Saved Container Services table code for future use on Services page
// This will be the 4th view option alongside table/list/cards views

import { useState } from 'react'

interface ServiceStatus {
  name: string
  status: 'running' | 'stopped' | 'error' | 'healthy' | 'unhealthy'
  health?: string
  uptime?: string
  cpu?: number
  memory?: number
  port?: string
}

interface ContainersTableProps {
  services: ServiceStatus[]
}

// Helper function to get service category
function getServiceCategory(name: string): 'required' | 'optional' | 'user' {
  const lowerName = name.toLowerCase()

  // Required services (core stack)
  if (['postgres', 'postgresql', 'database', 'db'].some((n) => lowerName.includes(n)))
    return 'required'
  if (['hasura', 'graphql'].some((n) => lowerName.includes(n))) return 'required'
  if (['auth', 'keycloak', 'supabase'].some((n) => lowerName.includes(n))) return 'required'
  if (['nginx', 'proxy', 'gateway', 'traefik'].some((n) => lowerName.includes(n))) return 'required'

  // Optional services (infrastructure) - but NOT user workers
  if (lowerName.includes('bullmq') || lowerName.includes('bull')) return 'user' // BullMQ workers are user services
  if (['minio', 's3'].some((n) => lowerName.includes(n))) return 'optional'
  if (lowerName.includes('storage') && !lowerName.includes('minio')) return 'optional'
  if (['mailpit'].some((n) => lowerName.includes(n))) return 'optional'
  if (['redis', 'cache', 'memcached'].some((n) => lowerName.includes(n))) return 'optional'
  if (
    ['grafana', 'prometheus', 'loki', 'jaeger', 'alertmanager', 'monitoring'].some((n) =>
      lowerName.includes(n)
    )
  )
    return 'optional'
  if (['kafka', 'rabbitmq', 'nats', 'amqp'].some((n) => lowerName.includes(n))) return 'optional'
  if (['elasticsearch', 'elastic', 'kibana', 'logstash'].some((n) => lowerName.includes(n)))
    return 'optional'

  // Everything else is user services (including workers)
  return 'user'
}

// Helper to get service order for default sorting
function getServiceDefaultOrder(name: string, category: 'required' | 'optional' | 'user'): number {
  const lowerName = name.toLowerCase()

  if (category === 'required') {
    // Required services order
    if (lowerName.includes('postgres')) return 1
    if (lowerName.includes('hasura')) return 2
    if (lowerName.includes('auth')) return 3
    if (lowerName.includes('nginx')) return 4
    return 100
  }

  if (category === 'optional') {
    // Optional services order
    if (lowerName.includes('minio')) return 1
    if (lowerName.includes('storage') && !lowerName.includes('minio')) return 2
    if (lowerName.includes('mailpit')) return 3
    if (lowerName.includes('redis')) return 4
    if (lowerName.includes('grafana')) return 5
    if (lowerName.includes('prometheus')) return 6
    if (lowerName.includes('loki')) return 7
    if (lowerName.includes('jaeger')) return 8
    if (lowerName.includes('alertmanager')) return 9
    return 100
  }

  // User services order (alphabetical within type)
  if (lowerName.includes('nest')) return 10
  if (lowerName.includes('bull')) return 20
  if (lowerName.includes('go')) return 30
  if (lowerName.includes('py') || lowerName.includes('python')) return 40
  return 100
}

// Helper to get service display name
function getServiceDisplayName(name: string): string {
  const lowerName = name.toLowerCase()

  // Core services
  if (lowerName.includes('postgres')) return 'PostgreSQL'
  if (lowerName.includes('hasura')) return 'Hasura GraphQL'
  if (lowerName.includes('auth')) return 'Authentication'
  if (lowerName.includes('nginx')) return 'Nginx Proxy'

  // Storage services
  if (lowerName.includes('minio')) return 'MinIO Storage'
  if (lowerName.includes('storage') && !lowerName.includes('minio')) return 'Storage Volume'

  // Mail service
  if (lowerName.includes('mailpit')) return 'Mailpit'
  if (lowerName.includes('mail') && !lowerName.includes('mailpit')) return 'Mail Service'

  // Cache
  if (lowerName.includes('redis')) return 'Redis Cache'

  // Monitoring stack
  if (lowerName.includes('grafana')) return 'Grafana'
  if (lowerName.includes('prometheus')) return 'Prometheus'
  if (lowerName.includes('loki')) return 'Loki'
  if (lowerName.includes('jaeger')) return 'Jaeger'
  if (lowerName.includes('alertmanager')) return 'Alert Manager'

  // User services
  if (lowerName.includes('nest')) return 'NestJS API'
  if (lowerName.includes('bullmq') || lowerName.includes('bull')) return 'BullMQ Worker'
  if (lowerName.includes('python') || lowerName.includes('py')) return 'Python Service'
  if (lowerName.includes('go') && !lowerName.includes('golang')) return 'Go Service'

  // Other infrastructure
  if (lowerName.includes('traefik')) return 'Traefik Proxy'
  if (lowerName.includes('keycloak')) return 'Keycloak Auth'
  if (lowerName.includes('supabase')) return 'Supabase'
  if (lowerName.includes('kafka')) return 'Apache Kafka'
  if (lowerName.includes('rabbitmq')) return 'RabbitMQ'
  if (lowerName.includes('nats')) return 'NATS'
  if (lowerName.includes('elasticsearch') || lowerName.includes('elastic')) return 'Elasticsearch'
  if (lowerName.includes('kibana')) return 'Kibana'
  if (lowerName.includes('logstash')) return 'Logstash'

  // Clean up nself_ prefix for display
  let displayName = name.replace(/^nself[_-]/i, '')

  // Capitalize first letter of each word
  return displayName
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function ContainersTable({ services }: ContainersTableProps) {
  const [sortBy, setSortBy] = useState<'default' | 'name' | 'status' | 'cpu' | 'memory'>('default')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Organize services by category
  const requiredServices = services.filter((s) => getServiceCategory(s.name) === 'required')
  const optionalServices = services.filter((s) => getServiceCategory(s.name) === 'optional')
  const userServices = services.filter((s) => getServiceCategory(s.name) === 'user')

  // Sort services within each category
  const sortServices = (
    serviceList: ServiceStatus[],
    category: 'required' | 'optional' | 'user'
  ) => {
    return [...serviceList].sort((a, b) => {
      switch (sortBy) {
        case 'default': {
          const orderA = getServiceDefaultOrder(a.name, category)
          const orderB = getServiceDefaultOrder(b.name, category)
          return orderA - orderB
        }
        case 'name':
          return a.name.localeCompare(b.name)
        case 'status':
          return a.status.localeCompare(b.status)
        case 'cpu':
          return (b.cpu || 0) - (a.cpu || 0)
        case 'memory':
          return (b.memory || 0) - (a.memory || 0)
        default:
          return 0
      }
    })
  }

  // Filter services
  const filterServices = (serviceList: ServiceStatus[]) => {
    return serviceList.filter((s) => {
      if (filterStatus !== 'all' && s.status !== filterStatus) return false
      if (searchTerm && !s.name.toLowerCase().includes(searchTerm.toLowerCase())) return false
      return true
    })
  }

  const filteredRequired = filterServices(sortServices(requiredServices, 'required'))
  const filteredOptional = filterServices(sortServices(optionalServices, 'optional'))
  const filteredUser = filterServices(sortServices(userServices, 'user'))

  const getHealthStatus = (service: ServiceStatus) => {
    // Parse health status properly
    if (service.health?.includes('unhealthy')) return 'unhealthy'
    if (service.health?.includes('healthy')) return 'healthy'
    if (service.status === 'running') return 'healthy'
    return service.status
  }

  const getUptime = (health: string | undefined) => {
    if (!health) return null
    const match = health.match(/Up\s+(.+?)(?:\s+\(|$)/)
    return match ? match[1] : null
  }

  const renderServiceRow = (service: ServiceStatus, index: number) => {
    const healthStatus = getHealthStatus(service)
    const uptime = getUptime(service.health)

    return (
      <tr
        key={`${service.name}-${index}`}
        className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-950/10"
      >
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-white">
              {getServiceDisplayName(service.name)}
            </div>
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{service.name}</div>
          </div>
        </td>
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          <div>
            <div className="flex items-center">
              <div
                className={`mr-2 h-2 w-2 rounded-full ${
                  healthStatus === 'healthy'
                    ? 'bg-green-500'
                    : healthStatus === 'unhealthy'
                      ? 'bg-red-500'
                      : healthStatus === 'stopped'
                        ? 'bg-gray-500'
                        : 'bg-yellow-500'
                }`}
              />
              <span
                className={`text-sm font-medium capitalize ${
                  healthStatus === 'healthy'
                    ? 'text-green-600 dark:text-green-400'
                    : healthStatus === 'unhealthy'
                      ? 'text-red-600 dark:text-red-400'
                      : healthStatus === 'stopped'
                        ? 'text-gray-600 dark:text-gray-400'
                        : 'text-yellow-600 dark:text-yellow-400'
                }`}
              >
                {healthStatus}
              </span>
            </div>
            {uptime && (
              <div className="mt-1 ml-4 text-xs text-zinc-500 dark:text-zinc-400">Up {uptime}</div>
            )}
          </div>
        </td>
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {service.cpu ? `${service.cpu.toFixed(1)}%` : '0%'}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${Math.min(service.cpu || 0, 100)}%` }}
              />
            </div>
          </div>
        </td>
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {service.memory ? `${service.memory.toFixed(1)}%` : '0%'}
            </span>
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(service.memory || 0, 100)}%` }}
              />
            </div>
          </div>
        </td>
        <td className="border-b border-zinc-200/50 px-6 py-4 dark:border-zinc-700/50">
          {service.port ? (
            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
              {service.port}
            </span>
          ) : (
            <span className="text-sm text-zinc-400 dark:text-zinc-500">-</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="mb-16">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Container Services</h2>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-400"
          />

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-400"
          >
            <option value="all">All Status</option>
            <option value="healthy">Healthy</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="unhealthy">Unhealthy</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:focus:ring-blue-400"
          >
            <option value="default">Sort by Default</option>
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="cpu">Sort by CPU</option>
            <option value="memory">Sort by Memory</option>
          </select>
        </div>
      </div>

      <div className="not-prose overflow-hidden rounded-2xl bg-white ring-1 ring-zinc-200 dark:bg-zinc-900/50 dark:ring-zinc-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Service / Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Status / Uptime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  CPU Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Memory
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                  Port
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-zinc-900/30">
              {/* Required Services */}
              {filteredRequired.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-zinc-200/50 px-6 py-2 dark:border-zinc-700/30"
                    >
                      <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                        Required Services
                      </span>
                    </td>
                  </tr>
                  {filteredRequired.map((service, index) => renderServiceRow(service, index))}
                </>
              )}

              {/* Optional Services */}
              {filteredOptional.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-zinc-200/50 px-6 py-2 dark:border-zinc-700/30"
                    >
                      <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                        Optional Services
                      </span>
                    </td>
                  </tr>
                  {filteredOptional.map((service, index) => renderServiceRow(service, index))}
                </>
              )}

              {/* User Services */}
              {filteredUser.length > 0 && (
                <>
                  <tr>
                    <td
                      colSpan={5}
                      className="border-b border-zinc-200/50 px-6 py-2 dark:border-zinc-700/30"
                    >
                      <span className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                        User Services
                      </span>
                    </td>
                  </tr>
                  {filteredUser.map((service, index) => renderServiceRow(service, index))}
                </>
              )}

              {services.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-zinc-500 dark:text-zinc-400"
                  >
                    No containers found. Start your nself services to see them here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ContainersTable
