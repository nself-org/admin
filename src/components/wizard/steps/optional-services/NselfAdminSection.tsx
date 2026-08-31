/**
 * Purpose: "nself-admin — Always Enabled" card in the Optional Services step,
 *          extracted verbatim (this one service can't be toggled off).
 * Inputs: config, setSelectedService (Settings opens the shared modal —
 *          this card never calls setConfig, the toggle is always on).
 * Outputs: JSX card.
 * Constraints: Deliberately has no onClick toggle — do not add one without
 *              a product decision (nself-admin is mandatory infrastructure).
 */
import { Layout, Wrench } from 'lucide-react'
import type { ProjectConfig } from '../../types'

interface OptionalServiceSectionProps {
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  setSelectedService: (service: string | null) => void
}

// `config` isn't read here (this card's status text is static — nself-admin
// is always on) but stays in the prop type so every optional-services
// section shares one uniform call signature from OptionalServicesStep.
export function NselfAdminSection({ setSelectedService }: Pick<OptionalServiceSectionProps, 'config' | 'setSelectedService'>) {
  return (
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Layout className="mt-0.5 h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <h4 className="font-medium text-zinc-900 dark:text-white">
                        nself Admin Dashboard
                      </h4>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        This admin panel you&apos;re currently using (required)
                      </p>
                      <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">
                        Port: 3021 | Status: Active | Version: Latest
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Required
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedService('nadmin')
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Wrench className="mr-1 inline h-4 w-4" />
                      Settings
                    </button>
                  </div>
                </div>
  )
}
