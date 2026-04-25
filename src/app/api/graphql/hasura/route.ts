import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/require-auth'

const HASURA_ENDPOINT =
  process.env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8080/v1/graphql'

// SECURITY: No fallback secret - must be configured via environment
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET

// SECURITY GUARD: Refuse to run in production with a dev-stub secret.
// Per the Security-Always-Free Doctrine, this check is always free and cannot be disabled.
// Covers the known dev-stub values used in env-handler.ts defaults.
if (
  process.env.NODE_ENV === 'production' &&
  HASURA_ADMIN_SECRET &&
  (HASURA_ADMIN_SECRET.includes('dummy') ||
    HASURA_ADMIN_SECRET === 'hasura-admin-secret-dev' ||
    HASURA_ADMIN_SECRET === 'changeme')
) {
  throw new Error(
    'FATAL: dev-stub HASURA_GRAPHQL_ADMIN_SECRET detected in production. ' +
      'Set a secure secret in your .env.secrets file before starting in production.',
  )
}

// Allowlist of safe query operations (read-only)
const ALLOWED_QUERY_PATTERNS = [
  /^\s*query\s+/i, // Only allow query operations
  /^\s*{\s*__schema/i, // Allow introspection
  /^\s*{\s*__type/i, // Allow type introspection
]

// Blocked patterns (mutations, subscriptions, dangerous operations)
const BLOCKED_PATTERNS = [
  /mutation\s*\{/i,
  /mutation\s+\w+/i,
  /subscription\s*\{/i,
  /subscription\s+\w+/i,
  /delete_/i,
  /update_/i,
  /insert_/i,
  /__schema\s*\{\s*mutationType/i, // Block mutation type introspection for execution
]

function isQueryAllowed(query: string): { allowed: boolean; reason?: string } {
  if (!query || typeof query !== 'string') {
    return { allowed: false, reason: 'Invalid query' }
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(query)) {
      return {
        allowed: false,
        reason:
          'Mutation and write operations are not allowed via this endpoint',
      }
    }
  }

  // Must match at least one allowed pattern
  const isAllowed = ALLOWED_QUERY_PATTERNS.some((pattern) =>
    pattern.test(query),
  )
  if (!isAllowed) {
    return {
      allowed: false,
      reason: 'Only read-only query operations are allowed',
    }
  }

  return { allowed: true }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'metadata'

    switch (action) {
      case 'metadata':
        return await getMetadata()
      case 'schema':
        return await getSchema()
      case 'tables':
        return await getTables()
      case 'permissions':
        return await getPermissions()
      case 'relationships':
        return await getRelationships()
      case 'stats':
        return await getStats()
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: 'Hasura operation failed',
        details: message,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = await requireAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { query, variables, action } = body

    if (action === 'execute') {
      return await executeGraphQL(query, variables)
    } else if (action === 'introspect') {
      return await introspectSchema()
    } else if (action === 'metadata') {
      return await updateMetadata(body.metadata)
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 },
      )
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: 'Hasura operation failed',
        details: message,
      },
      { status: 500 },
    )
  }
}

async function getMetadata() {
  const response = await fetch(
    `${HASURA_ENDPOINT.replace('/v1/graphql', '/v1/metadata')}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HASURA_ADMIN_SECRET && {
          'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
        }),
      },
      body: JSON.stringify({
        type: 'export_metadata',
        args: {},
      }),
    },
  )

  const data = await response.json()

  return NextResponse.json({
    success: true,
    data: {
      metadata: data,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getSchema() {
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        types {
          name
          kind
          description
          fields {
            name
            type {
              name
              kind
            }
          }
        }
        queryType {
          name
        }
        mutationType {
          name
        }
        subscriptionType {
          name
        }
      }
    }
  `

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(HASURA_ADMIN_SECRET && {
        'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
      }),
    },
    body: JSON.stringify({
      query: introspectionQuery,
    }),
  })

  const data = await response.json()

  return NextResponse.json({
    success: true,
    data: {
      schema: data.data.__schema,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getTables() {
  const query = `
    query GetTables {
      information_schema_tables(
        where: { table_schema: { _eq: "public" } }
      ) {
        table_name
        table_schema
        table_type
      }
    }
  `

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(HASURA_ADMIN_SECRET && {
        'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
      }),
    },
    body: JSON.stringify({ query }),
  })

  const data = await response.json()

  const tablesData = data.data?.information_schema_tables || []

  const detailedTables = await Promise.all(
    tablesData.map(async (table: { table_name: string }) => {
      // SECURITY: Use GraphQL variables instead of string interpolation
      const columnsQuery = `
        query GetColumns($tableName: String!) {
          information_schema_columns(
            where: {
              table_schema: { _eq: "public" },
              table_name: { _eq: $tableName }
            }
          ) {
            column_name
            data_type
            is_nullable
            column_default
          }
        }
      `

      const colResponse = await fetch(HASURA_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(HASURA_ADMIN_SECRET && {
            'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
          }),
        },
        body: JSON.stringify({
          query: columnsQuery,
          variables: { tableName: table.table_name },
        }),
      })

      const colData = await colResponse.json()

      return {
        ...table,
        columns: colData.data?.information_schema_columns || [],
      }
    }),
  )

  return NextResponse.json({
    success: true,
    data: {
      tables: detailedTables,
      count: detailedTables.length,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getPermissions() {
  const response = await fetch(
    `${HASURA_ENDPOINT.replace('/v1/graphql', '/v1/metadata')}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HASURA_ADMIN_SECRET && {
          'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
        }),
      },
      body: JSON.stringify({
        type: 'export_metadata',
        args: {},
      }),
    },
  )

  const data = await response.json()

  type TableMeta = {
    table: { name: string; schema: string }
    select_permissions?: Array<{ role: string; permission: unknown }>
    insert_permissions?: Array<{ role: string; permission: unknown }>
    update_permissions?: Array<{ role: string; permission: unknown }>
    delete_permissions?: Array<{ role: string; permission: unknown }>
  }

  const permissions =
    data.sources?.[0]?.tables?.flatMap((table: TableMeta) => {
      const tablePermissions: Array<{
        table: string
        schema: string
        role: string
        action: string
        permissions: unknown
      }> = []

      const actions = ['select', 'insert', 'update', 'delete'] as const
      actions.forEach((action) => {
        const perms = table[`${action}_permissions` as keyof TableMeta] as
          | Array<{ role: string; permission: unknown }>
          | undefined
        if (perms) {
          perms.forEach((perm) => {
            tablePermissions.push({
              table: table.table.name,
              schema: table.table.schema,
              role: perm.role,
              action: action,
              permissions: perm.permission,
            })
          })
        }
      })

      return tablePermissions
    }) || []

  return NextResponse.json({
    success: true,
    data: {
      permissions,
      count: permissions.length,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getRelationships() {
  const response = await fetch(
    `${HASURA_ENDPOINT.replace('/v1/graphql', '/v1/metadata')}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(HASURA_ADMIN_SECRET && {
          'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
        }),
      },
      body: JSON.stringify({
        type: 'export_metadata',
        args: {},
      }),
    },
  )

  const data = await response.json()

  type RelMeta = {
    table: { name: string; schema: string }
    object_relationships?: Array<{ name: string; using: unknown }>
    array_relationships?: Array<{ name: string; using: unknown }>
  }

  const relationships =
    data.sources?.[0]?.tables?.flatMap((table: RelMeta) => {
      const tableRelationships: Array<{
        table: string
        schema: string
        name: string
        type: string
        using: unknown
      }> = []

      const objectRels = table.object_relationships || []
      const arrayRels = table.array_relationships || []

      objectRels.forEach((rel) => {
        tableRelationships.push({
          table: table.table.name,
          schema: table.table.schema,
          name: rel.name,
          type: 'object',
          using: rel.using,
        })
      })

      arrayRels.forEach((rel) => {
        tableRelationships.push({
          table: table.table.name,
          schema: table.table.schema,
          name: rel.name,
          type: 'array',
          using: rel.using,
        })
      })

      return tableRelationships
    }) || []

  return NextResponse.json({
    success: true,
    data: {
      relationships,
      count: relationships.length,
      timestamp: new Date().toISOString(),
    },
  })
}

async function getStats() {
  const [metadata, schema] = await Promise.all([getMetadata(), getSchema()])

  const metadataData = await metadata.json()
  const schemaData = await schema.json()

  const tables = metadataData.data?.metadata?.sources?.[0]?.tables || []
  const types = schemaData.data?.schema?.types || []

  type TypeInfo = { name: string; fields?: unknown[] }
  type TableInfo = {
    select_permissions?: Array<{ role: string }>
    insert_permissions?: Array<{ role: string }>
    update_permissions?: Array<{ role: string }>
    delete_permissions?: Array<{ role: string }>
  }

  const stats = {
    tables: tables.length,
    customTypes: types.filter((t: TypeInfo) => !t.name.startsWith('__')).length,
    queryFields:
      types.find((t: TypeInfo) => t.name === 'query_root')?.fields?.length || 0,
    mutationFields:
      types.find((t: TypeInfo) => t.name === 'mutation_root')?.fields?.length ||
      0,
    subscriptionFields:
      types.find((t: TypeInfo) => t.name === 'subscription_root')?.fields
        ?.length || 0,
    roles: [
      ...new Set(
        tables.flatMap((t: TableInfo) => {
          const permissions: string[] = []
          const actions = ['select', 'insert', 'update', 'delete'] as const
          actions.forEach((action) => {
            const perms = t[`${action}_permissions` as keyof TableInfo]
            if (perms) {
              perms.forEach((p) => permissions.push(p.role))
            }
          })
          return permissions
        }),
      ),
    ].length,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json({
    success: true,
    data: stats,
  })
}

async function executeGraphQL(query: string, variables?: unknown) {
  // SECURITY: Require admin secret to be configured
  if (!HASURA_ADMIN_SECRET) {
    return NextResponse.json(
      { success: false, error: 'Hasura admin secret not configured' },
      { status: 500 },
    )
  }

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query is required' },
      { status: 400 },
    )
  }

  // SECURITY: Validate query is read-only
  const validation = isQueryAllowed(query)
  if (!validation.allowed) {
    return NextResponse.json(
      { success: false, error: validation.reason },
      { status: 403 },
    )
  }

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({
      query,
      variables: variables || {},
    }),
  })

  const data = await response.json()

  return NextResponse.json({
    success: true,
    data: {
      result: data,
      timestamp: new Date().toISOString(),
    },
  })
}

async function introspectSchema() {
  const introspectionQuery = `
    query IntrospectionQuery {
      __schema {
        queryType { name }
        mutationType { name }
        subscriptionType { name }
        types {
          ...FullType
        }
        directives {
          name
          description
          locations
          args {
            ...InputValue
          }
        }
      }
    }

    fragment FullType on __Type {
      kind
      name
      description
      fields(includeDeprecated: true) {
        name
        description
        args {
          ...InputValue
        }
        type {
          ...TypeRef
        }
        isDeprecated
        deprecationReason
      }
      inputFields {
        ...InputValue
      }
      interfaces {
        ...TypeRef
      }
      enumValues(includeDeprecated: true) {
        name
        description
        isDeprecated
        deprecationReason
      }
      possibleTypes {
        ...TypeRef
      }
    }

    fragment InputValue on __InputValue {
      name
      description
      type { ...TypeRef }
      defaultValue
    }

    fragment TypeRef on __Type {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                  ofType {
                    kind
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `

  return executeGraphQL(introspectionQuery)
}

async function updateMetadata(_metadata: unknown) {
  // SECURITY: Metadata updates are disabled for safety
  // This prevents arbitrary schema/permission changes via the API
  return NextResponse.json(
    {
      success: false,
      error:
        'Metadata updates are disabled for security. Use Hasura console directly.',
    },
    { status: 403 },
  )
}
