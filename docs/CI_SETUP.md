# CI/CD Setup Guide

## Required GitHub Secrets

To enable the CI/CD workflows, you need to configure the following secrets in your GitHub repository settings:

### 1. Docker Hub Credentials

Required for publishing Docker images to Docker Hub.

- **DOCKERHUB_USERNAME**: Your Docker Hub username
- **DOCKERHUB_TOKEN**: Docker Hub access token (not password)

#### How to create Docker Hub token:

1. Log in to [Docker Hub](https://hub.docker.com)
2. Go to Account Settings → Security
3. Click "New Access Token"
4. Give it a descriptive name (e.g., "GitHub Actions")
5. Copy the token (you won't see it again)

### 2. Setting up GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add each secret:
   - Name: `DOCKERHUB_USERNAME`
   - Value: Your Docker Hub username
   - Click "Add secret"
   - Name: `DOCKERHUB_TOKEN`
   - Value: The access token you created
   - Click "Add secret"

## Workflow Files

The repository includes three main workflow files:

### docker-publish.yml

- Builds and publishes multi-arch Docker images
- Triggers on:
  - Push to main/master branch
  - Version tags (v\*)
  - Manual workflow dispatch
- Publishes to:
  - Docker Hub: `nself/admin`
  - GitHub Container Registry: `ghcr.io/nself-org/admin`

### docker-buildx.yml

- Configuration for multi-architecture builds
- Supports: linux/amd64, linux/arm64, linux/arm/v7

### wiki-sync.yml

- Syncs documentation to GitHub Wiki
- Triggers when docs/ folder changes
- No additional secrets required (uses GITHUB_TOKEN)

## Verifying Setup

After adding the secrets:

1. Go to Actions tab in your repository
2. Run "Docker Build and Publish" workflow manually
3. Check the logs for successful authentication

## Troubleshooting

### "Username and password required" error

- Verify DOCKERHUB_USERNAME and DOCKERHUB_TOKEN are set correctly
- Ensure the token has push permissions

### Wiki sync fails

- This uses the built-in GITHUB_TOKEN
- Ensure Actions have write permissions in Settings → Actions → General

### Build fails on ARM architectures

- QEMU setup is automatic
- May take longer on first build due to emulation
