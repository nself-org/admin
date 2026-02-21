#!/bin/bash
set -e

# Docker release script for nself-admin
# Usage: ./scripts/docker-release.sh [version]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 nself-admin Docker Release Script${NC}"
echo "======================================="

# Get version from package.json or use provided argument
VERSION=${1:-$(node -p "require('./package.json').version")}
DOCKER_REPO="nself/nself-admin"

echo -e "Version: ${YELLOW}$VERSION${NC}"
echo -e "Repository: ${YELLOW}$DOCKER_REPO${NC}"
echo ""

# Check if logged in to Docker Hub
echo "Checking Docker Hub login..."
if ! docker info 2>/dev/null | grep -q "Username"; then
    echo -e "${YELLOW}Please log in to Docker Hub:${NC}"
    docker login
fi

# Build the application
echo -e "\n${GREEN}Building Next.js application...${NC}"
npm run build

# Build Docker images for multiple platforms
echo -e "\n${GREEN}Building Docker images...${NC}"

# Create a new builder instance if it doesn't exist
if ! docker buildx ls | grep -q "nself-builder"; then
    echo "Creating buildx builder..."
    docker buildx create --name nself-builder --use
    docker buildx inspect --bootstrap
fi

# Build and push multi-platform images
echo -e "\n${GREEN}Building multi-platform images...${NC}"
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag $DOCKER_REPO:$VERSION \
    --tag $DOCKER_REPO:latest \
    --push \
    .

echo -e "\n${GREEN}✅ Docker images pushed successfully!${NC}"
echo ""
echo "Images published:"
echo "  - $DOCKER_REPO:$VERSION (linux/amd64, linux/arm64)"
echo "  - $DOCKER_REPO:latest (linux/amd64, linux/arm64)"
echo ""
echo "To use the image:"
echo -e "${YELLOW}docker run -d -p 3021:3021 -v /var/run/docker.sock:/var/run/docker.sock:ro -v \$(pwd):/project $DOCKER_REPO:latest${NC}"