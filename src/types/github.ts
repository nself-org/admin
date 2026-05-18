/**
 * GitHub Plugin Types for nself-admin v0.0.8
 */

export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  description?: string
  private: boolean
  htmlUrl: string
  cloneUrl: string
  language?: string
  stargazersCount: number
  forksCount: number
  openIssuesCount: number
  defaultBranch: string
  createdAt: string
  updatedAt: string
  pushedAt: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body?: string
  state: 'open' | 'closed'
  htmlUrl: string
  userId: number
  userLogin: string
  labels: string[]
  assignees: string[]
  milestone?: string
  commentsCount: number
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body?: string
  state: 'open' | 'closed' | 'merged'
  htmlUrl: string
  userId: number
  userLogin: string
  head: string
  base: string
  labels: string[]
  reviewers: string[]
  draft: boolean
  mergeable?: boolean
  merged: boolean
  mergedAt?: string
  createdAt: string
  updatedAt: string
  closedAt?: string
}

export interface GitHubWorkflowRun {
  id: number
  name: string
  workflowId: number
  headBranch: string
  headSha: string
  status: 'queued' | 'in_progress' | 'completed' | 'waiting'
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required'
  htmlUrl: string
  runNumber: number
  event: string
  createdAt: string
  updatedAt: string
}

export interface GitHubRelease {
  id: number
  tagName: string
  name: string
  body?: string
  draft: boolean
  prerelease: boolean
  htmlUrl: string
  tarballUrl: string
  zipballUrl: string
  createdAt: string
  publishedAt?: string
  authorLogin: string
}

export interface GitHubStats {
  totalRepos: number
  publicRepos: number
  privateRepos: number
  openIssues: number
  openPRs: number
  totalStars: number
  totalForks: number
  actionsRuns: {
    success: number
    failure: number
    pending: number
  }
  lastSync: string
}
