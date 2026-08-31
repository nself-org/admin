/**
 * Purpose: Mail Service toggle + provider-select card in the Optional
 *          Services step, extracted verbatim from ProjectSetupWizard.tsx.
 * Inputs: config, setConfig, setSelectedService.
 * Outputs: JSX card.
 * Constraints: none beyond the shared section contract above.
 */
import { Mail, Wrench } from 'lucide-react'
import type { ProjectConfig } from '../../types'

interface OptionalServiceSectionProps {
  config: ProjectConfig
  setConfig: (config: ProjectConfig) => void
  setSelectedService: (service: string | null) => void
}

export function MailServiceSection(props: OptionalServiceSectionProps) {
  const { config, setConfig, setSelectedService } = props
  return (
              <div
                onClick={() => {
                  if (!config.optionalServices.mail.enabled) {
                    setConfig({
                      ...config,
                      optionalServices: {
                        ...config.optionalServices,
                        mail: {
                          ...config.optionalServices.mail,
                          enabled: true,
                        },
                      },
                    })
                  }
                }}
                className={`rounded-lg border p-4 transition-all ${
                  config.optionalServices.mail.enabled
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                    : 'cursor-pointer border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800/50 dark:hover:border-zinc-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Mail
                      className={`mt-0.5 h-5 w-5 transition-colors ${
                        config.optionalServices.mail.enabled
                          ? 'text-sky-500'
                          : 'text-zinc-400 dark:text-zinc-600'
                      }`}
                    />
                    <div className="flex-1">
                      <h4
                        className={`font-medium ${
                          config.optionalServices.mail.enabled
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                      >
                        Mail Service
                      </h4>
                      <p
                        className={`mt-1 text-sm ${
                          config.optionalServices.mail.enabled
                            ? 'text-zinc-600 dark:text-zinc-400'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      >
                        Email delivery and testing service
                      </p>
                      {config.optionalServices.mail.enabled && (
                        <>
                          <div className="mt-2">
                            <select
                              value={config.optionalServices.mail.provider}
                              onChange={(e) => {
                                e.stopPropagation()
                                setConfig({
                                  ...config,
                                  optionalServices: {
                                    ...config.optionalServices,
                                    mail: {
                                      ...config.optionalServices.mail,
                                      provider: e.target.value as any,
                                    },
                                  },
                                })
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              <option value="auto">
                                Auto (
                                {config.environment === 'dev'
                                  ? 'Mailpit'
                                  : config.environment === 'staging'
                                    ? 'SendGrid'
                                    : 'SendGrid/SES'}
                                )
                              </option>
                              <optgroup label="Development">
                                <option value="mailpit">Mailpit</option>
                              </optgroup>
                              <optgroup label="Popular Services">
                                <option value="sendgrid">SendGrid</option>
                                <option value="ses">AWS SES</option>
                                <option value="mailgun">Mailgun</option>
                                <option value="postmark">Postmark</option>
                                <option value="resend">Resend</option>
                                <option value="brevo">Brevo (SendinBlue)</option>
                              </optgroup>
                              <optgroup label="Email Providers">
                                <option value="gmail">Gmail</option>
                                <option value="outlook">Outlook/Office365</option>
                              </optgroup>
                              <optgroup label="Other Services">
                                <option value="sparkpost">SparkPost</option>
                                <option value="mandrill">Mandrill</option>
                                <option value="elastic">Elastic Email</option>
                                <option value="smtp2go">SMTP2GO</option>
                                <option value="mailersend">MailerSend</option>
                              </optgroup>
                              <optgroup label="Self-Hosted">
                                <option value="postfix">Postfix</option>
                                <option value="smtp">Custom SMTP</option>
                              </optgroup>
                            </select>
                          </div>
                          <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                            {config.optionalServices.mail.provider === 'auto' &&
                              (config.environment === 'dev'
                                ? 'Uses Mailpit - Local email capture with web UI'
                                : config.environment === 'staging'
                                  ? 'Uses SendGrid - 100 emails/day free tier'
                                  : 'Uses SendGrid or AWS SES based on region')}
                            {config.optionalServices.mail.provider === 'mailpit' &&
                              'SMTP: 1025 | Web UI: 8025'}
                            {config.optionalServices.mail.provider === 'smtp' &&
                              'Custom SMTP configuration'}
                            {config.optionalServices.mail.provider === 'sendgrid' &&
                              '100 emails/day free'}
                            {config.optionalServices.mail.provider === 'ses' &&
                              '$0.10 per 1000 emails'}
                            {config.optionalServices.mail.provider === 'mailgun' &&
                              'First 1000 emails free'}
                            {config.optionalServices.mail.provider === 'postmark' &&
                              'Transactional specialist'}
                            {config.optionalServices.mail.provider === 'gmail' &&
                              'Personal/workspace account'}
                            {config.optionalServices.mail.provider === 'outlook' &&
                              'Office 365 integration'}
                            {config.optionalServices.mail.provider === 'resend' &&
                              'Developer-friendly API'}
                            {config.optionalServices.mail.provider === 'brevo' &&
                              'Marketing & transactional'}
                            {config.optionalServices.mail.provider === 'sparkpost' &&
                              'Enterprise-ready'}
                            {config.optionalServices.mail.provider === 'mandrill' && 'By Mailchimp'}
                            {config.optionalServices.mail.provider === 'elastic' &&
                              'High volume sender'}
                            {config.optionalServices.mail.provider === 'smtp2go' &&
                              'Reliable delivery'}
                            {config.optionalServices.mail.provider === 'mailersend' &&
                              'Transactional emails'}
                            {config.optionalServices.mail.provider === 'postfix' &&
                              'Self-hosted server'}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {config.optionalServices.mail.enabled ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setConfig({
                              ...config,
                              optionalServices: {
                                ...config.optionalServices,
                                mail: {
                                  ...config.optionalServices.mail,
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
                            setSelectedService('mail')
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
