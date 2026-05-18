'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { helpArticlesArray, type HelpArticle } from '@/data/help-content'
import { Clock, Database } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function DatabaseHelpContent() {
  const databaseArticles = helpArticlesArray.filter((a: HelpArticle) => a.category === 'database')

  return (
    <>
      <PageHeader
        title="Database Documentation"
        description="Database operations, migrations, backups, and best practices"
      />
      <PageContent>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-green-100 p-3 dark:bg-green-900/20">
                <Database className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-xl font-semibold">Database Management</h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  nself uses PostgreSQL as the primary database. Learn how to manage migrations,
                  create backups, restore data, and optimize performance.
                </p>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-4 text-xl font-semibold">Database Guides</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {databaseArticles.map((article) => (
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

export default function DatabaseHelpPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <DatabaseHelpContent />
    </Suspense>
  )
}
