/**
 * Organization API client for interacting with org endpoints
 */

import type {
  CreateOrgInput,
  CreateTeamInput,
  Organization,
  OrgListResponse,
  OrgMember,
  Team,
} from '@/types/tenant'
import { api } from '../api-client'

const BASE_URL = '/api/org'

export async function createOrg(input: CreateOrgInput): Promise<Organization> {
  const response = await api.post(BASE_URL, input)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to create organization')
  return data.data
}

export async function listOrgs(): Promise<OrgListResponse> {
  const response = await api.get(BASE_URL)
  return response.json()
}

export async function getOrg(id: string): Promise<Organization> {
  const response = await api.get(`${BASE_URL}/${id}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to get organization')
  return data.data
}

export async function updateOrg(id: string, input: Partial<CreateOrgInput>): Promise<Organization> {
  const response = await api.put(`${BASE_URL}/${id}`, input)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update organization')
  return data.data
}

export async function deleteOrg(id: string): Promise<void> {
  const response = await api.delete(`${BASE_URL}/${id}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to delete organization')
}

// Member management
export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const response = await api.get(`${BASE_URL}/${orgId}/members`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to list members')
  return data.data.members
}

export async function addOrgMember(
  orgId: string,
  email: string,
  role: OrgMember['role']
): Promise<OrgMember> {
  const response = await api.post(`${BASE_URL}/${orgId}/members`, {
    email,
    role,
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to add member')
  return data.data
}

export async function removeOrgMember(orgId: string, userId: string): Promise<void> {
  const response = await api.delete(`${BASE_URL}/${orgId}/members/${userId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to remove member')
}

export async function updateOrgMemberRole(
  orgId: string,
  userId: string,
  role: OrgMember['role']
): Promise<OrgMember> {
  const response = await api.put(`${BASE_URL}/${orgId}/members/${userId}`, {
    role,
  })
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update member role')
  return data.data
}

// Team management
export async function listTeams(orgId: string): Promise<Team[]> {
  const response = await api.get(`${BASE_URL}/${orgId}/teams`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to list teams')
  return data.data.teams
}

export async function createTeam(orgId: string, input: CreateTeamInput): Promise<Team> {
  const response = await api.post(`${BASE_URL}/${orgId}/teams`, input)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to create team')
  return data.data
}

export async function getTeam(orgId: string, teamId: string): Promise<Team> {
  const response = await api.get(`${BASE_URL}/${orgId}/teams/${teamId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to get team')
  return data.data
}

export async function updateTeam(
  orgId: string,
  teamId: string,
  input: Partial<CreateTeamInput>
): Promise<Team> {
  const response = await api.put(`${BASE_URL}/${orgId}/teams/${teamId}`, input)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to update team')
  return data.data
}

export async function deleteTeam(orgId: string, teamId: string): Promise<void> {
  const response = await api.delete(`${BASE_URL}/${orgId}/teams/${teamId}`)
  const data = await response.json()
  if (!data.success) throw new Error(data.error || 'Failed to delete team')
}

export const orgApi = {
  create: createOrg,
  list: listOrgs,
  get: getOrg,
  update: updateOrg,
  delete: deleteOrg,
  members: {
    list: listOrgMembers,
    add: addOrgMember,
    remove: removeOrgMember,
    updateRole: updateOrgMemberRole,
  },
  teams: {
    list: listTeams,
    create: createTeam,
    get: getTeam,
    update: updateTeam,
    delete: deleteTeam,
  },
}
