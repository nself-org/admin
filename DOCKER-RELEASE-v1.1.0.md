# Docker Hub Release — nself/nself-admin v1.1.0

**Image:** `nself/nself-admin`
**Date:** TBD (pending USER-APPROVAL T26 — fires same day as CLI tag)

---

## Required Tags

Publish the following tags to Docker Hub on release day:

| Tag | Target |
|-----|--------|
| `nself/nself-admin:1.1.0` | Exact version (primary) |
| `nself/nself-admin:1.1` | Minor version alias |
| `nself/nself-admin:latest` | Always points to latest stable |

## Automation

The Docker publish workflow fires automatically when the CLI v1.1.0 tag is pushed.
Workflow: `admin/.github/workflows/release.yml` (triggered by CLI release dispatch).

## Manual publish (fallback if automation fails)

```bash
cd /Volumes/X9/Sites/nself/admin
source ~/.claude/vault.env

# Build
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag nself/nself-admin:1.1.0 \
  --tag nself/nself-admin:1.1 \
  --tag nself/nself-admin:latest \
  --push \
  .
```

## Verification

```bash
docker pull nself/nself-admin:1.1.0
docker run --rm nself/nself-admin:1.1.0 nself-admin --version
# expected: 1.1.0
```

## Lockstep note

Admin Docker image version MUST match CLI version exactly.
`nself doctor --deep` checks this and reports a CRITICAL finding if there is a mismatch.
