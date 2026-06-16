# Session Management

The nSelf admin GUI uses a **24-hour password-based session** backed by
LokiJS (in-process JSON store). This is a local-only tool; there is no
network-accessible auth surface.

---

## Session Lifecycle

1. **Login** — POST `/api/auth/login` with the admin password.
   - Password is bcrypt-hashed and stored in the LokiJS session store.
   - A session cookie (`nself-admin-session`) is set with `HttpOnly; SameSite=Strict`.
   - Session TTL: **24 hours** from the time of login.

2. **Session check** — every panel API call sends the session cookie.
   - Server-side: LokiJS validates the session ID and checks `expiresAt`.
   - Expired or missing session → `401 Unauthorized`.

3. **Session expiry** — when the 24h TTL passes:
   - The next API call returns `401`.
   - The panel switches to the **auth-expired** AsyncScreen state.
   - An **`AdminLoginOverlay`** appears over the panel content.
   - The user enters their password; on success the session is renewed
     and the panel re-fetches its data.

4. **Session refresh** — available via POST `/api/auth/refresh` while the
   session is still valid (within the 24h window).
   - The admin warns when 2 hours remain (optional banner).
   - Auto-refresh fires at the 20-hour mark (4 hours before expiry).

---

## Security Notes

- Session validation is **server-side only** (LokiJS). Client-side state
  (React context, localStorage, cookies) cannot bypass the server check.
- The `AdminLoginOverlay` renders when the server returns `401`; it is
  not triggered by client-side timeout logic.
- CSRF protection: all mutating requests require the `x-csrf-token` header
  (value read from the `nself-csrf` cookie).
- The admin is bound to `localhost:3021` and is never deployed publicly.

---

## Re-authentication Flow

When a panel detects a `401` response:

1. `sessionExpired` state is set to `true`.
2. The `AsyncScreen` switches to the `auth-expired` state.
3. `AdminLoginOverlay` renders over the panel.
4. The user enters their password.
5. `POST /api/auth/login` is called.
6. On success: overlay closes, `sessionExpired` resets to `false`,
   panel re-fetches its data.
7. On failure: error message shown in the overlay input.

---

## Multi-User Support

Multi-user admin access is planned for v1.2.0 and is **not** in scope for
the current version. The current model is single-admin, single-password.
All sessions share the same credential.
