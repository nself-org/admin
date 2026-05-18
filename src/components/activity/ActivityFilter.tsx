'use client'

import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select'
import { cn } from '@/lib/utils'
import type {
  ActivityAction,
  ActivityResourceType,
  ActivityFilter as FilterType,
} from '@/types/activity'
import {
  Database,
  Filter,
  Key,
  LayoutDashboard,
  Lock,
  Play,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  Square,
  User,
  Users,
  Workflow,
  X,
  Zap,
} from 'lucide-react'
import * as React from 'react'

/**
 * Activity filter controls component
 *
 * @example
 * ```tsx
 * <ActivityFilter
 *   value={filter}
 *   onChange={setFilter}
 *   showAdvanced
 * />
 * ```
 */

export interface ActivityFilterProps {
  /** Current filter value */
  value: FilterType
  /** Change handler */
  onChange: (filter: FilterType) => void
  /** Show advanced filters */
  showAdvanced?: boolean
  /** Compact layout */
  compact?: boolean
  /** Additional class name */
  className?: string
}

/** Action type options */
const actionOptions: MultiSelectOption[] = [
  { value: 'created', label: 'Created', icon: <Plus className="h-4 w-4" /> },
  {
    value: 'updated',
    label: 'Updated',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  { value: 'deleted', label: 'Deleted', icon: <X className="h-4 w-4" /> },
  { value: 'started', label: 'Started', icon: <Play className="h-4 w-4" /> },
  { value: 'stopped', label: 'Stopped', icon: <Square className="h-4 w-4" /> },
  {
    value: 'restarted',
    label: 'Restarted',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  { value: 'deployed', label: 'Deployed', icon: <Zap className="h-4 w-4" /> },
  {
    value: 'rollback',
    label: 'Rollback',
    icon: <RefreshCw className="h-4 w-4" />,
  },
  { value: 'login', label: 'Login', icon: <User className="h-4 w-4" /> },
  { value: 'logout', label: 'Logout', icon: <User className="h-4 w-4" /> },
  {
    value: 'password_changed',
    label: 'Password Changed',
    icon: <Lock className="h-4 w-4" />,
  },
  { value: 'invited', label: 'Invited', icon: <Users className="h-4 w-4" /> },
  { value: 'removed', label: 'Removed', icon: <Users className="h-4 w-4" /> },
  {
    value: 'role_changed',
    label: 'Role Changed',
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: 'backup_created',
    label: 'Backup Created',
    icon: <Database className="h-4 w-4" />,
  },
  {
    value: 'backup_restored',
    label: 'Backup Restored',
    icon: <Database className="h-4 w-4" />,
  },
  {
    value: 'config_changed',
    label: 'Config Changed',
    icon: <Settings className="h-4 w-4" />,
  },
  {
    value: 'secret_accessed',
    label: 'Secret Accessed',
    icon: <Lock className="h-4 w-4" />,
  },
]

/** Resource type options */
const resourceOptions: MultiSelectOption[] = [
  { value: 'service', label: 'Service', icon: <Server className="h-4 w-4" /> },
  {
    value: 'database',
    label: 'Database',
    icon: <Database className="h-4 w-4" />,
  },
  { value: 'user', label: 'User', icon: <User className="h-4 w-4" /> },
  { value: 'tenant', label: 'Tenant', icon: <Users className="h-4 w-4" /> },
  {
    value: 'organization',
    label: 'Organization',
    icon: <Users className="h-4 w-4" />,
  },
  {
    value: 'backup',
    label: 'Backup',
    icon: <Database className="h-4 w-4" />,
  },
  {
    value: 'deployment',
    label: 'Deployment',
    icon: <Play className="h-4 w-4" />,
  },
  { value: 'config', label: 'Config', icon: <Settings className="h-4 w-4" /> },
  { value: 'secret', label: 'Secret', icon: <Lock className="h-4 w-4" /> },
  { value: 'api_key', label: 'API Key', icon: <Key className="h-4 w-4" /> },
  {
    value: 'workflow',
    label: 'Workflow',
    icon: <Workflow className="h-4 w-4" />,
  },
  {
    value: 'report',
    label: 'Report',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    value: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    value: 'notification',
    label: 'Notification',
    icon: <Zap className="h-4 w-4" />,
  },
]

export function ActivityFilter({
  value,
  onChange,
  showAdvanced = false,
  compact = false,
  className,
}: ActivityFilterProps) {
  const [showFilters, setShowFilters] = React.useState(showAdvanced)
  const [searchInput, setSearchInput] = React.useState(value.search || '')

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== value.search) {
        onChange({ ...value, search: searchInput || undefined })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, value, onChange])

  const handleActionChange = (actions: string[]) => {
    onChange({
      ...value,
      action: actions.length > 0 ? (actions as ActivityAction[]) : undefined,
    })
  }

  const handleResourceTypeChange = (types: string[]) => {
    onChange({
      ...value,
      resourceType: types.length > 0 ? (types as ActivityResourceType[]) : undefined,
    })
  }

  const handleStartDateChange = (date: Date | undefined) => {
    onChange({
      ...value,
      startDate: date ? date.toISOString() : undefined,
    })
  }

  const handleEndDateChange = (date: Date | undefined) => {
    onChange({
      ...value,
      endDate: date ? date.toISOString() : undefined,
    })
  }

  const clearFilters = () => {
    setSearchInput('')
    onChange({})
  }

  const hasActiveFilters =
    value.action || value.resourceType || value.startDate || value.endDate || value.search

  // Get current action values as string array
  const currentActions = value.action
    ? Array.isArray(value.action)
      ? value.action
      : [value.action]
    : []

  // Get current resource type values as string array
  const currentResourceTypes = value.resourceType
    ? Array.isArray(value.resourceType)
      ? value.resourceType
      : [value.resourceType]
    : []

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search activities..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(hasActiveFilters && 'border-blue-500 text-blue-500')}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950',
        className
      )}
    >
      {/* Search and toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            type="text"
            placeholder="Search activities..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(hasActiveFilters && 'border-blue-500 text-blue-500')}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-2 rounded-full bg-blue-500 px-1.5 py-0.5 text-xs text-white">
              {
                [value.action, value.resourceType, value.startDate, value.endDate].filter(Boolean)
                  .length
              }
            </span>
          )}
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="mt-4 grid gap-4 border-t border-zinc-200 pt-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800">
          {/* Action type filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Action Type</Label>
            <MultiSelect
              options={actionOptions}
              value={currentActions}
              onChange={handleActionChange}
              placeholder="All actions"
            />
          </div>

          {/* Resource type filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Resource Type</Label>
            <MultiSelect
              options={resourceOptions}
              value={currentResourceTypes}
              onChange={handleResourceTypeChange}
              placeholder="All resources"
            />
          </div>

          {/* Start date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">From Date</Label>
            <DatePicker
              value={value.startDate ? new Date(value.startDate) : undefined}
              onChange={handleStartDateChange}
              placeholder="Start date"
              maxDate={value.endDate ? new Date(value.endDate) : undefined}
            />
          </div>

          {/* End date */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">To Date</Label>
            <DatePicker
              value={value.endDate ? new Date(value.endDate) : undefined}
              onChange={handleEndDateChange}
              placeholder="End date"
              minDate={value.startDate ? new Date(value.startDate) : undefined}
            />
          </div>
        </div>
      )}
    </div>
  )
}
