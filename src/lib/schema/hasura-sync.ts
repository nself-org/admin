/**
 * Hasura Sync — Canvas state → Hasura metadata API
 * SP-13.B20
 *
 * Re-exports and extends Hasura tracking from lib/schema-builder.ts.
 * Calls /v1/metadata endpoints to track tables and create relationships.
 */

export {
  buildHasuraTrackRelationshipPayload,
  buildHasuraTrackTablePayload,
  trackInHasura,
  type HasuraTrackRelationshipInput,
  type HasuraTrackTableInput,
} from '../schema-builder'

import type { CanvasState } from '../schema-builder'

export interface HasuraSyncConfig {
  hasuraUrl: string
  adminSecret: string
  /** Postgres source name in Hasura metadata (default: "default") */
  sourceName?: string
}

export interface HasuraSyncResult {
  tracked: string[]
  relationships: string[]
  errors: string[]
}

/**
 * Full sync: track all tables + create array relationships from FK edges.
 * Calls Hasura /v1/metadata API.
 */
export async function syncCanvasToHasura(
  state: CanvasState,
  config: HasuraSyncConfig,
): Promise<HasuraSyncResult> {
  const { trackInHasura: track } = await import('../schema-builder')
  const sourceName = config.sourceName ?? 'default'

  // Track tables
  const tableResult = await track(state, config.hasuraUrl, config.adminSecret)

  // Create array relationships for each FK edge
  const relationships: string[] = []
  const relErrors: string[] = []

  for (const rel of state.relationships) {
    const fromTable = state.tables.find((t) => t.id === rel.fromTableId)
    const toTable = state.tables.find((t) => t.id === rel.toTableId)
    if (!fromTable || !toTable) continue

    const fromCol = fromTable.columns.find((c) => c.id === rel.fromColumnId)
    if (!fromCol) continue

    // Array relationship on the "to" table (one-to-many)
    const relName = `${fromTable.name}_by_${fromCol.name}`
    const payload = {
      type: 'pg_create_array_relationship',
      args: {
        source: sourceName,
        table: { schema: toTable.schema || 'public', name: toTable.name },
        name: relName,
        using: {
          foreign_key_constraint_on: {
            table: {
              schema: fromTable.schema || 'public',
              name: fromTable.name,
            },
            column: fromCol.name,
          },
        },
      },
    }

    try {
      const res = await fetch(`${config.hasuraUrl}/v1/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': config.adminSecret,
        },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        relationships.push(relName)
      } else {
        const body = await res.text()
        relErrors.push(`Relationship ${relName}: ${body}`)
      }
    } catch (err) {
      relErrors.push(
        `Relationship ${relName}: ${err instanceof Error ? err.message : 'unknown'}`,
      )
    }
  }

  return {
    tracked: tableResult.tracked,
    relationships,
    errors: [...tableResult.errors, ...relErrors],
  }
}
