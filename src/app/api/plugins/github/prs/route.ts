import type { GitHubPullRequest } from '@/types/github'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/plugins/github/prs
 * Returns list of GitHub pull requests with pagination, search, and filters.
 * Requires GITHUB_TOKEN env var. Returns honest empty with a note when unconfigured.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const search = searchParams.get('search') || ''
    const filter = searchParams.get('filter') || 'all' // all, open, merged, closed
    const sort = searchParams.get('sort') || 'created' // created, updated

    const token = process.env.GITHUB_TOKEN
    if (!token) {
      return NextResponse.json({
        prs: [],
        total: 0,
        page,
        pageSize,
        note: 'github-token-not-configured',
      })
    }

    // Build GitHub search query for PRs visible to this token
    const stateFilter =
      filter === 'open' ? 'state:open' :
      filter === 'merged' ? 'is:merged' :
      filter === 'closed' ? 'state:closed is:unmerged' :
      'state:open state:closed' // all

    const ghQ = encodeURIComponent(
      `is:pr ${stateFilter} ${search ? search : ''}`.trim(),
    )
    const sortParam = sort === 'updated' ? 'updated' : 'created'

    const resp = await fetch(
      `https://api.github.com/search/issues?q=${ghQ}&sort=${sortParam}&order=desc&per_page=${Math.min(pageSize, 100)}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        signal: AbortSignal.timeout(15_000),
      },
    )

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json(
        {
          error: `GitHub API returned ${resp.status}`,
          details: text.slice(0, 500),
        },
        { status: 502 },
      )
    }

    const data: { total_count: number; items: Array<Record<string, unknown>> } =
      await resp.json()

    const prs: GitHubPullRequest[] = (data.items ?? []).map((item) => {
      const prData = item.pull_request as Record<string, string | null> | undefined
      const merged = !!(prData?.merged_at)
      return {
        id: item.id as number,
        number: item.number as number,
        title: item.title as string,
        body: (item.body as string | null) ?? undefined,
        state: merged ? 'merged' : (item.state as 'open' | 'closed'),
        htmlUrl: item.html_url as string,
        userId: (item.user as Record<string, unknown>)?.id as number ?? 0,
        userLogin: (item.user as Record<string, unknown>)?.login as string ?? '',
        head: '',
        base: '',
        labels: ((item.labels as Array<Record<string, string>>) ?? []).map((l) => l.name),
        reviewers: [],
        draft: !!(item.draft),
        mergeable: undefined,
        merged,
        mergedAt: prData?.merged_at ?? undefined,
        createdAt: item.created_at as string,
        updatedAt: item.updated_at as string,
        closedAt: (item.closed_at as string | null) ?? undefined,
      }
    })

    return NextResponse.json({
      prs,
      total: data.total_count ?? prs.length,
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
