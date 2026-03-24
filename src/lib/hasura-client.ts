/**
 * Hasura GraphQL client for server-side API routes.
 * Queries np_stripe_* tables via Hasura, with graceful fallback
 * when the Stripe plugin is not installed (tables don't exist).
 */

const HASURA_ENDPOINT =
  process.env.HASURA_GRAPHQL_ENDPOINT || 'http://localhost:8080/v1/graphql'
const HASURA_ADMIN_SECRET = process.env.HASURA_GRAPHQL_ADMIN_SECRET

export interface HasuraQueryResult<T = unknown> {
  data: T | null
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>
}

/**
 * Execute a read-only GraphQL query against Hasura
 */
export async function hasuraQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<HasuraQueryResult<T>> {
  if (!HASURA_ADMIN_SECRET) {
    return {
      data: null,
      errors: [{ message: 'Hasura admin secret not configured' }],
    }
  }

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hasura-Admin-Secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables: variables || {} }),
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    return {
      data: null,
      errors: [{ message: `Hasura returned HTTP ${response.status}` }],
    }
  }

  return response.json()
}

/**
 * Check if a Hasura table exists by attempting a simple query.
 * Returns true if the table is tracked and queryable.
 */
export async function hasuraTableExists(tableName: string): Promise<boolean> {
  // Use introspection to check if the query root has this table
  const result = await hasuraQuery<{
    __type: { fields: Array<{ name: string }> } | null
  }>(
    `query { __type(name: "query_root") { fields { name } } }`,
  )

  if (!result.data?.__type?.fields) return false

  return result.data.__type.fields.some((f) => f.name === tableName)
}

/**
 * Check if Stripe plugin tables exist in Hasura.
 * The Stripe plugin creates tables with the np_stripe_ prefix.
 */
export async function stripePluginInstalled(): Promise<boolean> {
  return hasuraTableExists('np_stripe_customers')
}
