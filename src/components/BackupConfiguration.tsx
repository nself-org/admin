'use client'

import { createScopedTranslator } from '@/features/i18n'
import { Clock, Database, FileText, HardDrive, Image, Shield, Wrench } from 'lucide-react'
import { useState } from 'react'

interface BackupConfig {
  enabled: boolean
  types: {
    database: boolean
    images: boolean
    configs: boolean
  }
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
    time: string
    dayOfWeek?: number
    dayOfMonth?: number
    customCron?: string
  }
  retention: number
  compression: boolean
  encryption: boolean
}

interface BackupConfigurationProps {
  value: BackupConfig
  onChange: (config: BackupConfig) => void
}

export function BackupConfiguration({ value, onChange }: BackupConfigurationProps) {
  const t = createScopedTranslator('en', 'backup_config')
  const [showModal, setShowModal] = useState(false)

  const updateConfig = (updates: Partial<BackupConfig>) => {
    onChange({ ...value, ...updates })
  }

  const updateSchedule = (scheduleUpdates: Partial<BackupConfig['schedule']>) => {
    onChange({
      ...value,
      schedule: { ...value.schedule, ...scheduleUpdates },
    })
  }

  const updateTypes = (typeUpdates: Partial<BackupConfig['types']>) => {
    onChange({
      ...value,
      types: { ...value.types, ...typeUpdates },
    })
  }

  const toggleBackup = () => {
    updateConfig({ enabled: !value.enabled })
  }

  const enableBackup = () => {
    if (!value.enabled) {
      updateConfig({ enabled: true })
    }
  }

  // Generate cron expression from schedule
  const getCronExpression = () => {
    const { frequency, time, dayOfWeek, dayOfMonth, customCron } = value.schedule

    if (frequency === 'custom' && customCron) {
      return customCron
    }

    const [hour, minute] = time.split(':')

    switch (frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`
      case 'weekly':
        return `${minute} ${hour} * * ${dayOfWeek || 0}`
      case 'monthly':
        return `${minute} ${hour} ${dayOfMonth || 1} * *`
      default:
        return '0 2 * * *'
    }
  }

  const getScheduleDescription = () => {
    const { frequency, time, dayOfWeek, dayOfMonth } = value.schedule
    const [hour, minute] = time.split(':')
    const timeStr = `${hour}:${minute}`

    switch (frequency) {
      case 'daily':
        return `Daily backups at ${timeStr}`
      case 'weekly': {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        return `Weekly backups on ${days[dayOfWeek || 0]}s at ${timeStr}`
      }
      case 'monthly': {
        const suffix =
          dayOfMonth === 1 ? 'st' : dayOfMonth === 2 ? 'nd' : dayOfMonth === 3 ? 'rd' : 'th'
        return `Monthly backups on the ${dayOfMonth}${suffix} at ${timeStr}`
      }
      case 'custom':
        return `Custom schedule: ${getCronExpression()}`
      default:
        return `Daily backups at ${timeStr}`
    }
  }

  const getBackupTypesDescription = () => {
    const types = []
    if (value.types.database) types.push('database')
    if (value.types.images) types.push('images')
    if (value.types.configs) types.push('configuration files')

    if (types.length === 0) return 'No backup types selected'
    if (types.length === 1) return `Backing up ${types[0]}`
    if (types.length === 2) return `Backing up ${types.join(' and ')}`
    return `Backing up ${types.slice(0, -1).join(', ')} and ${types[types.length - 1]}`
  }

  const getOptionsDescription = () => {
    const options = []
    options.push(`${value.retention} day retention`)
    if (value.compression) options.push('compressed')
    if (value.encryption) options.push('encrypted')
    return options.join(', ')
  }

  return (
    <>
      <div className="space-y-4">
        {/* Card matching optional services style */}
        <div
          className={`relative rounded-lg border-2 p-5 transition-all ${
            value.enabled
              ? 'border-zinc-500/40 bg-zinc-50/40 dark:bg-zinc-900/10'
              : 'cursor-pointer border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800/30 dark:hover:border-zinc-600'
          }`}
          role="button"
          tabIndex={value.enabled ? -1 : 0}
          aria-label={t('enableBtn')}
          onClick={enableBackup}
          onKeyDown={(e) => {
            if (!value.enabled && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              enableBackup()
            }
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-start space-x-4" onClick={enableBackup}>
              <div
                className={`rounded-lg border p-2 ${
                  value.enabled
                    ? 'border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                    : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                }`}
              >
                <Shield
                  className={`h-6 w-6 ${
                    value.enabled
                      ? 'text-zinc-600 dark:text-zinc-400'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                />
              </div>
              <div className="flex-1">
                <h3
                  className={`mb-1 font-medium ${
                    value.enabled
                      ? 'text-zinc-900 dark:text-zinc-100'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {t('automatedBackups')}
                </h3>
                <p className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {t('automatedBackupsDesc')}
                </p>
                {value.enabled && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-500">
                    <p>
                      {getBackupTypesDescription()}. {getScheduleDescription()}.{' '}
                      {getOptionsDescription().charAt(0).toUpperCase() +
                        getOptionsDescription().slice(1)}
                      .
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="ml-4 flex flex-col items-end space-y-2">
              {/* Checkbox */}
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={value.enabled}
                  onChange={toggleBackup}
                  onClick={(e) => e.stopPropagation()} // Prevent parent click when using checkbox
                  className={`h-5 w-5 rounded border-2 focus:ring-2 ${
                    value.enabled
                      ? 'text-zinc-600 focus:ring-zinc-400'
                      : 'border-zinc-300 text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:hover:border-zinc-500'
                  }`}
                  style={{
                    accentColor: value.enabled ? '#52525b' : undefined,
                  }}
                />
              </label>

              {/* Configure link (only shown when enabled) */}
              {value.enabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation() // Prevent parent click when clicking configure
                    setShowModal(true)
                  }}
                  className="inline-flex items-center gap-1 text-xs text-zinc-600 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300"
                >
                  <Wrench className="h-3 w-3" />
                  <span>{t('configure')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white dark:bg-zinc-900">
            <div className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                {t('configureTitle')}
              </h2>

              <div className="space-y-6">
                {/* Backup Types */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('whatToBackup')}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <label
                      className={`relative flex cursor-pointer items-center rounded-lg border p-3 transition-all ${
                        value.types.database
                          ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                      } `}
                    >
                      <input
                        type="checkbox"
                        checked={value.types.database}
                        onChange={(e) => updateTypes({ database: e.target.checked })}
                        className="sr-only"
                      />
                      <Database
                        className={`mr-2 h-4 w-4 ${
                          value.types.database
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          value.types.database
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {t('database')}
                      </span>
                    </label>

                    <label
                      className={`relative flex cursor-pointer items-center rounded-lg border p-3 transition-all ${
                        value.types.images
                          ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                      } `}
                    >
                      <input
                        type="checkbox"
                        checked={value.types.images}
                        onChange={(e) => updateTypes({ images: e.target.checked })}
                        className="sr-only"
                      />
                      <Image
                        className={`mr-2 h-4 w-4 ${
                          value.types.images
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          value.types.images
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {t('images')}
                      </span>
                    </label>

                    <label
                      className={`relative flex cursor-pointer items-center rounded-lg border p-3 transition-all ${
                        value.types.configs
                          ? 'border-zinc-400 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                      } `}
                    >
                      <input
                        type="checkbox"
                        checked={value.types.configs}
                        onChange={(e) => updateTypes({ configs: e.target.checked })}
                        className="sr-only"
                      />
                      <FileText
                        className={`mr-2 h-4 w-4 ${
                          value.types.configs
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : 'text-zinc-400 dark:text-zinc-500'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          value.types.configs
                            ? 'text-zinc-900 dark:text-white'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {t('configs')}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('schedule')}
                  </label>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <select
                          value={value.schedule.frequency}
                          onChange={(e) =>
                            updateSchedule({
                              frequency: e.target.value as BackupConfig['schedule']['frequency'],
                            })
                          }
                          className="focus:ring-opacity-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                        >
                          <option value="daily">{t('freqDaily')}</option>
                          <option value="weekly">{t('freqWeekly')}</option>
                          <option value="monthly">{t('freqMonthly')}</option>
                          <option value="custom">{t('freqCustom')}</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <input
                          type="time"
                          value={value.schedule.time}
                          onChange={(e) => updateSchedule({ time: e.target.value })}
                          className="focus:ring-opacity-20 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                        />
                      </div>
                    </div>

                    {value.schedule.frequency === 'weekly' && (
                      <select
                        value={value.schedule.dayOfWeek || 0}
                        onChange={(e) =>
                          updateSchedule({
                            dayOfWeek: parseInt(e.target.value),
                          })
                        }
                        className="focus:ring-opacity-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                      >
                        <option value="0">{t('day_sunday')}</option>
                        <option value="1">{t('day_monday')}</option>
                        <option value="2">{t('day_tuesday')}</option>
                        <option value="3">{t('day_wednesday')}</option>
                        <option value="4">{t('day_thursday')}</option>
                        <option value="5">{t('day_friday')}</option>
                        <option value="6">{t('day_saturday')}</option>
                      </select>
                    )}

                    {value.schedule.frequency === 'monthly' && (
                      <input
                        type="number"
                        min="1"
                        max="28"
                        value={value.schedule.dayOfMonth || 1}
                        onChange={(e) =>
                          updateSchedule({
                            dayOfMonth: parseInt(e.target.value),
                          })
                        }
                        className="focus:ring-opacity-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                        placeholder="Day of month (1-28)"
                      />
                    )}

                    {value.schedule.frequency === 'custom' && (
                      <input
                        type="text"
                        value={value.schedule.customCron || ''}
                        onChange={(e) => updateSchedule({ customCron: e.target.value })}
                        className="focus:ring-opacity-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                        placeholder="0 2 * * * (Cron expression)"
                      />
                    )}

                    <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        Cron Expression:{' '}
                        <code className="ml-1 font-mono text-zinc-900 dark:text-white">
                          {getCronExpression()}
                        </code>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Advanced Options */}
                <div>
                  <label className="mb-3 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('advancedOptions')}
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm text-zinc-600 dark:text-zinc-400">
                        {t('retentionPeriod')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={value.retention}
                        onChange={(e) =>
                          updateConfig({
                            retention: parseInt(e.target.value) || 7,
                          })
                        }
                        className="focus:ring-opacity-20 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={value.compression}
                          onChange={(e) => updateConfig({ compression: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-zinc-600 focus:ring-2 focus:ring-zinc-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-zinc-600"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          <HardDrive className="mr-1 inline h-3 w-3" />
                          {t('enableCompression')}
                        </span>
                      </label>

                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={value.encryption}
                          onChange={(e) => updateConfig({ encryption: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 bg-gray-100 text-zinc-600 focus:ring-2 focus:ring-zinc-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-zinc-600"
                        />
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          <Shield className="mr-1 inline h-3 w-3" />
                          {t('enableEncryption')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                >
                  {t('cancelBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  {t('saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
