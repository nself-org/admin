# Security Documentation

## Authentication

### Password Storage

- Passwords are hashed using bcrypt with a cost factor of 10
- Plain text passwords are automatically hashed on first use
- Supports both plain and pre-hashed passwords in environment variables

### Session Management

- Sessions use secure httpOnly cookies (not localStorage)
- Cookies are marked as SameSite=strict to prevent CSRF
- Sessions expire after 24 hours
- Secure flag is set in production environments

### Configuration

#### Using Plain Password (Development)

```env
ADMIN_PASSWORD=your-password-here
ADMIN_PASSWORD_IS_HASHED=false
```

#### Using Hashed Password (Production)

```bash
# Generate hash using the provided script
node scripts/hash-password.js

# Or manually with bcryptjs
npm install -g bcryptjs-cli
bcryptjs-cli hash "your-password" 10
```

Then add to `.env.local`:

```env
ADMIN_PASSWORD='$2b$10$...' # Your bcrypt hash
ADMIN_PASSWORD_IS_HASHED=true
```

### Security Headers

The middleware automatically adds the following security headers to protected routes:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` (no browser feature access)

### Content Security Policy

Admin ships with a strict CSP applied via `next.config.mjs` headers. The policy denies inline scripts in production, restricts script sources to `self`, and prevents the page from being framed by any other origin.

```text
default-src 'self';
script-src 'self' 'wasm-unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self' data:;
connect-src 'self' ws: wss:;
frame-ancestors 'none';
form-action 'self';
base-uri 'self';
object-src 'none';
```

Notes:

- `'unsafe-inline'` for styles is required by Tailwind's CSS-in-JS injection. Removing it would require a CSP nonce on every style block.
- `connect-src` allows `ws:` / `wss:` so the Socket.io live-update layer works in dev (`ws://localhost:3021`) and in production (`wss://...`).
- `frame-ancestors 'none'` is a stricter modern replacement for `X-Frame-Options: DENY` and is enforced by every browser that supports CSP level 2+.

To verify the policy in a running container:

```bash
curl -sI http://localhost:3021/login | grep -i content-security
```

### Session Cookies: Attribute Reference

Sessions are stored in httpOnly cookies issued by the auth layer. Each cookie carries:

| Attribute | Value | Why |
|-----------|-------|-----|
| `HttpOnly` | `true` | JavaScript cannot read the cookie. Protects against XSS-based session theft. |
| `SameSite` | `Strict` | Cookie is never sent on cross-origin requests. Hard CSRF stop. |
| `Secure` | `true` (production) | Cookie is only sent over HTTPS. Set automatically when `NODE_ENV=production`. |
| `Path` | `/` | Available to the whole admin app. |
| `Max-Age` | `86400` (24h) / `604800` (7d if `Remember Me`) | Bounded session lifetime. |

The `Secure` flag is gated on `NODE_ENV` so local dev over plain HTTP still works while production deployments cannot leak the cookie over an unencrypted channel. CSRF defense is layered: SameSite=Strict cookie attribute + origin validation on all mutating routes.

### Protected Routes

All API routes under the following paths require authentication:

- `/api/docker/*`
- `/api/services/*`
- `/api/database/*`
- `/api/config/*`
- `/api/system/*`
- `/api/project/*`
- `/api/nself/*`
- `/api/storage/*`
- `/api/monitoring/*`
- `/api/graphql/*`
- `/api/redis/*`
- `/api/cli/*`

### Best Practices

1. Always use a strong, unique password in production
2. Rotate passwords regularly
3. Use environment variables, never commit passwords to git
4. Enable HTTPS in production deployments
5. Monitor authentication logs for suspicious activity

### Session Storage (v0.0.7+)

Sessions are now stored in LokiJS embedded database (`nadmin.db`):

- Sessions persist across restarts
- Automatic TTL expiration (7 days by default)
- Session activity tracking and extension
- Audit logging for login attempts

### Security Features (v0.0.7+)

- **CSRF Protection**: SameSite=strict cookies + origin validation
- **Rate Limiting**: Built-in rate limiting on authentication endpoints
- **Input Validation**: Full validation using Zod schemas
- **Shell Injection Prevention**: execFile() with array arguments instead of exec()
- **SQL Injection Prevention**: Parameterized queries and identifier validation
- **Path Traversal Prevention**: Resolved path validation

### Future Improvements

- [ ] Multi-factor authentication
- [ ] Role-based access control
- [ ] Redis-based session storage (optional)
- [ ] Hardware key support (WebAuthn)

---

## Security Audit

For a full security audit of the nself-admin codebase, see **[[SECURITY_AUDIT|Security Audit Report]]**.

The audit covers:

- OWASP Top 10 vulnerabilities
- Command injection risks
- Authentication and session management
- Input validation
- Dependency vulnerabilities
- Remediation recommendations
