'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { helpArticlesArray, type HelpArticle } from '@/data/help-content'
import { Check, ChevronRight, Clock } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { Suspense } from 'react'

interface Step {
  id: number
  title: string
  description: string
  completed: boolean
}

function GettingStartedContent() {
  const [currentStep, setCurrentStep] = React.useState(1)
  const [steps, setSteps] = React.useState<Step[]>([
    {
      id: 1,
      title: 'Install nself CLI',
      description: 'Install the nself command-line tool globally',
      completed: false,
    },
    {
      id: 2,
      title: 'Initialize Project',
      description: 'Create a new nself project with all services',
      completed: false,
    },
    {
      id: 3,
      title: 'Configure Environment',
      description: 'Set up your environment variables and secrets',
      completed: false,
    },
    {
      id: 4,
      title: 'Build Configuration',
      description: 'Generate service configurations from env files',
      completed: false,
    },
    {
      id: 5,
      title: 'Start Services',
      description: 'Launch all services and verify they are running',
      completed: false,
    },
  ])

  const getStartedArticles = helpArticlesArray.filter(
    (a: HelpArticle) => a.category === 'getting-started'
  )

  const markStepComplete = (stepId: number) => {
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s)))
    if (stepId < steps.length) {
      setCurrentStep(stepId + 1)
    }
  }

  const currentStepData = steps.find((s) => s.id === currentStep)

  return (
    <>
      <PageHeader
        title="Getting Started with nself"
        description="Follow this step-by-step guide to set up your first nself project"
      />
      <PageContent>
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Progress Bar */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Your Progress</h3>
                <span className="text-sm text-zinc-500">
                  {steps.filter((s) => s.completed).length} / {steps.length} completed
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${(steps.filter((s) => s.completed).length / steps.length) * 100}%`,
                  }}
                />
              </div>
            </Card>

            {/* Current Step */}
            {currentStepData && (
              <Card className="p-6">
                <div className="mb-4">
                  <Badge className="mb-2">
                    Step {currentStep} of {steps.length}
                  </Badge>
                  <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    {currentStepData.description}
                  </p>
                </div>

                {/* Step-specific Content */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <p>Install nself globally using npm:</p>
                    <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                      npm install -g nself
                    </pre>
                    <p>Verify the installation:</p>
                    <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                      nself --version
                    </pre>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <p>Create a new directory and initialize nself:</p>
                    <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                      mkdir my-project{'\n'}cd my-project{'\n'}nself init --full
                    </pre>
                    <p>
                      This creates environment files, docker-compose.yml, and configuration
                      templates.
                    </p>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <p>Edit your .env.dev file to configure services:</p>
                    <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                      POSTGRES_PASSWORD=yourpassword{'\n'}
                      POSTGRES_DB=myapp{'\n'}
                      HASURA_GRAPHQL_ADMIN_SECRET=secret123
                    </pre>
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Use strong, unique passwords for production deployments.
                    </p>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-4">
                    <p>Generate service configurations from env files:</p>
                    <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                      nself build
                    </pre>
                    <p>
                      This reads your .env files and generates all necessary configuration files for
                      each service.
                    </p>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-4">
                    <p>Start all services:</p>
                    <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                      nself start
                    </pre>
                    <p>Check service status:</p>
                    <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100">
                      nself status
                    </pre>
                    <p>
                      Your services should now be running! Access Hasura at http://localhost:8080
                    </p>
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <Button
                    onClick={() => markStepComplete(currentStep)}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Mark Complete
                  </Button>
                  {currentStep < steps.length && (
                    <Button variant="outline" onClick={() => setCurrentStep(currentStep + 1)}>
                      Skip Step
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* All steps completed */}
            {steps.every((s) => s.completed) && (
              <Card className="p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="mb-2 text-2xl font-bold">Congratulations!</h2>
                <p className="mb-6 text-zinc-600 dark:text-zinc-400">
                  You've completed the getting started guide. Your nself project is ready to use!
                </p>
                <div className="flex justify-center gap-3">
                  <Link href="/">
                    <Button>Go to Dashboard</Button>
                  </Link>
                  <Link href="/help">
                    <Button variant="outline">Browse Documentation</Button>
                  </Link>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* All Steps */}
            <Card className="p-4">
              <h3 className="mb-4 font-semibold">All Steps</h3>
              <div className="space-y-2">
                {steps.map((step) => (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                      currentStep === step.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        step.completed
                          ? 'bg-green-600 text-white'
                          : 'border-2 border-zinc-300 dark:border-zinc-700'
                      }`}
                    >
                      {step.completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-xs">{step.id}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{step.title}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </button>
                ))}
              </div>
            </Card>

            {/* Related Articles */}
            <Card className="p-4">
              <h3 className="mb-4 font-semibold">Related Articles</h3>
              <div className="space-y-3">
                {getStartedArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/help/article/${article.id}`}
                    className="block rounded-lg border border-zinc-200 p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  >
                    <h4 className="mb-1 text-sm font-medium">{article.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>{article.readTime} min read</span>
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  )
}

export default function GettingStartedPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <GettingStartedContent />
    </Suspense>
  )
}
