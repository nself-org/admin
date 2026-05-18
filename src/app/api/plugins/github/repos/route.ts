import type { GitHubRepo } from '@/types/github'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/plugins/github/repos
 * Returns list of GitHub repositories with pagination and search.
 * Requires GITHUB_TOKEN env var. Returns honest empty with a note when unconfigured.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '12')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, has_issues, has_prs
    const sort = searchParams.get('sort') || 'updated' // name, updated, stars

    const token = process.env.GITHUB_TOKEN
    if (!token) {
      return NextResponse.json({
        repos: [],
        total: 0,
        page,
        pageSize,
        note: 'github-token-not-configured',
      })
    }

    // Fetch all accessible repos for the authenticated user/org
    // GitHub paginates at 100 per page; fetch up to 10 pages (1000 repos)
    const allRepos: GitHubRepo[] = []
    let ghPage = 1
    while (ghPage <= 10) {
      const ghParams = new URLSearchParams({
        per_page: '100',
        page: String(ghPage),
        sort: sort === 'stars' ? 'stargazers' : sort === 'name' ? 'full_name' : 'updated',
        direction: 'desc',
        affiliation: 'owner,collaborator,organization_member',
      })

      const resp = await fetch(`https://api.github.com/user/repos?${ghParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(15_000),
      })

      if (!resp.ok) {
        const text = await resp.text()
        return NextResponse.json(
          {
            error: `GitHub API returned ${resp.status}`,
            details: text.slice(0, 500),
          },
          { status: 502 }
        )
      }

      const batch: Array<Record<string, unknown>> = await resp.json()
      if (!Array.isArray(batch) || batch.length === 0) break

      for (const r of batch) {
        allRepos.push({
          id: r.id as number,
          name: r.name as string,
          fullName: r.full_name as string,
          description: (r.description as string | null) ?? undefined,
          private: r.private as boolean,
          htmlUrl: r.html_url as string,
          cloneUrl: r.clone_url as string,
          language: (r.language as string | null) ?? undefined,
          stargazersCount: (r.stargazers_count as number) ?? 0,
          forksCount: (r.forks_count as number) ?? 0,
          openIssuesCount: (r.open_issues_count as number) ?? 0,
          defaultBranch: (r.default_branch as string) ?? 'main',
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
          pushedAt: (r.pushed_at as string) ?? (r.updated_at as string),
        })
      }

      if (batch.length < 100) break
      ghPage++
    }

    // Filter repos
    let filtered = allRepos
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (repo) => repo.name.toLowerCase().includes(q) || repo.description?.toLowerCase().includes(q)
      )
    }
    if (filter === 'has_issues') {
      filtered = filtered.filter((repo) => repo.openIssuesCount > 0)
    }
    // has_prs: GitHub issues count includes PRs; keep same filter as has_issues
    if (filter === 'has_prs') {
      filtered = filtered.filter((repo) => repo.openIssuesCount > 0)
    }

    // Sort (API already sorted by updated desc; re-sort locally for other options)
    filtered.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'stars') return b.stargazersCount - a.stargazersCount
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    const total = filtered.length
    const start = (page - 1) * pageSize
    const repos = filtered.slice(start, start + pageSize)

    return NextResponse.json({ repos, total, page, pageSize })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch repositories',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
