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
- **Input Validation**: Comprehensive validation using Zod schemas
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

For a comprehensive security audit of the nself-admin codebase, see **[[SECURITY_AUDIT|Security Audit Report]]**.

The audit covers:

- OWASP Top 10 vulnerabilities
- Command injection risks
- Authentication and session management
- Input validation
- Dependency vulnerabilities
- Remediation recommendations
