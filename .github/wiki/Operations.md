# Operations

Operational reference for running ɳSelf Admin in production.

## Error Reporting with Sentry

ɳSelf Admin supports optional Sentry error reporting. When `SENTRY_DSN` is set, uncaught runtime errors are forwarded to your Sentry project. When unset, there is no overhead, the Sentry SDK is loaded lazily and has zero import side-effects.

### Setup

1. Create a project in [Sentry](https://sentry.io).
2. Copy the DSN from **Project Settings → Client Keys (DSN)**.
3. Set it in your `.env.local` (local dev) or `.env.secrets` (production):

```bash
SENTRY_DSN=https://xxxxx@o0.ingest.sentry.io/0
```

4. Restart ɳSelf Admin. Errors will appear in your Sentry dashboard.

### Disabling

Leave `SENTRY_DSN` blank (or unset) to disable. No restart is required after removing the value, the next server restart picks up the change.

### What is reported

Uncaught errors that reach the admin error boundary are reported to Sentry. Each report includes:

- Error message and stack trace
- Component stack (for React errors)
- Page URL and user agent
- Timestamp

Rate limiting is applied: no more than 10 identical errors per minute are forwarded.

### What is NOT reported

- Errors in development mode (unless `ENABLE_ERROR_LOGGING=true` is set)
- Rate-limited duplicate errors
- Errors during Sentry SDK initialization itself (logged to console only)

## Admin Secret Guard

ɳSelf Admin refuses to start in production with a known dev-stub admin secret. If `HASURA_GRAPHQL_ADMIN_SECRET` is set to a value containing `dummy`, or is `hasura-admin-secret-dev`, or `changeme`, the process throws:

```
FATAL: dev-stub HASURA_GRAPHQL_ADMIN_SECRET detected in production.
```

Set a secure random secret (minimum 32 characters) in `.env.secrets` for production deployments.

## Related

- `src/lib/error-logging.ts`, error logging implementation
- `src/app/api/graphql/hasura/route.ts`, admin secret guard
