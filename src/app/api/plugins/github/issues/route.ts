import type { GitHubIssue } from '@/types/github'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/plugins/github/issues
 * Returns list of GitHub issues with pagination, search, and filters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, open, closed
    const sort = searchParams.get('sort') || 'created' // created, updated

    // Mock data - will be replaced with real GitHub API
    const mockIssues: GitHubIssue[] = [
      {
        id: 1,
        number: 145,
        title: 'Add dark mode support to dashboard',
        body: 'Users are requesting a dark theme option for better visibility at night.',
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/admin/issues/145',
        userId: 1001,
        userLogin: 'developer1',
        labels: ['enhancement', 'good first issue'],
        assignees: ['developer2'],
        milestone: 'v0.1.0',
        commentsCount: 5,
        createdAt: '2026-01-28T10:30:00Z',
        updatedAt: '2026-01-30T14:20:00Z',
      },
      {
        id: 2,
        number: 143,
        title: 'Fix memory leak in service manager',
        body: 'Memory usage increases over time when services are restarted frequently.',
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/cli/issues/143',
        userId: 1002,
        userLogin: 'developer3',
        labels: ['bug', 'priority-high'],
        assignees: [],
        commentsCount: 12,
        createdAt: '2026-01-26T09:15:00Z',
        updatedAt: '2026-01-29T18:45:00Z',
      },
      {
        id: 3,
        number: 140,
        title: 'Documentation for SSL setup is incomplete',
        body: "Missing steps for Let's Encrypt integration in production.",
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/cli/issues/140',
        userId: 1003,
        userLogin: 'contributor1',
        labels: ['documentation'],
        assignees: ['developer1'],
        commentsCount: 3,
        createdAt: '2026-01-25T15:20:00Z',
        updatedAt: '2026-01-28T11:10:00Z',
      },
      {
        id: 4,
        number: 138,
        title: 'Add support for custom Docker networks',
        body: 'Allow users to specify custom Docker network configurations.',
        state: 'closed',
        htmlUrl: 'https://github.com/nself-org/cli/issues/138',
        userId: 1001,
        userLogin: 'developer1',
        labels: ['enhancement'],
        assignees: ['developer1'],
        commentsCount: 8,
        createdAt: '2026-01-20T11:00:00Z',
        updatedAt: '2026-01-24T16:30:00Z',
        closedAt: '2026-01-24T16:30:00Z',
      },
      {
        id: 5,
        number: 135,
        title: 'PostgreSQL backup fails with large databases',
        body: 'Backup process times out for databases larger than 5GB.',
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/cli/issues/135',
        userId: 1004,
        userLogin: 'user123',
        labels: ['bug', 'priority-medium'],
        assignees: [],
        commentsCount: 15,
        createdAt: '2026-01-18T13:45:00Z',
        updatedAt: '2026-01-27T10:20:00Z',
      },
      {
        id: 6,
        number: 132,
        title: 'Improve error messages in CLI output',
        body: 'Error messages could be more user-friendly and actionable.',
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/cli/issues/132',
        userId: 1002,
        userLogin: 'developer3',
        labels: ['enhancement', 'ux'],
        assignees: ['developer2'],
        commentsCount: 7,
        createdAt: '2026-01-15T08:30:00Z',
        updatedAt: '2026-01-26T14:50:00Z',
      },
      {
        id: 7,
        number: 130,
        title: 'Redis connection pool exhausted under load',
        body: 'Application crashes when Redis connection pool is exhausted.',
        state: 'closed',
        htmlUrl: 'https://github.com/nself-org/cli/issues/130',
        userId: 1003,
        userLogin: 'contributor1',
        labels: ['bug', 'priority-high'],
        assignees: ['developer3'],
        commentsCount: 20,
        createdAt: '2026-01-10T16:20:00Z',
        updatedAt: '2026-01-22T19:15:00Z',
        closedAt: '2026-01-22T19:15:00Z',
      },
      {
        id: 8,
        number: 128,
        title: 'Add GitHub Actions integration',
        body: 'Integrate with GitHub Actions for automated deployments.',
        state: 'open',
        htmlUrl: 'https://github.com/nself-org/admin/issues/128',
        userId: 1001,
        userLogin: 'developer1',
        labels: ['enhancement', 'integrations'],
        assignees: [],
        milestone: 'v0.2.0',
        commentsCount: 4,
        createdAt: '2026-01-08T12:00:00Z',
        updatedAt: '2026-01-25T15:30:00Z',
      },
    ]

    // Filter issues
    let filteredIssues = mockIssues
    if (search) {
      filteredIssues = filteredIssues.filter(
        (issue) =>
          issue.title.toLowerCase().includes(search.toLowerCase()) ||
          issue.body?.toLowerCase().includes(search.toLowerCase()),
      )
    }
    if (filter === 'open') {
      filteredIssues = filteredIssues.filter((issue) => issue.state === 'open')
    } else if (filter === 'closed') {
      filteredIssues = filteredIssues.filter(
        (issue) => issue.state === 'closed',
      )
    }

    // Sort issues
    filteredIssues.sort((a, b) => {
      if (sort === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      } else {
        // updated
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

    // Paginate
    const total = filteredIssues.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const issues = filteredIssues.slice(start, end)

    return NextResponse.json({
      issues,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch issues',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
