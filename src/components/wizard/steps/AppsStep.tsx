/**
 * Purpose: Wizard step 5 orchestrator — Frontend Applications list + add
 *          button. Extracted verbatim from ProjectSetupWizard.tsx's
 *          `case 'apps':` render branch; the per-card JSX (previously a
 *          194-line .map() callback inline here) now lives in
 *          FrontendAppCard.tsx.
 * Inputs: config, setConfig, showFrameworkExamples, setShowFrameworkExamples,
 *         showWhyRegister, setShowWhyRegister, appNameRefs.
 * Outputs: JSX for the Apps step.
 * Constraints: none beyond the shared props contract above.
 */
import { AlertCircle, ChevronDown, ChevronRight, Globe, Plus } from 'lucide-react'
import type { MutableRefObject } from 'react'
import type { ProjectConfig } from '../types'
import { FrontendAppCard } from './FrontendAppCard'

interface AppsStepProps {
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  showFrameworkExamples: boolean
  setShowFrameworkExamples: (show: boolean) => void
  showWhyRegister: boolean
  setShowWhyRegister: (show: boolean) => void
  appNameRefs: MutableRefObject<{ [key: number]: HTMLInputElement | null }>
}

export function AppsStep(props: AppsStepProps) {
  const {
    config,
    setConfig,
    showFrameworkExamples,
    setShowFrameworkExamples,
    showWhyRegister,
    setShowWhyRegister,
    appNameRefs,
  } = props

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Frontend Applications
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Register frontend apps that will connect to your backend services
          </p>
        </div>
        <button
          onClick={() => {
            const newApp = {
              name: `app_${config.frontendApps.length + 1}`,
              displayName: `App ${config.frontendApps.length + 1}`,
              tablePrefix: `app${config.frontendApps.length + 1}_`,
              port: 3000 + config.frontendApps.length + 1,
              subdomain: `app${config.frontendApps.length + 1}`,
              framework: 'nextjs',
              deployment: 'local' as const,
              enabled: true,
            }
            const newIndex = config.frontendApps.length
            setConfig({
              ...config,
              frontendApps: [...config.frontendApps, newApp],
            })
            // Auto-focus the new app display name input
            setTimeout(() => {
              appNameRefs.current[newIndex]?.focus()
              appNameRefs.current[newIndex]?.select()
            }, 100)
          }}
          className="flex items-center space-x-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" />
          <span>Add Frontend App</span>
        </button>
      </div>

      {/* Why Register Frontend Apps */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Frontend App Registration
            </p>
          </div>
          <button
            onClick={() => setShowWhyRegister(!showWhyRegister)}
            className="flex items-center space-x-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
          >
            {showWhyRegister ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>{showWhyRegister ? 'Hide' : 'Show'} Details</span>
          </button>
        </div>

        {showWhyRegister && (
          <div className="mt-3 border-t border-blue-200 pt-3 dark:border-blue-700">
            <p className="mb-2 text-sm font-medium text-blue-700 dark:text-blue-300">
              Why Register Frontend Applications?
            </p>
            <div className="space-y-2 text-xs text-blue-700 dark:text-blue-300">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <div>
                  <strong>Database Table Isolation:</strong> Each app gets its own table prefix
                  (e.g., app1_users, app2_posts) preventing data collisions in multi-tenant
                  architectures
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <div>
                  <strong>Development Routing:</strong> Automatic subdomain routing (app.localhost →
                  localhost:3001) for local development without manual nginx config
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <div>
                  <strong>Backend Service Awareness:</strong> Your backend knows which frontend apps
                  exist, enabling app-specific configurations, permissions, and API responses
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <div>
                  <strong>Universal Framework Support:</strong> Works with ANY frontend technology -
                  React, Vue, Angular, Swift, Kotlin, Flutter, or even vanilla JavaScript. If it can
                  call APIs or GraphQL, it works!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFrameworkExamples(!showFrameworkExamples)}
              className="mt-3 flex items-center space-x-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              {showFrameworkExamples ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>{showFrameworkExamples ? 'Hide' : 'Show'} Framework Examples</span>
            </button>

            {showFrameworkExamples && (
              <div className="mt-3 border-t border-blue-200 pt-3 dark:border-blue-700">
                <p className="mb-2 text-xs font-medium text-blue-700 dark:text-blue-300">
                  Example Frontend Technologies (Not Limited To):
                </p>
                <div className="grid grid-cols-3 gap-3 text-xs text-blue-600 dark:text-blue-400">
                  <div>
                    <p className="mb-1 font-semibold">Web Frameworks</p>
                    <div className="ml-2 space-y-0.5 text-blue-700 dark:text-blue-300">
                      <div>• React/Next.js/Remix</div>
                      <div>• Vue/Nuxt</div>
                      <div>• Angular</div>
                      <div>• Svelte/SvelteKit</div>
                      <div>• Solid.js</div>
                      <div>• Qwik</div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold">Mobile Apps</p>
                    <div className="ml-2 space-y-0.5 text-blue-700 dark:text-blue-300">
                      <div>• React Native</div>
                      <div>• Flutter</div>
                      <div>• Swift/SwiftUI</div>
                      <div>• Kotlin</div>
                      <div>• Ionic</div>
                      <div>• NativeScript</div>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold">Desktop & Others</p>
                    <div className="ml-2 space-y-0.5 text-blue-700 dark:text-blue-300">
                      <div>• Electron</div>
                      <div>• Tauri</div>
                      <div>• Unity/Unreal</div>
                      <div>• WPF/.NET</div>
                      <div>• Qt/PyQt</div>
                      <div>• CLI Tools</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Frontend Apps List */}
      <div className="space-y-4">
        {config.frontendApps.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-300 py-8 text-center dark:border-zinc-600">
            <Globe className="mx-auto mb-3 h-12 w-12 text-zinc-400" />
            <p className="text-zinc-600 dark:text-zinc-400">
              No frontend applications configured yet
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              Click &quot;Add Frontend App&quot; to register your first application
            </p>
          </div>
        ) : (
          config.frontendApps.map((app, index) => (
            <FrontendAppCard
              key={index}
              app={app}
              index={index}
              config={config}
              setConfig={setConfig}
              appNameRefs={appNameRefs}
            />
          ))
        )}
      </div>
    </div>
  )
}
