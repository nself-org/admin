/**
 * Purpose: Wizard step 3 orchestrator — composes the 6 Optional Services
 *          section cards (nself-admin/Redis/Mail/Monitoring/Search/MLFlow).
 *          The original `case 'optional-services':` render branch was 709
 *          lines; each card is now its own file under optional-services/,
 *          this file keeps only the shared header + "Enable All" button.
 * Inputs: config, setConfig, setSelectedService.
 * Outputs: JSX for the Optional Services step.
 * Constraints: "Enable All" writes the full optionalServices object in one
 *              setConfig call — keep it atomic (not per-service toggles) so
 *              a partial-enable state is never rendered mid-click.
 */
import type { ProjectConfig } from '../types'
import { MailServiceSection } from './optional-services/MailServiceSection'
import { MLFlowSection } from './optional-services/MLFlowSection'
import { MonitoringSection } from './optional-services/MonitoringSection'
import { NselfAdminSection } from './optional-services/NselfAdminSection'
import { RedisCacheSection } from './optional-services/RedisCacheSection'
import { SearchServiceSection } from './optional-services/SearchServiceSection'

interface OptionalServicesStepProps {
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  setSelectedService: (service: string | null) => void
}

export function OptionalServicesStep(props: OptionalServicesStepProps) {
  const { config, setConfig, setSelectedService } = props

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Optional Services</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Click on any service card to enable it. Once enabled, you can configure its settings.
          </p>
        </div>
        <button
          onClick={() => {
            setConfig({
              ...config,
              optionalServices: {
                redis: true,
                mail: {
                  enabled: true,
                  provider: config.optionalServices.mail.provider,
                },
                monitoring: true,
                search: {
                  enabled: true,
                  provider: config.optionalServices.search.provider,
                },
                mlflow: true,
                adminUI: true,
              },
            })
          }}
          className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
        >
          Enable All
        </button>
      </div>

      <div className="grid gap-4">
        <NselfAdminSection config={config} setSelectedService={setSelectedService} />
        <RedisCacheSection
          config={config}
          setConfig={setConfig}
          setSelectedService={setSelectedService}
        />
        <MailServiceSection
          config={config}
          setConfig={setConfig}
          setSelectedService={setSelectedService}
        />
        <MonitoringSection
          config={config}
          setConfig={setConfig}
          setSelectedService={setSelectedService}
        />
        <SearchServiceSection
          config={config}
          setConfig={setConfig}
          setSelectedService={setSelectedService}
        />
        <MLFlowSection
          config={config}
          setConfig={setConfig}
          setSelectedService={setSelectedService}
        />
      </div>
    </div>
  )
}
