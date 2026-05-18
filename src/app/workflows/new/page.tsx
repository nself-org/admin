'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { Textarea } from '@/components/ui/textarea'
import { useCreateWorkflow } from '@/hooks/useWorkflows'
import { AlertCircle, ArrowLeft, Loader2, Plus, Workflow } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

export default function NewWorkflowPage() {
  const router = useRouter()
  const { create, isLoading, error } = useCreateWorkflow()

  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [validationError, setValidationError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    // Validation
    if (!name.trim()) {
      setValidationError('Workflow name is required')
      return
    }

    if (name.trim().length < 3) {
      setValidationError('Workflow name must be at least 3 characters')
      return
    }

    if (name.trim().length > 100) {
      setValidationError('Workflow name must be less than 100 characters')
      return
    }

    try {
      const workflow = await create({
        name: name.trim(),
        description: description.trim() || undefined,
        triggers: [
          {
            id: `trigger-${Date.now()}`,
            type: 'manual',
            name: 'Manual Trigger',
            config: {},
            enabled: true,
          },
        ],
        actions: [],
        connections: [],
      })

      router.push(`/workflows/${workflow.id}`)
    } catch (_err) {
      // Error is handled by the hook
    }
  }

  return (
    <>
      <PageHeader
        title="Create Workflow"
        description="Create a new automation workflow"
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Workflows', href: '/workflows' },
          { label: 'New Workflow' },
        ]}
        actions={
          <Link href="/workflows">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          </Link>
        }
      />

      <PageContent>
        <div className="mx-auto max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Workflow className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Workflow Details</CardTitle>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Enter the basic information for your new workflow
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Display */}
                {(error || validationError) && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-sm">{validationError || error}</p>
                  </div>
                )}

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Workflow Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Daily Backup, User Onboarding, Data Sync"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    A descriptive name for your workflow (3-100 characters)
                  </p>
                </div>

                {/* Description Field */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this workflow does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isLoading}
                    rows={3}
                  />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Optional description to help you remember the purpose of this workflow
                  </p>
                </div>

                {/* Template Selection (Future Feature) */}
                <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                  <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Workflow templates coming soon - you will be able to start from pre-built
                    templates
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-between border-t pt-4 dark:border-zinc-800">
                  <Link href="/workflows">
                    <Button type="button" variant="ghost" disabled={isLoading}>
                      Cancel
                    </Button>
                  </Link>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Workflow
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Tips for Great Workflows</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <span>
                    <strong>Start simple:</strong> Begin with a single trigger and action, then
                    expand as needed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <span>
                    <strong>Use descriptive names:</strong> Include the purpose and frequency in
                    your workflow name
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <span>
                    <strong>Test before activating:</strong> Use the Run Now button to test your
                    workflow manually first
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <span>
                    <strong>Add error handling:</strong> Configure retry policies for actions that
                    might fail
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  )
}
