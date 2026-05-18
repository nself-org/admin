'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Accordion } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { helpArticlesArray, type HelpArticle } from '@/data/help-content'
import { AlertCircle, Clock, Search, Terminal } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'
import { Suspense } from 'react'

interface Issue {
  id: string
  title: string
  symptoms: string[]
  solutions: string[]
  relatedCommands: string[]
  severity: 'low' | 'medium' | 'high'
}

const commonIssues: Issue[] = [
  {
    id: 'port-conflict',
    title: 'Port Already in Use',
    symptoms: [
      'Error: "Port 8080 is already in use"',
      'Service fails to start',
      'Docker compose error about port binding',
    ],
    solutions: [
      'Find the process: lsof -ti:8080',
      'Kill the process: kill -9 <PID>',
      'Change port in .env.dev',
      'Restart Docker Desktop',
    ],
    relatedCommands: ['nself status', 'nself restart'],
    severity: 'high',
  },
  {
    id: 'docker-not-running',
    title: 'Docker Daemon Not Running',
    symptoms: [
      'Error: "Cannot connect to Docker daemon"',
      'Docker commands fail',
      "Services won't start",
    ],
    solutions: [
      'Open Docker Desktop application',
      'Wait for Docker to fully start (check menu bar icon)',
      'On Windows: Enable WSL2 integration in Docker settings',
      'Restart Docker Desktop if needed',
    ],
    relatedCommands: ['nself doctor', 'nself start'],
    severity: 'high',
  },
  {
    id: 'env-not-loading',
    title: 'Environment Variables Not Loading',
    symptoms: [
      'Services start with default/wrong config',
      'Database credentials not working',
      'Missing API keys in services',
    ],
    solutions: [
      'Run nself build after editing .env files',
      'Restart affected services',
      'Check for typos in .env file keys',
      'Ensure no spaces around = in .env files',
    ],
    relatedCommands: ['nself build', 'nself restart'],
    severity: 'medium',
  },
  {
    id: 'database-connection-error',
    title: 'Database Connection Failed',
    symptoms: [
      'Error: "ECONNREFUSED"',
      "Hasura can't connect to PostgreSQL",
      'Connection timeout errors',
    ],
    solutions: [
      'Verify PostgreSQL is running: nself status postgres',
      'Check database credentials in .env',
      'Restart database: nself restart postgres',
      'Check Docker network: docker network ls',
    ],
    relatedCommands: ['nself status', 'nself restart postgres', 'nself db reset'],
    severity: 'high',
  },
  {
    id: 'service-crash-loop',
    title: 'Service Keeps Restarting',
    symptoms: [
      'Service status shows "restarting"',
      'Container repeatedly crashes',
      'Logs show repeated startup errors',
    ],
    solutions: [
      'Check service logs: nself logs <service>',
      'Review configuration for errors',
      'Check resource limits (RAM/CPU)',
      'Verify all dependencies are running',
    ],
    relatedCommands: ['nself logs', 'nself doctor', 'nself restart'],
    severity: 'high',
  },
  {
    id: 'slow-performance',
    title: 'Slow Service Performance',
    symptoms: ['Services respond slowly', 'High CPU/memory usage', 'Timeout errors'],
    solutions: [
      'Allocate more resources to Docker',
      'Check for resource-heavy queries',
      'Review logs for bottlenecks',
      'Consider scaling services',
    ],
    relatedCommands: ['nself logs', 'nself status'],
    severity: 'medium',
  },
]

function TroubleshootingContent() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedSeverity, setSelectedSeverity] = React.useState<string>('all')

  const troubleshootingArticles = helpArticlesArray.filter(
    (a: HelpArticle) => a.category === 'troubleshooting'
  )

  const filteredIssues = commonIssues.filter((issue) => {
    const matchesSearch =
      searchQuery === '' ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.symptoms.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesSeverity = selectedSeverity === 'all' || issue.severity === selectedSeverity
    return matchesSearch && matchesSeverity
  })

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
      case 'low':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
      default:
        return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
    }
  }

  return (
    <>
      <PageHeader
        title="Troubleshooting Guide"
        description="Common issues and solutions for nself and nAdmin"
      />
      <PageContent>
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card className="p-6">
            <div className="relative mb-4">
              <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search issues and error messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-zinc-500">Filter by severity:</span>
              {['all', 'high', 'medium', 'low'].map((severity) => (
                <button
                  key={severity}
                  onClick={() => setSelectedSeverity(severity)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    selectedSeverity === severity
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </button>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="mb-4 flex items-center gap-2 font-semibold">
              <Terminal className="h-5 w-5" />
              Quick Diagnostic Tools
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Link href="/doctor">
                <div className="rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                  <h4 className="mb-1 font-medium">Run Doctor</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Automated system health checks
                  </p>
                </div>
              </Link>
              <Link href="/system/logs">
                <div className="rounded-lg border border-zinc-200 p-4 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                  <h4 className="mb-1 font-medium">View Logs</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Check service logs for errors
                  </p>
                </div>
              </Link>
            </div>
          </Card>

          {/* Common Issues */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Common Issues</h2>
            <Accordion
              items={filteredIssues.map((issue) => ({
                id: issue.id,
                title: (
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span>{issue.title}</span>
                    <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                  </div>
                ),
                content: (
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 font-semibold">Symptoms:</h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                        {issue.symptoms.map((symptom, i) => (
                          <li key={i}>{symptom}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="mb-2 font-semibold">Solutions:</h4>
                      <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
                        {issue.solutions.map((solution, i) => (
                          <li key={i}>{solution}</li>
                        ))}
                      </ol>
                    </div>

                    {issue.relatedCommands.length > 0 && (
                      <div>
                        <h4 className="mb-2 font-semibold">Related Commands:</h4>
                        <div className="flex flex-wrap gap-2">
                          {issue.relatedCommands.map((cmd, i) => (
                            <code
                              key={i}
                              className="rounded bg-zinc-100 px-2 py-1 text-sm dark:bg-zinc-900"
                            >
                              {cmd}
                            </code>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ),
              }))}
            />
          </div>

          {/* Related Articles */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Troubleshooting Articles</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {troubleshootingArticles.map((article) => (
                <Link key={article.id} href={`/help/article/${article.id}`}>
                  <Card className="p-4 transition-shadow hover:shadow-md">
                    <h3 className="mb-2 font-semibold">{article.title}</h3>
                    <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {article.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      <span>{article.readTime} min read</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </PageContent>
    </>
  )
}

export default function TroubleshootingPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <TroubleshootingContent />
    </Suspense>
  )
}
