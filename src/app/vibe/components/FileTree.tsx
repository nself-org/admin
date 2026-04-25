'use client'

import type { VibeGeneration } from '@/app/vibe/hooks/useVibeSession'
import { File, FolderOpen } from 'lucide-react'

interface FileTreeProps {
  generation: VibeGeneration | null
}

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: TreeNode[]
}

function buildTree(files: Record<string, string>): TreeNode[] {
  const root: TreeNode[] = []

  for (const path of Object.keys(files).sort()) {
    const parts = path.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      const fullPath = parts.slice(0, i + 1).join('/')

      let node = current.find((n) => n.name === part)
      if (!node) {
        node = {
          name: part,
          path: fullPath,
          type: isLast ? 'file' : 'dir',
          children: isLast ? undefined : [],
        }
        current.push(node)
      }

      if (!isLast && node.children) {
        current = node.children
      }
    }
  }

  return root
}

function TreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const indent = depth * 12

  if (node.type === 'dir') {
    return (
      <li>
        <div
          className="flex items-center gap-1.5 py-0.5 text-zinc-400"
          style={{ paddingLeft: indent + 8 }}
          role="treeitem"
          aria-expanded={true}
        >
          <FolderOpen
            className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500/70"
            aria-hidden="true"
          />
          <span className="text-xs font-medium">{node.name}/</span>
        </div>
        {node.children && node.children.length > 0 && (
          <ul role="group">
            {node.children.map((child) => (
              <TreeItem key={child.path} node={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <li
      role="treeitem"
      className="flex cursor-default items-center gap-1.5 rounded px-1 py-0.5 text-zinc-300 transition-colors hover:bg-zinc-800/50 hover:text-white"
      style={{ paddingLeft: indent + 8 }}
    >
      <File
        className="h-3.5 w-3.5 flex-shrink-0 text-sky-400/70"
        aria-hidden="true"
      />
      <span className="font-mono text-xs">{node.name}</span>
    </li>
  )
}

export function FileTree({ generation }: FileTreeProps) {
  const hasFiles =
    generation?.ui_files && Object.keys(generation.ui_files).length > 0
  const hasMigration = Boolean(generation?.migration_sql)
  const hasPermissions = Boolean(generation?.permissions_json)

  return (
    <section
      role="region"
      aria-label="File tree"
      className="flex h-full flex-col"
    >
      <h2 className="border-b border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100">
        Generated Files
      </h2>

      <div className="flex-1 overflow-y-auto p-2">
        {!generation || (!hasFiles && !hasMigration && !hasPermissions) ? (
          <p className="px-3 py-8 text-center text-xs text-zinc-600">
            Files appear here after generation
          </p>
        ) : (
          <ul role="tree" aria-label="Generated files" className="space-y-0.5">
            {hasMigration && (
              <li
                role="treeitem"
                className="flex items-center gap-1.5 px-2 py-0.5 text-zinc-300"
              >
                <File
                  className="h-3.5 w-3.5 flex-shrink-0 text-amber-400/70"
                  aria-hidden="true"
                />
                <span className="font-mono text-xs">migration.sql</span>
                <span className="ml-auto rounded bg-amber-500/10 px-1 text-xs text-amber-500/70">
                  SQL
                </span>
              </li>
            )}
            {hasPermissions && (
              <li
                role="treeitem"
                className="flex items-center gap-1.5 px-2 py-0.5 text-zinc-300"
              >
                <File
                  className="h-3.5 w-3.5 flex-shrink-0 text-purple-400/70"
                  aria-hidden="true"
                />
                <span className="font-mono text-xs">permissions.json</span>
                <span className="ml-auto rounded bg-purple-500/10 px-1 text-xs text-purple-500/70">
                  JSON
                </span>
              </li>
            )}
            {hasFiles &&
              generation?.ui_files &&
              buildTree(generation.ui_files).map((node) => (
                <TreeItem key={node.path} node={node} />
              ))}
          </ul>
        )}
      </div>

      {generation && (
        <div className="border-t border-zinc-800 p-3">
          <div className="space-y-0.5 text-xs text-zinc-500">
            {generation.tokens_used && (
              <p>Tokens: {generation.tokens_used.toLocaleString()}</p>
            )}
            <p className="font-mono text-zinc-600">{generation.ai_model}</p>
          </div>
        </div>
      )}
    </section>
  )
}
