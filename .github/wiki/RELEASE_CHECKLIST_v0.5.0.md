# Release Checklist: v0.5.0

Complete checklist for releasing nself-admin v0.5.0.

## Pre-Release Preparation

### Documentation

- [x] Update README.md with v0.5.0 features
- [x] Create comprehensive CHANGELOG.md entry
- [x] Write USER_GUIDE.md with step-by-step tutorials
- [x] Create MIGRATION_v0.4_to_v0.5.md guide
- [ ] Update API.md with all endpoints
- [ ] Create COMPONENTS.md documenting 60+ components
- [ ] Update DEVELOPER_GUIDE.md
- [ ] Update DEPLOYMENT.md for production
- [ ] Review and update TROUBLESHOOTING.md
- [ ] Update all version references in docs

### Code Quality

- [ ] Run `pnpm run lint` - Must pass with 0 errors, 0 warnings
- [ ] Run `pnpm run format` - Auto-format all files
- [ ] Run `pnpm run type-check` - TypeScript strict mode passes
- [ ] Run `pnpm test` - All unit tests pass
- [ ] Run `pnpm run test:coverage` - Coverage >90%
- [ ] Run E2E tests with Playwright
- [ ] Check bundle size - Should be <2MB

### Version Bumping

- [ ] Update `package.json` version to `0.5.0`
- [ ] Update `docs/VERSION` to `0.5.0`
- [ ] Update `Dockerfile` ENV version to `0.5.0`
- [ ] Update `src/lib/constants.ts` ADMIN_VERSION to `0.5.0`
- [ ] Update all version badges in README.md
- [ ] Update Docker image tags in documentation

### Security Review

- [ ] Run `npm audit` - No high/critical vulnerabilities
- [ ] Review SECURITY_AUDIT.md findings
- [ ] Verify all API routes use proper authentication
- [ ] Check for command injection vulnerabilities (use execFile)
- [ ] Verify input validation on all forms
- [ ] Review session management security
- [ ] Check environment variable handling
- [ ] Scan Docker image for vulnerabilities

### Testing

#### Manual Testing

**Authentication & Session**

- [ ] Can set admin password on first run
- [ ] Can log in with correct password
- [ ] Cannot log in with wrong password
- [ ] Session persists across page refreshes
- [ ] Session expires after 7 days
- [ ] Logout works correctly
- [ ] Password requirements enforced (12+ chars, mixed case, numbers, special)

**Dashboard**

- [ ] Dashboard loads without errors
- [ ] All service cards display
- [ ] Service status shows correctly
- [ ] Metrics update in real-time
- [ ] Quick actions work (Start All, Stop All, Build, Doctor)
- [ ] Recent activity feed displays
- [ ] System metrics accurate (CPU, Memory, Disk)

**Service Management**

- [ ] Can view individual service details
- [ ] Can start/stop services
- [ ] Can restart services
- [ ] Logs stream in real-time
- [ ] Can filter logs
- [ ] Can download logs
- [ ] Service configuration editor works
- [ ] Environment variables save correctly

**Database Operations**

- [ ] SQL console loads
- [ ] Can execute queries
- [ ] Query results display correctly
- [ ] Query history persists
- [ ] Can save queries
- [ ] Can export results (CSV, JSON)
- [ ] EXPLAIN ANALYZE works
- [ ] Schema browser displays tables
- [ ] Can create migrations
- [ ] Can run migrations
- [ ] Can rollback migrations

**Deployment**

- [ ] Environment overview page loads
- [ ] Staging deployment works
- [ ] Production deployment works
- [ ] Blue-green deployment strategy works
- [ ] Canary deployment strategy works
- [ ] Rollback functionality works
- [ ] Deployment history accurate

**Backup & Restore**

- [ ] Can create backups
- [ ] Can download backups
- [ ] Can restore backups
- [ ] Scheduled backups work
- [ ] Backup retention works
- [ ] Backup list displays correctly

**Configuration**

- [ ] Can edit .env.dev variables
- [ ] Can edit .env.local variables
- [ ] Can add new variables
- [ ] Can delete variables
- [ ] SSL certificate generation works (mkcert)
- [ ] SSL trust installation works
- [ ] Let's Encrypt configuration works

**Monitoring**

- [ ] Metrics dashboard loads
- [ ] Charts display correctly
- [ ] Real-time updates work
- [ ] Can change time ranges
- [ ] Grafana integration works
- [ ] Log aggregation works
- [ ] Can create alerts
- [ ] Alert notifications work

**Cloud & Kubernetes**

- [ ] Cloud provider pages load
- [ ] Can configure AWS
- [ ] Can configure GCP
- [ ] Can configure DigitalOcean
- [ ] Kubernetes cluster management works
- [ ] Helm chart management works

**Plugins**

- [ ] Plugin dashboard loads
- [ ] Can view installed plugins
- [ ] Can view available plugins
- [ ] Plugin configuration works
- [ ] Stripe plugin displays data
- [ ] GitHub plugin displays data
- [ ] Shopify plugin displays data

#### Automated Testing

- [ ] Unit tests pass: `pnpm test`
- [ ] E2E tests pass: `npx playwright test`
- [ ] Type checking passes: `pnpm run type-check`
- [ ] Linting passes: `pnpm run lint`
- [ ] Build succeeds: `pnpm run build`

### Browser Testing

Test in all supported browsers:

- [ ] Chrome 100+ (latest)
- [ ] Firefox 100+ (latest)
- [ ] Safari 15+ (macOS)
- [ ] Edge 100+ (latest)
- [ ] Mobile Safari (iOS 15+)
- [ ] Chrome Mobile (Android)

**Check for:**

- Layout issues
- JavaScript errors
- WebSocket connectivity
- Real-time updates
- Responsive design
- Touch interactions (mobile)

### Performance Testing

- [ ] Lighthouse score >95 for all metrics
- [ ] Initial load <1.5s
- [ ] API response <100ms average
- [ ] Real-time latency <50ms
- [ ] No memory leaks after 1 hour usage
- [ ] Bundle size optimized (<2MB)
- [ ] Images optimized
- [ ] Code splitting effective

### Accessibility Testing

- [ ] WCAG 2.1 AA compliance verified
- [ ] Keyboard navigation works throughout app
- [ ] Screen reader compatible (tested with VoiceOver/NVDA)
- [ ] Color contrast ratios meet standards
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Forms have proper labels
- [ ] Error messages announced

### Docker Testing

**Build Docker Image**

```bash
docker build -t nself/nself-admin:0.5.0 .
docker build -t nself/nself-admin:latest .
```

- [ ] Docker image builds successfully
- [ ] Image size reasonable (<500MB)
- [ ] Multi-stage build works
- [ ] Base image security-scanned
- [ ] Health check works
- [ ] Can run container
- [ ] Container starts without errors
- [ ] Can access on port 3021
- [ ] Volume mounts work correctly
- [ ] Environment variables passed correctly

**Test Docker Image**

```bash
# Test basic functionality
docker run -d \
  --name nself-admin-test \
  -p 3021:3021 \
  -v $(pwd)/test-project:/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:0.5.0

# Verify it works
curl http://localhost:3021/api/health

# Clean up
docker stop nself-admin-test
docker rm nself-admin-test
```

- [ ] Container runs successfully
- [ ] Health endpoint responds
- [ ] Can log in
- [ ] Can manage services
- [ ] No errors in logs

---

## Release Process

### 1. Final Code Freeze

- [ ] All PRs merged
- [ ] No pending commits
- [ ] Git working directory clean
- [ ] On `main` branch
- [ ] Pulled latest changes

### 2. Version Update

```bash
# Update package.json
npm version 0.5.0 --no-git-tag-version

# Verify version updated
grep '"version"' package.json
```

- [ ] package.json updated
- [ ] All documentation updated
- [ ] Constants file updated
- [ ] Dockerfile updated

### 3. Final Build & Test

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Run all checks
pnpm run lint
pnpm run format:check
pnpm run type-check
pnpm test
pnpm run build

# Verify build output
ls -lh .next/
```

- [ ] Clean install successful
- [ ] All checks pass
- [ ] Build successful
- [ ] Build output looks correct

### 4. Git Commit & Tag

```bash
# Stage changes
git add .

# Commit
git commit -m "$(cat <<'EOF'
release: v0.5.0 - Production Ready

This is the first production-ready release of nself-admin.

Major Features:
- 198 fully functional pages
- 60+ production-grade components
- Real-time WebSocket updates
- Comprehensive error handling
- Full mobile support
- WCAG 2.1 AA accessibility
- Enterprise-level security

See CHANGELOG.md for full details.
EOF
)"

# Create tag
git tag -a v0.5.0 -m "Release v0.5.0"

# Push
git push origin main
git push origin v0.5.0
```

- [ ] Changes committed
- [ ] Tag created
- [ ] Pushed to GitHub

### 5. Build Docker Images

```bash
# Build with version tag
docker build -t nself/nself-admin:0.5.0 .

# Build latest tag
docker build -t nself/nself-admin:latest .

# Verify images
docker images | grep nself-admin
```

- [ ] Version image built
- [ ] Latest image built
- [ ] Image sizes reasonable

### 6. Test Docker Images

```bash
# Test version tag
docker run -d --name test-v0.5.0 -p 3021:3021 nself/nself-admin:0.5.0
curl http://localhost:3021/api/health
docker stop test-v0.5.0 && docker rm test-v0.5.0

# Test latest tag
docker run -d --name test-latest -p 3021:3021 nself/nself-admin:latest
curl http://localhost:3021/api/health
docker stop test-latest && docker rm test-latest
```

- [ ] Version image works
- [ ] Latest image works
- [ ] Health checks pass

### 7. Push Docker Images

```bash
# Login to Docker Hub
docker login

# Push version tag
docker push nself/nself-admin:0.5.0

# Push latest tag
docker push nself/nself-admin:latest

# Verify on Docker Hub
open https://hub.docker.com/r/nself/nself-admin/tags
```

- [ ] Logged into Docker Hub
- [ ] Version image pushed
- [ ] Latest image pushed
- [ ] Images visible on Docker Hub

### 8. Create GitHub Release

```bash
# Using GitHub CLI
gh release create v0.5.0 \
  --title "v0.5.0 - Production Ready" \
  --notes-file docs/CHANGELOG.md \
  --latest
```

**Or manually:**

1. Go to https://github.com/nself-org/admin/releases/new
2. Select tag: `v0.5.0`
3. Release title: `v0.5.0 - Production Ready`
4. Copy release notes from CHANGELOG.md
5. Check "Set as latest release"
6. Publish release

**Release Notes:**

````markdown
# v0.5.0 - Production Ready

This is the **first production-ready release** of nself-admin.

## Highlights

- 198 fully functional pages
- 60+ production-grade components
- Real-time WebSocket updates
- Comprehensive error handling
- Full mobile support
- WCAG 2.1 AA accessibility
- Enterprise-level security

## Quick Start

```bash
# Via nself CLI (recommended)
nself admin

# Or via Docker
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:0.5.0
```
````

## Upgrading from v0.4.0

See [MIGRATION_v0.4_to_v0.5.md](https://github.com/nself-org/admin/blob/main/docs/MIGRATION_v0.4_to_v0.5.md) for detailed upgrade instructions.

## Full Changelog

See [CHANGELOG.md](https://github.com/nself-org/admin/blob/main/docs/CHANGELOG.md) for complete details.

## Documentation

- [User Guide](https://github.com/nself-org/admin/blob/main/docs/USER_GUIDE.md)
- [Developer Guide](https://github.com/nself-org/admin/blob/main/docs/DEVELOPER_GUIDE.md)
- [API Reference](https://github.com/nself-org/admin/blob/main/docs/API.md)
- [Troubleshooting](https://github.com/nself-org/admin/blob/main/docs/TROUBLESHOOTING.md)

```

- [ ] GitHub release created
- [ ] Release notes accurate
- [ ] Marked as latest
- [ ] Links work

---

## Post-Release Tasks

### 1. Update nself CLI

Notify nself CLI maintainers to update default nself-admin version.

- [ ] Create issue in nself CLI repo
- [ ] Update nself CLI to use v0.5.0 by default

### 2. Documentation

- [ ] Update Wiki pages
- [ ] Update website (if exists)
- [ ] Verify all documentation links work

### 3. Communication

**Announcement Blog Post:**
- [ ] Write announcement post
- [ ] Highlight key features
- [ ] Include screenshots
- [ ] Publish to blog

**Social Media:**
- [ ] Twitter/X announcement
- [ ] LinkedIn post
- [ ] Reddit (r/selfhosted, r/docker)
- [ ] Hacker News (Show HN)
- [ ] Dev.to article

**Community:**
- [ ] Post in GitHub Discussions
- [ ] Update Discord (if exists)
- [ ] Email notification list (if exists)

### 4. Marketing Materials

- [ ] Update README badges
- [ ] Create demo video
- [ ] Take screenshots for documentation
- [ ] Update project homepage

### 5. Monitor

**First 24 Hours:**
- [ ] Monitor GitHub issues
- [ ] Watch Docker Hub downloads
- [ ] Check for crash reports
- [ ] Monitor social media feedback

**First Week:**
- [ ] Triage new issues
- [ ] Answer questions
- [ ] Update FAQ
- [ ] Plan hotfix if needed

### 6. Metrics

Track release metrics:
- [ ] Docker pulls
- [ ] GitHub stars
- [ ] Issue count
- [ ] PR count
- [ ] User feedback

---

## Hotfix Process

If critical issues found:

1. Create hotfix branch: `git checkout -b hotfix/v0.5.1`
2. Fix issue
3. Test thoroughly
4. Bump version to v0.5.1
5. Follow release process
6. Merge hotfix to main

---

## Rollback Plan

If major issues found:

1. **Docker Hub:** Revert `latest` tag to v0.4.0
2. **GitHub:** Mark v0.5.0 as pre-release
3. **Documentation:** Add warning in README
4. **Communication:** Notify users via all channels
5. **Investigation:** Identify and fix root cause
6. **Re-release:** Follow full release process for v0.5.1

---

## Success Criteria

Release is successful when:

- [ ] No critical bugs reported in first 48 hours
- [ ] Docker image pulls >100 in first week
- [ ] Positive community feedback
- [ ] All tests passing
- [ ] Documentation complete and accurate
- [ ] Migration guide tested by users
- [ ] No rollback required

---

## Notes

**Release Date:** 2026-01-31

**Release Manager:** (Your name)

**nself CLI Compatibility:** v0.4.4+

**Known Issues:** None

**Special Thanks:** Contributors and testers who helped make this release possible.

---

## Sign-Off

- [ ] Code reviewed and approved
- [ ] Documentation reviewed and approved
- [ ] Testing complete
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Ready for production

**Approved by:** ___________________

**Date:** ___________________

---

**Release Complete! 🎉**

nself-admin v0.5.0 is now live and ready for production use.
```
