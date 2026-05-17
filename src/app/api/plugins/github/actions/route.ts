import type { GitHubWorkflowRun } from '@/types/github'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/plugins/github/actions
 * Returns list of GitHub Actions workflow runs across repos accessible to GITHUB_TOKEN.
 * Returns honest empty with a note when unconfigured.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const filter = searchParams.get('filter') || 'all' // all, success, failure, in_progress
    const sort = searchParams.get('sort') || 'started' // started, duration
    const repo = searchParams.get('repo') || '' // optional: owner/repo

    const token = process.env.GITHUB_TOKEN
    if (!token) {
      return NextResponse.json({
        runs: [],
        total: 0,
        page,
        pageSize,
        note: 'github-token-not-configured',
      })
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    let allRuns: GitHubWorkflowRun[] = []

    if (repo) {
      // Single repo specified — fetch runs directly
      const statusParam = filter === 'in_progress' ? '&status=in_progress' : ''
      const resp = await fetch(
        `https://api.github.com/repos/${repo}/actions/runs?per_page=100${statusParam}`,
        { headers, signal: AbortSignal.timeout(15_000) },
      )
      if (resp.ok) {
        const data: { total_count: number; workflow_runs: Array<Record<string, unknown>> } =
          await resp.json()
        allRuns = mapRuns(data.workflow_runs ?? [])
      }
    } else {
      // No repo specified — use the authenticated user's repos to find recent runs
      // Fetch top 5 most-recently-pushed repos and aggregate runs
      const reposResp = await fetch(
        'https://api.github.com/user/repos?sort=pushed&per_page=5&affiliation=owner',
        { headers, signal: AbortSignal.timeout(15_000) },
      )
      if (!reposResp.ok) {
        const text = await reposResp.text()
        return NextResponse.json(
          { error: `GitHub API returned ${reposResp.status}`, details: text.slice(0, 500) },
          { status: 502 },
        )
      }
      const repos: Array<Record<string, unknown>> = await reposResp.json()

      await Promise.all(
        repos.map(async (r) => {
          const fullName = r.full_name as string
          const runsResp = await fetch(
            `https://api.github.com/repos/${fullName}/actions/runs?per_page=20`,
            { headers, signal: AbortSignal.timeout(10_000) },
          ).catch(() => null)
          if (!runsResp?.ok) return
          const data: { workflow_runs: Array<Record<string, unknown>> } =
            await runsResp.json()
          allRuns.push(...mapRuns(data.workflow_runs ?? []))
        }),
      )
    }

    // Filter
    let filtered = allRuns
    if (filter === 'success') {
      filtered = filtered.filter((r) => r.conclusion === 'success')
    } else if (filter === 'failure') {
      filtered = filtered.filter((r) => r.conclusion === 'failure')
    } else if (filter === 'in_progress') {
      filtered = filtered.filter((r) => r.status === 'in_progress')
    }

    // Sort
    filtered.sort((a, b) => {
      if (sort === 'duration') {
        const da = new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()
        const db = new Date(b.updatedAt).getTime() - new Date(b.createdAt).getTime()
        return db - da
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const total = filtered.length
    const start = (page - 1) * pageSize
    const runs = filtered.slice(start, start + pageSize)

    return NextResponse.json({ runs, total, page, pageSize })
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch workflow runs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}

function mapRuns(raw: Array<Record<string, unknown>>): GitHubWorkflowRun[] {
  return raw.map((r) => ({
    id: r.id as number,
    name: r.name as string,
    workflowId: r.workflow_id as number,
    headBranch: (r.head_branch as string) ?? '',
    headSha: (r.head_sha as string) ?? '',
    status: r.status as GitHubWorkflowRun['status'],
    conclusion: (r.conclusion as GitHubWorkflowRun['conclusion']) ?? undefined,
    htmlUrl: r.html_url as string,
    runNumber: r.run_number as number,
    event: r.event as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  }))
}
