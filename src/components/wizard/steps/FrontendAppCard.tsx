/**
 * Purpose: One frontend-app card (name/framework/port/subdomain/deployment
 *          target + remove button) in the Apps step, extracted verbatim
 *          from ProjectSetupWizard.tsx's `config.frontendApps.map(...)`
 *          callback body. `key={index}` was dropped from the returned
 *          element for the same reason as CustomServiceCard.
 * Inputs: app, index, config, setConfig, appNameRefs.
 * Outputs: JSX card for one frontend app.
 * Constraints: none beyond the shared props contract above.
 */
import { Globe } from 'lucide-react'
import type { MutableRefObject } from 'react'
import type { ProjectConfig } from '../types'

interface FrontendAppCardProps {
  app: ProjectConfig['frontendApps'][number]
  index: number
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  appNameRefs: MutableRefObject<{ [key: number]: HTMLInputElement | null }>
}

export function FrontendAppCard(props: FrontendAppCardProps) {
  const { app, index, config, setConfig, appNameRefs } = props
  return (
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-5 w-5 text-blue-500" />
                        <input
                          ref={(el) => {
                            appNameRefs.current[index] = el
                          }}
                          type="text"
                          value={app.displayName}
                          onChange={(e) => {
                            const updatedApps = [...config.frontendApps]
                            const app0 = updatedApps[index]
                            if (app0) app0.displayName = e.target.value
                            setConfig({ ...config, frontendApps: updatedApps })
                          }}
                          className="-ml-1 border-b border-transparent bg-transparent px-1 text-lg font-medium outline-none hover:border-zinc-300 focus:border-blue-500 dark:hover:border-zinc-600 dark:focus:border-blue-400"
                          placeholder="App Display Name"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const updatedApps = config.frontendApps.filter((_, i) => i !== index)
                          setConfig({ ...config, frontendApps: updatedApps })
                        }}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          App Identifier
                        </label>
                        <input
                          type="text"
                          value={app.name}
                          onChange={(e) => {
                            const updatedApps = [...config.frontendApps]
                            const app1 = updatedApps[index]
                            if (app1)
                              app1.name = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
                            setConfig({ ...config, frontendApps: updatedApps })
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                          placeholder="app_name"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Table Prefix
                        </label>
                        <input
                          type="text"
                          value={app.tablePrefix}
                          onChange={(e) => {
                            const updatedApps = [...config.frontendApps]
                            const app2 = updatedApps[index]
                            if (app2)
                              app2.tablePrefix = e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_]/g, '')
                            setConfig({ ...config, frontendApps: updatedApps })
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                          placeholder="app_"
                        />
                        <p className="mt-0.5 text-xs text-zinc-500">e.g., app_users, app_posts</p>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Framework
                        </label>
                        <select
                          value={app.framework}
                          onChange={(e) => {
                            const updatedApps = [...config.frontendApps]
                            const app3 = updatedApps[index]
                            if (app3) app3.framework = e.target.value
                            setConfig({ ...config, frontendApps: updatedApps })
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                        >
                          <optgroup label="React">
                            <option value="nextjs">Next.js</option>
                            <option value="vite-react">Vite React</option>
                            <option value="cra">Create React App</option>
                            <option value="remix">Remix</option>
                          </optgroup>
                          <optgroup label="Vue">
                            <option value="nuxt">Nuxt</option>
                            <option value="vite-vue">Vite Vue</option>
                          </optgroup>
                          <optgroup label="Other">
                            <option value="sveltekit">SvelteKit</option>
                            <option value="solidstart">SolidStart</option>
                            <option value="astro">Astro</option>
                            <option value="angular">Angular</option>
                            <option value="flutter">Flutter Web</option>
                            <option value="other">Other</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Local Port
                        </label>
                        <input
                          type="number"
                          value={app.port}
                          onChange={(e) => {
                            const updatedApps = [...config.frontendApps]
                            const app4 = updatedApps[index]
                            if (app4) app4.port = parseInt(e.target.value) || 3000
                            setConfig({ ...config, frontendApps: updatedApps })
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                          placeholder="3001"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Dev Subdomain
                        </label>
                        <div className="flex items-center">
                          <input
                            type="text"
                            value={app.subdomain}
                            onChange={(e) => {
                              const updatedApps = [...config.frontendApps]
                              const app5 = updatedApps[index]
                              if (app5)
                                app5.subdomain = e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9-]/g, '')
                              setConfig({
                                ...config,
                                frontendApps: updatedApps,
                              })
                            }}
                            className="flex-1 rounded-l border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                            placeholder="app"
                          />
                          <span className="rounded-r border border-l-0 border-zinc-300 bg-zinc-100 px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-700">
                            .{config.domain}
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                          Deployment
                        </label>
                        <select
                          value={app.deployment}
                          onChange={(e) => {
                            const updatedApps = [...config.frontendApps]
                            const app6 = updatedApps[index]
                            if (app6) app6.deployment = e.target.value as any
                            setConfig({ ...config, frontendApps: updatedApps })
                          }}
                          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                        >
                          <option value="local">Local/Docker</option>
                          <option value="vercel">Vercel</option>
                          <option value="netlify">Netlify</option>
                          <option value="cloudflare">Cloudflare Pages</option>
                          <option value="other">Other CDN</option>
                        </select>
                      </div>
                    </div>

                    {config.environment === 'dev' && app.deployment === 'local' && (
                      <div className="mt-3 rounded bg-blue-50 p-2 text-xs dark:bg-blue-900/20">
                        <p className="text-blue-700 dark:text-blue-300">
                          <b>Dev Routing:</b> {app.subdomain}.{config.domain} → localhost:{app.port}
                        </p>
                        <p className="mt-1 text-blue-600 dark:text-blue-400">
                          Nginx will proxy requests from the subdomain to your local dev server
                        </p>
                      </div>
                    )}
                  </div>
  )
}
