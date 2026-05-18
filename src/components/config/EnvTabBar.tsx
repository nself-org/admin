'use client'

import { EnvironmentTab } from './types'

interface EnvTabBarProps {
  tabs: EnvironmentTab[]
  activeTab: string
  hasUnsavedChanges: boolean
  onTabChange: (tabId: string) => void
}

export function EnvTabBar({ tabs, activeTab, hasUnsavedChanges, onTabChange }: EnvTabBarProps) {
  const handleTabClick = (tabId: string) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Switch environments?')
      if (!confirmed) return
    }
    onTabChange(tabId)
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-blue-400'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
          }`}
          title={tab.description}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
