import type { GitHubWorkflowRun } from '@/types/github'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/plugins/github/actions
 * Returns list of GitHub Actions workflow runs with pagination and filters
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const filter = searchParams.get('filter') || 'all' // all, success, failure, in_progress
    const sort = searchParams.get('sort') || 'started' // started, duration

    // Mock data - will be replaced with real GitHub API
    const mockRuns: GitHubWorkflowRun[] = [
      {
        id: 1,
        name: 'CI',
        workflowId: 101,
        headBranch: 'main',
        headSha: 'a1b2c3d',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: 'https://github.com/nself-org/admin/actions/runs/1',
        runNumber: 345,
        event: 'push',
        createdAt: '2026-01-31T10:30:00Z',
        updatedAt: '2026-01-31T10:35:00Z',
      },
      {
        id: 2,
        name: 'Build and Deploy',
        workflowId: 102,
        headBranch: 'main',
        headSha: 'b2c3d4e',
        status: 'in_progress',
        htmlUrl: 'https://github.com/nself-org/cli/actions/runs/2',
        runNumber: 892,
        event: 'push',
        createdAt: '2026-01-31T09:45:00Z',
        updatedAt: '2026-01-31T09:50:00Z',
      },
      {
        id: 3,
        name: 'Lint and Format',
        workflowId: 103,
        headBranch: 'feature/plugin-system',
        headSha: 'c3d4e5f',
        status: 'completed',
        conclusion: 'failure',
        htmlUrl: 'https://github.com/nself-org/admin/actions/runs/3',
        runNumber: 344,
        event: 'pull_request',
        createdAt: '2026-01-31T08:20:00Z',
        updatedAt: '2026-01-31T08:23:00Z',
      },
      {
        id: 4,
        name: 'Tests',
        workflowId: 104,
        headBranch: 'main',
        headSha: 'd4e5f6g',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: 'https://github.com/nself-org/cli/actions/runs/4',
        runNumber: 891,
        event: 'push',
        createdAt: '2026-01-30T16:15:00Z',
        updatedAt: '2026-01-30T16:22:00Z',
      },
      {
        id: 5,
        name: 'Release',
        workflowId: 105,
        headBranch: 'main',
        headSha: 'e5f6g7h',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: 'https://github.com/nself-org/admin/actions/runs/5',
        runNumber: 12,
        event: 'release',
        createdAt: '2026-01-30T14:00:00Z',
        updatedAt: '2026-01-30T14:08:00Z',
      },
      {
        id: 6,
        name: 'CI',
        workflowId: 101,
        headBranch: 'fix/migration-rollback',
        headSha: 'f6g7h8i',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: 'https://github.com/nself-org/cli/actions/runs/6',
        runNumber: 890,
        event: 'pull_request',
        createdAt: '2026-01-30T12:30:00Z',
        updatedAt: '2026-01-30T12:36:00Z',
      },
      {
        id: 7,
        name: 'Security Scan',
        workflowId: 106,
        headBranch: 'main',
        headSha: 'g7h8i9j',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: 'https://github.com/nself-org/admin/actions/runs/7',
        runNumber: 156,
        event: 'schedule',
        createdAt: '2026-01-30T00:00:00Z',
        updatedAt: '2026-01-30T00:04:00Z',
      },
      {
        id: 8,
        name: 'Build and Deploy',
        workflowId: 102,
        headBranch: 'main',
        headSha: 'h8i9j0k',
        status: 'completed',
        conclusion: 'failure',
        htmlUrl: 'https://github.com/nself-org/cli/actions/runs/8',
        runNumber: 889,
        event: 'push',
        createdAt: '2026-01-29T18:45:00Z',
        updatedAt: '2026-01-29T18:52:00Z',
      },
      {
        id: 9,
        name: 'Tests',
        workflowId: 104,
        headBranch: 'dependabot/npm_and_yarn/deps',
        headSha: 'i9j0k1l',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: 'https://github.com/nself-org/admin/actions/runs/9',
        runNumber: 343,
        event: 'pull_request',
        createdAt: '2026-01-29T11:20:00Z',
        updatedAt: '2026-01-29T11:28:00Z',
      },
      {
        id: 10,
        name: 'CI',
        workflowId: 101,
        headBranch: 'main',
        headSha: 'j0k1l2m',
        status: 'completed',
        conclusion: 'success',
        htmlUrl: 'https://github.com/nself-org/cli/actions/runs/10',
        runNumber: 888,
        event: 'push',
        createdAt: '2026-01-29T09:00:00Z',
        updatedAt: '2026-01-29T09:05:00Z',
      },
    ]

    // Filter runs
    let filteredRuns = mockRuns
    if (filter === 'success') {
      filteredRuns = filteredRuns.filter((run) => run.conclusion === 'success')
    } else if (filter === 'failure') {
      filteredRuns = filteredRuns.filter((run) => run.conclusion === 'failure')
    } else if (filter === 'in_progress') {
      filteredRuns = filteredRuns.filter((run) => run.status === 'in_progress')
    }

    // Sort runs
    filteredRuns.sort((a, b) => {
      if (sort === 'duration') {
        const durationA =
          new Date(a.updatedAt).getTime() - new Date(a.createdAt).getTime()
        const durationB =
          new Date(b.updatedAt).getTime() - new Date(b.createdAt).getTime()
        return durationB - durationA
      } else {
        // started
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    // Paginate
    const total = filteredRuns.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const runs = filteredRuns.slice(start, end)

    return NextResponse.json({
      runs,
      total,
      page,
      pageSize,
    })
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
