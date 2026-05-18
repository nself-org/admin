'use client'

import { Dialog, Transition } from '@headlessui/react'
import { Info, X } from 'lucide-react'
import { Fragment, useState } from 'react'

interface ServiceConfig {
  [key: string]: string | number | boolean
}

interface ServiceDetailModalProps {
  isOpen: boolean
  onClose: () => void
  serviceName: string
  config: ServiceConfig
  onSave: (config: ServiceConfig) => void
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'select' | 'boolean' | 'password'
    placeholder?: string
    options?: Array<{ value: string; label: string }>
    help?: string
    advanced?: boolean
  }>
}

export function ServiceDetailModal({
  isOpen,
  onClose,
  serviceName,
  config,
  onSave,
  fields,
}: ServiceDetailModalProps) {
  const [localConfig, setLocalConfig] = useState(config)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSave = () => {
    onSave(localConfig)
    onClose()
  }

  const basicFields = fields.filter((f) => !f.advanced)
  const advancedFields = fields.filter((f) => f.advanced)

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="bg-opacity-50 fixed inset-0 bg-black" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all dark:bg-zinc-800">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-zinc-900 dark:text-white"
                    >
                      {serviceName} - Detailed Configuration
                    </Dialog.Title>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      Configure advanced settings for {serviceName}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[60vh] space-y-4 overflow-y-auto">
                  {/* Basic Fields */}
                  {basicFields.map((field) => (
                    <div key={field.key}>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {field.label}
                        {field.help && (
                          <span className="group relative ml-1 inline-block">
                            <Info className="inline h-3 w-3 text-zinc-400" />
                            <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-zinc-900 p-2 text-xs text-white shadow-lg group-hover:block">
                              <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-zinc-900"></div>
                              {field.help}
                            </div>
                          </span>
                        )}
                      </label>
                      {field.type === 'boolean' ? (
                        <label className="flex cursor-pointer items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={localConfig[field.key] as boolean}
                            onChange={(e) =>
                              setLocalConfig({
                                ...localConfig,
                                [field.key]: e.target.checked,
                              })
                            }
                            className="text-blue-600"
                          />
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">Enabled</span>
                        </label>
                      ) : field.type === 'select' ? (
                        <select
                          value={localConfig[field.key] as string}
                          onChange={(e) =>
                            setLocalConfig({
                              ...localConfig,
                              [field.key]: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        >
                          {field.options?.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={localConfig[field.key] as string}
                          onChange={(e) =>
                            setLocalConfig({
                              ...localConfig,
                              [field.key]: e.target.value,
                            })
                          }
                          placeholder={field.placeholder}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                        />
                      )}
                    </div>
                  ))}

                  {/* Advanced Fields Toggle */}
                  {advancedFields.length > 0 && (
                    <>
                      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
                        <button
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings...
                        </button>
                      </div>

                      {showAdvanced && (
                        <div className="space-y-4">
                          {advancedFields.map((field) => (
                            <div key={field.key}>
                              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {field.label}
                                {field.help && (
                                  <span className="group relative ml-1 inline-block">
                                    <Info className="inline h-3 w-3 text-zinc-400" />
                                    <div className="absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-zinc-900 p-2 text-xs text-white shadow-lg group-hover:block">
                                      <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rotate-45 bg-zinc-900"></div>
                                      {field.help}
                                    </div>
                                  </span>
                                )}
                              </label>
                              {field.type === 'boolean' ? (
                                <label className="flex cursor-pointer items-center space-x-3">
                                  <input
                                    type="checkbox"
                                    checked={localConfig[field.key] as boolean}
                                    onChange={(e) =>
                                      setLocalConfig({
                                        ...localConfig,
                                        [field.key]: e.target.checked,
                                      })
                                    }
                                    className="text-blue-600"
                                  />
                                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                    Enabled
                                  </span>
                                </label>
                              ) : field.type === 'select' ? (
                                <select
                                  value={localConfig[field.key] as string}
                                  onChange={(e) =>
                                    setLocalConfig({
                                      ...localConfig,
                                      [field.key]: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                >
                                  {field.options?.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={field.type}
                                  value={localConfig[field.key] as string}
                                  onChange={(e) =>
                                    setLocalConfig({
                                      ...localConfig,
                                      [field.key]: e.target.value,
                                    })
                                  }
                                  placeholder={field.placeholder}
                                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Save Configuration
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
