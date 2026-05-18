'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { helpArticlesArray, type HelpArticle } from '@/data/help-content'
import { Clock, Server } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function ServicesHelpContent() {
  const servicesArticles = helpArticlesArray.filter((a: HelpArticle) => a.category === 'services')

  return (
    <>
      <PageHeader
        title="Services Documentation"
        description="Learn how to configure and manage nself services"
      />
      <PageContent>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900/20">
                <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-xl font-semibold">About nself Services</h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  nself includes PostgreSQL, Hasura GraphQL, Auth service, Functions, MinIO storage,
                  Redis cache, Mailpit email testing, and Nginx proxy. Each service is
                  pre-configured and ready to use.
                </p>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-4 text-xl font-semibold">Service Guides</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {servicesArticles.map((article) => (
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

export default function ServicesHelpPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ServicesHelpContent />
    </Suspense>
  )
}
