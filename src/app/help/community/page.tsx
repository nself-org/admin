'use client'

import { ListSkeleton } from '@/components/skeletons'
import { Card } from '@/components/ui/card'
import { PageContent } from '@/components/ui/page-content'
import { PageHeader } from '@/components/ui/page-header'
import {
  ExternalLink,
  Github,
  Mail,
  MessageCircle,
  Twitter,
  Users,
  Video,
} from 'lucide-react'
import { Suspense } from 'react'

function CommunityContent() {
  return (
    <>
      <PageHeader
        title="Community Resources"
        description="Connect with other nself users and get help from the community"
      />
      <PageContent>
        <div className="space-y-8">
          {/* Primary Channels */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Get Help & Connect</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className="rounded-lg bg-sky-100 p-3 dark:bg-sky-900/20">
                    <MessageCircle className="h-6 w-6 text-sky-500 dark:text-sky-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold">
                      Discord Community
                    </h3>
                    <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                      Join our Discord server for real-time help, discussions,
                      and to connect with other developers.
                    </p>
                    <a
                      href="https://discord.gg/nself"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Join Discord <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="mb-4 flex items-start gap-4">
                  <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900/20">
                    <Github className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="mb-2 text-lg font-semibold">
                      GitHub Discussions
                    </h3>
                    <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                      Ask questions, share ideas, and discuss feature requests
                      on GitHub.
                    </p>
                    <a
                      href="https://github.com/nself-org/cli/discussions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View Discussions <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Additional Resources */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Stay Updated</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-6">
                <div className="mb-3 w-fit rounded-lg bg-sky-100 p-3 dark:bg-sky-900/20">
                  <Twitter className="h-5 w-5 text-sky-600 dark:text-sky-400" />
                </div>
                <h3 className="mb-2 font-semibold">Twitter/X</h3>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Follow us for updates, tips, and announcements
                </p>
                <a
                  href="https://twitter.com/nself_dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  @nself_dev
                </a>
              </Card>

              <Card className="p-6">
                <div className="mb-3 w-fit rounded-lg bg-red-100 p-3 dark:bg-red-900/20">
                  <Video className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="mb-2 font-semibold">YouTube</h3>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Watch tutorials and learn best practices
                </p>
                <a
                  href="https://youtube.com/@nself"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  nself Channel
                </a>
              </Card>

              <Card className="p-6">
                <div className="mb-3 w-fit rounded-lg bg-sky-100 p-3 dark:bg-sky-900/20">
                  <Mail className="h-5 w-5 text-sky-500 dark:text-sky-400" />
                </div>
                <h3 className="mb-2 font-semibold">Newsletter</h3>
                <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Get monthly updates delivered to your inbox
                </p>
                <a
                  href="https://nself.dev/newsletter"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Subscribe
                </a>
              </Card>
            </div>
          </div>

          {/* Office Hours */}
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-emerald-100 p-3 dark:bg-emerald-900/20">
                <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-lg font-semibold">Office Hours</h3>
                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                  Join our weekly office hours every Friday at 10am PST for live
                  Q&A sessions with the nself team.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-sm font-medium">Next Session:</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Friday, February 2, 2026 at 10:00 AM PST
                    </p>
                  </div>
                  <a
                    href="https://nself.dev/office-hours"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Add to Calendar <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </Card>

          {/* Contributing */}
          <div>
            <h2 className="mb-4 text-xl font-semibold">Contributing</h2>
            <Card className="p-6">
              <h3 className="mb-3 text-lg font-semibold">Help Build nself</h3>
              <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                nself is open source and welcomes contributions from the
                community. Whether it's bug fixes, new features, documentation,
                or examples - we appreciate all contributions.
              </p>
              <div className="space-y-3">
                <div>
                  <h4 className="mb-1 font-medium">Report Issues</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Found a bug? Open an issue on GitHub
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 font-medium">Submit Pull Requests</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Have a fix or feature? Submit a PR for review
                  </p>
                </div>
                <div>
                  <h4 className="mb-1 font-medium">Improve Documentation</h4>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Help make our docs better for everyone
                  </p>
                </div>
              </div>
              <div className="mt-6">
                <a
                  href="https://github.com/nself-org/cli/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
                >
                  Read Contributing Guidelines{' '}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  )
}

export default function CommunityPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <CommunityContent />
    </Suspense>
  )
}
