/**
 * Purpose: Wizard step 4 orchestrator — Custom Backend Services list, add
 *          button, and templates info panel. Extracted verbatim from
 *          ProjectSetupWizard.tsx's `case 'user-services':` render branch;
 *          the per-card JSX (previously a 188-line .map() callback inline
 *          here) now lives in CustomServiceCard.tsx.
 * Inputs: config, setConfig, showTemplateInfo, setShowTemplateInfo,
 *         serviceNameRefs.
 * Outputs: JSX for the User Services step.
 * Constraints: The "Add Service" click both appends to config.customServices
 *              AND schedules a focus() on the new row's name input via
 *              serviceNameRefs — keep both effects together (dropping the
 *              focus call is a UX regression, not a behavior-neutral trim).
 */
import { AlertCircle, Server } from 'lucide-react'
import type { MutableRefObject } from 'react'
import type { ProjectConfig } from '../types'
import { CustomServiceCard } from './CustomServiceCard'

interface UserServicesStepProps {
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  showTemplateInfo: boolean
  setShowTemplateInfo: (show: boolean) => void
  serviceNameRefs: MutableRefObject<{ [key: number]: HTMLInputElement | null }>
}

export function UserServicesStep(props: UserServicesStepProps) {
  const { config, setConfig, showTemplateInfo, setShowTemplateInfo, serviceNameRefs } = props

  return (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Custom Backend Services
                </h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Add your own backend services using templates or custom configuration.
                </p>
              </div>
              <button
                onClick={() => {
                  const newService = {
                    name: `service_${config.customServices.length + 1}`,
                    framework: 'nest',
                    port: 4000 + config.customServices.length,
                    route: '',
                  }
                  const newIndex = config.customServices.length
                  setConfig({
                    ...config,
                    customServices: [...config.customServices, newService],
                  })
                  // Auto-focus the new service name input
                  setTimeout(() => {
                    serviceNameRefs.current[newIndex]?.focus()
                    serviceNameRefs.current[newIndex]?.select()
                  }, 100)
                }}
                className="rounded-lg bg-green-100 px-3 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              >
                + Add Service
              </button>
            </div>

            {/* Service Templates Info */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Available Service Templates
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplateInfo(!showTemplateInfo)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {showTemplateInfo ? '▼ Hide Details' : '▶ Show Details'}
                </button>
              </div>

              {showTemplateInfo && (
                <div className="mt-3 grid grid-cols-3 gap-4 text-xs text-blue-700 dark:text-blue-300">
                  <div className="space-y-2">
                    <div>
                      <p className="mb-1 font-semibold text-blue-800 dark:text-blue-200">
                        📦 JavaScript / TS
                      </p>
                      <div className="ml-2 space-y-0.5">
                        <div title="Vanilla Node.js runtime">
                          • <b>Node.js</b> (JS/TS) - Vanilla runtime
                        </div>
                        <div title="Minimal web framework">
                          • <b>Express</b> (JS/TS) - Minimal, flexible
                        </div>
                        <div title="High-performance Node.js framework">
                          • <b>Fastify</b> (JS/TS) - 2x faster than Express
                        </div>
                        <div title="Enterprise Node.js framework">
                          • <b>NestJS</b> (JS/TS) - Angular-style architecture
                        </div>
                        <div title="Edge-first framework">
                          • <b>Hono</b> (TS) - Cloudflare Workers ready
                        </div>
                        <div title="Type-safe RPC">
                          • <b>tRPC</b> (TS) - End-to-end type safety
                        </div>
                        <div title="WebSocket library">
                          • <b>Socket.io</b> (JS/TS) - Real-time events
                        </div>
                        <div title="Job queue for Node.js">
                          • <b>BullMQ</b> (JS/TS) - Redis-based queue
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 font-semibold text-blue-800 dark:text-blue-200">
                        🚀 Alternative Runtimes
                      </p>
                      <div className="ml-2 space-y-0.5">
                        <div title="Secure TypeScript runtime">
                          • <b>Deno</b> (TS) - Secure by default
                        </div>
                        <div title="Fast all-in-one JavaScript runtime">
                          • <b>Bun</b> (JS/TS) - Fastest JS runtime
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="mb-1 font-semibold text-blue-800 dark:text-blue-200">
                        🐍 Python
                      </p>
                      <div className="ml-2 space-y-0.5">
                        <div title="Vanilla Python scripts">
                          • <b>Python</b> - Vanilla scripts
                        </div>
                        <div title="Minimal web framework">
                          • <b>Flask</b> (Python) - Simple APIs
                        </div>
                        <div title="Modern async framework">
                          • <b>FastAPI</b> (Python) - Auto docs, async
                        </div>
                        <div title="AI agent framework">
                          • <b>LangChain</b> (Python) - LLM agents
                        </div>
                        <div title="Distributed task queue">
                          • <b>Celery</b> (Python) - Background tasks
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 font-semibold text-blue-800 dark:text-blue-200">🏃 Go</p>
                      <div className="ml-2 space-y-0.5">
                        <div title="Vanilla Go">
                          • <b>Go</b> - Vanilla Go
                        </div>
                        <div title="Fast web framework">
                          • <b>Gin</b> (Go) - Minimal overhead
                        </div>
                        <div title="Express-like Go framework">
                          • <b>Fiber</b> (Go) - Express-inspired
                        </div>
                        <div title="Minimalist Go framework">
                          • <b>Echo</b> (Go) - High performance
                        </div>
                        <div title="RPC framework">
                          • <b>gRPC</b> (Go) - Binary protocol RPC
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="mb-1 font-semibold text-blue-800 dark:text-blue-200">💎 Ruby</p>
                      <div className="ml-2 space-y-0.5">
                        <div title="Vanilla Ruby scripts">
                          • <b>Ruby</b> - Vanilla scripts
                        </div>
                        <div title="Minimal web DSL">
                          • <b>Sinatra</b> (Ruby) - Minimal DSL
                        </div>
                        <div title="Background job processor">
                          • <b>Sidekiq</b> (Ruby) - Background jobs
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 font-semibold text-blue-800 dark:text-blue-200">
                        🔧 System Languages
                      </p>
                      <div className="ml-2 space-y-0.5">
                        <div title="Memory-safe systems language">
                          • <b>Rust</b> - Zero-cost abstractions
                        </div>
                        <div title="JVM language">
                          • <b>Java</b> - Enterprise JVM
                        </div>
                        <div title="Microsoft ecosystem">
                          • <b>C#</b> (.NET) - Cross-platform
                        </div>
                        <div title="Modern JVM language">
                          • <b>Kotlin</b> - Android compatible
                        </div>
                        <div title="Functional JVM language">
                          • <b>Scala</b> - Spark ready
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 font-semibold text-blue-800 dark:text-blue-200">
                        🎯 Other
                      </p>
                      <div className="ml-2 space-y-0.5">
                        <div title="Web scripting language">
                          • <b>PHP</b> - Web scripts
                        </div>
                        <div title="Fault-tolerant BEAM VM">
                          • <b>Elixir</b> - Erlang VM
                        </div>
                        <div title="Embedded scripting">
                          • <b>Lua</b> - Nginx/Redis
                        </div>
                        <div title="Workflow orchestration">
                          • <b>Temporal</b> (Go/Java) - Workflows
                        </div>
                        <div title="Custom Docker image">
                          • <b>Custom</b> - Any Docker image
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!showTemplateInfo && (
                <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                  Choose from 30+ backend frameworks optimized for APIs, workers, and microservices
                </p>
              )}
            </div>

            <div className="space-y-4">
              {config.customServices.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-zinc-300 py-8 text-center dark:border-zinc-600">
                  <Server className="mx-auto mb-3 h-12 w-12 text-zinc-400" />
                  <p className="text-zinc-600 dark:text-zinc-400">No custom services added yet</p>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
                    Click &quot;Add Service&quot; to create your first backend service
                  </p>
                </div>
              ) : (
                config.customServices.map((service, index) => (
                  <CustomServiceCard
                    key={index}
                    service={service}
                    index={index}
                    config={config}
                    setConfig={setConfig}
                    serviceNameRefs={serviceNameRefs}
                  />
                ))
              )}
            </div>
          </div>
  )
}
