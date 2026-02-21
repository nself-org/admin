#!/bin/bash

# nself-admin Release Script
# Automates version bumping, tagging, and Docker image publishing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="nself/admin"
GITHUB_REPO="nself-org/admin"

# Functions
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}→${NC} $1"
}

check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check for required commands
    for cmd in git docker npm jq; do
        if ! command -v $cmd &> /dev/null; then
            print_error "$cmd is not installed"
            exit 1
        fi
    done
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Run this script from the project root."
        exit 1
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        print_error "You have uncommitted changes. Commit or stash them first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

get_current_version() {
    node -p "require('./package.json').version"
}

bump_version() {
    local bump_type=$1
    print_info "Bumping $bump_type version..."
    
    # Bump version in package.json
    npm version $bump_type --no-git-tag-version
    
    # Get new version
    NEW_VERSION=$(get_current_version)
    
    # Update version in other files
    update_version_in_files $NEW_VERSION
    
    print_success "Version bumped to $NEW_VERSION"
}

update_version_in_files() {
    local version=$1
    
    # Update Dockerfile
    sed -i.bak "s/ENV ADMIN_VERSION=.*/ENV ADMIN_VERSION=$version/" Dockerfile
    rm Dockerfile.bak
    
    # Update docker-compose template
    if [ -f "docker-compose.nself-admin.yml" ]; then
        sed -i.bak "s/ADMIN_VERSION:-.*}/ADMIN_VERSION:-$version}/" docker-compose.nself-admin.yml
        rm docker-compose.nself-admin.yml.bak
    fi
    
    # Update CHANGELOG.md with new version header
    if [ -f "CHANGELOG.md" ]; then
        DATE=$(date +%Y-%m-%d)
        sed -i.bak "2i\\
\\
## [$version] - $DATE\\
\\
### Added\\
- \\
\\
### Changed\\
- \\
\\
### Fixed\\
- \\
" CHANGELOG.md
        rm CHANGELOG.md.bak
    fi
}

build_docker_image() {
    local version=$1
    print_info "Building Docker image..."
    
    # Build for multiple architectures
    docker buildx create --use --name nself-builder 2>/dev/null || true
    
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag $DOCKER_REGISTRY:$version \
        --tag $DOCKER_REGISTRY:latest \
        --push \
        .
    
    print_success "Docker image built and pushed"
}

create_git_tag() {
    local version=$1
    print_info "Creating git tag v$version..."
    
    # Commit version changes
    git add -A
    git commit -m "Release v$version"
    
    # Create and push tag
    git tag -a "v$version" -m "Release version $version"
    git push origin main
    git push origin "v$version"
    
    print_success "Git tag created and pushed"
}

create_github_release() {
    local version=$1
    print_info "Creating GitHub release..."
    
    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        print_info "GitHub CLI not found, skipping release creation"
        return
    fi
    
    # Create release notes
    RELEASE_NOTES="## nself-admin v$version

### Installation

\`\`\`bash
# Using Docker
docker run -d \\
  --name nself-admin \\
  -p 3001:3001 \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v \$(pwd):/project \\
  $DOCKER_REGISTRY:$version

# Using nself CLI
nself admin install --version $version
\`\`\`

### Docker Images
- Docker Hub: \`$DOCKER_REGISTRY:$version\`
- Docker Hub Latest: \`$DOCKER_REGISTRY:latest\`

See [CHANGELOG.md](https://github.com/$GITHUB_REPO/blob/main/CHANGELOG.md) for detailed changes."
    
    # Create release
    gh release create "v$version" \
        --repo $GITHUB_REPO \
        --title "v$version" \
        --notes "$RELEASE_NOTES" \
        --draft
    
    print_success "GitHub release draft created"
}

# Main script
main() {
    echo "🚀 nself-admin Release Script"
    echo "=============================="
    
    check_prerequisites
    
    CURRENT_VERSION=$(get_current_version)
    echo ""
    echo "Current version: $CURRENT_VERSION"
    echo ""
    echo "Select release type:"
    echo "  1) Patch (bug fixes)"
    echo "  2) Minor (new features)"
    echo "  3) Major (breaking changes)"
    echo "  4) Pre-release (beta/alpha)"
    echo "  5) Custom version"
    echo ""
    read -p "Enter choice [1-5]: " choice
    
    case $choice in
        1)
            bump_version patch
            ;;
        2)
            bump_version minor
            ;;
        3)
            bump_version major
            ;;
        4)
            read -p "Enter pre-release type (beta/alpha/rc): " prerelease
            bump_version "pre$prerelease"
            ;;
        5)
            read -p "Enter custom version: " custom_version
            npm version $custom_version --no-git-tag-version
            NEW_VERSION=$custom_version
            update_version_in_files $NEW_VERSION
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    echo ""
    read -p "Build and push Docker image? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_docker_image $NEW_VERSION
    fi
    
    echo ""
    read -p "Create git tag and push? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_git_tag $NEW_VERSION
    fi
    
    echo ""
    read -p "Create GitHub release? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        create_github_release $NEW_VERSION
    fi
    
    echo ""
    print_success "Release v$NEW_VERSION completed!"
    echo ""
    echo "Next steps:"
    echo "  1. Update CHANGELOG.md with release notes"
    echo "  2. Test the new Docker image"
    echo "  3. Publish GitHub release draft"
    echo "  4. Update documentation"
}

# Run main function
main "$@"