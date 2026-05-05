# Changelog

All notable changes to nself-admin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.18] - PENDING (P99 Sprint 3.5 release cascade)

P99 Sprints 3.1–3.3 patch release (CLI ↔ Admin lockstep at v1.0.18). Pairs with plugins-pro v1.1.6. Filled by Sprint 3.4 (this sprint) — concrete bullets land when sprints 3.1/3.2/3.3 complete.

### Fixed

<!-- Sprint 3.1: admin /environments page mock removal — fill from sprint completion notes -->
<!-- Sprint 3.1: admin benchmark mock data — fill -->
<!-- Sprint 3.1: admin np-tables fallback — fill -->
<!-- Sprint 3.1: vercel.json X-Nself-Version dynamic — fill -->
<!-- Sprint 3.1 T11: web/org releases page hardcoded version — fill -->

### Security

<!-- Sprint 3.3: CSP enforce mode (overlap with web/) — fill -->

---

## [1.0.17] - PENDING (P99 Sprint 2.6 release cascade)

P99 Sprints 2.1–2.5 patch release (CLI ↔ Admin lockstep at v1.0.17). Filled by Sprint 2.6 — bullets land when sprints 2.1–2.5 complete.

### Added

<!-- Sprint 2.1: plugin marketplace UI updates from contract integrity — fill -->
<!-- Sprint 2.5: ops hygiene admin page additions — fill -->

---

## [1.0.16] - PENDING (P99 Sprint 1.8 release cascade)

P99 reliability + data-integrity + security-lockdown patch release. Bundles unreleased v1.0.14 + v1.0.15 work plus full P99 Sprints 1.1–1.7. CLI ↔ Admin lockstep maintained at v1.0.16. Plugins-pro paired patch is v1.1.4.

User-action items (T01–T03, T18, T04+T05) from the Sprint 1.8 prep are NOT in this release; they land in the next patch.

### Added

- **Blue-green/canary deploy state file with atomic write + 0600 perms** (1.1.T06+T06-FIX).
- **mux audit queue + 1s flusher** (1.2.T05).
- **Stripe `Idempotency-Key` shared helper** (1.2.T06+T07).
- **Hasura row filters on `np_*` tables** (1.3.T01+T02). Row-level isolation enforced across the full `np_*` surface; doctor verifies coverage.
- **SSRF guard shared module** (1.3.T05).
- **Ollama installer SHA pinning + verify pipeline** (1.3.T08).
- **Loki retention extended to 30d** (1.6.T11). `cli/internal/compose/monitoring/loki.go` `DefaultLokiConfig.RetentionPeriod` now `720h` (was `168h`).

### Changed

- **mux Gmail timeout retry telemetry split** (1.2.T01). Retry counter decomposed into `attempt`, `outcome`, `latency_ms`.
- **HTTP timeout sweep — 17 CLI sites migrated to scoped `httptimeout`/`httpclient`** (1.4 series); `forbidigo` lint blocks new bare `http.Client{}` usage.
- **GitHub Actions pinned to commit SHAs across 17 workflows** (1.5.T09 + T13). Node runners moved 20 → 22 in lockstep.
- **homebrew formula audit hardening** (1.5.T16).
- **license-gate workflow updated for AGPL ua-parser-js → v1 MIT** (1.5.T17+T17b).
- **Version bumped to v1.0.16** to maintain lockstep with CLI v1.0.16 (per ɳSelf CLI ↔ Admin version-lockstep policy).

### Fixed

- **mux `SafeGo` panic guards** (1.1.T01).
- **Cron stagger jitter (0–60s)** (1.1.T02). Prevents thundering-herd on the top of the hour.
- **nginx healthcheck endpoint** returns 200 on `/healthz` consistently across reload cycles (1.1.T03).
- **Identifier sanitizer error returns** (1.1.T04). No more silent truncation.
- **Plugin scaffold panic→error** (1.1.T05).
- **mux Gmail timeout retry** with telemetry split (1.2.T01).
- **claw DLQ + tiered retry (5m / 30m / 2h / 24h)** (1.2.T02).
- **Telegram webhook ingress validation** (1.2.T03).
- **mux nil `AccountEmail` → DLQ guard** (1.2.T04). Nil-account events now route to DLQ instead of nil-deref panic.
- **Admin yaml syntax fix** (1.5.T08).
- **GH Actions failures: Node 20 → 22 across 17 workflows** (1.5.T13).
- **Web/org CSP smoke test tsx loader** (1.5.T14) and **4 web/org check workflows** (1.5.T15).

### Security

- **ai SHA-256 audit hashing** (1.3.T04). All ai-plugin audit log entries hashed with SHA-256 (was MD5).
- **admin CSP nonce + httpOnly session cookies** (1.3.T06+T07). Inline scripts gated by per-request nonce; session cookie set httpOnly + Secure + SameSite=Strict.
- **mux attachment path-traversal hardening** (1.3.T10).
- **License pubkey ldflag pin (SEC-10)** (1.3.T11). `LICENSE_PUBLIC_KEY_OVERRIDE` env var removed.
- **Fuzz test on identifier sanitizer** (1.3.T03). 1M+ iterations against the sanitizer regex.

### Internal

- **plugins-pro CI checkout fixes** for ntask iOS + sibling workflows (1.5.T07+T07b).
- **clawde AI action SHA-pinned replacement** (1.5.T11).
- **nchat tests env fix** (1.5.T09), **nclaw + ntv plugins-pro PAT** (1.5.T10).
- **plugins-pro auth-enterprise + byok import path fixes** (1.5.T06b/c).
- **HTTP timeout sweep — 76 plugins-pro sites migrated** (1.4 series, plugins-pro side; total ecosystem footprint 93 sites).
- **Pricing/brand sweep:** canonical `$0.99 / $3.99 / $39.99` across 5 READMEs + `cli/README` + 11 brand-voice fixes; `nclaw` indigo → sky-500 (18 occurrences); `nMedia` → `nTV`; `ClawDE+` → `ClawDE`.
- **DR + ops:** Hasura migration runbook now ACTIONABLE (PostgREST primary, RTO < 4h); Stripe failover (Lemon Squeezy) PREP runbook published.
- **Doctrine:** `nchat install.sh` 15 `docker compose` invocations → `nself` CLI (nSelf-First); LICENSING_SPEC doc-drift cleanup queued.

### Notes

- v1.0.14 + v1.0.15 work was never tagged separately; both batches are folded into v1.0.16.
- CLI ships at v1.0.16 in lockstep per CLI ↔ Admin lockstep hard rule.
- Plugins-pro ships v1.1.4 alongside.

---

## [1.0.11] - 2026-04-25

### Security

- **Auth middleware on all 260 routes** (S121): `requireAuth` middleware enforced across every App Router page and API route. Unauthenticated requests return 401 and redirect to `/login`.
- **CSRF protection** added to all 260 routes as part of S121 security lockdown.
- **Secret redaction** in `/api/env/read`: `HASURA_GRAPHQL_ADMIN_SECRET`, `NSELF_PLUGIN_LICENSE_KEY`, and other sensitive vars are masked in the API response. Operators see `***` in the UI; plaintext never leaves the server.
- **Wizard write guards**: `/build` wizard routes now verify auth before accepting any POST; unauthenticated wizard writes return 401.
- **Default binding to 127.0.0.1**: Docker Compose production config now binds admin port 3021 to `127.0.0.1` only. External exposure requires the new `--expose-network` flag (default: off).
- **`--expose-network` flag**: explicit opt-in to bind admin on `0.0.0.0` for LAN/remote-admin scenarios.
- **Gitleaks credential scanner** added to CI (S102-T01+T02): all PRs and pushes now run gitleaks to prevent accidental secret commits.

### Fixed

- **Dockerfile version sync** (S211-T07b): `NSELF_VERSION` build arg and `ADMIN_VERSION` env var in Dockerfile updated to `1.0.11`; stale `1.0.10` references removed.
- **CLI version constant** (S211-T06): `src/lib/cli-version.ts` `CLI_VERSION` bumped to `1.0.11` to match CLI lockstep.
- **`react-markdown` lockfile** (S211-T07): `pnpm-lock.yaml` regenerated to include `react-markdown@^9.0.1`; specifier mismatch resolved.
- **`dompurify` lockfile specifier** (S211-T07b): `pnpm-lock.yaml` specifier for `dompurify` synced.
- **TypeScript errors** (S211-T07b): resolved `TS2552` and `TS2307` type errors across build.
- **`NODE_ENV` readonly** (S211-T07b): `NODE_ENV` typed as `readonly` in TS config to prevent accidental mutation.
- **`eslint-plugin-react-hooks`** (S211-T07b): upgraded to resolve `react-hooks/rules-of-hooks` CI failures.
- **`ActivityTimeline` useMemo** (S211-T07b): wrapped expensive computations in `useMemo` to fix lint exhaustive-deps warning.
- **Dead code removal** (S211-T07b): deleted `page.old.tsx` and excluded remaining dead-code files from ESLint scope.
- **Prettier formatting** (S211-T07b): applied Prettier to all files; `services/functions/page.tsx` formatted.
- **LokiJS test isolation** (S211-T07b): fixed prefix collision in `api-keys` tests causing false failures in parallel Jest runs.
- **Vibe session export** (S211-T07b): removed invalid `maxSessionsPerUser` export from vibe session route that caused CI type errors.
- **Hasura startup guard** (S211-T07b / `fix(build)`): `HASURA_GRAPHQL_ADMIN_SECRET` guard skipped during `next build` phase to prevent build-time failures in CI containers without a running Hasura.
- **Gitleaks allowlist path** (ci): fixed allowlist path reference after `ai-dir` removal.

### Changed

- **Version bumped to v1.0.11** to maintain lockstep with CLI v1.0.11 (per ɳSelf CLI-Admin version-lockstep policy).

---

## [0.5.0] - 2026-01-31

### 🎉 Production-Ready Release

This is the **first production-ready release** of nself-admin, representing a complete transformation from prototype to enterprise-grade application.

### Added

#### 📊 Full Page Coverage (198 Pages)

- **Dashboard & Overview** (15 pages)
- Real-time dashboard with live metrics
- Service overview grid with health indicators
- Quick actions and common tasks
- System resource monitoring
- Activity feed and recent events

- **Database Management** (25 pages)
- Full-featured SQL console with Monaco editor
- Query history and saved queries
- Backup creation and restoration wizard
- Automated backup scheduling with cron
- Migration management (create, run, rollback)
- Schema browser with table visualization
- Query explain/analyze support
- Database performance metrics
- Connection pool monitoring
- Index management and optimization

- **Service Management** (30 pages)
- Individual service detail pages (PostgreSQL, Hasura, Auth, Functions, MinIO, Redis, Mailpit, Nginx)
- Service configuration editors
- Container logs viewer with filtering
- Service health checks and diagnostics
- Resource usage per service
- Service dependency visualization
- Container shell access

- **Deployment & Environments** (35 pages)
- Multi-environment management (Dev, Staging, Production)
- Blue-green deployment strategy
- Canary deployment controls
- Preview environment generation
- Rollback management
- Deployment history and audit log
- Environment diff viewer
- Secrets management per environment
- Environment variable editor with validation

- **Cloud & Infrastructure** (28 pages)
- AWS integration (EC2, RDS, S3, Route53)
- Google Cloud Platform support
- DigitalOcean integration
- Azure support
- Server provisioning wizard
- Cloud resource monitoring
- Cost estimation
- Multi-cloud deployment

- **Kubernetes & Orchestration** (22 pages)
- Cluster management
- Namespace viewer
- Pod monitoring and logs
- Helm chart management
- Service mesh integration
- Ingress configuration
- ConfigMap and Secret management
- Resource quotas and limits

- **Monitoring & Observability** (18 pages)
- Grafana dashboard integration
- Prometheus metrics viewer
- Loki log aggregation
- Alert configuration
- Uptime monitoring
- Performance profiling
- Trace viewer
- Custom metrics dashboard

- **Security & Access** (12 pages)
- SSL certificate management (mkcert, Let's Encrypt)
- Certificate renewal automation
- Trust store management
- Access control configuration
- Audit log viewer
- Security scan results
- Vulnerability reports

- **Plugins & Extensions** (13 pages)
- Plugin marketplace
- Installed plugins dashboard
- Plugin configuration
- Stripe integration (revenue, customers, subscriptions)
- GitHub integration (repos, issues, PRs, CI/CD)
- Shopify integration (products, orders, inventory)
- Custom plugin development guide

#### 🧩 Production-Grade Components (60+ Components)

**Core UI Components:**

- `Layout` - Main application layout with navigation
- `PageShell` - Page wrapper with breadcrumbs and actions
- `PageTemplate` - Standardized page template
- `Header` - Top navigation bar with user menu
- `Sidebar` - Collapsible navigation sidebar
- `Footer` - Application footer
- `Breadcrumbs` - Hierarchical navigation
- `Logo` - Application branding

**Data Display:**

- `ServiceCard` - Service status cards
- `MetricCard` - Metric display cards
- `StatCard` - Statistics cards
- `ActivityFeed` - Recent activity list
- `Timeline` - Event timeline
- `Table` - Data table with sorting/filtering
- `VirtualTable` - Virtualized table for large datasets
- `TreeView` - Hierarchical data viewer

**Forms & Input:**

- `Input` - Text input with validation
- `Textarea` - Multi-line text input
- `Select` - Dropdown select
- `Checkbox` - Checkbox input
- `Switch` - Toggle switch
- `DatePicker` - Date selection
- `TimePicker` - Time selection
- `ColorPicker` - Color selection
- `FileUpload` - File upload with drag-drop
- `CodeEditor` - Monaco-based code editor
- `UrlInput` - URL validation input

**Feedback & Overlays:**

- `Toast` - Toast notifications (using Sonner)
- `Dialog` - Modal dialogs
- `AlertDialog` - Confirmation dialogs
- `Sheet` - Side panels
- `Popover` - Contextual popovers
- `Tooltip` - Hover tooltips
- `ConfirmDialog` - Confirmation prompts
- `ErrorBoundary` - Error boundary wrapper
- `LoadingStates` - Loading indicators

**Charts & Visualization:**

- `LineChart` - Time series charts
- `BarChart` - Bar charts
- `PieChart` - Pie charts
- `AreaChart` - Area charts
- `ComposedChart` - Multi-type charts
- `Gauge` - Gauge indicators
- `Sparkline` - Inline trend charts
- `HeatMap` - Heat map visualization

**Skeletons & Loading:**

- `DashboardSkeleton` - Dashboard loading state
- `FormSkeleton` - Form loading state
- `CodeEditorSkeleton` - Editor loading state
- `LogViewerSkeleton` - Log viewer loading state
- `MetricCardSkeleton` - Metric card loading state
- `CardGridSkeleton` - Card grid loading state
- `ChartSkeleton` - Chart loading state
- `ListSkeleton` - List loading state
- `TableSkeleton` - Table loading state
- `TimelineSkeleton` - Timeline loading state

**Specialized Components:**

- `ServiceDetailModal` - Service details modal
- `ServiceConfigModal` - Service configuration modal
- `BackupConfiguration` - Backup setup wizard
- `NetworkSpeedTest` - Network speed testing
- `ProjectSetupWizard` - Initial setup wizard
- `WizardProvider` - Wizard state management
- `ProjectStateProvider` - Project state context
- `SSEProvider` - Server-sent events provider
- `GlobalDataProvider` - Global data context
- `ThemeToggle` - Dark/light mode toggle

#### ⚡ Real-Time Features

- **WebSocket Integration**
- Live service status updates
- Real-time log streaming
- Container event notifications
- Deployment progress tracking
- Resource usage monitoring

- **Server-Sent Events (SSE)**
- Long-running operation updates
- Build process streaming
- CLI command output streaming
- Metrics updates

#### 🔒 Security Enhancements

- **Authentication**
- bcrypt password hashing
- Session management with httpOnly cookies
- 7-day session expiry with auto-renewal
- CSRF protection
- Rate limiting on auth endpoints

- **Authorization**
- Role-based access control foundation
- Environment-based access (dev, staging, prod)
- Secrets management per environment
- Audit logging for all actions

- **Input Validation**
- Zod schema validation on all forms
- Command injection prevention (execFile vs exec)
- GraphQL query allowlisting
- File path sanitization
- Environment variable validation

#### 🎨 user workflow

- **Responsive Design**
- Mobile-first approach
- Tablet optimization
- Desktop layouts
- Touch-friendly interactions

- **Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA attributes

- **Dark Mode**
- Full dark mode support
- System preference detection
- Persistent theme selection
- Smooth transitions

- **Progressive Web App (PWA)**
- Installable on mobile/desktop
- Offline capability (coming soon)
- App-like workflow

#### 📡 API Infrastructure (120+ Endpoints)

- **Authentication**: `/api/auth/*` (5 endpoints)
- **Services**: `/api/services/*` (12 endpoints)
- **Database**: `/api/database/*` (18 endpoints)
- **Docker**: `/api/docker/*` (15 endpoints)
- **Deployment**: `/api/deploy/*` (10 endpoints)
- **Cloud**: `/api/cloud/*` (15 endpoints)
- **Kubernetes**: `/api/k8s/*` (12 endpoints)
- **Monitoring**: `/api/monitoring/*` (8 endpoints)
- **Plugins**: `/api/plugins/*` (10 endpoints)
- **Config**: `/api/config/*` (8 endpoints)
- **System**: `/api/system/*` (7 endpoints)

### Changed

#### 🏗️ Architecture Improvements

- **State Management**
- Zustand for global state
- SWR for data fetching with caching
- React Context for feature-specific state
- LocalStorage persistence where appropriate

- **Code Organization**
- Feature-based folder structure
- Shared components library
- Utility functions library
- Type-safe API client

- **Build Optimization**
- Code splitting per route
- Dynamic imports for heavy components
- Image optimization
- Bundle size reduction (30% smaller)
- Lighthouse score: 95+

#### 🚀 Performance

- **Rendering**
- React 19 concurrent features
- Virtual scrolling for large lists
- Memoization of expensive calculations
- Lazy loading of images and components

- **Networking**
- API response caching
- Request deduplication
- Optimistic UI updates
- Retry logic with exponential backoff

- **Metrics**
- Initial load: < 1.5s
- API response: < 100ms average
- Real-time latency: < 50ms
- Time to Interactive: < 2s

### Fixed

#### 🐛 Critical Fixes

- **Build Page Race Condition** - Prevent double builds with useRef
- **Store Cleanup on Logout** - Reset all Zustand stores
- **Memory Leak Prevention** - Proper cleanup in polling services
- **Command Injection** - 50+ routes now use execFile
- **GraphQL Injection** - Query allowlisting implemented
- **Session Security** - Enhanced token validation
- **Password Validation** - Improved strength requirements

#### 🔧 Bug Fixes

- Docker container detection in WSL2
- Environment file parsing edge cases
- SSL certificate renewal automation
- Wizard state persistence across refreshes
- Service dependency ordering
- Log viewer ANSI escape code handling
- Real-time update reconnection
- Chart rendering with null values
- Table sorting with mixed types
- Form validation error display

### Removed

- Legacy environment variable authentication (now database-based)
- Deprecated API routes from v0.0.x
- Unused dependencies (reduced by 15%)
- Test fixtures and mock data from production build

### Technical Details

#### Dependencies Updated

- **Next.js**: 14.x → 16.1.4
- **React**: 18.x → 19.1.1
- **TypeScript**: 5.3 → 5.9.2
- **Tailwind CSS**: 3.x → 4.1.11
- **Socket.io**: 4.5 → 4.8.1

#### Browser Support

- Chrome/Edge 100+
- Firefox 100+
- Safari 15+
- Mobile browsers (iOS Safari, Chrome Mobile)

#### System Requirements

**Development:**

- Node.js 18+
- pnpm 8+
- Docker 20+
- 4GB RAM minimum

**Production:**

- Docker 20+
- 2GB RAM minimum
- 10GB disk space
- Linux/macOS/Windows (WSL2)

#### Docker Image

- Image: `nself/nself-admin:0.5.0`
- Size: 450MB (optimized)
- Base: `node:18-alpine`
- Multi-stage build
- Security scanning passed

### Migration from v0.4.0

See [MIGRATION_v0.4_to_v0.5.md](MIGRATION_v0.4_to_v0.5.md) for detailed upgrade instructions.

**Breaking Changes:**

1. Database schema changes (automatic migration)
2. API response format standardization
3. Environment variable naming conventions
4. Session storage moved to database

**Recommended Steps:**

1. Backup your current installation
2. Update Docker image: `docker pull nself/nself-admin:0.5.0`
3. Review environment variables
4. Restart containers
5. Test all critical workflows

---

## [0.0.8] - 2026-01-24

### Added

- **Full Security Audit** (`docs/SECURITY_AUDIT.md`)
- 3-pass security review covering OWASP Top 10
- Authentication and session management audit
- API routes and input validation analysis
- Command injection vulnerability assessment
- Dependency vulnerability scan
- Prioritized remediation recommendations

- **Plugin Management UI** (Aligns with nself CLI v0.4.8)
- Plugin dashboard (`/plugins`) with installed/available plugins grid
- Plugin installation wizard with environment variable configuration
- Plugin configuration management
- Plugin-specific detail pages (`/plugins/[name]`)
- Webhook event monitoring and retry
- Plugin sync controls and history
- Plugin health indicators

- **Stripe Plugin UI** (`/plugins/stripe`)
- Revenue dashboard (MRR, ARR, key metrics)
- Customer management interface with search
- Subscription viewer with status filters
- Invoice management and PDF download
- Payment methods viewer
- Webhook event log with filtering

- **GitHub Plugin UI** (`/plugins/github`)
- Repository overview and sync status
- Issues and Pull Requests dashboard
- CI/CD status (GitHub Actions runs)
- Commit history and releases
- Activity feed

- **Shopify Plugin UI** (`/plugins/shopify`)
- Store overview and metrics
- Product catalog viewer with variants
- Order management with status filters
- Customer list
- Inventory status

- **Enhanced Database UI**
- Backup creation wizard with type selection
- Backup list with download/delete actions
- Backup restore workflow with confirmation
- Scheduled backups with visual cron editor
- Migration management (run, rollback, create)
- Schema browser with table visualization
- Monaco-based SQL console with syntax highlighting
- Query history (persisted) and saved queries
- Query results export (CSV, JSON)
- Query explain/analyze support

- **Cloud Provider Integration**
- AWS configuration and deployment
- Google Cloud Platform (GCP) support
- DigitalOcean integration
- Provider status monitoring

- **Kubernetes Management UI**
- Cluster configuration
- Namespace management
- Pod monitoring
- Helm chart support

- **Performance & Deployment**
- Benchmark runner UI
- Cache management interface
- Blue-green deployment controls
- Rollback management

### Security Fixes

- **Command Injection** - Fixed vulnerabilities in 9 API routes using `execFile` instead of `exec`
- `/api/database/backups/route.ts`
- `/api/database/migrations/route.ts`
- `/api/database/schema/route.ts`
- `/api/cloud/aws/route.ts`
- `/api/cloud/gcp/route.ts`
- `/api/cloud/digitalocean/route.ts`
- `/api/kubernetes/route.ts`
- `/api/kubernetes/helm/route.ts`
- `/api/performance/benchmark/route.ts`
- **GraphQL Query Injection** - Added allowlisted query patterns to prevent arbitrary query execution
- **Session Validation** - Enhanced session security with proper token verification
- **Password Storage** - Improved password hashing and validation

### Fixed

- **Build Page Race Condition** - Changed `buildStarted` from `useState` to `useRef` to prevent double builds
- **Store Cleanup on Logout** - Added Zustand store reset calls in AuthContext for security
- **Memory Leak Prevention** - Proper cleanup in DockerPollingService with `beforeunload` handler

### API Routes

- `GET/POST /api/plugins/*` - Plugin management endpoints
- `GET/POST /api/plugins/[name]/*` - Plugin-specific endpoints
- `GET/POST /api/database/backups/*` - Backup management
- `GET/POST /api/database/migrations/*` - Migration management
- `GET/POST /api/database/schema/*` - Schema browser
- `GET/POST /api/cloud/*` - Cloud provider integration
- `GET/POST /api/kubernetes/*` - Kubernetes management
- `GET/POST /api/performance/*` - Performance tools

### Dependencies

- `@monaco-editor/react` - SQL editor
- `recharts` - Revenue charts
- `cronstrue` - Cron to human readable

### Technical

- Aligns with nself CLI v0.4.8 (Plugin System Release)
- New plugin command wrapping infrastructure
- Enhanced database command support
- Plugin registry integration
- Docker image: `nself/nself-admin:0.0.8`
- 50+ files changed with security hardening

---

## [0.0.7] - 2026-01-23

### Added

- **Multi-Environment Deployment UI**
- New `/deployment/staging` page for staging deployments
- New `/deployment/prod` page for production deployments
- New `/deployment/environments` page for environment management
- Deploy API routes (`/api/deploy/staging`, `/api/deploy/production`)
- **CLI Integration Improvements**
- Added `findNselfPath()` and `findNselfPathSync()` for dynamic CLI path resolution
- Added `getEnhancedPath()` for proper PATH environment in container
- CLI version detection in health endpoint (`cliVersion` field)
- Support for `PROJECT_PATH` and `NSELF_PROJECT_PATH` environment variables
- **Container Enhancements**
- Added mkcert binary for local SSL certificate generation
- Added docker-cli-compose for Docker Compose support
- Documented Docker socket security considerations
- **Unit Testing Infrastructure**
- Added Jest configuration (`jest.config.js`, `jest.setup.js`)
- Created initial test suite for nself-path utilities

### Changed

- Navigation updated with new deployment routes
- CLI command whitelist expanded with new commands: `restart`, `ssl`, `trust`, `env`, `clean`, `reset`, `exec`, `staging`, `prod`
- Default CLI command timeout increased from 30s to 60s
- Health check now includes nself CLI availability and version

### Fixed

- **CLI Path Resolution** - Fixed hardcoded paths in `letsencrypt/route.ts` and `config/route.ts`
- **Enhanced PATH** - Added `getEnhancedPath()` to all exec calls for container compatibility
- **Project Name Detection** - Fixed extraction from multiple env files (.env, .env.local, .env.dev)
- **ANSI Escape Codes** - Added `stripAnsi()` function for parsing CLI output
- **Filesystem Health Check** - Changed from `/project` to `/workspace` (NSELF_PROJECT_PATH)

### Technical

- 20+ files changed
- New API routes: `/api/deploy/*` (3 endpoints), `/api/env` (1 endpoint)
- New pages: `/deployment/*` (3 pages)
- Docker image: `nself/nself-admin:0.0.7`
- Aligned with nself CLI v0.4.4

## [0.0.6] - 2026-01-22

### Added

- **SSL Configuration Page** (`/config/ssl`)
- Certificate status display (mode, validity, expiry)
- Local certificate generation via mkcert integration
- Let's Encrypt configuration support
- Trust store installation guide with OS-specific instructions
- **Centralized Constants** (`src/lib/constants.ts`)
- All port definitions (ADMIN: 3021, LOKI: 3100, etc.)
- Version information for dynamic display
- **Full Roadmap** (`docs/ROADMAP.md`)
- Detailed plans for v0.0.7 through v0.1.0
- Aligned with nself CLI v0.4.3-v0.5.0 release schedule
- Technical architecture notes with TypeScript interfaces
- Multi-environment deployment considerations

### Changed

- Login page now displays dynamic version from constants (was hardcoded v0.3.9)
- Standardized error response format across all 30+ API routes

### Fixed

- **TypeScript Error Handling** - Fixed 30+ API routes with proper error handling
- Changed `error?.message` and `error.message` patterns to proper type checking
- Pattern: `error instanceof Error ? error.message : 'Unknown error'`
- **Promise Typing** - Fixed `Promise<Response>` return type in SSL generate-local route
- **File System Errors** - Added `NodeJS.ErrnoException` typing for file operations

### Technical

- 45 files changed, 2,362 insertions(+), 264 deletions(-)
- New API routes: `/api/config/ssl/*` (4 endpoints)
- Docker image: `nself/nself-admin:0.0.6`

## [0.0.5] - 2026-01-21

### Added

- Full documentation reorganization for GitHub Wiki sync
- Improved sidebar navigation with complete page linking
- VERSION file moved to `/docs` for cleaner root directory

### Changed

- Cleaned up root directory (removed VERSION, docker-compose files, test files)
- Updated all version references to 0.0.5 across package.json, Dockerfile
- Reorganized documentation structure for better wiki generation
- Simplified README.md to focus on quick start

### Fixed

- Version mismatch between package.json (0.0.4) and Dockerfile (0.0.3)
- ESLint warnings for unused variables across API routes
- Documentation link consistency across wiki pages

### Technical

- Updated Dockerfile labels and environment variables
- Improved GitHub Actions wiki-sync workflow with better navigation
- Standardized documentation file naming conventions

## [0.0.4] - 2025-09-17

### Added

- Security enhancements with bcrypt password hashing
- Secure random generation for session tokens
- Dependabot configuration for automated updates
- Centralized project path handling

### Changed

- Improved CI/CD pipeline reliability
- Enhanced TypeScript declarations
- Better path resolution across modules

### Fixed

- 43 security alerts resolved
- Build and reset command issues
- Functions service categorization
- UI consistency between wizard pages

## [0.0.4-beta] - 2025-09-06

### Added

- Unified state management for wizard configuration
- Real-time synchronization between UI state and environment files
- Automatic environment file detection (.env.dev, .env.local, .env)
- Improved wizard navigation with proper state persistence

### Changed

- Environment handler now writes directly to .env.dev for development
- Removed .env.local as primary configuration target
- Simplified ProjectStateWrapper to prevent navigation conflicts
- Updated optional services to save all states together

### Fixed

- Wizard navigation redirect loops between /init pages
- Project status API not detecting .env.dev files
- Optional service selections not persisting across page navigation
- Environment changes not saving immediately on field changes
- Redirect issues when moving between wizard steps
- Project name and configuration values reverting on navigation

### Technical Improvements

- Removed aggressive redirect logic from ProjectStateWrapper
- Enhanced environment file cascade priority handling
- Improved auto-save functionality with proper debouncing
- Better error handling in wizard update endpoints
- Streamlined state management across all wizard pages

## [0.0.3] - 2025-08-31

### Added

- LokiJS database integration for session management
- Project setup wizard with 6 steps
- Docker image optimization (reduced from 3.69GB to 421MB)

### Changed

- Migrated from environment variables to database for auth
- Improved project initialization flow

## [0.0.2] - 2025-08-29

### Added

- Initial project setup capabilities
- Service configuration interface
- Docker integration

## [0.0.1] - 2025-08-28

### Added

- Initial release
- Basic admin interface
- Authentication system
- Project management features

## [1.0.10] - 2026-04-23 (Wave 5)

### Added

- **Admin panel unified auth** (O07), Admin now uses unified auth flow (FF_UNIFIED_AUTH). Session management via np_sessions v2. License management and device management pages wired to `nself account` CLI.
- **Audit log live tail** (Q02), Admin shows live stream of np_audit_log entries via Hasura subscription panel.
- **Ollama status panel** (B38), Admin displays Ollama service health and installed models.

---

## [1.0.12] - 2026-04-25

P96 CRUNCH phase, release cascade widget, XSS hardening, 2FA TOTP, audit log, rate limiting, and ship-readiness fixes.

### Added

- **`ReleaseCascadeWidget`** (S173): visual release coordinator in Admin UI. Shows real-time progress of the 12-step release cascade; links out to GitHub Actions, Homebrew tap, and Docker Hub status.
- **2FA TOTP enforcement** (S123): all admin users can enroll a TOTP authenticator app; super-admin policy can require 2FA for privileged operations.
- **Audit log with rate limit** (S123): every sensitive admin action (env write, plugin install, license set, user manage) is written to `np_audit_log` with actor, timestamp, and IP. Rate limit enforced at the route level.
- **`nself doctor` admin check** (S124): admin surfaces a one-click "Doctor" panel that runs `nself doctor --deep` and displays categorised findings inline. Blocks deploy button on CRITICAL findings.

### Changed

- **Version bumped to v1.0.12** (lockstep with CLI v1.0.12).
- **`CLI_VERSION` constant** in `src/lib/cli-version.ts` updated to `1.0.12`.

### Fixed

- **XSS hardening on all output viewers** (S122): all plugin log viewers, env value displays, and JSON output panels now sanitise through DOMPurify before rendering.
- **`requireAuth` on all 260 routes** (S121): middleware enforced across every page and API route; unauthenticated requests return 401.
- **Dockerfile `NSELF_VERSION` build arg** updated from stale `1.0.11` to `1.0.12`.

### Security

- **CSRF protection** extended to all 260 routes as part of S121-S122 security lockdown.
- **Secret redaction** hardened: additional sensitive env var patterns masked in `/api/env/read` response.
