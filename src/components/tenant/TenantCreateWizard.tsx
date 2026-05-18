'use client'

import type { CreateTenantInput } from '@/types/tenant'
import { Building2, Check, ChevronLeft, ChevronRight, Palette, Settings } from 'lucide-react'
import { useState } from 'react'

interface TenantCreateWizardProps {
  onCreate: (input: CreateTenantInput) => Promise<void>
  isLoading?: boolean
}

const steps = [
  { id: 'basics', title: 'Basic Info', icon: Building2 },
  { id: 'branding', title: 'Branding', icon: Palette },
  { id: 'settings', title: 'Settings', icon: Settings },
]

export function TenantCreateWizard({ onCreate, isLoading }: TenantCreateWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<CreateTenantInput>({
    name: '',
    slug: '',
    plan: 'free',
    branding: {
      primaryColor: '#10b981',
      secondaryColor: '#1f2937',
      accentColor: '#3b82f6',
    },
    settings: {
      allowPublicSignup: false,
      requireEmailVerification: true,
      maxMembers: 10,
    },
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateFormData = (updates: Partial<CreateTenantInput>) => {
    setFormData((prev) => ({ ...prev, ...updates }))
  }

  const validateStep = () => {
    const newErrors: Record<string, string> = {}

    if (currentStep === 0) {
      if (!formData.name.trim()) newErrors.name = 'Name is required'
      if (formData.name.length < 2) newErrors.name = 'Name must be at least 2 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (validateStep()) {
      await onCreate(formData)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 ${index <= currentStep ? 'text-emerald-400' : 'text-zinc-500'}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  index < currentStep
                    ? 'bg-emerald-500 text-white'
                    : index === currentStep
                      ? 'border-2 border-emerald-500'
                      : 'border-2 border-zinc-600'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <step.icon className="h-4 w-4" />
                )}
              </div>
              <span className="hidden text-sm font-medium sm:inline">{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-px w-12 ${index < currentStep ? 'bg-emerald-500' : 'bg-zinc-700'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-6">
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Basic Information</h2>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Tenant Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  updateFormData({
                    name: e.target.value,
                    slug: generateSlug(e.target.value),
                  })
                }}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="Acme Corporation"
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => updateFormData({ slug: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                placeholder="acme-corporation"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Plan</label>
              <select
                value={formData.plan}
                onChange={(e) =>
                  updateFormData({
                    plan: e.target.value as 'free' | 'pro' | 'enterprise',
                  })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Branding</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Primary Color</label>
                <input
                  type="color"
                  value={formData.branding?.primaryColor || '#10b981'}
                  onChange={(e) =>
                    updateFormData({
                      branding: {
                        ...formData.branding,
                        primaryColor: e.target.value,
                      },
                    })
                  }
                  className="h-10 w-full cursor-pointer rounded border-0"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Secondary Color</label>
                <input
                  type="color"
                  value={formData.branding?.secondaryColor || '#1f2937'}
                  onChange={(e) =>
                    updateFormData({
                      branding: {
                        ...formData.branding,
                        secondaryColor: e.target.value,
                      },
                    })
                  }
                  className="h-10 w-full cursor-pointer rounded border-0"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Accent Color</label>
                <input
                  type="color"
                  value={formData.branding?.accentColor || '#3b82f6'}
                  onChange={(e) =>
                    updateFormData({
                      branding: {
                        ...formData.branding,
                        accentColor: e.target.value,
                      },
                    })
                  }
                  className="h-10 w-full cursor-pointer rounded border-0"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Settings</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings?.allowPublicSignup || false}
                  onChange={(e) =>
                    updateFormData({
                      settings: {
                        ...formData.settings,
                        allowPublicSignup: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                />
                <span className="text-sm text-zinc-300">Allow public signup</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.settings?.requireEmailVerification || false}
                  onChange={(e) =>
                    updateFormData({
                      settings: {
                        ...formData.settings,
                        requireEmailVerification: e.target.checked,
                      },
                    })
                  }
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-emerald-500"
                />
                <span className="text-sm text-zinc-300">Require email verification</span>
              </label>
            </div>
            <div>
              <label className="mb-2 block text-sm text-zinc-400">Max Members</label>
              <input
                type="number"
                value={formData.settings?.maxMembers || 10}
                onChange={(e) =>
                  updateFormData({
                    settings: {
                      ...formData.settings,
                      maxMembers: parseInt(e.target.value),
                    },
                  })
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white focus:border-emerald-500 focus:outline-none"
                min={1}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        {currentStep < steps.length - 1 ? (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Tenant'}
          </button>
        )}
      </div>
    </div>
  )
}
