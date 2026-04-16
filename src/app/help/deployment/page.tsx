'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { helpArticlesArray, type HelpArticle } from '@/data/help-content'
import { Clock, Rocket } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function DeploymentHelpContent() {
  const deploymentArticles = helpArticlesArray.filter(
    (a: HelpArticle) => a.category === 'deployment',
  )

  return (
    <>
      <PageHeader
        title="Deployment Documentation"
        description="Deploy your application to staging and production environments"
      />
      <PageContent>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-sky-100 p-3 dark:bg-sky-900/20">
                <Rocket className="h-6 w-6 text-sky-500 dark:text-sky-400" />
              </div>
              <div className="flex-1">
                <h2 className="mb-2 text-xl font-semibold">
                  Deployment Strategies
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Deploy to staging and production with confidence. Learn about
                  blue-green deployments, rollbacks, CI/CD integration, and
                  production best practices.
                </p>
              </div>
            </div>
          </Card>

          <div>
            <h2 className="mb-4 text-xl font-semibold">Deployment Guides</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deploymentArticles.map((article) => (
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

export default function DeploymentHelpPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <DeploymentHelpContent />
    </Suspense>
  )
}
