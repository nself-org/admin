import type { GitHubRepo } from '@/types/github'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/plugins/github/repos
 * Returns list of GitHub repositories with pagination and search
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '12')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, has_issues, has_prs
    const sort = searchParams.get('sort') || 'updated' // name, updated, stars

    // Mock data - will be replaced with real GitHub API
    const mockRepos: GitHubRepo[] = [
      {
        id: 1,
        name: 'nself',
        fullName: 'nself-org/cli',
        description: 'Self-hosted development platform',
        private: false,
        htmlUrl: 'https://github.com/nself-org/cli',
        cloneUrl: 'https://github.com/nself-org/cli.git',
        language: 'TypeScript',
        stargazersCount: 234,
        forksCount: 45,
        openIssuesCount: 12,
        defaultBranch: 'main',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2026-01-30T14:20:00Z',
        pushedAt: '2026-01-30T14:20:00Z',
      },
      {
        id: 2,
        name: 'nself-admin',
        fullName: 'nself-org/admin',
        description: 'Web UI for nself CLI management',
        private: false,
        htmlUrl: 'https://github.com/nself-org/admin',
        cloneUrl: 'https://github.com/nself-org/admin.git',
        language: 'TypeScript',
        stargazersCount: 89,
        forksCount: 12,
        openIssuesCount: 8,
        defaultBranch: 'main',
        createdAt: '2024-06-10T09:15:00Z',
        updatedAt: '2026-01-31T11:45:00Z',
        pushedAt: '2026-01-31T11:45:00Z',
      },
      {
        id: 3,
        name: 'api-gateway',
        fullName: 'nself-org/api-gateway',
        description: 'Modern API gateway with rate limiting and auth',
        private: true,
        htmlUrl: 'https://github.com/nself-org/api-gateway',
        cloneUrl: 'https://github.com/nself-org/api-gateway.git',
        language: 'Go',
        stargazersCount: 156,
        forksCount: 28,
        openIssuesCount: 5,
        defaultBranch: 'main',
        createdAt: '2023-11-20T16:00:00Z',
        updatedAt: '2026-01-29T18:30:00Z',
        pushedAt: '2026-01-29T18:30:00Z',
      },
      {
        id: 4,
        name: 'analytics-dashboard',
        fullName: 'nself-org/analytics-dashboard',
        description: 'Real-time analytics and visualization platform',
        private: false,
        htmlUrl: 'https://github.com/nself-org/analytics-dashboard',
        cloneUrl: 'https://github.com/nself-org/analytics-dashboard.git',
        language: 'Python',
        stargazersCount: 312,
        forksCount: 67,
        openIssuesCount: 18,
        defaultBranch: 'main',
        createdAt: '2024-03-05T12:45:00Z',
        updatedAt: '2026-01-28T20:10:00Z',
        pushedAt: '2026-01-28T20:10:00Z',
      },
      {
        id: 5,
        name: 'microservice-starter',
        fullName: 'nself-org/microservice-starter',
        description: 'Production-ready microservice template with Docker',
        private: false,
        htmlUrl: 'https://github.com/nself-org/microservice-starter',
        cloneUrl: 'https://github.com/nself-org/microservice-starter.git',
        language: 'JavaScript',
        stargazersCount: 445,
        forksCount: 92,
        openIssuesCount: 24,
        defaultBranch: 'main',
        createdAt: '2023-09-12T08:20:00Z',
        updatedAt: '2026-01-27T15:55:00Z',
        pushedAt: '2026-01-27T15:55:00Z',
      },
      {
        id: 6,
        name: 'rust-cli-tools',
        fullName: 'nself-org/rust-cli-tools',
        description: 'Collection of CLI utilities written in Rust',
        private: false,
        htmlUrl: 'https://github.com/nself-org/rust-cli-tools',
        cloneUrl: 'https://github.com/nself-org/rust-cli-tools.git',
        language: 'Rust',
        stargazersCount: 678,
        forksCount: 134,
        openIssuesCount: 0,
        defaultBranch: 'main',
        createdAt: '2023-07-18T14:30:00Z',
        updatedAt: '2026-01-26T09:40:00Z',
        pushedAt: '2026-01-26T09:40:00Z',
      },
    ]

    // Filter repos
    let filteredRepos = mockRepos
    if (search) {
      filteredRepos = filteredRepos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(search.toLowerCase()) ||
          repo.description?.toLowerCase().includes(search.toLowerCase()),
      )
    }
    if (filter === 'has_issues') {
      filteredRepos = filteredRepos.filter((repo) => repo.openIssuesCount > 0)
    } else if (filter === 'has_prs') {
      // Mock: assume repos with issues have PRs
      filteredRepos = filteredRepos.filter((repo) => repo.openIssuesCount > 0)
    }

    // Sort repos
    filteredRepos.sort((a, b) => {
      if (sort === 'name') {
        return a.name.localeCompare(b.name)
      } else if (sort === 'stars') {
        return b.stargazersCount - a.stargazersCount
      } else {
        // updated
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
    })

    // Paginate
    const total = filteredRepos.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const repos = filteredRepos.slice(start, end)

    return NextResponse.json({
      repos,
      total,
      page,
      pageSize,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch repositories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
