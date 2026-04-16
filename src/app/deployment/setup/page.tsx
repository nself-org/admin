'use client'

import { HeroPattern } from '@/components/HeroPattern'
import { FormSkeleton } from '@/components/skeletons'
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Key,
  Rocket,
  Server,
  Settings,
} from 'lucide-react'
import { Suspense, useState } from 'react'

interface SetupStep {
  id: number
  title: string
  description: string
  icon: typeof Server
}

const steps: SetupStep[] = [
  {
    id: 1,
    title: 'Choose Environment',
    description: 'Select the deployment environment type',
    icon: Server,
  },
  {
    id: 2,
    title: 'Configure Settings',
    description: 'Set up domain, SSL, and basic configuration',
    icon: Settings,
  },
  {
    id: 3,
    title: 'Set Secrets',
    description: 'Generate and configure environment secrets',
    icon: Key,
  },
  {
    id: 4,
    title: 'Deploy',
    description: 'Review and deploy your environment',
    icon: Rocket,
  },
]

function DeploymentSetupContent() {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedEnvironment, setSelectedEnvironment] = useState<
    'development' | 'staging' | 'production' | null
  >(null)
  const [domain, setDomain] = useState('')
  const [email, setEmail] = useState('')
  const [enableSSL, setEnableSSL] = useState(true)
  const [sshHost, setSSHHost] = useState('')
  const [sshUser, setSSHUser] = useState('')
  const [deployPath, setDeployPath] = useState('/var/www/app')
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentComplete, setDeploymentComplete] = useState(false)

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleDeploy = async () => {
    setIsDeploying(true)

    // Simulate deployment
    await new Promise((resolve) => setTimeout(resolve, 3000))

    setIsDeploying(false)
    setDeploymentComplete(true)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return selectedEnvironment !== null
      case 2:
        return domain.length > 0
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  return (
    <>
      <HeroPattern />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-10 border-b border-zinc-200 pb-8 dark:border-zinc-800">
          <h1 className="bg-gradient-to-r from-sky-500 to-blue-400 bg-clip-text text-4xl font-bold text-transparent dark:from-sky-400 dark:to-blue-300">
            Deployment Setup Wizard
          </h1>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
            Configure and deploy a new environment in 4 easy steps
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isCompleted = currentStep > step.id
              const isCurrent = currentStep === step.id

              return (
                <div key={step.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all ${
                        isCompleted
                          ? 'border-green-500 bg-green-500'
                          : isCurrent
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-800'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6 text-white" />
                      ) : (
                        <Icon
                          className={`h-6 w-6 ${isCurrent ? 'text-white' : 'text-zinc-400'}`}
                        />
                      )}
                    </div>
                    <p
                      className={`text-center text-sm font-medium ${isCurrent ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400'}`}
                    >
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`mx-4 h-0.5 flex-1 ${isCompleted ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          {currentStep === 1 && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
                Choose Environment Type
              </h2>
              <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                Select the type of environment you want to deploy
              </p>

              <div className="grid gap-4 md:grid-cols-3">
                {(['development', 'staging', 'production'] as const).map(
                  (env) => (
                    <button
                      key={env}
                      onClick={() => setSelectedEnvironment(env)}
                      className={`rounded-lg border-2 p-6 text-left transition-all ${
                        selectedEnvironment === env
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                      }`}
                    >
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-500">
                        <Server className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="mb-1 font-semibold text-zinc-900 capitalize dark:text-white">
                        {env}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {env === 'development'
                          ? 'Local development environment'
                          : env === 'staging'
                            ? 'Testing and QA environment'
                            : 'Production deployment'}
                      </p>
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
                Configure Settings
              </h2>
              <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                Set up your environment configuration
              </p>

              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Domain Name *
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder={
                      selectedEnvironment === 'production'
                        ? 'example.com'
                        : `${selectedEnvironment}.example.com`
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    SSL Certificate Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ssl"
                    checked={enableSSL}
                    onChange={(e) => setEnableSSL(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="ssl"
                    className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Enable SSL/TLS (Recommended)
                  </label>
                </div>

                {selectedEnvironment !== 'development' && (
                  <>
                    <div className="border-t border-zinc-200 pt-6 dark:border-zinc-700">
                      <h3 className="mb-4 font-semibold text-zinc-900 dark:text-white">
                        SSH Server Configuration
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            SSH Host
                          </label>
                          <input
                            type="text"
                            value={sshHost}
                            onChange={(e) => setSSHHost(e.target.value)}
                            placeholder={
                              selectedEnvironment === 'production'
                                ? 'prod.example.com'
                                : 'staging.example.com'
                            }
                            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                          />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              SSH User
                            </label>
                            <input
                              type="text"
                              value={sshUser}
                              onChange={(e) => setSSHUser(e.target.value)}
                              placeholder="deploy"
                              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              Deploy Path
                            </label>
                            <input
                              type="text"
                              value={deployPath}
                              onChange={(e) => setDeployPath(e.target.value)}
                              placeholder="/var/www/app"
                              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-zinc-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
                Configure Secrets
              </h2>
              <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                Generate secure secrets for your environment
              </p>

              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Secrets will be automatically generated on the server where
                  they will be used. This ensures they never leave the
                  production environment.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">
                      JWT Secret
                    </h4>
                    <p className="text-sm text-zinc-500">
                      256-bit secret for JWT signing
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">
                      Hasura Admin Secret
                    </h4>
                    <p className="text-sm text-zinc-500">
                      Secure admin access to Hasura
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">
                      Database Password
                    </h4>
                    <p className="text-sm text-zinc-500">
                      PostgreSQL admin password
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                  <div>
                    <h4 className="font-medium text-zinc-900 dark:text-white">
                      MinIO Access Keys
                    </h4>
                    <p className="text-sm text-zinc-500">
                      Storage service credentials
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
                Review and Deploy
              </h2>
              <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                Review your configuration before deploying
              </p>

              {!deploymentComplete ? (
                <>
                  <div className="mb-6 space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Environment
                      </span>
                      <span className="font-mono text-zinc-900 capitalize dark:text-white">
                        {selectedEnvironment}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        Domain
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-white">
                        {domain}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        SSL Enabled
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-white">
                        {enableSSL ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {sshHost && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            SSH Host
                          </span>
                          <span className="font-mono text-zinc-900 dark:text-white">
                            {sshHost}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                            Deploy User
                          </span>
                          <span className="font-mono text-zinc-900 dark:text-white">
                            {sshUser}@{sshHost}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying}
                    className="w-full rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 font-semibold text-white transition-all hover:from-sky-400 hover:to-blue-500 disabled:opacity-50"
                  >
                    {isDeploying ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Deploying...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Rocket className="h-5 w-5" />
                        Deploy Environment
                      </span>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-white">
                    Deployment Complete!
                  </h3>
                  <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                    Your {selectedEnvironment} environment has been successfully
                    configured and deployed.
                  </p>
                  <a
                    href="/deployment/environments"
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    View Environments
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        {!deploymentComplete && (
          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center gap-2 rounded-lg border border-zinc-300 px-6 py-2 font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-5 w-5" />
              Previous
            </button>

            <div className="text-sm text-zinc-500">
              Step {currentStep} of {steps.length}
            </div>

            <button
              onClick={handleNext}
              disabled={!canProceed() || currentStep === steps.length}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default function DeploymentSetupPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <DeploymentSetupContent />
    </Suspense>
  )
}
