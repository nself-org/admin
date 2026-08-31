'use client'

/**
 * Purpose: Project Setup Wizard orchestrator — thin composition root (all
 *          state: useWizardConfigState()+useWizardPersistence(); all step
 *          JSX: steps/*.tsx; modal field data: service-fields.ts). This
 *          file used to BE the whole 3670-line wizard (P6-E11-W2-S3-T17).
 * Inputs: `mode` prop ('new' | 'edit' | 'reset').
 * Outputs: full wizard UI (progress bar, active step, nav, shared modal).
 * Constraints: dispatch-only — never re-derive state the hooks already own.
 */
import { Button } from '@/components/Button'
import { ServiceDetailModal } from '@/components/ServiceDetailModal'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  Layout,
  Loader2,
  Package,
  Server,
  Settings,
  Shield,
} from 'lucide-react'
import type { WizardStep } from './types'
import { SERVICE_FIELDS } from './service-fields'
import { useWizardConfigState } from './useWizardConfigState'
import { useWizardPersistence } from './useWizardPersistence'
import { InitialStep } from './steps/InitialStep'
import { RequiredServicesStep } from './steps/RequiredServicesStep'
import { OptionalServicesStep } from './steps/OptionalServicesStep'
import { UserServicesStep } from './steps/UserServicesStep'
import { AppsStep } from './steps/AppsStep'
import { ReviewStep } from './steps/ReviewStep'

interface ProjectSetupWizardProps {
  mode?: 'new' | 'edit' | 'reset'
}


export function ProjectSetupWizard({ mode = 'new' }: ProjectSetupWizardProps) {
  const state = useWizardConfigState()
  const {
    currentStep, setCurrentStep, isExecuting, commandOutput, showCliInstructions,
    setShowCliInstructions, domainPreview, setDomainPreview, showPassword,
    setShowPassword, isLoading, validationErrors, setValidationErrors,
    selectedService, setSelectedService, showTemplateInfo, setShowTemplateInfo,
    showFrameworkExamples, setShowFrameworkExamples, showWhyRegister,
    setShowWhyRegister, serviceNameRefs, appNameRefs, config, setConfig,
    steps, currentStepIndex, validateDomain,
  } = state
  const { handleNext, handleBack, clearWizardState, handleBuild } = useWizardPersistence(mode, state)

  const renderStepContent = () => {
    switch (currentStep) {
      case 'initial':
        return (
          <InitialStep config={config} setConfig={setConfig} validationErrors={validationErrors}
            setValidationErrors={setValidationErrors} domainPreview={domainPreview}
            setDomainPreview={setDomainPreview} showPassword={showPassword} setShowPassword={setShowPassword}
            showCliInstructions={showCliInstructions} setShowCliInstructions={setShowCliInstructions}
            validateDomain={validateDomain} />
        )
      case 'required-services':
        return <RequiredServicesStep config={config} setSelectedService={setSelectedService} />
      case 'optional-services':
        return (
          <OptionalServicesStep config={config} setConfig={setConfig} setSelectedService={setSelectedService} />
        )
      case 'user-services':
        return (
          <UserServicesStep config={config} setConfig={setConfig} showTemplateInfo={showTemplateInfo}
            setShowTemplateInfo={setShowTemplateInfo} serviceNameRefs={serviceNameRefs} />
        )
      case 'apps':
        return (
          <AppsStep config={config} setConfig={setConfig} showFrameworkExamples={showFrameworkExamples}
            setShowFrameworkExamples={setShowFrameworkExamples} showWhyRegister={showWhyRegister}
            setShowWhyRegister={setShowWhyRegister} appNameRefs={appNameRefs} />
        )
      case 'review':
        return <ReviewStep config={config} commandOutput={commandOutput} />
    }
  }

  const getStepTitle = (step: WizardStep) => {
    switch (step) {
      case 'initial':
        return 'Initial Setup'
      case 'required-services':
        return 'Required Services'
      case 'optional-services':
        return 'Optional Services'
      case 'user-services':
        return 'User Services'
      case 'apps':
        return 'Frontend Apps'
      case 'review':
        return 'Review & Build'
    }
  }

  const getStepIcon = (step: WizardStep) => {
    switch (step) {
      case 'initial':
        return Settings
      case 'required-services':
        return Database
      case 'optional-services':
        return Shield
      case 'user-services':
        return Server
      case 'apps':
        return Layout
      case 'review':
        return Package
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[400px] max-w-4xl items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-500" />
          <p className="text-zinc-600 dark:text-zinc-400">Loading wizard state...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Project Setup Wizard</h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              Configure your nself project step by step
            </p>
          </div>
          <button
            onClick={clearWizardState}
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            title="Clear all saved data and start over"
          >
            Start Fresh
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = getStepIcon(step)
              const isActive = index === currentStepIndex
              const isComplete = index < currentStepIndex

              return (
                <div key={step} className="relative flex-1">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => {
                        if (isComplete || index === 0) {
                          setCurrentStep(step)
                        }
                      }}
                      disabled={!isComplete && index > currentStepIndex}
                      className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${isComplete ? 'cursor-pointer bg-green-500 hover:bg-green-600' : isActive ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'} ${isComplete && 'hover:scale-110'} transition-all duration-300 ${!isComplete && index > currentStepIndex ? 'cursor-not-allowed' : ''} `}
                    >
                      {isComplete ? (
                        <CheckCircle className="h-6 w-6 text-white" />
                      ) : (
                        <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-zinc-500'}`} />
                      )}
                    </button>
                    {index < steps.length - 1 && (
                      <div
                        className={`absolute top-6 left-[50%] h-0.5 w-[100%] ${isComplete ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'} transition-colors duration-300`}
                      />
                    )}
                    <p
                      className={`mt-2 text-xs ${isActive ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-zinc-500'}`}
                    >
                      {getStepTitle(step)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
          <Button
            onClick={handleBack}
            variant="outline"
            disabled={currentStepIndex === 0 || isExecuting}
            className="flex items-center"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>

          {currentStep === 'review' ? (
            <Button
              onClick={handleBuild}
              variant="primary"
              disabled={isExecuting}
              className="flex items-center"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Building...
                </>
              ) : (
                <>
                  Build Project
                  <Package className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} variant="primary" className="flex items-center">
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Service Detail Modals */}
      {selectedService && (
        <ServiceDetailModal
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          serviceName={selectedService.charAt(0).toUpperCase() + selectedService.slice(1)}
          config={
            // Handle optional services config
            selectedService === 'redis'
              ? config.redisConfig
              : selectedService === 'mail'
                ? config.mailConfig
                : selectedService === 'monitoring'
                  ? config.monitoringConfig
                  : selectedService === 'search'
                    ? config.searchConfig
                    : selectedService === 'mlflow'
                      ? config.mlflowConfig
                      : selectedService === 'nadmin'
                        ? config.nadminConfig
                        : (config[selectedService as keyof typeof config] as any)
          }
          onSave={(newConfig) => {
            // Handle optional services config save
            if (selectedService === 'redis') {
              setConfig({ ...config, redisConfig: newConfig as any })
            } else if (selectedService === 'mail') {
              setConfig({ ...config, mailConfig: newConfig as any })
            } else if (selectedService === 'monitoring') {
              setConfig({ ...config, monitoringConfig: newConfig as any })
            } else if (selectedService === 'search') {
              setConfig({ ...config, searchConfig: newConfig as any })
            } else if (selectedService === 'mlflow') {
              setConfig({ ...config, mlflowConfig: newConfig as any })
            } else if (selectedService === 'nadmin') {
              setConfig({ ...config, nadminConfig: newConfig as any })
            } else {
              setConfig({
                ...config,
                [selectedService]: newConfig,
              })
            }
            setSelectedService(null)
          }}
          fields={SERVICE_FIELDS[selectedService as keyof typeof SERVICE_FIELDS] || []}
        />
      )}
    </>
  )
}
