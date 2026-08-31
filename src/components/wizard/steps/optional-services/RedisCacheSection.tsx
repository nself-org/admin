/**
 * Purpose: Redis Cache toggle card in the Optional Services step, extracted
 *          verbatim from ProjectSetupWizard.tsx.
 * Inputs: config, setConfig (toggle enable), setSelectedService (Settings
 *         button opens the shared ServiceDetailModal in the orchestrator).
 * Outputs: JSX card.
 * Constraints: none beyond the shared section contract above.
 */
import { Database, Wrench } from 'lucide-react'
import type { ProjectConfig } from '../../types'

interface OptionalServiceSectionProps {
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  setSelectedService: (service: string | null) => void
}

export function RedisCacheSection(props: OptionalServiceSectionProps) {
  const { config, setConfig, setSelectedService } = props
  return (
    <div
      onClick={() => {
        if (!config.optionalServices.redis) {
          setConfig({
            ...config,
            optionalServices: {
              ...config.optionalServices,
              redis: true,
            },
          })
        }
      }}
      className={`rounded-lg border p-4 transition-all ${
        config.optionalServices.redis
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
          : 'cursor-pointer border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-zinc-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Database
            className={`mt-0.5 h-5 w-5 transition-colors ${
              config.optionalServices.redis ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-600'
            }`}
          />
          <div className="flex-1">
            <h4
              className={`font-medium ${
                config.optionalServices.redis
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Redis Cache
            </h4>
            <p
              className={`mt-1 text-sm ${
                config.optionalServices.redis
                  ? 'text-zinc-600 dark:text-zinc-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              In-memory data store for caching, sessions, and pub/sub
            </p>
            {config.optionalServices.redis && (
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                Port: 6379 | Persistence: Enabled | Max Memory: 256MB
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          {config.optionalServices.redis ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfig({
                    ...config,
                    optionalServices: {
                      ...config.optionalServices,
                      redis: false,
                    },
                  })
                }}
                className="cursor-pointer rounded bg-green-100 px-2 py-1 text-xs text-green-700 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              >
                Enabled
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedService('redis')
                }}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <Wrench className="mr-1 inline h-4 w-4" />
                Settings
              </button>
            </>
          ) : (
            <span className="rounded bg-zinc-200 px-2 py-1 text-xs text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400">
              Disabled
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
