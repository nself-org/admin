/**
 * Purpose: One custom-backend-service card (name/framework/port/route +
 *          remove button) in the User Services step, extracted verbatim
 *          from ProjectSetupWizard.tsx's `config.customServices.map(...)`
 *          callback body. `key={index}` was dropped from the returned
 *          element — key belongs on the <CustomServiceCard> usage in the
 *          parent's .map(), not inside this component's own JSX root.
 * Inputs: service, index, config, setConfig, serviceNameRefs (auto-focus
 *         ref map keyed by index, owned by the orchestrator).
 * Outputs: JSX card for one custom service.
 * Constraints: none beyond the shared props contract above.
 */
import { Terminal } from 'lucide-react'
import type { MutableRefObject } from 'react'
import type { ProjectConfig } from '../types'

interface CustomServiceCardProps {
  service: ProjectConfig['customServices'][number]
  index: number
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  serviceNameRefs: MutableRefObject<{ [key: number]: HTMLInputElement | null }>
}

export function CustomServiceCard(props: CustomServiceCardProps) {
  const { service, index, config, setConfig, serviceNameRefs } = props
  return (
                  <div
                                        className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Terminal className="h-5 w-5 text-blue-500" />
                        <input
                          ref={(el) => {
                            serviceNameRefs.current[index] = el
                          }}
                          type="text"
                          value={service.name}
                          onChange={(e) => {
                            const updatedServices = [...config.customServices]
                            const svc = updatedServices[index]
                            if (svc)
                              svc.name = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '')
                            setConfig({
                              ...config,
                              customServices: updatedServices,
                            })
                          }}
                          className="-ml-1 border-b border-transparent bg-transparent px-1 text-lg font-medium outline-none hover:border-zinc-300 focus:border-blue-500 dark:hover:border-zinc-600 dark:focus:border-blue-400"
                          placeholder="service_name"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const updatedServices = config.customServices.filter(
                            (_, i) => i !== index
                          )
                          setConfig({
                            ...config,
                            customServices: updatedServices,
                          })
                        }}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Framework
                        </label>
                        <select
                          value={service.framework}
                          onChange={(e) => {
                            const updatedServices = [...config.customServices]
                            const svc2 = updatedServices[index]
                            if (svc2) svc2.framework = e.target.value
                            setConfig({
                              ...config,
                              customServices: updatedServices,
                            })
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                        >
                          <optgroup label="JavaScript / TS">
                            <option value="nodejs">Node.js</option>
                            <option value="nodejs-ts">Node.js (TS)</option>
                            <option value="express">Express</option>
                            <option value="express-ts">Express (TS)</option>
                            <option value="fastify">Fastify</option>
                            <option value="fastify-ts">Fastify (TS)</option>
                            <option value="nest">NestJS</option>
                            <option value="nest-ts">NestJS (TS)</option>
                            <option value="hono">Hono</option>
                            <option value="trpc">tRPC</option>
                            <option value="socketio">Socket.io</option>
                            <option value="bullmq">BullMQ</option>
                            <option value="bullmq-ts">BullMQ (TS)</option>
                            <option value="deno">Deno</option>
                            <option value="bun">Bun</option>
                          </optgroup>
                          <optgroup label="Python">
                            <option value="python">Python</option>
                            <option value="flask">Flask</option>
                            <option value="fastapi">FastAPI</option>
                            <option value="langchain">LangChain</option>
                            <option value="celery">Celery</option>
                          </optgroup>
                          <optgroup label="Go">
                            <option value="go">Go</option>
                            <option value="gin">Gin</option>
                            <option value="fiber">Fiber</option>
                            <option value="echo">Echo</option>
                            <option value="grpc">gRPC</option>
                          </optgroup>
                          <optgroup label="Ruby">
                            <option value="ruby">Ruby</option>
                            <option value="sinatra">Sinatra</option>
                            <option value="sidekiq">Sidekiq</option>
                          </optgroup>
                          <optgroup label="Rust">
                            <option value="rust">Rust</option>
                          </optgroup>
                          <optgroup label="Java">
                            <option value="java">Java</option>
                            <option value="temporal">Temporal</option>
                          </optgroup>
                          <optgroup label="C# / .NET">
                            <option value="csharp">C# (.NET)</option>
                          </optgroup>
                          <optgroup label="Kotlin">
                            <option value="kotlin">Kotlin</option>
                          </optgroup>
                          <optgroup label="Scala">
                            <option value="scala">Scala</option>
                          </optgroup>
                          <optgroup label="PHP">
                            <option value="php">PHP</option>
                          </optgroup>
                          <optgroup label="Elixir">
                            <option value="elixir">Elixir</option>
                          </optgroup>
                          <optgroup label="Lua">
                            <option value="lua">Lua</option>
                          </optgroup>
                          <optgroup label="Other">
                            <option value="other">Custom Docker</option>
                          </optgroup>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Port
                        </label>
                        <input
                          type="number"
                          value={service.port}
                          onChange={(e) => {
                            const updatedServices = [...config.customServices]
                            const svc3 = updatedServices[index]
                            if (svc3) svc3.port = parseInt(e.target.value) || 3000
                            setConfig({
                              ...config,
                              customServices: updatedServices,
                            })
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                          placeholder="4000"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Route (Optional)
                          <span className="group relative ml-1 inline-block">
                            <span className="cursor-help text-xs">ⓘ</span>
                            <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-zinc-900 p-2 text-xs text-white shadow-lg group-hover:block">
                              <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-zinc-900"></div>
                              Leave empty for no routing, or specify subdomain (e.g.,
                              &quot;api&quot; for api.{config.domain}) or full URL
                            </div>
                          </span>
                        </label>
                        <input
                          type="text"
                          value={service.route}
                          onChange={(e) => {
                            const updatedServices = [...config.customServices]
                            const svc4 = updatedServices[index]
                            if (svc4) svc4.route = e.target.value
                            setConfig({
                              ...config,
                              customServices: updatedServices,
                            })
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                          placeholder={`api.${config.domain}`}
                        />
                      </div>
                    </div>

                    {service.route && (
                      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                        Will be accessible at:{' '}
                        {service.route.includes('.')
                          ? service.route
                          : `${service.route}.${config.domain}`}
                      </div>
                    )}
                  </div>
  )
}
