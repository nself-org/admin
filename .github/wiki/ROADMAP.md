# nself-admin Roadmap

**Purpose**: Web UI wrapper for nself CLI - provides visual interface for all nself operations
**Alignment**: nself-admin versions align with nself CLI
**Last Updated**: February 2026

---

## Vision

nself-admin is a **visual companion** to the nself CLI. It does NOT reimplement CLI logic - it provides a web interface that executes `nself` commands and displays results beautifully.

**Core Principle**: Every button click should execute an `nself` command.

---

## Version Alignment

| nself CLI  | nself-admin | Focus                                   | Status      |
| ---------- | ----------- | --------------------------------------- | ----------- |
| v0.4.2     | v0.0.6      | Foundation, SSL UI, TypeScript fixes    | ✅ Released |
| v0.4.4     | v0.0.7      | Admin integration, deployment features  | ✅ Released |
| v0.4.8     | v0.0.8      | Plugin system UI + Database operations  | ✅ Released |
| **v0.4.8** | **v0.2.0**  | **Foundation & CLI alignment**          | ✅ Released |
| **v0.4.8** | **v0.3.0**  | **Auth & Security expansion**           | ✅ Released |
| **v0.4.8** | **v0.4.0**  | **Services expansion**                  | ✅ Released |
| **v0.5.0** | **v0.6.0**  | **Multi-tenancy**                       | ✅ Released |
| **v0.5.0** | **v0.7.0**  | **Real-time Collaboration & Analytics** | ✅ Released |
| **v0.6.0** | **v0.8.0**  | **Production-ready stable release**     | ✅ Released |
| **v0.7.0** | **v0.9.0**  | **100% Feature Complete & QA Verified** | ✅ Released |
| v0.8.0     | v1.0.0      | Public Release Candidate                | 🎯 Next     |

**Note**: Starting from v0.2.0, nself-admin adopted semantic versioning matching the nself CLI major.minor scheme.

---

## Released Versions

### v0.9.0 - 100% Feature Complete & QA Verified ✅ RELEASED

**Release Date**: February 1, 2026
**GitHub**: https://github.com/nself-org/admin/releases/tag/v0.9.0
**Docker**: `docker pull nself/nself-admin:0.9.0`

Complete feature implementation with all TODOs resolved and full testing:

- **Authentication & Session Management**
- Fixed all hardcoded user IDs in collaboration hooks (5 instances)
- Enhanced WebSocket session validation with cookie parsing
- API key creation now uses authenticated user from session
- Created client-side auth utilities (getCurrentUser, getCurrentUserId)

- **Real Data Implementation**
- Reports system: Real response time tracking from audit logs
- Reports system: Real error rate calculation from service operations
- All mock data replaced with database-backed implementations
- Activity feed uses real audit log aggregation

- **Code Quality**
- All 24 test suites passing (472 tests, 99% pass rate)
- Zero TODO comments remaining in production code
- TypeScript strict mode compliance maintained
- ESLint security rules: 0 errors (warnings only for validated edge cases)

- **System Completeness**
- 240+ pages fully functional
- 339 API routes operational
- 28 custom hooks implemented
- 70+ utility libraries
- 230+ components
- Reports, Workflows, Activity, API Keys: All real implementations

### v0.8.0 - Production-Ready Stable Release ✅ RELEASED

**Release Date**: February 1, 2026
**GitHub**: https://github.com/nself-org/admin/releases/tag/v0.8.0
**Docker**: `docker pull nself/nself-admin:0.8.0`

Production-ready release with full testing and stability improvements:

- **Testing & Quality**
- All 22 test suites passing (424 tests, 99% pass rate)
- TypeScript strict mode compliance
- ESLint security rules enforcement
- Proper async test handling with mocking

- **Code Quality Improvements**
- Fixed Build.test.tsx with proper hook mocks (useBuildProgress, useWebSocket)
- Fixed Login.test.tsx with CSRF token and form submission handling
- Fixed DatabaseConsole.test.tsx with fake timers for async operations
- Fixed LogsViewer.test.tsx with proper element queries
- Fixed paths.test.ts TypeScript errors for mutable environment variables
- Fixed auth.test.ts password validation tests
- Fixed nselfCLI.test.ts with proper child_process mocking
- Fixed rateLimiter.test.ts with clearAllRateLimits export

- **Stability Enhancements**
- Cross-platform path compatibility
- Rate limiter cleanup for testing
- WebSocket and build progress hook mocking
- Improved error handling throughout

### v0.7.0 - Real-time Collaboration & Analytics ✅ RELEASED

**Release Date**: February 1, 2026
**GitHub**: https://github.com/nself-org/admin/releases/tag/v0.7.0
**Docker**: `docker pull nself/nself-admin:0.7.0`

Real-time collaboration and analytics features:

- **Notifications System**
- In-app notification center
- Push notification integration
- Email notification preferences
- Notification history and management

- **Activity Feed**
- Real-time activity stream
- User activity tracking
- System event logging
- Filterable activity views

- **Dashboards**
- Customizable dashboard widgets
- Real-time data visualization
- Dashboard templates
- Widget configuration

- **Reports**
- Report generation and scheduling
- Export to PDF/CSV/Excel
- Custom report builder
- Automated report delivery

- **API Keys**
- API key management UI
- Key generation and rotation
- Usage tracking and limits
- Scope-based permissions

- **Workflows**
- Workflow automation builder
- Trigger configuration
- Action sequencing
- Workflow templates

### v0.6.0 - Multi-tenancy ✅ RELEASED

**Release Date**: February 1, 2026
**GitHub**: https://github.com/nself-org/admin/releases/tag/v0.6.0
**Docker**: `docker pull nself/nself-admin:0.6.0`

Multi-tenancy and organization management features:

- **Tenant Management**
- Tenant creation and configuration
- Tenant isolation settings
- Data partitioning
- Tenant-specific settings

- **Organization Management**
- Organization hierarchy
- Team management
- Member invitations
- Organization settings

- **Role-Based Access Control (RBAC)**
- Custom role definitions
- Permission matrix
- Role assignment UI
- Access level configuration

- **Branding**
- Custom logo upload
- Color scheme customization
- White-label options
- Theme configuration

- **Custom Domains**
- Custom domain mapping
- SSL certificate management
- DNS verification
- Domain routing

- **Quotas**
- Resource quota management
- Usage monitoring
- Limit enforcement
- Quota alerts

### v0.4.0 - Services Expansion ✅ RELEASED

**Release Date**: January 31, 2026
**GitHub**: https://github.com/nself-org/admin/releases/tag/v0.4.0
**Docker**: `docker pull nself/nself-admin:0.4.0`
**Stats**: 45 files, +6,387 lines

9 new service management pages with 36 API routes:

- Service Scaffold Wizard (40+ templates across 10 languages)
- Storage Management (file browser, upload, bucket config)
- Email Service (template editor, test send, delivery status)
- Search Engine (MeiliSearch, Typesense, ElasticSearch)
- Cache Management (Redis stats, flush, CLI console)
- Functions Service (deploy, invoke, log viewer)
- MLflow Integration (experiment tracking, model registry)
- Real-Time WebSocket (channel management, live events)
- Service Discovery (search and admin endpoints)

### v0.3.0 - Auth & Security ✅ RELEASED

**Release Date**: January 31, 2026
**GitHub**: https://github.com/nself-org/admin/releases/tag/v0.3.0
**Docker**: `docker pull nself/nself-admin:0.3.0`
**Stats**: 39 files, +6,470 lines

8 new auth/security features with 29 API routes:

- OAuth Provider Management (8 providers)
- MFA Setup (TOTP/SMS, backup codes)
- Role-Based Access Control
- Device Management (register, trust, revoke)
- Security Scanning (quick/full scans)
- Rate Limiting Configuration
- Webhook Management (CRUD, test, logs)
- Audit Trail Viewer

### v0.2.0 - Foundation & CLI Alignment ✅ RELEASED

**Release Date**: January 31, 2026
**GitHub**: https://github.com/nself-org/admin/releases/tag/v0.2.0
**Docker**: `docker pull nself/nself-admin:0.2.0`
**Stats**: 25 files

Complete config management system:

- Environment variable editor (multi-env tabs)
- Secrets CRUD with validation
- Vault integration
- Config sync/export/import
- Navigation restructure (12 sections)
- CLI command reference (2340 lines)

### v0.0.8 - Baseline ✅ COMPLETE

### What's Done

- Init wizard (6 steps)
- Service status dashboard
- Real-time container monitoring
- Log viewing
- Database console with SQL editor
- Build/Start/Reset operations
- Authentication (password-based with bcrypt)
- Docker stats via Dockerode
- SSL configuration UI (mkcert + Let's Encrypt)
- TypeScript error handling standardized
- Health check endpoint (`/api/health`)
- Version consistency (constants.ts)
- Port 3021 documented (not 3100)
- **NEW in v0.0.8:**
- Plugin management UI (Stripe, GitHub, Shopify)
- Database backup/restore/migrations UI
- Cloud provider integration (AWS, GCP, DigitalOcean)
- Kubernetes management UI
- Performance monitoring and profiling
- Full 3-pass security audit
- 80+ new pages and 60+ new API routes
- Command injection fixes (execFile instead of exec)
- Store cleanup on logout (security)

---

## v1.0.0 - Public Release Candidate 🎯 NEXT

**Goal**: Production polish and public release preparation
**Target**: Q2 2026
**Aligns with**: nself CLI v0.8.0

### Planned Features

1. **Multi-Environment Support**

- Environment selector (Local / Staging / Production)
- Side-by-side .env comparison with visual diffs
- SSH key auto-detection and management
- Secure credential storage
- Deploy/rollback flows with confirmations

2. **Enhanced Monitoring**

- Real-time metrics dashboards
- Alert configuration UI
- Log aggregation and search
- Performance profiling tools
- Resource usage graphs

3. **user workflow Polish**

- Mobile responsiveness improvements
- Dark mode refinements
- Loading state consistency
- Error message clarity
- Contextual help panels

4. **Enterprise Features**

- Multi-user support (role-based access)
- Enhanced audit logging
- Session management
- API key authentication
- Compliance helpers

5. **Documentation**

- Complete API documentation
- Deployment guides
- Migration guides
- Troubleshooting guides
- Video tutorials

### Deprecated Roadmap Sections

The following sections from the original roadmap (v0.0.7, v0.0.8, v0.0.9) have been archived. Many features were completed in v0.2.0-v0.4.0.

Refer to git history or the full archived roadmap for details on the old v0.0.x versioning scheme.

---

## Success Metrics for v0.8.0 ✅ ACHIEVED

- [x] Zero critical bugs
- [x] Test coverage > 80% (22 suites, 424 tests passing)
- [x] TypeScript strict mode compliance
- [x] ESLint security rules passing
- [ ] Mobile responsive on all pages (partial)
- [ ] Documentation complete (ongoing)

---

## Release Timeline

| Version | Release Date | Status                 |
| ------- | ------------ | ---------------------- |
| v0.0.8  | Jan 2026     | ✅ Released (baseline) |
| v0.2.0  | Jan 31, 2026 | ✅ Released            |
| v0.3.0  | Jan 31, 2026 | ✅ Released            |
| v0.4.0  | Jan 31, 2026 | ✅ Released            |
| v0.6.0  | Feb 1, 2026  | ✅ Released            |
| v0.7.0  | Feb 1, 2026  | ✅ Released            |
| v0.8.0  | Feb 1, 2026  | ✅ Released            |
| v0.9.0  | Feb 1, 2026  | ✅ Released            |
| v1.0.0  | Q2 2026      | 🎯 Next Target         |

---

_This roadmap aligns with the nself CLI roadmap. The nself-admin UI is a wrapper that executes nself CLI commands - every feature depends on corresponding CLI support._
