# CI/CD Quick Reference

## GitHub Actions Workflows

### On Every PR

- **test.yml** runs automatically
  - Lint & format checks
  - TypeScript type checking
  - Unit tests with coverage
  - E2E tests (Playwright)
  - Production build test

### On Merge to Main

- **deploy-staging.yml** runs automatically
  - Builds Docker image
  - Pushes to Docker Hub (staging tag)
  - Deploys to staging server
  - Runs smoke tests

### On Version Tag (v\*)

- **release.yml** runs automatically
  - Full test suite
  - Multi-platform Docker build
  - Pushes to Docker Hub (latest + version)
  - Creates GitHub Release
  - Updates Docker Hub README

### Daily

- **dependency-audit.yml** runs automatically
  - Scans for security vulnerabilities
  - Creates GitHub issue if found
  - Fails on critical vulnerabilities

### Weekly

- **lighthouse.yml** runs automatically
  - Performance audit
  - Accessibility audit
  - Comments results on PRs

## Quick Commands

```bash
# Before committing
pnpm run lint          # Check code quality
pnpm run format        # Auto-format code
pnpm run type-check    # Check TypeScript
pnpm test              # Run unit tests

# Local workflow testing
act pull_request -W .github/workflows/test.yml

# Create a release
npm version 0.5.0 --no-git-tag-version
git add package.json
git commit -m "chore: bump version to 0.5.0"
git tag v0.5.0
git push origin main --tags
```

## Monitoring Endpoints

- **Health**: http://localhost:3021/api/health
- **Metrics**: http://localhost:3021/api/metrics

## GitHub Secrets Needed

Add to: Settings > Secrets and variables > Actions

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `STAGING_HOST`
- `STAGING_USER`
- `STAGING_SSH_KEY`
- `STAGING_URL`
- `SLACK_WEBHOOK` (optional)

## Common Issues

### PR Failing?

```bash
# Fix lint issues
pnpm run lint --fix

# Fix formatting
pnpm run format

# Check types
pnpm run type-check
```

### Staging Deploy Failing?

1. Check GitHub secrets are set
2. Verify Docker Hub credentials
3. SSH into staging and check logs:
   ```bash
   docker logs nself-admin-staging
   ```

### Release Failing?

1. Ensure all tests pass
2. Check tag format: `v0.5.0` (with 'v' prefix)
3. Verify Docker Hub permissions

## Documentation

- **Full Guide**: [docs/CICD.md](../docs/CICD.md)
- **Docker Hub**: [docs/DOCKER_README.md](../docs/DOCKER_README.md)
- **Main README**: [README.md](../README.md)

## Support

- Issues: https://github.com/nself-org/admin/issues
- Discussions: https://github.com/nself-org/admin/discussions
