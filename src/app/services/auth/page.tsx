'use client'

import { Button } from '@/components/Button'
import { HeroPattern } from '@/components/HeroPattern'
import { ServiceDetailSkeleton } from '@/components/skeletons'
import { useUrlState } from '@/hooks/useUrlState'
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Chrome,
  Clock,
  Copy,
  Download,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  Facebook,
  Github,
  Globe,
  History,
  Key,
  Lock,
  Mail,
  Monitor,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Shield,
  Smartphone,
  Tablet,
  Trash2,
  TrendingUp,
  Twitter,
  Users,
  XCircle,
} from 'lucide-react'
import { Suspense, useState } from 'react'

interface AuthStats {
  totalUsers: number
  activeUsers: number
  newRegistrations24h: number
  failedLogins24h: number
  avgSessionDuration: string
  mfaEnabled: number
  emailVerified: number
  passwordResets24h: number
}

interface User {
  id: string
  email: string
  displayName?: string
  emailVerified: boolean
  disabled: boolean
  createdAt: string
  lastSignIn?: string
  providerData: UserProvider[]
  customClaims: Record<string, any>
  metadata: {
    lastSignInTime?: string
    creationTime: string
    lastRefreshTime?: string
  }
  roles: string[]
  mfaEnabled: boolean
  locale?: string
  phoneNumber?: string
  photoURL?: string
}

interface UserProvider {
  providerId: string
  uid: string
  displayName?: string
  email?: string
  photoURL?: string
}

interface Role {
  name: string
  description: string
  permissions: string[]
  userCount: number
  isDefault: boolean
  createdAt: string
}

interface Permission {
  name: string
  description: string
  resource: string
  action: string
  conditions?: string[]
}

interface OAuthProvider {
  providerId: string
  enabled: boolean
  clientId: string
  clientSecret: string
  scopes: string[]
  customParameters?: Record<string, string>
  buttonText?: string
  iconURL?: string
}

interface JWTSettings {
  algorithm: string
  issuer: string
  audience: string
  accessTokenExpiry: number
  refreshTokenExpiry: number
  claims: Record<string, any>
  customClaims: boolean
  allowedClockSkew: number
}

interface Session {
  id: string
  userId: string
  userEmail: string
  deviceInfo: {
    device: string
    os: string
    browser: string
    ip: string
    location?: string
  }
  createdAt: string
  lastAccessed: string
  expiresAt: string
  isActive: boolean
}

interface LoginAttempt {
  id: string
  email: string
  success: boolean
  timestamp: string
  ip: string
  userAgent: string
  provider: string
  errorReason?: string
  country?: string
  city?: string
}

interface SecuritySetting {
  name: string
  description: string
  enabled: boolean
  value?: string | number | boolean
  category: 'password' | 'session' | 'rate_limiting' | 'security'
}

function StatsOverview({ stats }: { stats: AuthStats }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Total Users
            </p>
            <p className="text-2xl font-bold">
              {stats.totalUsers.toLocaleString()}
            </p>
          </div>
          <Users className="h-6 w-6 text-blue-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Active Users
            </p>
            <p className="text-2xl font-bold text-green-600">
              {stats.activeUsers.toLocaleString()}
            </p>
          </div>
          <Activity className="h-6 w-6 text-green-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              New Today
            </p>
            <p className="text-2xl font-bold text-sky-500">
              {stats.newRegistrations24h}
            </p>
          </div>
          <TrendingUp className="h-6 w-6 text-sky-500" />
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Failed Logins
            </p>
            <p className="text-2xl font-bold text-red-600">
              {stats.failedLogins24h}
            </p>
          </div>
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
      </div>
    </div>
  )
}

function UserManagement({ users }: { users: User[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'disabled' | 'unverified'
  >('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [sortBy, setSortBy] = useState<
    'name' | 'email' | 'created' | 'lastLogin'
  >('created')

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ??
          false)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !user.disabled && user.emailVerified) ||
        (statusFilter === 'disabled' && user.disabled) ||
        (statusFilter === 'unverified' && !user.emailVerified)

      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.displayName || a.email).localeCompare(
            b.displayName || b.email,
          )
        case 'email':
          return a.email.localeCompare(b.email)
        case 'created':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        case 'lastLogin':
          return (
            new Date(b.lastSignIn || 0).getTime() -
            new Date(a.lastSignIn || 0).getTime()
          )
        default:
          return 0
      }
    })

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google.com':
        return Chrome
      case 'github.com':
        return Github
      case 'facebook.com':
        return Facebook
      case 'twitter.com':
        return Twitter
      default:
        return Mail
    }
  }

  const handleBulkAction = (_action: string) => {
    setSelectedUsers([])
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">User Management</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="text-xs">
                <Download className="mr-1 h-3 w-3" />
                Export
              </Button>
              <Button className="text-xs">
                <Plus className="mr-1 h-3 w-3" />
                Add User
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 py-2 pr-4 pl-10 dark:border-zinc-700"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            >
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
              <option value="unverified">Unverified</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
            >
              <option value="created">Sort by Created</option>
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="lastLogin">Sort by Last Login</option>
            </select>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
              <span className="text-sm font-medium">
                {selectedUsers.length} users selected
              </span>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction('enable')}
                  className="text-xs"
                >
                  Enable
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction('disable')}
                  className="text-xs"
                >
                  Disable
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleBulkAction('delete')}
                  className="text-xs"
                >
                  Delete
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="px-2 py-3 text-left">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map((u) => u.id))
                        } else {
                          setSelectedUsers([])
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-2 py-3 text-left">User</th>
                  <th className="px-2 py-3 text-left">Status</th>
                  <th className="px-2 py-3 text-left">Roles</th>
                  <th className="px-2 py-3 text-left">Providers</th>
                  <th className="px-2 py-3 text-left">Last Login</th>
                  <th className="px-2 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 20).map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-700/50"
                  >
                    <td className="px-2 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers((prev) => [...prev, user.id])
                          } else {
                            setSelectedUsers((prev) =>
                              prev.filter((id) => id !== user.id),
                            )
                          }
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName || user.email}
                            className="h-8 w-8 rounded-full"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {user.displayName || user.email}
                          </div>
                          {user.displayName && (
                            <div className="text-xs text-zinc-500">
                              {user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        {user.disabled ? (
                          <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                            Disabled
                          </span>
                        ) : user.emailVerified ? (
                          <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                            Active
                          </span>
                        ) : (
                          <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                            Unverified
                          </span>
                        )}
                        {user.mfaEnabled && (
                          <Shield className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        {user.roles.slice(0, 2).map((role) => (
                          <span
                            key={role}
                            className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                          >
                            {role}
                          </span>
                        ))}
                        {user.roles.length > 2 && (
                          <span className="text-xs text-zinc-500">
                            +{user.roles.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-1">
                        {user.providerData.slice(0, 3).map((provider, i) => {
                          const Icon = getProviderIcon(provider.providerId)
                          return (
                            <Icon key={i} className="h-4 w-4 text-zinc-500" />
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs text-zinc-500">
                      {user.lastSignIn
                        ? new Date(user.lastSignIn).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedUser(user)}
                          className="text-xs"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="outline" className="text-xs">
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">User Details</h4>
              <Button
                variant="outline"
                onClick={() => setSelectedUser(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Display Name
                </label>
                <div className="text-lg font-medium">
                  {selectedUser.displayName || 'Not set'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Email
                </label>
                <div className="text-lg font-medium">{selectedUser.email}</div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Phone
                </label>
                <div className="text-lg font-medium">
                  {selectedUser.phoneNumber || 'Not set'}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Locale
                </label>
                <div className="text-lg font-medium">
                  {selectedUser.locale || 'Not set'}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Custom Claims
              </label>
              <pre className="overflow-x-auto rounded bg-zinc-50 p-3 font-mono text-sm dark:bg-zinc-900">
                {JSON.stringify(selectedUser.customClaims, null, 2)}
              </pre>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Provider Data
              </label>
              <div className="space-y-2">
                {selectedUser.providerData.map((provider, i) => {
                  const Icon = getProviderIcon(provider.providerId)
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded bg-zinc-50 p-2 dark:bg-zinc-900"
                    >
                      <Icon className="h-5 w-5 text-zinc-500" />
                      <div>
                        <div className="text-sm font-medium">
                          {provider.providerId}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {provider.email || provider.uid}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RolesAndPermissions({
  roles,
  permissions,
}: {
  roles: Role[]
  permissions: Permission[]
}) {
  const [activeSection, setActiveSection] = useState<'roles' | 'permissions'>(
    'roles',
  )
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
        <button
          onClick={() => setActiveSection('roles')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'roles'
              ? 'bg-blue-500 text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Shield className="h-4 w-4" />
          Roles ({roles.length})
        </button>
        <button
          onClick={() => setActiveSection('permissions')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeSection === 'permissions'
              ? 'bg-blue-500 text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
          }`}
        >
          <Key className="h-4 w-4" />
          Permissions ({permissions.length})
        </button>
      </div>

      {activeSection === 'roles' && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Roles</h3>
              <Button className="text-xs">
                <Plus className="mr-1 h-3 w-3" />
                Create Role
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <div
                  key={role.name}
                  onClick={() => setSelectedRole(role)}
                  className="cursor-pointer rounded-lg border border-zinc-200 p-4 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">{role.name}</span>
                    </div>
                    {role.isDefault && (
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
                    {role.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>{role.permissions.length} permissions</span>
                    <span>{role.userCount} users</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'permissions' && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Permissions</h3>
              <Button className="text-xs">
                <Plus className="mr-1 h-3 w-3" />
                Create Permission
              </Button>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-3">
              {permissions.map((permission) => (
                <div
                  key={permission.name}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-4 w-4 text-yellow-500" />
                    <div>
                      <div className="text-sm font-medium">
                        {permission.name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {permission.resource}:{permission.action}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {permission.description}
                  </div>
                  <Button variant="outline" className="text-xs">
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedRole && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">
                {selectedRole.name} Role
              </h4>
              <Button
                variant="outline"
                onClick={() => setSelectedRole(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div>
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Description
              </label>
              <p className="mt-1 text-sm">{selectedRole.description}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Permissions ({selectedRole.permissions.length})
              </label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {selectedRole.permissions.map((permName) => {
                  const permission = permissions.find(
                    (p) => p.name === permName,
                  )
                  return (
                    <div
                      key={permName}
                      className="flex items-center gap-2 rounded bg-zinc-50 p-2 dark:bg-zinc-900"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">
                        {permission?.description || permName}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="text-xs">
                <Edit className="mr-1 h-3 w-3" />
                Edit Role
              </Button>
              <Button variant="outline" className="text-xs">
                <Copy className="mr-1 h-3 w-3" />
                Duplicate
              </Button>
              {!selectedRole.isDefault && (
                <Button variant="outline" className="text-xs">
                  <Trash2 className="mr-1 h-3 w-3" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OAuthConfiguration({ providers }: { providers: OAuthProvider[] }) {
  const [editingProvider, setEditingProvider] = useState<OAuthProvider | null>(
    null,
  )

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
        return Chrome
      case 'github':
        return Github
      case 'facebook':
        return Facebook
      case 'twitter':
        return Twitter
      default:
        return Globe
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
        <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">OAuth Providers</h3>
            <Button className="text-xs">
              <Plus className="mr-1 h-3 w-3" />
              Add Provider
            </Button>
          </div>
        </div>

        <div className="p-4">
          <div className="space-y-3">
            {providers.map((provider) => {
              const Icon = getProviderIcon(provider.providerId)
              return (
                <div
                  key={provider.providerId}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6" />
                    <div>
                      <div className="font-medium capitalize">
                        {provider.providerId}
                      </div>
                      <div className="text-xs text-zinc-500">
                        Client ID: {provider.clientId.substring(0, 20)}...
                      </div>
                    </div>

                    {provider.enabled ? (
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        Enabled
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                        Disabled
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">
                      {provider.scopes.length} scopes
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setEditingProvider(provider)}
                      className="text-xs"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {editingProvider && (
        <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold capitalize">
                {editingProvider.providerId} Configuration
              </h4>
              <Button
                variant="outline"
                onClick={() => setEditingProvider(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Enabled
                </label>
                <div className="mt-1">
                  <input
                    type="checkbox"
                    checked={editingProvider.enabled}
                    className="rounded"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Button Text
                </label>
                <input
                  type="text"
                  value={
                    editingProvider.buttonText ||
                    `Continue with ${editingProvider.providerId}`
                  }
                  className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Client ID
              </label>
              <input
                type="text"
                value={editingProvider.clientId}
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 font-mono dark:border-zinc-700"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Client Secret
              </label>
              <div className="relative mt-1">
                <input
                  type="password"
                  value={editingProvider.clientSecret}
                  className="w-full rounded border border-zinc-200 px-3 py-2 pr-10 font-mono dark:border-zinc-700"
                />
                <button className="absolute top-1/2 right-3 -translate-y-1/2">
                  <EyeOff className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Scopes
              </label>
              <div className="flex flex-wrap gap-2">
                {editingProvider.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                  >
                    {scope}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button className="text-xs">
                <Save className="mr-1 h-3 w-3" />
                Save Changes
              </Button>
              <Button variant="outline" className="text-xs">
                Test Connection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function JWTConfiguration({ settings }: { settings: JWTSettings }) {
  const [editMode, setEditMode] = useState(false)
  const [config, setConfig] = useState(settings)

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">JWT Settings</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setEditMode(!editMode)}
              className="text-xs"
            >
              <Edit className="mr-1 h-3 w-3" />
              {editMode ? 'Cancel' : 'Edit'}
            </Button>
            {editMode && (
              <Button className="text-xs">
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Algorithm
            </label>
            {editMode ? (
              <select
                value={config.algorithm}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, algorithm: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              >
                <option value="HS256">HS256</option>
                <option value="RS256">RS256</option>
                <option value="ES256">ES256</option>
              </select>
            ) : (
              <div className="mt-1 font-mono">{config.algorithm}</div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Issuer
            </label>
            {editMode ? (
              <input
                type="text"
                value={config.issuer}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, issuer: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              />
            ) : (
              <div className="mt-1 font-mono">{config.issuer}</div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Audience
            </label>
            {editMode ? (
              <input
                type="text"
                value={config.audience}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, audience: e.target.value }))
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              />
            ) : (
              <div className="mt-1 font-mono">{config.audience}</div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Clock Skew (seconds)
            </label>
            {editMode ? (
              <input
                type="number"
                value={config.allowedClockSkew}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    allowedClockSkew: parseInt(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              />
            ) : (
              <div className="mt-1">{config.allowedClockSkew}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Access Token Expiry (seconds)
            </label>
            {editMode ? (
              <input
                type="number"
                value={config.accessTokenExpiry}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    accessTokenExpiry: parseInt(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              />
            ) : (
              <div className="mt-1">
                {config.accessTokenExpiry} (
                {Math.floor(config.accessTokenExpiry / 60)} minutes)
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Refresh Token Expiry (seconds)
            </label>
            {editMode ? (
              <input
                type="number"
                value={config.refreshTokenExpiry}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    refreshTokenExpiry: parseInt(e.target.value),
                  }))
                }
                className="mt-1 w-full rounded border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              />
            ) : (
              <div className="mt-1">
                {config.refreshTokenExpiry} (
                {Math.floor(config.refreshTokenExpiry / 3600)} hours)
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Custom Claims
          </label>
          <div className="mb-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.customClaims}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  customClaims: e.target.checked,
                }))
              }
              disabled={!editMode}
              className="rounded"
            />
            <span className="text-sm">Enable custom claims in JWT tokens</span>
          </div>

          {editMode ? (
            <textarea
              value={JSON.stringify(config.claims, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setConfig((prev) => ({ ...prev, claims: parsed }))
                } catch {
                  // Invalid JSON, ignore
                }
              }}
              className="h-32 w-full rounded border border-zinc-200 px-3 py-2 font-mono text-sm dark:border-zinc-700"
            />
          ) : (
            <pre className="overflow-x-auto rounded bg-zinc-50 p-3 font-mono text-sm dark:bg-zinc-900">
              {JSON.stringify(config.claims, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

function SessionManagement({ sessions }: { sessions: Session[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [deviceFilter, setDeviceFilter] = useState<
    'all' | 'mobile' | 'desktop' | 'tablet'
  >('all')

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch =
      session.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.deviceInfo.ip.includes(searchTerm)

    const matchesDevice =
      deviceFilter === 'all' ||
      (deviceFilter === 'mobile' &&
        session.deviceInfo.device.toLowerCase().includes('mobile')) ||
      (deviceFilter === 'desktop' &&
        session.deviceInfo.device.toLowerCase().includes('desktop')) ||
      (deviceFilter === 'tablet' &&
        session.deviceInfo.device.toLowerCase().includes('tablet'))

    return matchesSearch && matchesDevice
  })

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile')) return Smartphone
    if (device.toLowerCase().includes('tablet')) return Tablet
    return Monitor
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Active Sessions</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-xs">
              <Download className="mr-1 h-3 w-3" />
              Export
            </Button>
            <Button variant="outline" className="text-xs">
              Revoke All
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 py-2 pr-4 pl-10 dark:border-zinc-700"
            />
          </div>

          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value as any)}
            className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
          >
            <option value="all">All Devices</option>
            <option value="mobile">Mobile</option>
            <option value="desktop">Desktop</option>
            <option value="tablet">Tablet</option>
          </select>
        </div>

        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.deviceInfo.device)
            return (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
              >
                <div className="flex items-center gap-3">
                  <DeviceIcon className="h-5 w-5 text-zinc-500" />
                  <div>
                    <div className="text-sm font-medium">
                      {session.userEmail}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {session.deviceInfo.browser} on {session.deviceInfo.os} •{' '}
                      {session.deviceInfo.ip}
                      {session.deviceInfo.location &&
                        ` • ${session.deviceInfo.location}`}
                    </div>
                  </div>

                  {session.isActive ? (
                    <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-900/20 dark:text-green-400">
                      Active
                    </span>
                  ) : (
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                      Expired
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right text-xs text-zinc-500">
                    <div>
                      Created:{' '}
                      {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      Last:{' '}
                      {new Date(session.lastAccessed).toLocaleDateString()}
                    </div>
                  </div>

                  <Button variant="outline" className="text-xs">
                    Revoke
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LoginHistory({ attempts }: { attempts: LoginAttempt[] }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'success' | 'failed'
  >('all')

  const filteredAttempts = attempts.filter((attempt) => {
    const matchesSearch =
      attempt.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.ip.includes(searchTerm)
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'success' && attempt.success) ||
      (statusFilter === 'failed' && !attempt.success)

    return matchesSearch && matchesStatus
  })

  return (
    <div className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Login History</h3>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="text-xs">
              <Download className="mr-1 h-3 w-3" />
              Export
            </Button>
            <Button variant="outline" className="text-xs">
              <Trash2 className="mr-1 h-3 w-3" />
              Clear Old
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search login attempts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 py-2 pr-4 pl-10 dark:border-zinc-700"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
          >
            <option value="all">All Attempts</option>
            <option value="success">Successful</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="space-y-2">
          {filteredAttempts.map((attempt) => (
            <div
              key={attempt.id}
              className="flex items-center justify-between rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
            >
              <div className="flex items-center gap-3">
                {attempt.success ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <div>
                  <div className="text-sm font-medium">{attempt.email}</div>
                  <div className="text-xs text-zinc-500">
                    {attempt.provider} • {attempt.ip}
                    {attempt.city && ` • ${attempt.city}, ${attempt.country}`}
                  </div>
                </div>

                {!attempt.success && attempt.errorReason && (
                  <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
                    {attempt.errorReason}
                  </span>
                )}
              </div>

              <div className="text-xs text-zinc-500">
                {new Date(attempt.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SecuritySettings({ settings }: { settings: SecuritySetting[] }) {
  const [editingSettings, setEditingSettings] = useState<Record<string, any>>(
    {},
  )
  const [hasChanges, setHasChanges] = useState(false)

  const categories = [
    'password',
    'session',
    'rate_limiting',
    'security',
  ] as const

  const handleSettingChange = (name: string, value: any) => {
    setEditingSettings((prev) => ({ ...prev, [name]: value }))
    setHasChanges(true)
  }

  const saveSettings = () => {
    setHasChanges(false)
    setEditingSettings({})
  }

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const categorySettings = settings.filter((s) => s.category === category)

        return (
          <div
            key={category}
            className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
              <h3 className="text-lg font-semibold capitalize">
                {category.replace('_', ' ')} Settings
              </h3>
            </div>

            <div className="space-y-4 p-4">
              {categorySettings.map((setting) => (
                <div
                  key={setting.name}
                  className="flex items-center justify-between border-b border-zinc-100 py-3 last:border-0 dark:border-zinc-800"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{setting.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {setting.description}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {typeof setting.value === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={
                          editingSettings[setting.name] ?? setting.enabled
                        }
                        onChange={(e) =>
                          handleSettingChange(setting.name, e.target.checked)
                        }
                        className="rounded"
                      />
                    ) : typeof setting.value === 'number' ? (
                      <input
                        type="number"
                        value={editingSettings[setting.name] ?? setting.value}
                        onChange={(e) =>
                          handleSettingChange(
                            setting.name,
                            parseInt(e.target.value),
                          )
                        }
                        className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editingSettings[setting.name] ?? setting.value}
                        onChange={(e) =>
                          handleSettingChange(setting.name, e.target.value)
                        }
                        className="w-32 rounded border border-zinc-200 px-2 py-1 text-sm dark:border-zinc-700"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {hasChanges && (
        <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium">You have unsaved changes</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingSettings({})
                setHasChanges(false)
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button onClick={saveSettings} className="text-xs">
              <Save className="mr-1 h-3 w-3" />
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function AuthContent() {
  const [activeTab, setActiveTab] = useUrlState<string>('tab', 'users')

  // Mock data
  const [stats] = useState<AuthStats>({
    totalUsers: 15432,
    activeUsers: 1234,
    newRegistrations24h: 23,
    failedLogins24h: 45,
    avgSessionDuration: '2h 34m',
    mfaEnabled: 892,
    emailVerified: 14567,
    passwordResets24h: 8,
  })

  const [users] = useState<User[]>([
    {
      id: '1',
      email: 'john.doe@example.com',
      displayName: 'John Doe',
      emailVerified: true,
      disabled: false,
      createdAt: '2024-01-15T10:30:00.000Z',
      lastSignIn: '2024-01-17T09:15:00.000Z',
      providerData: [
        {
          providerId: 'google.com',
          uid: 'google-uid-123',
          email: 'john.doe@example.com',
        },
        { providerId: 'github.com', uid: 'github-uid-456' },
      ],
      customClaims: { role: 'admin', department: 'engineering' },
      metadata: {
        creationTime: '2024-01-15T10:30:00.000Z',
        lastSignInTime: '2024-01-17T09:15:00.000Z',
      },
      roles: ['admin', 'user'],
      mfaEnabled: true,
      photoURL: 'https://avatar.example.com/john.jpg',
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      displayName: 'Jane Smith',
      emailVerified: true,
      disabled: false,
      createdAt: '2024-01-16T14:20:00.000Z',
      lastSignIn: '2024-01-17T08:30:00.000Z',
      providerData: [
        {
          providerId: 'google.com',
          uid: 'google-uid-789',
          email: 'jane.smith@example.com',
        },
      ],
      customClaims: { role: 'manager', department: 'product' },
      metadata: {
        creationTime: '2024-01-16T14:20:00.000Z',
        lastSignInTime: '2024-01-17T08:30:00.000Z',
      },
      roles: ['manager', 'user'],
      mfaEnabled: false,
    },
    {
      id: '3',
      email: 'unverified@example.com',
      emailVerified: false,
      disabled: false,
      createdAt: '2024-01-17T10:00:00.000Z',
      providerData: [
        {
          providerId: 'password',
          uid: 'password-uid-101',
          email: 'unverified@example.com',
        },
      ],
      customClaims: {},
      metadata: {
        creationTime: '2024-01-17T10:00:00.000Z',
      },
      roles: ['user'],
      mfaEnabled: false,
    },
  ])

  const [roles] = useState<Role[]>([
    {
      name: 'admin',
      description: 'Full system administrator with all permissions',
      permissions: [
        'users.read',
        'users.write',
        'users.delete',
        'roles.manage',
        'system.config',
      ],
      userCount: 5,
      isDefault: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      name: 'manager',
      description: 'Team manager with user management permissions',
      permissions: ['users.read', 'users.write', 'team.manage'],
      userCount: 23,
      isDefault: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      name: 'user',
      description: 'Standard user with basic permissions',
      permissions: ['profile.read', 'profile.write'],
      userCount: 15404,
      isDefault: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  ])

  const [permissions] = useState<Permission[]>([
    {
      name: 'users.read',
      description: 'View user information',
      resource: 'users',
      action: 'read',
    },
    {
      name: 'users.write',
      description: 'Create and update users',
      resource: 'users',
      action: 'write',
    },
    {
      name: 'users.delete',
      description: 'Delete user accounts',
      resource: 'users',
      action: 'delete',
    },
    {
      name: 'roles.manage',
      description: 'Manage roles and permissions',
      resource: 'roles',
      action: 'manage',
    },
    {
      name: 'system.config',
      description: 'Configure system settings',
      resource: 'system',
      action: 'config',
    },
    {
      name: 'team.manage',
      description: 'Manage team members',
      resource: 'team',
      action: 'manage',
    },
    {
      name: 'profile.read',
      description: 'View own profile',
      resource: 'profile',
      action: 'read',
    },
    {
      name: 'profile.write',
      description: 'Update own profile',
      resource: 'profile',
      action: 'write',
    },
  ])

  const [oauthProviders] = useState<OAuthProvider[]>([
    {
      providerId: 'google',
      enabled: true,
      clientId: 'your-google-client-id.apps.googleusercontent.com',
      clientSecret: 'your-google-client-secret',
      scopes: ['email', 'profile'],
      buttonText: 'Continue with Google',
    },
    {
      providerId: 'github',
      enabled: true,
      clientId: 'your-github-client-id',
      clientSecret: 'your-github-client-secret',
      scopes: ['user:email'],
      buttonText: 'Continue with GitHub',
    },
    {
      providerId: 'facebook',
      enabled: false,
      clientId: 'your-facebook-client-id',
      clientSecret: 'your-facebook-client-secret',
      scopes: ['email'],
      buttonText: 'Continue with Facebook',
    },
  ])

  const [jwtSettings] = useState<JWTSettings>({
    algorithm: 'HS256',
    issuer: 'https://your-app.com',
    audience: 'your-app-users',
    accessTokenExpiry: 900, // 15 minutes
    refreshTokenExpiry: 2592000, // 30 days
    claims: {
      iss: 'https://your-app.com',
      aud: 'your-app-users',
      sub: 'user-id',
      role: 'user',
    },
    customClaims: true,
    allowedClockSkew: 60,
  })

  const [sessions] = useState<Session[]>([
    {
      id: 'sess_1',
      userId: '1',
      userEmail: 'john.doe@example.com',
      deviceInfo: {
        device: 'Desktop',
        os: 'macOS 14.0',
        browser: 'Chrome 120.0',
        ip: '192.168.1.100',
        location: 'San Francisco, CA',
      },
      createdAt: '2024-01-17T09:15:00.000Z',
      lastAccessed: '2024-01-17T10:30:00.000Z',
      expiresAt: '2024-01-18T09:15:00.000Z',
      isActive: true,
    },
    {
      id: 'sess_2',
      userId: '1',
      userEmail: 'john.doe@example.com',
      deviceInfo: {
        device: 'iPhone 15 Pro',
        os: 'iOS 17.0',
        browser: 'Safari',
        ip: '10.0.1.50',
        location: 'San Francisco, CA',
      },
      createdAt: '2024-01-16T18:30:00.000Z',
      lastAccessed: '2024-01-17T07:45:00.000Z',
      expiresAt: '2024-01-17T18:30:00.000Z',
      isActive: true,
    },
  ])

  const [loginAttempts] = useState<LoginAttempt[]>([
    {
      id: '1',
      email: 'john.doe@example.com',
      success: true,
      timestamp: '2024-01-17T09:15:00.000Z',
      ip: '192.168.1.100',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      provider: 'google',
      country: 'US',
      city: 'San Francisco',
    },
    {
      id: '2',
      email: 'attacker@malicious.com',
      success: false,
      timestamp: '2024-01-17T08:45:00.000Z',
      ip: '123.456.789.012',
      userAgent: 'curl/7.68.0',
      provider: 'password',
      errorReason: 'Invalid credentials',
      country: 'Unknown',
      city: 'Unknown',
    },
    {
      id: '3',
      email: 'jane.smith@example.com',
      success: true,
      timestamp: '2024-01-17T08:30:00.000Z',
      ip: '192.168.1.101',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      provider: 'password',
      country: 'US',
      city: 'New York',
    },
  ])

  const [securitySettings] = useState<SecuritySetting[]>([
    {
      name: 'Minimum Password Length',
      description: 'Minimum number of characters required for passwords',
      enabled: true,
      value: 8,
      category: 'password',
    },
    {
      name: 'Require Special Characters',
      description: 'Passwords must contain at least one special character',
      enabled: true,
      category: 'password',
    },
    {
      name: 'Password Expiry Days',
      description: 'Number of days before passwords expire (0 = never)',
      enabled: false,
      value: 90,
      category: 'password',
    },
    {
      name: 'Session Timeout',
      description: 'Automatically log out users after inactivity (minutes)',
      enabled: true,
      value: 30,
      category: 'session',
    },
    {
      name: 'Remember Me Duration',
      description: 'How long "remember me" sessions last (days)',
      enabled: true,
      value: 30,
      category: 'session',
    },
    {
      name: 'Max Login Attempts',
      description: 'Number of failed login attempts before account lockout',
      enabled: true,
      value: 5,
      category: 'rate_limiting',
    },
    {
      name: 'Account Lockout Duration',
      description:
        'How long accounts remain locked after failed attempts (minutes)',
      enabled: true,
      value: 15,
      category: 'rate_limiting',
    },
    {
      name: 'Require Email Verification',
      description:
        'New users must verify their email before accessing the system',
      enabled: true,
      category: 'security',
    },
    {
      name: 'Enable MFA',
      description: 'Allow users to enable multi-factor authentication',
      enabled: true,
      category: 'security',
    },
  ])

  const tabs = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles & Permissions', icon: Shield },
    { id: 'oauth', label: 'OAuth Providers', icon: Globe },
    { id: 'jwt', label: 'JWT Settings', icon: Key },
    { id: 'sessions', label: 'Sessions', icon: Clock },
    { id: 'history', label: 'Login History', icon: History },
    { id: 'security', label: 'Security', icon: Lock },
  ]

  return (
    <>
      <HeroPattern />
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold text-zinc-900 dark:text-white">
                <Shield className="h-8 w-8 text-green-500" />
                Auth Service
              </h1>
              <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                User management, authentication, and security configuration
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                Hasura Auth Console
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export Users
              </Button>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <StatsOverview stats={stats} />

          {/* Additional Quick Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Email Verified
                  </p>
                  <p className="text-2xl font-bold">
                    {((stats.emailVerified / stats.totalUsers) * 100).toFixed(
                      1,
                    )}
                    %
                  </p>
                </div>
                <Mail className="h-6 w-6 text-blue-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    MFA Enabled
                  </p>
                  <p className="text-2xl font-bold">{stats.mfaEnabled}</p>
                </div>
                <Lock className="h-6 w-6 text-green-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Avg Session
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.avgSessionDuration}
                  </p>
                </div>
                <Clock className="h-6 w-6 text-sky-500" />
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Password Resets
                  </p>
                  <p className="text-2xl font-bold">
                    {stats.passwordResets24h}
                  </p>
                </div>
                <Key className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && <UserManagement users={users} />}
        {activeTab === 'roles' && (
          <RolesAndPermissions roles={roles} permissions={permissions} />
        )}
        {activeTab === 'oauth' && (
          <OAuthConfiguration providers={oauthProviders} />
        )}
        {activeTab === 'jwt' && <JWTConfiguration settings={jwtSettings} />}
        {activeTab === 'sessions' && <SessionManagement sessions={sessions} />}
        {activeTab === 'history' && <LoginHistory attempts={loginAttempts} />}
        {activeTab === 'security' && (
          <SecuritySettings settings={securitySettings} />
        )}
      </div>
    </>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<ServiceDetailSkeleton />}>
      <AuthContent />
    </Suspense>
  )
}
