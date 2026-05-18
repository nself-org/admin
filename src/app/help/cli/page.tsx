'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { helpArticlesArray, type HelpArticle } from '@/data/help-content'
import { Clock, Terminal } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function CLIHelpContent() {
  const cliArticles = helpArticlesArray.filter((a: HelpArticle) => a.category === 'cli')

  return (
    <>
      <PageHeader
        title="CLI Reference"
        description="Complete reference for all nself CLI commands"
      />
      <PageContent>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900/20">
                <Terminal className="h-6 w-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-xl font-semibold">nself CLI</h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  The nself CLI is the master application. Every operation in nAdmin executes a
                  corresponding CLI command. You can use the CLI directly for automation, scripting,
                  or when the UI is not available.
                </p>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-4 text-xl font-semibold">CLI Commands</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {cliArticles.map((article) => (
                <Link key={article.id} href={`/help/article/${article.id}`}>
                  <Card className="p-4 transition-shadow hover:shadow-md">
                    <h3 className="mb-2 font-mono text-sm font-semibold">{article.title}</h3>
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

          <Card className="border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/10">
            <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
              Tip: View complete CLI reference
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              For a complete list of all nself CLI commands organized by category, visit the main{' '}
              <Link href="/help" className="font-semibold underline hover:no-underline">
                Help page
              </Link>{' '}
              and click the "CLI Reference" tab.
            </p>
          </Card>
        </div>
      </PageContent>
    </>
  )
}

export default function CLIHelpPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CLIHelpContent />
    </Suspense>
  )
}
