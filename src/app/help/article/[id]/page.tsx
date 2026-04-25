'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { CodeEditor } from '@/components/ui/code-editor'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { helpArticlesArray, type HelpArticle } from '@/data/help-content'
import { ArrowLeft, Clock, ThumbsDown, ThumbsUp } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as React from 'react'
import { Suspense } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

function HelpArticleContent({ id }: { id: string }) {
  const [feedbackGiven, setFeedbackGiven] = React.useState(false)
  const [helpful, setHelpful] = React.useState<boolean | null>(null)

  const article = helpArticlesArray.find((a: HelpArticle) => a.id === id)

  if (!article) {
    notFound()
  }

  const handleFeedback = async (isHelpful: boolean) => {
    try {
      await fetch(`/api/help/article/${article.id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful: isHelpful }),
      })
      setFeedbackGiven(true)
      setHelpful(isHelpful)
    } catch (_error) {
      // Silent error handling
    }
  }

  // Render article content using react-markdown — no dangerouslySetInnerHTML, no manual escaping needed.
  // Code blocks are rendered by CodeEditor for syntax highlighting.
  const renderContent = (content: string) => {
    return (
      <ReactMarkdown
        className="prose-zinc prose max-w-none dark:prose-invert"
        rehypePlugins={[rehypeSanitize]}
        components={{
          code({ className, children, ...rest }) {
            const match = /language-(\w+)/.exec(className || '')
            const isBlock = match !== null
            if (isBlock) {
              return (
                <div className="my-4">
                  <CodeEditor
                    value={String(children).replace(/\n$/, '')}
                    language={
                      (match[1] || 'bash') as
                        | 'javascript'
                        | 'typescript'
                        | 'json'
                        | 'html'
                        | 'css'
                        | 'python'
                        | 'sql'
                        | 'yaml'
                        | 'markdown'
                        | 'bash'
                    }
                    readOnly
                    height="auto"
                    showLineNumbers={false}
                  />
                </div>
              )
            }
            return (
              <code className={className} {...rest}>
                {children}
              </code>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    )
  }

  // Get related articles
  const relatedArticles = helpArticlesArray
    .filter(
      (a: HelpArticle) =>
        a.category === article.category && a.id !== article.id,
    )
    .slice(0, 3)

  return (
    <>
      <PageHeader title={article.title} description={article.description} />
      <PageContent>
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Back Link */}
          <Link
            href="/help"
            className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Help Center
          </Link>

          {/* Article Meta */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              <Badge variant="outline">{article.category}</Badge>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{article.readTime} min read</span>
              </div>
              <span>Updated {article.updatedAt}</span>
              <div className="flex flex-wrap gap-1">
                {(article.tags || []).map((tag: string) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* Article Content */}
          <Card className="p-8">
            <div className="space-y-4">{renderContent(article.content)}</div>
          </Card>

          {/* Feedback */}
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Was this helpful?</h3>
            {feedbackGiven ? (
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Thank you for your feedback!{' '}
                {helpful
                  ? "We're glad this article helped you."
                  : "We'll work on improving this article."}
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => handleFeedback(true)}
                  className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-green-700 transition-colors hover:bg-green-100 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes, this was helpful
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-red-700 transition-colors hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No, needs improvement
                </button>
              </div>
            )}
          </Card>

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Related Articles</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {relatedArticles.map((related) => (
                  <Link key={related.id} href={`/help/article/${related.id}`}>
                    <Card className="p-4 transition-shadow hover:shadow-md">
                      <h4 className="mb-2 font-medium">{related.title}</h4>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {related.description}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageContent>
    </>
  )
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<ListSkeleton />}>
      <HelpArticleContent id={id} />
    </Suspense>
  )
}
