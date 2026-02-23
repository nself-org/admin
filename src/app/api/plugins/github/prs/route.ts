import type { GitHubPullRequest } from '@/types/github'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/plugins/github/prs
 * Returns list of GitHub pull requests with pagination, search, and filters
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, open, merged, closed
    const sort = searchParams.get('sort') || 'created' // created, updated

    // Mock data - will be replaced with real GitHub API
    const mockPRs: GitHubPullRequest[] = [
      {
        id: 1,
        number: 89,
        title: 'Add plugin system for third-party integrations',
        body: 'Implements a plugin architecture to allow third-party extensions.',
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/admin/pulls/89',
        userId: 1001,
        userLogin: 'developer1',
        head: 'feature/plugin-system',
        base: 'main',
        labels: ['enhancement', 'breaking-change'],
        reviewers: ['developer2', 'developer3'],
        draft: false,
        mergeable: true,
        merged: false,
        createdAt: '2026-01-29T10:30:00Z',
        updatedAt: '2026-01-31T08:20:00Z',
      },
      {
        id: 2,
        number: 87,
        title: 'Fix database migration rollback issues',
        body: 'Corrects rollback behavior when migrations fail midway.',
        state: 'merged',
        htmlUrl: 'https://github.com/nself-org/cli/pulls/87',
        userId: 1002,
        userLogin: 'developer3',
        head: 'fix/migration-rollback',
        base: 'main',
        labels: ['bug', 'priority-high'],
        reviewers: ['developer1'],
        draft: false,
        mergeable: true,
        merged: true,
        mergedAt: '2026-01-30T14:15:00Z',
        createdAt: '2026-01-27T16:45:00Z',
        updatedAt: '2026-01-30T14:15:00Z',
      },
      {
        id: 3,
        number: 85,
        title: 'Update dependencies to latest versions',
        body: 'Bumps all npm packages to their latest stable versions.',
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/admin/pulls/85',
        userId: 1003,
        userLogin: 'dependabot[bot]',
        head: 'dependabot/npm_and_yarn/deps',
        base: 'main',
        labels: ['dependencies'],
        reviewers: [],
        draft: false,
        mergeable: true,
        merged: false,
        createdAt: '2026-01-26T09:00:00Z',
        updatedAt: '2026-01-28T11:30:00Z',
      },
      {
        id: 4,
        number: 83,
        title: 'Improve SSL certificate auto-renewal',
        body: "Adds automated renewal for Let's Encrypt certificates before expiry.",
        state: 'merged',
        htmlUrl: 'https://github.com/nself-org/cli/pulls/83',
        userId: 1001,
        userLogin: 'developer1',
        head: 'feature/ssl-auto-renew',
        base: 'main',
        labels: ['enhancement'],
        reviewers: ['developer2'],
        draft: false,
        mergeable: true,
        merged: true,
        mergedAt: '2026-01-25T18:20:00Z',
        createdAt: '2026-01-22T14:30:00Z',
        updatedAt: '2026-01-25T18:20:00Z',
      },
      {
        id: 5,
        number: 81,
        title: 'Add Docker Compose health checks',
        body: 'Implements health checks for all services in docker-compose.yml.',
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/cli/pulls/81',
        userId: 1004,
        userLogin: 'contributor2',
        head: 'feature/health-checks',
        base: 'main',
        labels: ['enhancement', 'docker'],
        reviewers: ['developer1', 'developer3'],
        draft: true,
        mergeable: undefined,
        merged: false,
        createdAt: '2026-01-20T11:15:00Z',
        updatedAt: '2026-01-27T15:45:00Z',
      },
      {
        id: 6,
        number: 79,
        title: 'Refactor API error handling',
        body: 'Standardizes error responses across all API routes.',
        state: 'closed',
        htmlUrl: 'https://github.com/nself-org/admin/pulls/79',
        userId: 1002,
        userLogin: 'developer3',
        head: 'refactor/error-handling',
        base: 'main',
        labels: ['refactor'],
        reviewers: [],
        draft: false,
        mergeable: true,
        merged: false,
        closedAt: '2026-01-24T16:00:00Z',
        createdAt: '2026-01-18T09:30:00Z',
        updatedAt: '2026-01-24T16:00:00Z',
      },
      {
        id: 7,
        number: 77,
        title: 'Add support for custom environment variables',
        body: 'Allows users to define custom env vars in the admin UI.',
        state: 'merged',
        htmlUrl: 'https://github.com/nself-org/admin/pulls/77',
        userId: 1001,
        userLogin: 'developer1',
        head: 'feature/custom-env-vars',
        base: 'main',
        labels: ['enhancement'],
        reviewers: ['developer2'],
        draft: false,
        mergeable: true,
        merged: true,
        mergedAt: '2026-01-23T10:45:00Z',
        createdAt: '2026-01-15T13:20:00Z',
        updatedAt: '2026-01-23T10:45:00Z',
      },
      {
        id: 8,
        number: 75,
        title: 'Fix CSS layout issues on mobile devices',
        body: 'Corrects responsive design bugs on small screens.',
        state: 'merged',
        htmlUrl: 'https://github.com/nself-org/admin/pulls/75',
        userId: 1003,
        userLogin: 'contributor1',
        head: 'fix/mobile-layout',
        base: 'main',
        labels: ['bug', 'ui'],
        reviewers: ['developer1'],
        draft: false,
        mergeable: true,
        merged: true,
        mergedAt: '2026-01-21T14:30:00Z',
        createdAt: '2026-01-12T10:00:00Z',
        updatedAt: '2026-01-21T14:30:00Z',
      },
    ]

    // Filter PRs
    let filteredPRs = mockPRs
    if (search) {
      filteredPRs = filteredPRs.filter(
        (pr) =>
          pr.title.toLowerCase().includes(search.toLowerCase()) ||
          pr.body?.toLowerCase().includes(search.toLowerCase()),
      )
    }
    if (filter === 'open') {
      filteredPRs = filteredPRs.filter(
        (pr) => pr.state === 'open' && !pr.merged,
      )
    } else if (filter === 'merged') {
      filteredPRs = filteredPRs.filter((pr) => pr.merged)
    } else if (filter === 'closed') {
      filteredPRs = filteredPRs.filter(
        (pr) => pr.state === 'closed' && !pr.merged,
      )
    }

    // Sort PRs
    filteredPRs.sort((a, b) => {
      if (sort === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        // updated
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

    // Paginate
    const total = filteredPRs.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const prs = filteredPRs.slice(start, end)

    return NextResponse.json({
      prs,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch pull requests',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
