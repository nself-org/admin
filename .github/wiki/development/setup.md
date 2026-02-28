# Development Setup

## Prerequisites

Before starting development, ensure you have:

- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher
- **Docker**: For testing containerized deployment
- **Git**: For version control
- **VS Code** (recommended): With recommended extensions

## Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/nself-admin.git
cd nself-admin

# Install dependencies
npm install
```

## Project Structure

```
nself-admin/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/             # API routes
│   │   ├── (auth)/          # Authenticated pages group
│   │   ├── login/           # Login page (no nav)
│   │   ├── build/           # Setup wizard (no nav)
│   │   ├── start/           # Start services (no nav)
│   │   └── page.tsx         # Dashboard
│   ├── components/          # React components
│   ├── contexts/           # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries
│   │   ├── database.ts    # LokiJS interface
│   │   ├── auth-db.ts     # Authentication logic
│   │   └── nselfCLI.ts    # nself CLI wrapper
│   ├── services/          # Background services
│   ├── stores/           # State management
│   └── utils/            # Helper utilities
├── public/               # Static assets
├── data/                # Database storage (gitignored)
│   └── nadmin.db       # LokiJS database file
├── docs/               # Documentation
├── .claude/           # AI assistant context
└── package.json       # Dependencies

```

## Environment Setup

### 1. Create Environment File

```bash
# Create .env.local for development
cat > .env.local << EOF
# Development Environment
NODE_ENV=development
PORT=3021

# Project Path (relative for development)
NSELF_PROJECT_PATH=../nself

# Optional: Enable debug logging
DEBUG=true
EOF
```

### 2. Setup Test Project

Create a sibling directory for testing:

```bash
# Go to parent directory
cd ..

# Clone or create test nself project
git clone https://github.com/your-org/nself-project.git
# OR
mkdir nself-project && cd nself-project && nself init
```

Your directory structure should look like:

```
parent-directory/
├── nself-admin/       # This repository (nAdmin)
└── nself-project/     # Test project
```

## Running Development Server

### Basic Start

```bash
# Start development server
npm run dev

# Or with custom port
PORT=3022 npm run dev
```

Access at http://localhost:3021

### With Debugging

```bash
# Enable Node.js debugging
npm run dev:debug

# In VS Code, attach debugger (F5)
```

### Watch Mode

```bash
# Run with file watching and auto-restart
npm run dev:watch
```

## Development Workflow

### 1. Database Management

The database is created automatically on first run:

```bash
# Database location
./data/nadmin.db

# Reset database (careful!)
rm ./data/nadmin.db
npm run dev  # Creates fresh database
```

### 2. Authentication Testing

For development, password requirements are relaxed:

- **Development**: Min 3 characters
- **Production**: Min 12 chars with complexity

Test with:

```bash
# Quick test password
Password: "dev"
```

### 3. API Testing

Use the included REST client file:

```bash
# Install REST Client extension in VS Code
code ./.vscode/api-tests.http
```

Or use curl:

```bash
# Test health endpoint
curl http://localhost:3021/api/health

# Login (saves cookies)
curl -X POST http://localhost:3021/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "dev", "isSetup": true}' \
  -c cookies.txt

# Test authenticated endpoint
curl http://localhost:3021/api/project/status \
  -b cookies.txt
```

### 4. Component Development

Use Storybook for component development:

```bash
# Start Storybook
npm run storybook

# Build Storybook
npm run build-storybook
```

### 5. Testing nself Commands

Mock nself CLI responses:

```bash
# Create mock nself script
cat > ../nself/nself << 'EOF'
#!/bin/bash
case "$1" in
  init) echo "Project initialized" ;;
  build) echo "Building services..." ;;
  start) echo "Starting services..." ;;
  stop) echo "Stopping services..." ;;
  status) echo "Services running" ;;
  *) echo "Unknown command" ;;
esac
EOF

chmod +x ../nself/nself
```

## Code Style & Linting

### ESLint Configuration

```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### TypeScript

```bash
# Type check
npm run type-check

# Watch mode
npm run type-check:watch
```

### Prettier

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

## Testing

### Unit Tests

```bash
# Run tests
npm test

# Watch mode
npm test:watch

# Coverage
npm test:coverage
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Test specific API
npm run test:api -- auth
```

### E2E Tests

```bash
# Install Playwright
npx playwright install

# Run E2E tests
npm run test:e2e

# Interactive mode
npm run test:e2e:ui
```

## Building for Production

### Local Build

```bash
# Build production bundle
npm run build

# Test production build
npm run start
```

### Docker Build

```bash
# Build Docker image
docker build -t nself-admin:dev .

# Run Docker container
docker run -p 3021:3021 \
  -v $(pwd)/../nself:/workspace \
  nself-admin:dev
```

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Dev Server",
      "port": 9229,
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug in Chrome",
      "url": "http://localhost:3021",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3021

# Kill process
kill -9 <PID>

# Or use different port
PORT=3022 npm run dev
```

#### Database Locked

```bash
# Remove lock file
rm ./data/nadmin.db.lock

# Restart server
npm run dev
```

#### Module Resolution Errors

```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

## Hot Module Replacement (HMR)

Next.js provides automatic HMR:

- **Pages**: Auto-refresh on save
- **API Routes**: Server restarts automatically
- **Components**: Preserve state during updates

### Disable HMR (if needed)

```bash
# In .env.local
NEXT_HMR=false
```

## Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "prisma.prisma",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "mikestead.dotenv",
    "humao.rest-client"
  ]
}
```

### Browser Extensions

- React Developer Tools
- Redux DevTools (if using Redux)
- Network Inspector

## Performance Profiling

### Next.js Analytics

```bash
# Enable build analytics
ANALYZE=true npm run build
```

### React Profiler

```typescript
import { Profiler } from 'react'

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`)
}

<Profiler id="Dashboard" onRender={onRenderCallback}>
  <Dashboard />
</Profiler>
```

## Git Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/your-feature
```

### Commit Convention

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

## Deployment Testing

### Local Docker Testing

```bash
# Build and run as production
docker build -t nself-admin:test .
docker run -p 3021:3021 \
  -e NODE_ENV=production \
  -v $(pwd)/../nself:/workspace \
  nself-admin:test
```

### Environment Variables

Test different environments:

```bash
# Development
NODE_ENV=development npm run dev

# Production
NODE_ENV=production npm run build && npm run start
```

## Troubleshooting

### Clear All Caches

```bash
# Full reset
rm -rf .next node_modules data/nadmin.db
npm install
npm run dev
```

### Debug Logging

Enable verbose logging:

```typescript
// In your code
if (process.env.DEBUG) {
  console.log('Debug info:', data)
}
```

```bash
# Run with debug
DEBUG=true npm run dev
```

### Memory Issues

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

## Next Steps

- Read [Project Structure](structure.md) for detailed code organization
- Review [Contributing Guide](contributing.md) for submission guidelines
- Check [API Documentation](../api/authentication.md) for endpoint details
- See [Testing Guide](testing.md) for comprehensive testing strategies
