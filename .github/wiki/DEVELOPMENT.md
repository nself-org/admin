# Development Guide

This guide covers local development setup for contributing to nself-admin.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Code Style Guide](#code-style-guide)
5. [Testing](#testing)
6. [Building](#building)
7. [Common Development Tasks](#common-development-tasks)
8. [Debugging](#debugging)
9. [Common Issues](#common-issues)
10. [Contributing](#contributing)

---

## Getting Started

### Prerequisites

- **Node.js**: 18.x or later
- **pnpm**: 8.x or later
- **Docker**: 20.10+ (for testing)
- **Git**: Any recent version
- **Code Editor**: VS Code recommended

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/nself-org/admin.git
cd nself-admin

# Install dependencies
pnpm install

# Copy environment file (optional)
cp .env.example .env.local

# Start development server
PORT=3021 pnpm dev
```

Open http://localhost:3021

### VS Code Setup

Recommended extensions:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "yoavbls.pretty-ts-errors",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

Settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

---

## Project Structure

```
nself-admin/
├── .claude/                 # Project instructions for Claude
│   └── CLAUDE.md           # Development guidelines
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # Architecture details
│   ├── API.md              # API documentation
│   ├── DEPLOYMENT.md       # Deployment guide
│   ├── DEVELOPMENT.md      # This file
│   ├── MIGRATION.md        # Migration guides
│   └── CHANGELOG.md        # Release notes
├── public/                 # Static assets
│   ├── sw.js              # Service worker
│   └── offline.html       # Offline page
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── api/          # API routes
│   │   ├── login/        # Login page
│   │   ├── build/        # Build wizard
│   │   ├── config/       # Configuration pages
│   │   ├── database/     # Database pages
│   │   ├── services/     # Service management pages
│   │   ├── deployment/   # Deployment pages
│   │   ├── cloud/        # Cloud provider pages
│   │   ├── plugins/      # Plugin pages
│   │   ├── monitor/      # Monitoring pages
│   │   ├── settings/     # Settings pages
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Dashboard
│   ├── components/        # React components
│   │   ├── ui/           # UI primitives
│   │   ├── build/        # Build wizard components
│   │   ├── config/       # Config components
│   │   ├── database/     # Database components
│   │   ├── services/     # Service components
│   │   ├── skeletons/    # Loading skeletons
│   │   ├── Header.tsx    # Top navigation
│   │   ├── Layout.tsx    # Main layout
│   │   └── Navigation.tsx # Sidebar navigation
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx # Auth state
│   ├── hooks/             # Custom hooks
│   │   ├── useDashboardData.ts
│   │   ├── useServiceStatus.ts
│   │   ├── useSession.ts
│   │   └── useWebSocket.ts
│   ├── lib/               # Utilities and libraries
│   │   ├── api-client.ts  # API client
│   │   ├── auth-db.ts     # Auth database
│   │   ├── database.ts    # LokiJS database
│   │   ├── nselfCLI.ts    # nself CLI wrapper
│   │   ├── validation.ts  # Zod schemas
│   │   └── utils.ts       # Utility functions
│   └── services/          # Background services
│       └── SimplifiedPolling.ts # Polling service
├── tests/                 # Test files
│   ├── e2e/              # Playwright tests
│   └── accessibility/    # Accessibility tests
├── .env.example          # Example environment file
├── .eslintrc.json        # ESLint configuration
├── .prettierrc           # Prettier configuration
├── jest.config.js        # Jest configuration
├── next.config.mjs       # Next.js configuration
├── package.json          # Dependencies
├── pnpm-lock.yaml        # Lock file
├── tailwind.config.ts    # Tailwind configuration
└── tsconfig.json         # TypeScript configuration
```

### Key Directories

**`src/app/`** - Next.js App Router pages and API routes

- Every folder is a route
- `page.tsx` = page component
- `route.ts` = API endpoint

**`src/components/`** - Reusable React components

- `ui/` = Base components (buttons, inputs, etc.)
- Feature-specific folders for complex components

**`src/lib/`** - Utilities, helpers, and services

- Business logic, database access, API clients

**`src/hooks/`** - Custom React hooks

- Data fetching, WebSocket, state management

---

## Development Workflow

### Starting Development Server

```bash
# Start with default port (3021)
pnpm dev

# Start with custom port
PORT=4000 pnpm dev

# Start with turbo mode (faster builds)
pnpm dev --turbo
```

### Making Changes

1. **Create a branch**

   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes**
 - Edit files
 - Add tests
 - Update documentation

3. **Run quality checks**

   ```bash
   pnpm run lint          # Check for errors
   pnpm run format        # Auto-format code
   pnpm run type-check    # TypeScript validation
   pnpm test              # Run unit tests
   ```

4. **Test manually**
 - Start dev server
 - Test in browser
 - Check console for errors

5. **Commit changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   # Open PR on GitHub
   ```

### Hot Reload

Next.js supports hot module replacement:

- Changes to components → instant reload
- Changes to API routes → automatic restart
- Changes to config → manual restart needed

---

## Code Style Guide

### TypeScript

**Use strict typing:**

```typescript
// Good
interface ServiceStatus {
  name: string
  status: 'running' | 'stopped' | 'error'
  uptime: number
}

function getServiceStatus(name: string): ServiceStatus {
  // ...
}

// Avoid
function getServiceStatus(name: any): any {
  // ...
}
```

**Prefer interfaces over types:**

```typescript
// Good
interface User {
  id: string
  name: string
}

// OK for unions
type Status = 'active' | 'inactive'
```

**Use proper error handling:**

```typescript
// Good
try {
  await someOperation()
} catch (error) {
  const err = error as Error
  console.error('Operation failed:', err.message)
  return { success: false, error: err.message }
}

// Avoid
try {
  await someOperation()
} catch (error) {
  console.error(error) // Unknown type
}
```

### React Components

**Functional components with TypeScript:**

```typescript
// Good
interface ButtonProps {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`btn btn-${variant}`}
    >
      {label}
    </button>
  )
}
```

**Use proper hooks:**

```typescript
// Good
function MyComponent() {
  const [count, setCount] = useState(0)
  const [data, setData] = useState<Data | null>(null)

  useEffect(() => {
    fetchData().then(setData)
  }, [])

  return <div>{count}</div>
}
```

### API Routes

**Standard response format:**

```typescript
// Good
export async function GET(request: Request) {
  try {
    const data = await fetchData()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
```

### Naming Conventions

**Files:**

- Components: `PascalCase.tsx` (e.g., `ServiceCard.tsx`)
- Utilities: `camelCase.ts` (e.g., `apiClient.ts`)
- API routes: `route.ts`
- Pages: `page.tsx`

**Variables:**

- Constants: `UPPER_SNAKE_CASE`
- Variables: `camelCase`
- Components: `PascalCase`
- Types/Interfaces: `PascalCase`

**Functions:**

- Regular functions: `camelCase`
- React components: `PascalCase`
- Custom hooks: `useCamelCase`

### Imports

**Order:**

1. External libraries
2. Internal utilities
3. Components
4. Types
5. Styles

```typescript
// Good
import { useState, useEffect } from 'react'
import { NextResponse } from 'next/server'

import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

import type { ServiceStatus } from '@/types'
```

**Use path aliases:**

```typescript
// Good
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'

// Avoid
import { Button } from '../../../components/ui/button'
```

---

## Testing

### Unit Tests (Jest)

**Run tests:**

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

**Example test:**

```typescript
// src/lib/__tests__/utils.test.ts
import { formatUptime } from '../utils'

describe('formatUptime', () => {
  it('formats seconds correctly', () => {
    expect(formatUptime(30)).toBe('30s')
  })

  it('formats minutes correctly', () => {
    expect(formatUptime(90)).toBe('1m 30s')
  })

  it('formats hours correctly', () => {
    expect(formatUptime(3665)).toBe('1h 1m 5s')
  })
})
```

### E2E Tests (Playwright)

**Run E2E tests:**

```bash
pnpm test:e2e           # Run all E2E tests
pnpm test:e2e:headed    # Run with browser visible
pnpm test:e2e:ui        # Interactive mode
pnpm test:e2e:debug     # Debug mode
```

**Example E2E test:**

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test'

test('should login successfully', async ({ page }) => {
  await page.goto('http://localhost:3021/login')

  await page.fill('input[name="password"]', 'testpassword123')
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL('http://localhost:3021/')
  await expect(page.locator('h1')).toContainText('Dashboard')
})
```

### Accessibility Tests

**Run accessibility audit:**

```bash
pnpm test:a11y
```

Uses Pa11y to check WCAG 2.1 AA compliance.

---

## Building

### Development Build

```bash
pnpm build
```

Outputs to `.next/` directory.

### Production Build

```bash
NODE_ENV=production pnpm build
```

Optimizes for production:

- Minification
- Code splitting
- Tree shaking
- Image optimization

### Docker Build

```bash
# Build image
pnpm docker:build

# Push to registry
pnpm docker:push

# Or use script
./scripts/docker-release.sh
```

### Build Analysis

Analyze bundle size:

```bash
ANALYZE=true pnpm build
```

Opens interactive bundle analyzer.

---

## Common Development Tasks

### Adding a New Page

1. Create page file:

   ```bash
   mkdir -p src/app/my-feature
   touch src/app/my-feature/page.tsx
   ```

2. Create page component:

   ```typescript
   export default function MyFeaturePage() {
     return <div>My Feature</div>
   }
   ```

3. Add to navigation:
   ```typescript
   // src/components/Navigation.tsx
   {
     name: 'My Feature',
     href: '/my-feature',
     icon: SparklesIcon
   }
   ```

### Adding an API Route

1. Create route file:

   ```bash
   mkdir -p src/app/api/my-feature
   touch src/app/api/my-feature/route.ts
   ```

2. Implement handlers:

   ```typescript
   import { NextResponse } from 'next/server'

   export async function GET(request: Request) {
     try {
       const data = await fetchData()
       return NextResponse.json({ success: true, data })
     } catch (error) {
       return NextResponse.json(
         { success: false, error: 'Failed' },
         { status: 500 },
       )
     }
   }

   export async function POST(request: Request) {
     // ...
   }
   ```

### Adding a Component

1. Create component file:

   ```bash
   touch src/components/MyComponent.tsx
   ```

2. Implement component:

   ```typescript
   interface MyComponentProps {
     title: string
   }

   export function MyComponent({ title }: MyComponentProps) {
     return <div>{title}</div>
   }
   ```

3. Export from index (if in ui/):
   ```typescript
   // src/components/ui/index.ts
   export { MyComponent } from './MyComponent'
   ```

### Adding a Custom Hook

1. Create hook file:

   ```bash
   touch src/hooks/useMyHook.ts
   ```

2. Implement hook:

   ```typescript
   import { useState, useEffect } from 'react'

   export function useMyHook(param: string) {
     const [data, setData] = useState(null)

     useEffect(() => {
       // Fetch data
     }, [param])

     return { data }
   }
   ```

### Adding Database Fields

LokiJS is used for nAdmin's internal database.

1. Update schema:

   ```typescript
   // src/lib/database.ts
   interface MyCollection {
     key: string
     value: any
     timestamp: number
   }
   ```

2. Add collection:
   ```typescript
   const collection =
     db.getCollection<MyCollection>('my_collection') ||
     db.addCollection('my_collection', {
       unique: ['key'],
       ttl: 3600000, // 1 hour
     })
   ```

---

## Debugging

### Browser DevTools

**React DevTools:**

- Install extension
- Inspect component tree
- View props and state

**Network Tab:**

- Monitor API requests
- Check response times
- Debug failed requests

**Console:**

- View logs and errors
- Test JavaScript

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm dev"
    },
    {
      "name": "Next.js: debug client-side",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3021"
    }
  ]
}
```

### Debugging API Routes

Add breakpoints or console.log:

```typescript
export async function GET(request: Request) {
  console.log('Request received:', request.url)
  debugger // Pauses execution
  // ...
}
```

### Debugging nself CLI Calls

Enable CLI debug output:

```typescript
// src/lib/nselfCLI.ts
const result = await execFile('nself', ['status'], {
  cwd: projectPath,
  env: { ...process.env, DEBUG: '1' },
})
console.log('CLI output:', result.stdout)
```

---

## Common Issues

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3021`

**Solution:**

```bash
# Find process using port
lsof -i :3021

# Kill process
kill -9 <PID>

# Or use different port
PORT=4000 pnpm dev
```

### Module Not Found

**Error:** `Cannot find module '@/components/...'`

**Solution:**

```bash
# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### TypeScript Errors

**Error:** Type errors during development

**Solution:**

```bash
# Run type check
pnpm run type-check

# Restart TypeScript server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

### Hot Reload Not Working

**Solution:**

```bash
# Restart dev server
Ctrl+C
pnpm dev

# Clear Next.js cache
rm -rf .next
pnpm dev
```

### Docker Socket Permission Denied

**Error:** `permission denied while trying to connect to the Docker daemon socket`

**Solution:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker ps
```

---

## Contributing

### Before Submitting PR

**Checklist:**

- [ ] Code follows style guide
- [ ] TypeScript compiles (`pnpm run type-check`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Code is formatted (`pnpm run format`)
- [ ] Tests pass (`pnpm test`)
- [ ] E2E tests pass (if applicable)
- [ ] Documentation updated
- [ ] Commit messages follow convention

### Commit Message Convention

Format: `<type>(<scope>): <subject>`

**Types:**

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting
- `refactor` - Code restructuring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**

```bash
feat(database): add backup scheduling
fix(auth): resolve session timeout issue
docs(api): update API documentation
refactor(services): simplify service status logic
test(auth): add login flow tests
```

### Code Review Process

1. Submit PR with description
2. Automated checks run (CI)
3. Reviewer provides feedback
4. Make requested changes
5. Approved and merged

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Jest](https://jestjs.io/docs/getting-started)
- [Playwright](https://playwright.dev/docs/intro)

---

**Questions?** Open an issue on [GitHub](https://github.com/nself-org/admin/issues).
