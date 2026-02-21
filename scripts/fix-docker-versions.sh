#!/bin/bash

# Fix Docker Hub version tags for nself-admin
# This script helps manage version tags on Docker Hub

echo "=== Docker Hub Version Management for nself-admin ==="
echo ""
echo "Current situation:"
echo "- Incorrect: 0.2.0 (should be 0.0.2)"
echo "- Need to push: 0.0.3 (new release)"
echo ""

# Check if logged in
echo "Checking Docker login status..."
if docker pull nself/nself-admin:latest > /dev/null 2>&1; then
    echo "✓ Already logged in to Docker Hub"
else
    echo "✗ Not logged in. Please login using Docker Desktop or run:"
    echo "  docker login -u nself"
    exit 1
fi

echo ""
echo "=== Option 1: Remove incorrect 0.2.0 tag ==="
echo "Unfortunately, Docker Hub doesn't allow removing tags via CLI."
echo "You need to:"
echo "1. Go to https://hub.docker.com/r/nself/nself-admin/tags"
echo "2. Login as nself"
echo "3. Delete the 0.2.0 tag manually"
echo ""

echo "=== Option 2: Push correct versions ==="
echo "Commands to push correct versions:"
echo ""

# Show commands to execute
cat << 'EOF'
# 1. Build the new 0.0.3 version
docker build -t nself-admin:0.0.3 .

# 2. Tag for Docker Hub
docker tag nself-admin:0.0.3 nself/nself-admin:0.0.3
docker tag nself-admin:0.0.3 nself/nself-admin:latest

# 3. Optionally, if you have 0.0.2 locally, push it too:
# docker tag nself-admin:0.0.2 nself/nself-admin:0.0.2
# docker push nself/nself-admin:0.0.2

# 4. Push to Docker Hub
docker push nself/nself-admin:0.0.3
docker push nself/nself-admin:latest

# 5. Verify on Docker Hub
echo "Check: https://hub.docker.com/r/nself/nself-admin/tags"
EOF

echo ""
echo "=== Option 3: Override 0.2.0 with deprecation notice ==="
echo "If you can't delete 0.2.0, you could push a new image to that tag with a deprecation notice:"
echo ""
cat << 'EOF'
# Create a deprecation Dockerfile
cat > Dockerfile.deprecated << 'DOCKERFILE'
FROM alpine:latest
RUN echo "This version tag (0.2.0) was incorrectly published. Please use 0.0.2 or 0.0.3 instead." > /notice.txt
CMD ["cat", "/notice.txt"]
DOCKERFILE

# Build and push deprecation notice
docker build -f Dockerfile.deprecated -t nself/nself-admin:0.2.0 .
docker push nself/nself-admin:0.2.0
EOF

echo ""
echo "=== Current local images ==="
docker images | grep nself-admin

echo ""
echo "=== Recommended Action Plan ==="
echo "1. First, go to Docker Hub and manually delete the 0.2.0 tag"
echo "2. Build the new 0.0.3 version"
echo "3. Push 0.0.3 and latest tags"
echo "4. Verify all tags are correct on Docker Hub"
echo ""
echo "Ready to proceed? (The actual commands are shown above)"