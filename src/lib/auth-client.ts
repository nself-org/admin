/**
 * Client-side authentication utilities
 * Provides functions to get current user info from session cookie
 */

export interface CurrentUser {
  userId: string
  userName: string
  sessionToken?: string
}

/**
 * Get current user information from session
 * For client-side use in hooks and components
 */
export function getCurrentUser(): CurrentUser {
  // In single-user mode, we always return 'admin'
  // When multi-user support is added, this will read from session cookie
  return {
    userId: 'admin',
    userName: 'Admin User',
  }
}

/**
 * Get user ID from session (convenience function)
 */
export function getCurrentUserId(): string {
  return getCurrentUser().userId
}

/**
 * Get user name from session (convenience function)
 */
export function getCurrentUserName(): string {
  return getCurrentUser().userName
}

/**
 * Check if user is authenticated (client-side approximation).
 *
 * NOTE: The nself-session cookie is httpOnly — it is intentionally invisible to
 * JavaScript, so document.cookie cannot be used to detect it.  This function
 * returns false in all browser contexts.  Rely on the AuthContext (which calls
 * /api/auth/check on mount) for accurate authentication state.  This function
 * is retained for API surface compatibility but should not be used for access
 * control decisions.
 */
export function isAuthenticated(): boolean {
  // httpOnly cookies are not readable by JavaScript; always return false.
  // Use useAuth() / AuthContext.isAuthenticated for real auth state.
  return false
}
