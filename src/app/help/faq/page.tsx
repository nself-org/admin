'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import { HelpCircle, Search, ThumbsDown, ThumbsUp } from 'lucide-react'
import * as React from 'react'
import { Suspense } from 'react'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  helpful: number
  notHelpful: number
}

const faqData: FAQItem[] = [
  // General
  {
    id: 'what-is-nself',
    question: 'What is nself?',
    answer:
      'nself is a complete development infrastructure toolkit that provides PostgreSQL, Hasura GraphQL, authentication, storage, and more out of the box. It uses Docker Compose to orchestrate services and provides both a CLI and web UI (nAdmin) for management.',
    category: 'General',
    helpful: 156,
    notHelpful: 3,
  },
  {
    id: 'difference-cli-admin',
    question: 'What is the difference between nself CLI and nAdmin?',
    answer:
      'The nself CLI is the master application that defines all operations and conventions. nAdmin is a web UI wrapper that executes nself CLI commands, providing a visual interface without reimplementing any logic.',
    category: 'General',
    helpful: 98,
    notHelpful: 5,
  },

  // Installation
  {
    id: 'install-requirements',
    question: 'What are the requirements to run nself?',
    answer:
      'You need: Node.js 18+, Docker Desktop running, Git installed, and at least 4GB of RAM available for Docker containers.',
    category: 'Installation',
    helpful: 203,
    notHelpful: 7,
  },
  {
    id: 'install-mac-windows',
    question: 'Can I use nself on Mac and Windows?',
    answer:
      'Yes! nself works on macOS, Windows (via WSL2), and Linux. Docker Desktop is required on all platforms.',
    category: 'Installation',
    helpful: 145,
    notHelpful: 12,
  },

  // Services
  {
    id: 'service-not-starting',
    question: 'Why is my service not starting?',
    answer:
      'Common causes: 1) Port already in use - check with `lsof -ti:PORT`, 2) Missing environment variables - run `nself doctor`, 3) Docker not running - ensure Docker Desktop is active, 4) Insufficient resources - allocate more RAM to Docker.',
    category: 'Services',
    helpful: 267,
    notHelpful: 15,
  },
  {
    id: 'restart-service',
    question: 'How do I restart a specific service?',
    answer:
      'Use `nself restart <service-name>` or click the restart button for that service in the nAdmin Services page.',
    category: 'Services',
    helpful: 189,
    notHelpful: 4,
  },

  // Database
  {
    id: 'database-backup',
    question: 'How do I backup my database?',
    answer:
      'Run `nself db backup` or use the Database → Backup page in nAdmin. Backups are timestamped and stored in the `backups/` directory.',
    category: 'Database',
    helpful: 234,
    notHelpful: 6,
  },
  {
    id: 'database-restore',
    question: 'How do I restore from a backup?',
    answer:
      'Run `nself db restore <backup-file>` or use the Database → Restore page. Make sure to stop services first to avoid data conflicts.',
    category: 'Database',
    helpful: 198,
    notHelpful: 9,
  },
  {
    id: 'database-migrations',
    question: 'How do migrations work?',
    answer:
      'Migrations are managed through `nself db migrate`. Create new migrations with descriptive names, test locally first, and never edit applied migrations.',
    category: 'Database',
    helpful: 176,
    notHelpful: 11,
  },

  // Deployment
  {
    id: 'deploy-staging',
    question: 'How do I deploy to staging?',
    answer:
      'Configure `.env.stage`, set up your staging server, configure SSH access, then run `nself staging deploy`.',
    category: 'Deployment',
    helpful: 143,
    notHelpful: 18,
  },
  {
    id: 'deploy-production',
    question: 'What should I check before deploying to production?',
    answer:
      'Pre-deployment checklist: All tests passing, staging deployed and tested, backup created, team notified, rollback plan ready, secrets properly configured.',
    category: 'Deployment',
    helpful: 201,
    notHelpful: 8,
  },
  {
    id: 'rollback-deployment',
    question: 'How do I rollback a failed deployment?',
    answer:
      'Run `nself prod rollback` to revert to the previous deployment. This uses blue-green deployment to ensure zero downtime.',
    category: 'Deployment',
    helpful: 167,
    notHelpful: 14,
  },

  // Troubleshooting
  {
    id: 'port-conflict',
    question: "I'm getting a port conflict error",
    answer:
      'Find the process using the port with `lsof -ti:PORT` then kill it with `kill -9 <PID>`, or change the port in your `.env` file.',
    category: 'Troubleshooting',
    helpful: 289,
    notHelpful: 7,
  },
  {
    id: 'docker-connection',
    question: 'Getting "Cannot connect to Docker daemon"',
    answer:
      'Ensure Docker Desktop is running. On macOS, check the menu bar icon. On Windows, verify WSL2 integration is enabled in Docker Desktop settings.',
    category: 'Troubleshooting',
    helpful: 256,
    notHelpful: 13,
  },
  {
    id: 'env-not-loading',
    question: 'Environment variables not loading',
    answer:
      'After editing `.env.*` files, run `nself build` to regenerate configurations. Then restart affected services with `nself restart`.',
    category: 'Troubleshooting',
    helpful: 178,
    notHelpful: 9,
  },
]

const categories = [
  'All',
  'General',
  'Installation',
  'Services',
  'Database',
  'Deployment',
  'Troubleshooting',
]

function FAQContent() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedCategory, setSelectedCategory] = React.useState('All')
  const [feedbackGiven, setFeedbackGiven] = React.useState<Set<string>>(new Set())

  const filteredFAQs = faqData.filter((faq) => {
    const matchesSearch =
      searchQuery === '' ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedFAQs = categories.reduce(
    (acc, category) => {
      if (category === 'All') return acc
      acc[category] = filteredFAQs.filter((faq) => faq.category === category)
      return acc
    },
    {} as Record<string, FAQItem[]>
  )

  const handleFeedback = async (faqId: string, helpful: boolean) => {
    try {
      await fetch(`/api/help/faq/${faqId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful }),
      })
      setFeedbackGiven((prev) => new Set(prev).add(faqId))
    } catch (_error) {
      // Silent error handling
    }
  }

  const accordionItems: AccordionItem[] = filteredFAQs.map((faq) => ({
    id: faq.id,
    title: faq.question,
    content: (
      <div>
        <p className="mb-4">{faq.answer}</p>
        <div className="flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">Was this helpful?</span>
            <button
              onClick={() => handleFeedback(faq.id, true)}
              disabled={feedbackGiven.has(faq.id)}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
            >
              <ThumbsUp className="h-3 w-3" />
              <span>{faq.helpful}</span>
            </button>
            <button
              onClick={() => handleFeedback(faq.id, false)}
              disabled={feedbackGiven.has(faq.id)}
              className="flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <ThumbsDown className="h-3 w-3" />
              <span>{faq.notHelpful}</span>
            </button>
          </div>
          <Badge variant="secondary">{faq.category}</Badge>
        </div>
      </div>
    ),
  }))

  return (
    <>
      <PageHeader
        title="Frequently Asked Questions"
        description="Find answers to common questions about nself and nAdmin"
      />
      <PageContent>
        <div className="space-y-6">
          {/* Search and Filter */}
          <Card className="p-6">
            <div className="relative mb-4">
              <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </Card>

          {/* Results Count */}
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {filteredFAQs.length} question
              {filteredFAQs.length !== 1 ? 's' : ''}{' '}
              {selectedCategory !== 'All' && `in ${selectedCategory}`}
            </span>
          </div>

          {/* FAQs by Category */}
          {selectedCategory === 'All' ? (
            <div className="space-y-8">
              {Object.entries(groupedFAQs).map(([category, faqs]) =>
                faqs.length > 0 ? (
                  <div key={category}>
                    <h2 className="mb-4 text-xl font-semibold">{category}</h2>
                    <Accordion
                      items={faqs.map((faq) => ({
                        id: faq.id,
                        title: faq.question,
                        content: (
                          <div>
                            <p className="mb-4">{faq.answer}</p>
                            <div className="flex items-center justify-between border-t border-zinc-200 pt-3 dark:border-zinc-700">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-zinc-500">Was this helpful?</span>
                                <button
                                  onClick={() => handleFeedback(faq.id, true)}
                                  disabled={feedbackGiven.has(faq.id)}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-sm text-green-600 transition-colors hover:bg-green-50 disabled:opacity-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                  <span>{faq.helpful}</span>
                                </button>
                                <button
                                  onClick={() => handleFeedback(faq.id, false)}
                                  disabled={feedbackGiven.has(faq.id)}
                                  className="flex items-center gap-1 rounded px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                  <span>{faq.notHelpful}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ),
                      }))}
                    />
                  </div>
                ) : null
              )}
            </div>
          ) : (
            <Accordion items={accordionItems} />
          )}

          {/* No Results */}
          {filteredFAQs.length === 0 && (
            <Card className="p-12 text-center">
              <HelpCircle className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
              <h3 className="mb-2 text-lg font-semibold">No FAQs found</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Try adjusting your search or filter
              </p>
            </Card>
          )}
        </div>
      </PageContent>
    </>
  )
}

export default function FAQPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <FAQContent />
    </Suspense>
  )
}
