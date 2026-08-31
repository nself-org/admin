/**
 * Purpose: Search Service toggle + provider-select card in the Optional
 *          Services step, extracted verbatim from ProjectSetupWizard.tsx.
 * Inputs: config, setConfig, setSelectedService.
 * Outputs: JSX card.
 * Constraints: none beyond the shared section contract above.
 */
import { Search, Wrench } from 'lucide-react'
import type { ProjectConfig } from '../../types'

interface OptionalServiceSectionProps {
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  setSelectedService: (service: string | null) => void
}

export function SearchServiceSection(props: OptionalServiceSectionProps) {
  const { config, setConfig, setSelectedService } = props
  return (
    <div
      onClick={() => {
        if (!config.optionalServices.search.enabled) {
          setConfig({
            ...config,
            optionalServices: {
              ...config.optionalServices,
              search: {
                ...config.optionalServices.search,
                enabled: true,
              },
            },
          })
        }
      }}
      className={`rounded-lg border p-4 transition-all ${
        config.optionalServices.search.enabled
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
          : 'cursor-pointer border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-zinc-500'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Search
            className={`mt-0.5 h-5 w-5 transition-colors ${
              config.optionalServices.search.enabled
                ? 'text-cyan-500'
                : 'text-zinc-400 dark:text-zinc-600'
            }`}
          />
          <div className="flex-1">
            <h4
              className={`font-medium ${
                config.optionalServices.search.enabled
                  ? 'text-zinc-900 dark:text-white'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              Search Service
            </h4>
            <p
              className={`mt-1 text-sm ${
                config.optionalServices.search.enabled
                  ? 'text-zinc-600 dark:text-zinc-400'
                  : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              Full-text search engine for your application
            </p>
            {config.optionalServices.search.enabled && (
              <>
                <div className="mt-2">
                  <select
                    value={config.optionalServices.search.provider}
                    onChange={(e) => {
                      e.stopPropagation()
                      setConfig({
                        ...config,
                        optionalServices: {
                          ...config.optionalServices,
                          search: {
                            ...config.optionalServices.search,
                            provider: e.target.value as any,
                          },
                        },
                      })
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    <option value="auto">
                      Auto ({config.environment === 'dev' ? 'MeiliSearch' : 'MeiliSearch/Elastic'})
                    </option>
                    <optgroup label="Self-Hosted">
                      <option value="meilisearch">MeiliSearch</option>
                      <option value="elasticsearch">Elasticsearch</option>
                      <option value="opensearch">OpenSearch</option>
                      <option value="typesense">Typesense</option>
                      <option value="sonic">Sonic</option>
                    </optgroup>
                    <optgroup label="Database">
                      <option value="postgres">PostgreSQL FTS</option>
                    </optgroup>
                    <optgroup label="Cloud Services">
                      <option value="algolia">Algolia</option>
                    </optgroup>
                  </select>
                </div>
                <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  {config.optionalServices.search.provider === 'auto' &&
                    (config.environment === 'dev'
                      ? 'Uses MeiliSearch - Fast, typo-tolerant, minimal resources'
                      : config.environment === 'staging'
                        ? 'Uses MeiliSearch - Good for up to 100K documents'
                        : 'Uses MeiliSearch or Elasticsearch based on scale')}
                  {config.optionalServices.search.provider === 'meilisearch' &&
                    'Port: 7700 | Typo-tolerant | Fast'}
                  {config.optionalServices.search.provider === 'elasticsearch' &&
                    'Port: 9200 | Most powerful'}
                  {config.optionalServices.search.provider === 'opensearch' &&
                    'Port: 9200 | AWS fork of ES'}
                  {config.optionalServices.search.provider === 'typesense' &&
                    'Port: 8108 | Real-time search'}
                  {config.optionalServices.search.provider === 'sonic' && 'Port: 1491 | Ultra-fast'}
                  {config.optionalServices.search.provider === 'postgres' &&
                    'Built-in full-text search'}
                  {config.optionalServices.search.provider === 'algolia' &&
                    'Cloud-based | Instant search'}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2">
          {config.optionalServices.search.enabled ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfig({
                    ...config,
                    optionalServices: {
                      ...config.optionalServices,
                      search: {
                        ...config.optionalServices.search,
                        enabled: false,
                      },
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
                  setSelectedService('search')
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
