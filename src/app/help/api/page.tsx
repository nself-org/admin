'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { helpArticlesArray, type HelpArticle } from '@/data/help-content'
import { Clock, Code } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function APIHelpContent() {
  const apiArticles = helpArticlesArray.filter(
    (a: HelpArticle) => a.category === 'api',
  )

  return (
    <>
      <PageHeader
        title="API Reference"
        description="Complete reference for all nAdmin API endpoints"
      />
      <PageContent>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-sky-100 p-3 dark:bg-sky-900/20">
                <Code className="h-6 w-6 text-sky-500 dark:text-sky-400" />
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-xl font-semibold">nAdmin API</h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  nAdmin provides REST APIs for all operations. Each endpoint
                  corresponds to a nself CLI command. Use these APIs to
                  integrate with external tools or build custom workflows.
                </p>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-4 text-xl font-semibold">API Endpoints</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {apiArticles.map((article) => (
                <Link key={article.id} href={`/help/article/${article.id}`}>
                  <Card className="p-4 transition-shadow hover:shadow-md">
                    <h3 className="mb-2 font-mono text-sm font-semibold">
                      {article.title}
                    </h3>
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

export default function APIHelpPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <APIHelpContent />
    </Suspense>
  )
}
