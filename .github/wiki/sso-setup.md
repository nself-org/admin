# SSO Setup

ɳSelf Admin supports Cloudflare Access and other header-based SSO proxies via an optional SSO header fallback. When enabled, if an upstream auth proxy injects an authenticated email address into a request header, Admin creates a local session automatically without requiring a password.

## How it works

1. An upstream proxy (Cloudflare Access, nginx `auth_request`, Tailscale funnel, etc.) authenticates the request and injects the operator's email into a header.
2. Admin middleware detects the header on unauthenticated page requests.
3. The user is redirected through `POST /api/auth/sso` which creates a short-lived (8-hour) LokiJS session and issues the `nself-session` cookie.
4. Subsequent requests use the cookie normally.

## Configuration

Set the following variables in your `.env` file:

```env
NSELF_ADMIN_SSO_HEADER_ENABLED=true
NSELF_ADMIN_SSO_HEADER_NAME=CF-Access-Authenticated-User-Email
NSELF_ADMIN_SSO_AUTO_PROVISION=false
```

| Variable | Default | Purpose |
| -------------------------------- | ------------------------------------ | --------------------------------------------------- |
| `NSELF_ADMIN_SSO_HEADER_ENABLED` | `false` | Enable SSO header auto-login |
| `NSELF_ADMIN_SSO_HEADER_NAME` | `CF-Access-Authenticated-User-Email` | Name of the header carrying the user's email |
| `NSELF_ADMIN_SSO_AUTO_PROVISION` | `false` | Allow unknown emails to create sessions (see below) |

## Auto-provision

When `NSELF_ADMIN_SSO_AUTO_PROVISION=false` (default), only the configured operator email is accepted via SSO. Any other email triggers a 403 response.

When `NSELF_ADMIN_SSO_AUTO_PROVISION=true`, any valid email in the SSO header creates a session. This is useful when multiple operators share an install and you want the upstream proxy to be the sole authentication gate.

## Cloudflare Access setup

1. Create a Cloudflare Access application pointing at your admin URL (e.g. `https://admin.yourdomain.com`).
2. In Access, configure the policy to allow only your operator email (or group).
3. Cloudflare injects `CF-Access-Authenticated-User-Email` on every forwarded request.
4. Set `NSELF_ADMIN_SSO_HEADER_ENABLED=true` in your Admin `.env`.

The default header name matches Cloudflare's convention, so no additional config is needed.

## nginx auth_request setup

If you're using nginx with `auth_request` pointing at Authelia, Vouch, or similar:

```nginx
location /admin {
    auth_request /auth;
    auth_request_set $auth_user $upstream_http_x_auth_request_email;
    proxy_set_header X-Auth-Request-Email $auth_user;
    proxy_pass http://127.0.0.1:3021;
}
```

Then set:

```env
NSELF_ADMIN_SSO_HEADER_ENABLED=true
NSELF_ADMIN_SSO_HEADER_NAME=X-Auth-Request-Email
```

## Security notes

- SSO sessions are 8 hours (shorter than password sessions which are 7–30 days). The upstream proxy renews on the next request via a new redirect through `/api/auth/sso`.
- Never expose the Admin port directly to the internet without an upstream auth proxy when SSO is enabled. The SSO endpoint trusts the header value without additional verification.
- If you're not using SSO, leave `NSELF_ADMIN_SSO_HEADER_ENABLED=false` (default). This ensures no session can be created by forging the header.
