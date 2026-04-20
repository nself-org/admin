/**
 * Feature Flags for nself-admin
 *
 * Centralizes all feature-flag reads so components and middleware can import
 * a single function rather than reading env vars directly.
 *
 * All flags are evaluated server-side (process.env) at call time.
 * Client-side usage: pass flags as props from a Server Component.
 */

/**
 * NSELF_ADMIN_MULTIUSER (default: false)
 *
 * When false (the default), hides all multi-user UI surfaces:
 *   - "Roles" nav item under Auth
 *   - "Multi-Tenancy" nav group (Tenants + Organizations)
 *   - /users, /tenant/*, /auth/roles pages → Next.js notFound()
 *   - /api/users/*, /api/auth/roles/* → HTTP 404 (enforced by API handlers)
 *
 * When true, the nav items and pages are revealed, but the API endpoints
 * still return 404 in v1.0.9 / v1.1.0 — the multi-user backend (CLI
 * commands `nself user list`, `nself auth roles list`) does not exist yet.
 * Pages show a "v1.2 preview, not yet wired" banner in this state.
 *
 * Multi-user Admin GA target: v1.2.0 (Q3 2026).
 * See: https://docs.nself.org/admin/single-user-posture
 */
export function isMultiUserEnabled(): boolean {
  return process.env.NSELF_ADMIN_MULTIUSER === 'true'
}
