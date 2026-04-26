# Development Setup Guide

This guide will help you set up your local development environment for nself-admin.

## Prerequisites

### Required Software

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **Docker**: Version 20.10 or higher
- **Git**: Version 2.0 or higher

### Optional but Recommended

- **VS Code**: With recommended extensions
- **Docker Compose**: For running the full nself stack locally
- **PostgreSQL Client**: For database debugging

## Initial Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/nself-admin.git
cd nself-admin

# Add upstream remote
git remote add upstream https://github.com/nself-org/admin.git
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Or using yarn
yarn install
```

### 3. Environment Configuration

Create a `.env.local` file for development:

```bash
# Copy example environment file
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Development Environment Variables
NODE_ENV=development
PORT=3000

# Admin Configuration
ADMIN_PASSWORD=your-dev-password

# Docker Configuration
DOCKER_HOST=unix:///var/run/docker.sock

# Database Configuration (if testing with local PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nself_dev

# Feature Flags
ENABLE_DEBUG_MODE=true
ENABLE_HOT_RELOAD=true
```

### 4. Docker Setup (Optional)

If you want to test with the full nself stack:

```bash
# Create a test nself project
mkdir ../nself-test
cd ../nself-test

# Initialize nself project
curl -fsSL https://raw.githubusercontent.com/nself-org/cli/main/install.sh | bash
nself init
nself build
nself start

# Return to nself-admin
cd ../nself-admin
```

## Development Workflow

### Starting the Development Server

```bash
# Start Next.js development server
npm run dev

# The application will be available at:
# http://localhost:3000
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint

# Format code with Prettier
npm run format

# Type checking
npm run type-check

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure Overview

```
nself-admin/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (main)/         # Main layout group
│   │   ├── api/            # API routes
│   │   └── login/          # Auth pages
│   ├── components/         # React components
│   │   ├── ui/            # Base UI components
│   │   └── services/      # Feature components
│   ├── lib/               # Utility functions
│   ├── services/          # Service layer
│   └── stores/            # Zustand stores
├── public/                # Static assets
├── docs/                  # Documentation
├── scripts/              # Build scripts
└── tests/                # Test files
```

## VS Code Setup

### Recommended Extensions

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "ms-azuretools.vscode-docker",
    "github.copilot"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

## Debugging

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000"
    },
    {
      "name": "Next.js: debug full stack",
      "type": "node-terminal",
      "request": "launch",
      "command": "npm run dev",
      "serverReadyAction": {
        "pattern": "started server on .+, url: (https?://.+)",
        "uriFormat": "%s",
        "action": "debugWithChrome"
      }
    }
  ]
}
```

### Debug Mode Features

When `ENABLE_DEBUG_MODE=true` in `.env.local`:

- Verbose logging in console
- React Query Devtools enabled
- Performance monitoring
- API request/response logging

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

### Writing Tests

Tests are located alongside the code they test:

```
src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx
├── lib/
│   ├── utils.ts
│   └── utils.test.ts
└── app/
    └── api/
        ├── health/
        │   ├── route.ts
        │   └── route.test.ts
```

## Common Development Tasks

### Adding a New Page

```bash
# Create new page directory
mkdir -p src/app/(main)/my-feature

# Create page component
touch src/app/(main)/my-feature/page.tsx
```

### Adding an API Route

```bash
# Create API route directory
mkdir -p src/app/api/my-endpoint

# Create route handler
touch src/app/api/my-endpoint/route.ts
```

### Adding a Component

```bash
# Create component file
touch src/components/MyComponent.tsx

# Create test file
touch src/components/MyComponent.test.tsx

# Create story file (if using Storybook)
touch src/components/MyComponent.stories.tsx
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Docker Socket Permission Issues

```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER

# Restart terminal or run
newgrp docker
```

### Module Resolution Issues

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
```

### TypeScript Errors

```bash
# Check for TypeScript errors
npm run type-check

# Generate TypeScript declarations
npm run build:types
```

## Performance Profiling

### Using React DevTools

1. Install React DevTools browser extension
2. Open DevTools and navigate to Profiler tab
3. Start recording and interact with the app
4. Analyze component render times

### Using Next.js Analytics

```javascript
// In next.config.js
module.exports = {
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP'],
  },
}
```

## Git Workflow

### Creating a Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-feature
```

### Committing Changes

```bash
# Stage changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new feature"

# Push to your fork
git push origin feature/my-feature
```

### Keeping Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream main into your main
git checkout main
git merge upstream/main
git push origin main
```

## Getting Help

- **Documentation**: Check `/docs` folder
- **the community chat**: Join our [community chat at chat.nself.org](https://chat.nself.org)
- **GitHub Issues**: Search existing issues or create new one
- **Stack Overflow**: Tag with `nself-admin`

## Next Steps

- Read the [Architecture Overview](./Architecture.md)
- Review [Contributing Guidelines](../contributing/CONTRIBUTING.md)
- Explore the [API Reference](../api/Reference.md)
- Set up your [IDE](./IDE-Setup.md)
