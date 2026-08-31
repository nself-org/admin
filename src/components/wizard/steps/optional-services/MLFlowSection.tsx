/**
 * Purpose: MLFlow toggle card in the Optional Services step, extracted
 *          verbatim from ProjectSetupWizard.tsx.
 * Inputs: config, setConfig, setSelectedService.
 * Outputs: JSX card.
 * Constraints: none beyond the shared section contract above.
 */
import { BarChart, Wrench } from 'lucide-react'
import type { ProjectConfig } from '../../types'

interface OptionalServiceSectionProps {
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  setSelectedService: (service: string | null) => void
}

export function MLFlowSection(props: OptionalServiceSectionProps) {
  const { config, setConfig, setSelectedService } = props
  return (
    <div
      onClick={() => {
        if (!config.optionalServices.mlflow) {
          setConfig({
            ...config,
            optionalServices: {
              ...config.optionalServices,
              mlflow: true,
            },
          })
        }
      }}
      className={`rounded-lg border p-4 transition-all ${
        config.optionalServices.mlflow
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
          : 'cursor-pointer border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-zinc-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <BarChart
            className={`mt-0.5 h-5 w-5 transition-colors ${
              config.optionalServices.mlflow ? 'text-sky-500' : 'text-zinc-400 dark:text-zinc-600'
            }`}
          />
          <div className="flex-1">
            <h4
              className={`font-medium ${
                config.optionalServices.mlflow
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              MLFlow
            </h4>
            <p
              className={`mt-1 text-sm ${
                config.optionalServices.mlflow
                  ? 'text-zinc-600 dark:text-zinc-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              ML lifecycle platform for experiments, models, and deployments
            </p>
            {config.optionalServices.mlflow && (
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                Port: 5000 | Backend: PostgreSQL | Artifacts: MinIO
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          {config.optionalServices.mlflow ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfig({
                    ...config,
                    optionalServices: {
                      ...config.optionalServices,
                      mlflow: false,
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
                  setSelectedService('mlflow')
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
