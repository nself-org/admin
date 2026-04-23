/**
 * Startup guard tests for hasura-client.ts
 *
 * Verifies that the module-level guard throws on missing or known-bad secrets
 * in production, and passes on a valid 32+ char secret.
 *
 * N04 fix: ensures no dev-stub secret (hasura-admin-secret-dev, dummy*, changeme)
 * can ever reach a production Hasura instance.
 */

const VALID_SECRET = 'b'.repeat(32) // 32-char placeholder that passes validation

// Re-require after env mutation to trigger module-level guard.
function freshModule() {
  jest.resetModules()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/hasura-client')
}

describe('hasura-client production startup guard', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.NODE_ENV = 'production'
  })

  afterEach(() => {
    process.env = originalEnv
    jest.resetModules()
  })

  describe('missing secret', () => {
    it('throws FATAL when HASURA_GRAPHQL_ADMIN_SECRET is not set in production', () => {
      delete process.env.HASURA_GRAPHQL_ADMIN_SECRET
      expect(() => freshModule()).toThrow(
        /HASURA_GRAPHQL_ADMIN_SECRET is not set/,
      )
    })

    it('throws FATAL when HASURA_GRAPHQL_ADMIN_SECRET is empty string in production', () => {
      process.env.HASURA_GRAPHQL_ADMIN_SECRET = ''
      expect(() => freshModule()).toThrow(
        /HASURA_GRAPHQL_ADMIN_SECRET is not set/,
      )
    })
  })

  describe('known-bad dev-stub values', () => {
    const badValues = [
      'hasura-admin-secret-dev',
      'dummy-admin-secret',
      'dummy',
      'dummyvalue12345678901234567890123',
      'changeme',
      'changeme123',
    ]

    badValues.forEach((bad) => {
      it(`throws FATAL for known-bad secret: "${bad}"`, () => {
        process.env.HASURA_GRAPHQL_ADMIN_SECRET = bad
        expect(() => freshModule()).toThrow(
          /HASURA_GRAPHQL_ADMIN_SECRET is (not set|set to a known insecure|must be at least)/,
        )
      })
    })
  })

  describe('too-short secret', () => {
    it('throws FATAL when secret is fewer than 32 characters in production', () => {
      process.env.HASURA_GRAPHQL_ADMIN_SECRET = 'tooshort'
      expect(() => freshModule()).toThrow(
        /must be at least 32 characters/,
      )
    })
  })

  describe('valid secret', () => {
    it('does not throw when secret is a 32-char string', () => {
      process.env.HASURA_GRAPHQL_ADMIN_SECRET = VALID_SECRET
      expect(() => freshModule()).not.toThrow()
    })

    it('does not throw when secret is a 64-char hex string', () => {
      process.env.HASURA_GRAPHQL_ADMIN_SECRET = 'e'.repeat(64)
      expect(() => freshModule()).not.toThrow()
    })
  })

  describe('development mode — guard is not enforced', () => {
    it('does not throw on empty secret in development', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.HASURA_GRAPHQL_ADMIN_SECRET
      // Guard only runs in production — development allows missing secret
      // so the dev environment can boot without full config.
      expect(() => freshModule()).not.toThrow()
    })

    it('does not throw on dev-stub value in development', () => {
      process.env.NODE_ENV = 'development'
      process.env.HASURA_GRAPHQL_ADMIN_SECRET = 'hasura-admin-secret-dev'
      expect(() => freshModule()).not.toThrow()
    })
  })
})
