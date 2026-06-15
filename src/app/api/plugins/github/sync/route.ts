import { requireAuth } from '@/lib/require-auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/plugins/github/sync
 * Triggers a live sync against the GitHub API: fetches current counts for
 * repos, open issues, open PRs, and recent workflow runs then returns the
 * aggregated summary.
 *
 * Requires GITHUB_TOKEN env var. Returns honest empty with a note when
 * unconfigured — identical pattern to sibling routes (repos, prs, issues,
 * actions).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      return NextResponse.json({
        success: true,
        syncedAt: new Date().toISOString(),
        counts: { repos: 0, openIssues: 0, openPRs: 0, workflowRuns: 0 },
        note: 'github-token-not-configured',
      })
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    // Fetch user info + repo counts in parallel
    const [userResp, reposResp, issuesResp, prsResp] = await Promise.all([
      fetch('https://api.github.com/user', {
        headers,
        signal: AbortSignal.timeout(10_000),
      }),
      fetch(
        'https://api.github.com/user/repos?per_page=1&affiliation=owner,collaborator,organization_member',
        { headers, signal: AbortSignal.timeout(10_000) }
      ),
      fetch('https://api.github.com/search/issues?q=is:issue+is:open&per_page=1', {
        headers,
        signal: AbortSignal.timeout(10_000),
      }),
      fetch('https://api.github.com/search/issues?q=is:pr+is:open&per_page=1', {
        headers,
        signal: AbortSignal.timeout(10_000),
      }),
    ])

    if (!userResp.ok) {
      const text = await userResp.text()
      return NextResponse.json(
        { error: `GitHub API returned ${userResp.status}`, details: text.slice(0, 500) },
        { status: 502 }
      )
    }

    const userData: Record<string, unknown> = await userResp.json()
    const totalRepos =
      ((userData.total_private_repos as number) ?? 0) + ((userData.public_repos as number) ?? 0)

    // Extract total_count from paginated responses (Link header carries page info;
    // we only need the count which GitHub returns in the response body for search
    // endpoints and in X-Total-Count for /user/repos).
    let repoCount = totalRepos
    if (reposResp.ok) {
      const linkHeader = reposResp.headers.get('Link') ?? ''
      // Extract last page from Link header: rel="last"
      const lastMatch = linkHeader.match(/page=(\d+)>; rel="last"/)
      if (lastMatch) {
        // per_page=1 so last page number = total count
        repoCount = parseInt(lastMatch[1] ?? '0', 10)
      }
    }

    let openIssues = 0
    if (issuesResp.ok) {
      const issuesData: { total_count: number } = await issuesResp.json()
      openIssues = issuesData.total_count ?? 0
    }

    let openPRs = 0
    if (prsResp.ok) {
      const prsData: { total_count: number } = await prsResp.json()
      openPRs = prsData.total_count ?? 0
    }

    // Fetch recent workflow runs from top 3 most-recently-pushed repos
    let workflowRuns = 0
    const topReposResp = await fetch(
      'https://api.github.com/user/repos?sort=pushed&per_page=3&affiliation=owner',
      { headers, signal: AbortSignal.timeout(10_000) }
    )
    if (topReposResp.ok) {
      const topRepos: Array<Record<string, unknown>> = await topReposResp.json()
      const runCounts = await Promise.all(
        topRepos.map(async (r) => {
          const fullName = r.full_name as string
          const resp = await fetch(
            `https://api.github.com/repos/${fullName}/actions/runs?per_page=1`,
            { headers, signal: AbortSignal.timeout(8_000) }
          ).catch(() => null)
          if (!resp?.ok) return 0
          const data: { total_count: number } = await resp.json()
          return data.total_count ?? 0
        })
      )
      workflowRuns = runCounts.reduce((sum, n) => sum + n, 0)
    }

    return NextResponse.json({
      success: true,
      syncedAt: new Date().toISOString(),
      counts: {
        repos: repoCount,
        openIssues,
        openPRs,
        workflowRuns,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync GitHub data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
