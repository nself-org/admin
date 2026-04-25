'use client'

import { PageTemplate } from '@/components/PageTemplate'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  generateForwardDDL,
  generateId,
  generateReverseDDL,
  type CanvasColumn,
  type CanvasRelationship,
  type CanvasState,
  type CanvasTable,
} from '@/lib/schema-builder'
import {
  AlertTriangle,
  CheckCircle,
  Code,
  Database,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const PG_TYPES = [
  'uuid',
  'text',
  'varchar(255)',
  'varchar(100)',
  'varchar(50)',
  'integer',
  'bigint',
  'smallint',
  'serial',
  'bigserial',
  'boolean',
  'real',
  'double precision',
  'numeric',
  'jsonb',
  'json',
  'timestamptz',
  'timestamp',
  'date',
  'time',
  'bytea',
  'inet',
  'cidr',
  'uuid[]',
  'text[]',
]

const TABLE_WIDTH = 240
const COL_HEIGHT = 28
const TABLE_HEADER_HEIGHT = 40

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tableHeight(table: CanvasTable): number {
  return TABLE_HEADER_HEIGHT + table.columns.length * COL_HEIGHT + 8
}

function columnYCenter(table: CanvasTable, colIndex: number): number {
  return table.y + TABLE_HEADER_HEIGHT + colIndex * COL_HEIGHT + COL_HEIGHT / 2
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number
  y: number
  tableId: string
  columnId?: string
}

// ─── SVG Edge (FK line) ───────────────────────────────────────────────────────

function RelationshipEdge({
  rel,
  tables,
}: {
  rel: CanvasRelationship
  tables: CanvasTable[]
}) {
  const fromTable = tables.find((t) => t.id === rel.fromTableId)
  const toTable = tables.find((t) => t.id === rel.toTableId)
  if (!fromTable || !toTable) return null

  const fromColIdx = fromTable.columns.findIndex(
    (c) => c.id === rel.fromColumnId,
  )
  const toColIdx = toTable.columns.findIndex((c) => c.id === rel.toColumnId)
  if (fromColIdx < 0 || toColIdx < 0) return null

  const x1 = fromTable.x + TABLE_WIDTH
  const y1 = columnYCenter(fromTable, fromColIdx)
  const x2 = toTable.x
  const y2 = columnYCenter(toTable, toColIdx)

  const midX = (x1 + x2) / 2

  return (
    <g>
      <path
        d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
        stroke="#0ea5e9"
        strokeWidth="1.5"
        fill="none"
        strokeDasharray="4 2"
        aria-label={`Relationship from ${fromTable.name} to ${toTable.name}`}
        role="img"
      />
      <circle cx={x2} cy={y2} r="4" fill="#0ea5e9" />
      <circle cx={x1} cy={y1} r="4" fill="#6366f1" />
    </g>
  )
}

// ─── Table Node ───────────────────────────────────────────────────────────────

function TableNode({
  table,
  isSelected,
  onSelect,
  onDragStart,
  onContextMenu,
}: {
  table: CanvasTable
  isSelected: boolean
  onSelect: (id: string) => void
  onDragStart: (id: string, e: React.MouseEvent) => void
  onContextMenu: (e: React.MouseEvent, tableId: string, colId?: string) => void
}) {
  const h = tableHeight(table)

  return (
    <g
      role="group"
      aria-label={`Table: ${table.name}`}
      transform={`translate(${table.x},${table.y})`}
      style={{ cursor: 'grab' }}
      onMouseDown={(e) => {
        if (e.button === 0) {
          onSelect(table.id)
          onDragStart(table.id, e)
        }
      }}
      onContextMenu={(e) => onContextMenu(e, table.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect(table.id)
      }}
      aria-selected={isSelected}
    >
      {/* Drop shadow */}
      <rect
        x="2"
        y="2"
        width={TABLE_WIDTH}
        height={h}
        rx="6"
        fill="rgba(0,0,0,0.15)"
      />
      {/* Main card */}
      <rect
        width={TABLE_WIDTH}
        height={h}
        rx="6"
        fill={isSelected ? '#1e3a5f' : '#1a2535'}
        stroke={isSelected ? '#0ea5e9' : '#334155'}
        strokeWidth={isSelected ? 2 : 1}
      />
      {/* Header */}
      <rect
        width={TABLE_WIDTH}
        height={TABLE_HEADER_HEIGHT}
        rx="6"
        fill="#0f172a"
      />
      <rect
        y={TABLE_HEADER_HEIGHT - 6}
        width={TABLE_WIDTH}
        height="6"
        fill="#0f172a"
      />
      <text
        x="12"
        y="24"
        fontSize="13"
        fontWeight="600"
        fill="#e2e8f0"
        fontFamily="monospace"
        aria-hidden="true"
      >
        {table.name || 'untitled'}
      </text>
      <text x="12" y="36" fontSize="9" fill="#64748b" aria-hidden="true">
        {table.schema}
      </text>

      {/* Columns */}
      {table.columns.map((col, idx) => {
        const cy = TABLE_HEADER_HEIGHT + idx * COL_HEIGHT
        return (
          <g
            key={col.id}
            transform={`translate(0,${cy})`}
            onContextMenu={(e) => {
              e.stopPropagation()
              onContextMenu(e, table.id, col.id)
            }}
            aria-label={`Column: ${col.name} ${col.type}`}
          >
            {/* hover highlight */}
            <rect
              width={TABLE_WIDTH}
              height={COL_HEIGHT}
              fill="transparent"
              className="hover:fill-white/5"
            />
            {col.isPrimaryKey && (
              <text x="10" y="18" fontSize="11" fill="#f59e0b" aria-hidden>
                🔑
              </text>
            )}
            {col.isForeignKey && !col.isPrimaryKey && (
              <text x="10" y="18" fontSize="11" fill="#0ea5e9" aria-hidden>
                🔗
              </text>
            )}
            <text
              x={col.isPrimaryKey || col.isForeignKey ? 28 : 12}
              y="18"
              fontSize="12"
              fill="#cbd5e1"
              fontFamily="monospace"
              aria-hidden="true"
            >
              {col.name}
            </text>
            <text
              x={TABLE_WIDTH - 8}
              y="18"
              fontSize="10"
              fill="#475569"
              textAnchor="end"
              fontFamily="monospace"
              aria-hidden="true"
            >
              {col.type}
            </text>
            {!col.nullable && (
              <circle
                cx={TABLE_WIDTH - 4}
                cy="5"
                r="3"
                fill="#ef4444"
                aria-label="NOT NULL"
              />
            )}
          </g>
        )
      })}
    </g>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchemaBuilderPage() {
  // Canvas state
  const [state, setState] = useState<CanvasState>({
    tables: [
      {
        id: 'tbl_users',
        name: 'users',
        schema: 'public',
        x: 60,
        y: 60,
        columns: [
          {
            id: 'col_users_id',
            name: 'id',
            type: 'uuid',
            nullable: false,
            default: 'gen_random_uuid()',
            isPrimaryKey: true,
          },
          {
            id: 'col_users_email',
            name: 'email',
            type: 'varchar(255)',
            nullable: false,
            isPrimaryKey: false,
          },
          {
            id: 'col_users_created_at',
            name: 'created_at',
            type: 'timestamptz',
            nullable: false,
            default: 'now()',
            isPrimaryKey: false,
          },
        ],
      },
      {
        id: 'tbl_posts',
        name: 'posts',
        schema: 'public',
        x: 380,
        y: 60,
        columns: [
          {
            id: 'col_posts_id',
            name: 'id',
            type: 'uuid',
            nullable: false,
            default: 'gen_random_uuid()',
            isPrimaryKey: true,
          },
          {
            id: 'col_posts_title',
            name: 'title',
            type: 'varchar(255)',
            nullable: false,
            isPrimaryKey: false,
          },
          {
            id: 'col_posts_user_id',
            name: 'user_id',
            type: 'uuid',
            nullable: false,
            isPrimaryKey: false,
            isForeignKey: true,
          },
          {
            id: 'col_posts_created_at',
            name: 'created_at',
            type: 'timestamptz',
            nullable: false,
            default: 'now()',
            isPrimaryKey: false,
          },
        ],
      },
    ],
    relationships: [
      {
        id: 'rel_posts_users',
        fromTableId: 'tbl_posts',
        fromColumnId: 'col_posts_user_id',
        toTableId: 'tbl_users',
        toColumnId: 'col_users_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    ],
  })

  // UI state
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dragTableId, setDragTableId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [showDDL, setShowDDL] = useState(false)
  const [showAddTable, setShowAddTable] = useState(false)
  const [showEditColumn, setShowEditColumn] = useState(false)
  const [editingColumn, setEditingColumn] = useState<{
    tableId: string
    col: CanvasColumn
  } | null>(null)
  const [newTableName, setNewTableName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const [saveResult, setSaveResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)
  const [jobs, setJobs] = useState<
    { id: string; name: string; status: string; createdAt: string }[]
  >([])
  const [showRollbackWarning, setShowRollbackWarning] = useState<string | null>(
    null,
  )

  const svgRef = useRef<SVGSVGElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  // Aria live region for a11y announcements
  const [announcement, setAnnouncement] = useState('')

  const announce = useCallback((msg: string) => {
    setAnnouncement('')
    // Needs a tick to trigger re-read by screen readers
    setTimeout(() => setAnnouncement(msg), 50)
  }, [])

  // ── Drag handling ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (tableId: string, e: React.MouseEvent) => {
      const table = state.tables.find((t) => t.id === tableId)
      if (!table || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left - table.x,
        y: e.clientY - rect.top - table.y,
      })
      setDragTableId(tableId)
      setIsDragging(true)
    },
    [state.tables],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isDragging || !dragTableId || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const newX = Math.max(0, e.clientX - rect.left - dragOffset.x)
      const newY = Math.max(0, e.clientY - rect.top - dragOffset.y)
      setState((prev) => ({
        ...prev,
        tables: prev.tables.map((t) =>
          t.id === dragTableId ? { ...t, x: newX, y: newY } : t,
        ),
      }))
    },
    [isDragging, dragTableId, dragOffset],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setDragTableId(null)
  }, [])

  // ── Keyboard navigation ──────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedTableId) return
      const STEP = 20
      const directions: Record<string, { x: number; y: number }> = {
        ArrowLeft: { x: -STEP, y: 0 },
        ArrowRight: { x: STEP, y: 0 },
        ArrowUp: { x: 0, y: -STEP },
        ArrowDown: { x: 0, y: STEP },
      }
      if (directions[e.key]) {
        e.preventDefault()
        const d = directions[e.key]
        setState((prev) => ({
          ...prev,
          tables: prev.tables.map((t) =>
            t.id === selectedTableId
              ? { ...t, x: Math.max(0, t.x + d.x), y: Math.max(0, t.y + d.y) }
              : t,
          ),
        }))
        const table = state.tables.find((t) => t.id === selectedTableId)
        if (table) announce(`Moved ${table.name}`)
      }
      // Tab cycles entities
      if (
        e.key === 'Tab' &&
        !e.shiftKey &&
        document.activeElement?.closest('svg')
      ) {
        e.preventDefault()
        const ids = state.tables.map((t) => t.id)
        const idx = ids.indexOf(selectedTableId)
        const nextId = ids[(idx + 1) % ids.length]
        setSelectedTableId(nextId)
        const next = state.tables.find((t) => t.id === nextId)
        if (next) announce(`Selected table: ${next.name}`)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedTableId, state.tables, announce])

  // ── Context menu ──────────────────────────────────────────────────────────────

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, tableId: string, colId?: string) => {
      e.preventDefault()
      setContextMenu({ x: e.clientX, y: e.clientY, tableId, columnId: colId })
    },
    [],
  )

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const handleContextAction = useCallback(
    (action: string) => {
      if (!contextMenu) return
      const { tableId, columnId } = contextMenu

      setState((prev) => {
        const tables = prev.tables.map((t) => {
          if (t.id !== tableId) return t
          if (!columnId) return t

          return {
            ...t,
            columns: t.columns.map((c) => {
              if (c.id !== columnId) return c
              switch (action) {
                case 'set-not-null':
                  announce(`Set ${c.name} NOT NULL`)
                  return { ...c, nullable: false }
                case 'set-nullable':
                  announce(`Set ${c.name} nullable`)
                  return { ...c, nullable: true }
                case 'add-index':
                  announce(`Added index on ${c.name}`)
                  return { ...c, hasIndex: true }
                case 'remove-index':
                  return { ...c, hasIndex: false }
                default:
                  return c
              }
            }),
          }
        })

        if (action === 'drop-column' && columnId) {
          return {
            ...prev,
            tables: prev.tables.map((t) => {
              if (t.id !== tableId) return t
              const col = t.columns.find((c) => c.id === columnId)
              if (col) announce(`Dropped column ${col.name}`)
              return {
                ...t,
                columns: t.columns.filter((c) => c.id !== columnId),
              }
            }),
            relationships: prev.relationships.filter(
              (r) => r.fromColumnId !== columnId && r.toColumnId !== columnId,
            ),
          }
        }

        if (action === 'rename-column' && columnId) {
          const table = prev.tables.find((t) => t.id === tableId)
          const col = table?.columns.find((c) => c.id === columnId)
          if (col && table) {
            setEditingColumn({ tableId, col: { ...col } })
            setShowEditColumn(true)
          }
          return prev
        }

        return { ...prev, tables }
      })

      closeContextMenu()
    },
    [contextMenu, closeContextMenu, announce],
  )

  // ── Add table ──────────────────────────────────────────────────────────────────

  const handleAddTable = useCallback(() => {
    if (!newTableName.trim()) return
    const id = generateId('tbl')
    setState((prev) => ({
      ...prev,
      tables: [
        ...prev.tables,
        {
          id,
          name: newTableName.trim(),
          schema: 'public',
          x: 60 + prev.tables.length * 30,
          y: 60 + prev.tables.length * 30,
          columns: [
            {
              id: generateId('col'),
              name: 'id',
              type: 'uuid',
              nullable: false,
              default: 'gen_random_uuid()',
              isPrimaryKey: true,
            },
            {
              id: generateId('col'),
              name: 'created_at',
              type: 'timestamptz',
              nullable: false,
              default: 'now()',
              isPrimaryKey: false,
            },
          ],
        },
      ],
    }))
    announce(`Added table ${newTableName.trim()}`)
    setNewTableName('')
    setShowAddTable(false)
    setSelectedTableId(id)
  }, [newTableName, announce])

  // ── Add column to selected table ────────────────────────────────────────────

  const handleAddColumn = useCallback(() => {
    if (!selectedTableId) return
    const colId = generateId('col')
    setState((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === selectedTableId
          ? {
              ...t,
              columns: [
                ...t.columns,
                {
                  id: colId,
                  name: 'new_column',
                  type: 'text',
                  nullable: true,
                  isPrimaryKey: false,
                },
              ],
            }
          : t,
      ),
    }))
    announce('Added new column')
  }, [selectedTableId, announce])

  // ── Delete selected table ────────────────────────────────────────────────────

  const handleDeleteTable = useCallback(() => {
    if (!selectedTableId) return
    const table = state.tables.find((t) => t.id === selectedTableId)
    if (table) announce(`Deleted table ${table.name}`)
    setState((prev) => ({
      tables: prev.tables.filter((t) => t.id !== selectedTableId),
      relationships: prev.relationships.filter(
        (r) =>
          r.fromTableId !== selectedTableId && r.toTableId !== selectedTableId,
      ),
    }))
    setSelectedTableId(null)
  }, [selectedTableId, state.tables, announce])

  // ── Save migration job ───────────────────────────────────────────────────────

  const handleSaveMigration = useCallback(async () => {
    setIsSaving(true)
    setSaveResult(null)
    try {
      const forwardDDL = generateForwardDDL(state)
      const reverseDDL = generateReverseDDL(state)
      const res = await fetch('/api/schema-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `schema_builder_${Date.now()}`,
          forwardDDL,
          reverseDDL,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setSaveResult({
          ok: true,
          message: `Migration job created: ${data.id}`,
        })
        announce('Migration job saved')
        // Reload jobs
        loadJobs()
      } else {
        const err = await res.json()
        setSaveResult({ ok: false, message: err.error || 'Failed to save' })
      }
    } catch (err) {
      setSaveResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }, [state, announce])

  // ── Apply migration ───────────────────────────────────────────────────────────

  const handleApplyMigration = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/schema-jobs/${jobId}/apply`, {
          method: 'POST',
        })
        if (res.ok) {
          setSaveResult({ ok: true, message: 'Migration applied successfully' })
          announce('Migration applied')
          loadJobs()
        } else {
          const err = await res.json()
          setSaveResult({ ok: false, message: err.error || 'Apply failed' })
        }
      } catch (err) {
        setSaveResult({
          ok: false,
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    [announce],
  )

  // ── Rollback migration ────────────────────────────────────────────────────────

  const handleRollback = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/schema-jobs/${jobId}/rollback`, {
          method: 'POST',
        })
        if (res.ok) {
          setSaveResult({ ok: true, message: 'Rollback completed' })
          announce('Rollback completed')
          loadJobs()
        } else {
          const err = await res.json()
          setSaveResult({ ok: false, message: err.error || 'Rollback failed' })
        }
      } catch (err) {
        setSaveResult({
          ok: false,
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      } finally {
        setShowRollbackWarning(null)
      }
    },
    [announce],
  )

  // ── Hasura tracking ────────────────────────────────────────────────────────────

  const handleTrackHasura = useCallback(async () => {
    setIsTracking(true)
    setSaveResult(null)
    try {
      const res = await fetch('/api/schema-jobs/hasura-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables: state.tables }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveResult({
          ok: true,
          message: `Tracked ${data.tracked?.length ?? 0} tables in Hasura`,
        })
        announce('Hasura tracking complete')
      } else {
        setSaveResult({ ok: false, message: data.error || 'Tracking failed' })
      }
    } catch (err) {
      setSaveResult({
        ok: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsTracking(false)
    }
  }, [state.tables, announce])

  // ── Load jobs ──────────────────────────────────────────────────────────────────

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/schema-jobs')
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs ?? [])
      }
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  // ── Edit column save ──────────────────────────────────────────────────────────

  const handleSaveColumnEdit = useCallback(() => {
    if (!editingColumn) return
    setState((prev) => ({
      ...prev,
      tables: prev.tables.map((t) =>
        t.id === editingColumn.tableId
          ? {
              ...t,
              columns: t.columns.map((c) =>
                c.id === editingColumn.col.id ? editingColumn.col : c,
              ),
            }
          : t,
      ),
    }))
    announce(`Updated column ${editingColumn.col.name}`)
    setShowEditColumn(false)
    setEditingColumn(null)
  }, [editingColumn, announce])

  // ─────────────────────────────────────────────────────────────────────────────

  const forwardDDL = generateForwardDDL(state)
  const reverseDDL = generateReverseDDL(state)
  const selectedTable = state.tables.find((t) => t.id === selectedTableId)

  const canvasWidth = Math.max(
    800,
    ...state.tables.map((t) => t.x + TABLE_WIDTH + 60),
  )
  const canvasHeight = Math.max(
    500,
    ...state.tables.map((t) => t.y + tableHeight(t) + 60),
  )

  return (
    <PageTemplate
      title="Visual Schema Builder"
      description="Design your database schema visually — drag tables, define columns, and generate Postgres DDL"
    >
      {/* Aria live region for a11y */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {announcement}
      </div>

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddTable(true)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Table
          </Button>

          {selectedTableId && (
            <>
              <Button variant="outline" size="sm" onClick={handleAddColumn}>
                <Plus className="mr-1 h-4 w-4" />
                Add Column
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={handleDeleteTable}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete Table
              </Button>
            </>
          )}

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDDL(!showDDL)}
            >
              <Code className="mr-1 h-4 w-4" />
              {showDDL ? 'Hide DDL' : 'Show DDL'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTrackHasura}
              disabled={isTracking}
            >
              {isTracking ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-1 h-4 w-4" />
              )}
              Track in Hasura
            </Button>
            <Button size="sm" onClick={handleSaveMigration} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              Save Migration
            </Button>
          </div>
        </div>

        {/* Keyboard hint */}
        <Alert>
          <Database className="h-4 w-4" />
          <AlertTitle>Keyboard Navigation</AlertTitle>
          <AlertDescription>
            Click or press Enter to select a table. Arrow keys move the selected
            table. Tab cycles between tables. Right-click a column for options.
            Alt+D reads the structure aloud.
          </AlertDescription>
        </Alert>

        {/* Save result feedback */}
        {saveResult && (
          <Alert variant={saveResult.ok ? 'default' : 'destructive'}>
            {saveResult.ok ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>{saveResult.message}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-4">
          {/* ERD Canvas */}
          <div
            ref={canvasRef}
            className="relative flex-1 overflow-auto rounded-xl border border-zinc-700 bg-zinc-950"
            style={{ minHeight: 500 }}
            onClick={() => {
              closeContextMenu()
              setSelectedTableId(null)
            }}
            aria-label="Schema Builder Canvas"
            role="application"
          >
            <svg
              ref={svgRef}
              width={canvasWidth}
              height={canvasHeight}
              aria-label="Entity Relationship Diagram"
              role="img"
              style={{
                cursor: isDragging ? 'grabbing' : 'default',
                display: 'block',
              }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Grid pattern */}
              <defs>
                <pattern
                  id="grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Relationship edges */}
              {state.relationships.map((rel) => (
                <RelationshipEdge
                  key={rel.id}
                  rel={rel}
                  tables={state.tables}
                />
              ))}

              {/* Tables */}
              {state.tables.map((table) => (
                <TableNode
                  key={table.id}
                  table={table}
                  isSelected={selectedTableId === table.id}
                  onSelect={setSelectedTableId}
                  onDragStart={handleDragStart}
                  onContextMenu={handleContextMenu}
                />
              ))}
            </svg>

            {/* Context Menu */}
            {contextMenu && (
              <div
                role="menu"
                aria-label="Column actions"
                style={{
                  position: 'fixed',
                  top: contextMenu.y,
                  left: contextMenu.x,
                  zIndex: 50,
                }}
                className="rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
                onMouseLeave={closeContextMenu}
              >
                {contextMenu.columnId ? (
                  <>
                    <button
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                      onClick={() => handleContextAction('rename-column')}
                    >
                      Rename column
                    </button>
                    <button
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                      onClick={() => handleContextAction('add-index')}
                    >
                      Add index
                    </button>
                    <button
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                      onClick={() => handleContextAction('set-not-null')}
                    >
                      Set NOT NULL
                    </button>
                    <button
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                      onClick={() => handleContextAction('set-nullable')}
                    >
                      Set nullable
                    </button>
                    <hr className="my-1 border-zinc-700" />
                    <button
                      role="menuitem"
                      className="block w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                      onClick={() => handleContextAction('drop-column')}
                    >
                      Drop column (warning: irreversible)
                    </button>
                  </>
                ) : (
                  <button
                    role="menuitem"
                    className="block w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                    onClick={closeContextMenu}
                  >
                    Close
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Side panel */}
          {selectedTable && (
            <div className="w-64 shrink-0 space-y-4">
              <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
                <h3 className="mb-3 font-semibold text-zinc-100">
                  {selectedTable.name}
                </h3>
                <p className="mb-2 text-xs text-zinc-400">
                  {selectedTable.columns.length} columns
                </p>
                <div className="space-y-1">
                  {selectedTable.columns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center justify-between rounded px-2 py-1 text-xs hover:bg-zinc-800"
                    >
                      <span className="font-mono text-zinc-300">
                        {col.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {col.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DDL Panel */}
        {showDDL && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                Forward Migration (CREATE)
              </h3>
              <ScrollArea className="h-64">
                <pre className="font-mono text-xs whitespace-pre-wrap text-emerald-400">
                  {forwardDDL || '-- (empty canvas)'}
                </pre>
              </ScrollArea>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-4">
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                Reverse Migration (DROP)
              </h3>
              <ScrollArea className="h-64">
                <pre className="font-mono text-xs whitespace-pre-wrap text-red-400">
                  {reverseDDL || '-- (empty canvas)'}
                </pre>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Jobs table */}
        {jobs.length > 0 && (
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 p-4">
            <h3 className="mb-3 font-semibold text-zinc-100">Migration Jobs</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="py-2 text-left text-xs font-medium text-zinc-400">
                      Name
                    </th>
                    <th className="py-2 text-left text-xs font-medium text-zinc-400">
                      Status
                    </th>
                    <th className="py-2 text-left text-xs font-medium text-zinc-400">
                      Created
                    </th>
                    <th className="py-2 text-right text-xs font-medium text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b border-zinc-800">
                      <td className="py-2 font-mono text-zinc-300">
                        {job.name}
                      </td>
                      <td className="py-2">
                        <Badge
                          variant="outline"
                          className={
                            job.status === 'applied'
                              ? 'border-emerald-600 text-emerald-400'
                              : job.status === 'failed'
                                ? 'border-red-600 text-red-400'
                                : job.status === 'rollback'
                                  ? 'border-amber-600 text-amber-400'
                                  : 'border-zinc-600 text-zinc-400'
                          }
                        >
                          {job.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-zinc-500">
                        {new Date(job.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-2">
                          {job.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleApplyMigration(job.id)}
                            >
                              Apply
                            </Button>
                          )}
                          {job.status === 'applied' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-amber-400"
                              onClick={() => setShowRollbackWarning(job.id)}
                            >
                              <Undo2 className="mr-1 h-3 w-3" />
                              Rollback
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────────── */}

      {/* Add Table dialog */}
      <Dialog open={showAddTable} onOpenChange={setShowAddTable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="new-table-name">Table name</Label>
              <Input
                id="new-table-name"
                value={newTableName}
                onChange={(e) => setNewTableName(e.target.value)}
                placeholder="e.g. orders"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTable()
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTable(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTable} disabled={!newTableName.trim()}>
              Add Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Column dialog */}
      <Dialog open={showEditColumn} onOpenChange={setShowEditColumn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Column</DialogTitle>
          </DialogHeader>
          {editingColumn && (
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="col-name">Column name</Label>
                <Input
                  id="col-name"
                  value={editingColumn.col.name}
                  onChange={(e) =>
                    setEditingColumn((prev) =>
                      prev
                        ? {
                            ...prev,
                            col: { ...prev.col, name: e.target.value },
                          }
                        : null,
                    )
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="col-type">Type</Label>
                <Select
                  value={editingColumn.col.type}
                  onValueChange={(v) =>
                    setEditingColumn((prev) =>
                      prev ? { ...prev, col: { ...prev.col, type: v } } : null,
                    )
                  }
                >
                  <SelectTrigger id="col-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PG_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="col-default">Default value</Label>
                <Input
                  id="col-default"
                  value={editingColumn.col.default ?? ''}
                  onChange={(e) =>
                    setEditingColumn((prev) =>
                      prev
                        ? {
                            ...prev,
                            col: {
                              ...prev.col,
                              default: e.target.value || undefined,
                            },
                          }
                        : null,
                    )
                  }
                  className="mt-1"
                  placeholder="e.g. now()"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="col-nullable"
                  checked={editingColumn.col.nullable}
                  onCheckedChange={(v) =>
                    setEditingColumn((prev) =>
                      prev
                        ? { ...prev, col: { ...prev.col, nullable: v } }
                        : null,
                    )
                  }
                />
                <Label htmlFor="col-nullable">Nullable</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="col-index"
                  checked={editingColumn.col.hasIndex ?? false}
                  onCheckedChange={(v) =>
                    setEditingColumn((prev) =>
                      prev
                        ? { ...prev, col: { ...prev.col, hasIndex: v } }
                        : null,
                    )
                  }
                />
                <Label htmlFor="col-index">Create index</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditColumn(false)
                setEditingColumn(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveColumnEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback warning dialog */}
      <Dialog
        open={showRollbackWarning !== null}
        onOpenChange={() => setShowRollbackWarning(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Rollback</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription>
                Rolling back this migration will execute DROP statements and may
                result in data loss. This action cannot be undone. Are you sure?
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRollbackWarning(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (showRollbackWarning) handleRollback(showRollbackWarning)
              }}
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Yes, rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  )
}
