# nself-admin Architecture

Comprehensive technical architecture documentation for nself-admin v0.5.0.

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Principles](#core-principles)
3. [Technology Stack](#technology-stack)
4. [Architecture Diagrams](#architecture-diagrams)
5. [Directory Structure](#directory-structure)
6. [Component Hierarchy](#component-hierarchy)
7. [Data Flow](#data-flow)
8. [State Management](#state-management)
9. [API Design](#api-design)
10. [Real-Time Architecture](#real-time-architecture)
11. [Security Model](#security-model)
12. [Performance Optimizations](#performance-optimizations)
13. [Database Schema](#database-schema)
14. [Deployment Architecture](#deployment-architecture)

---

## System Overview

nself-admin is a **web-based UI wrapper** for the [nself CLI](https://github.com/nself-org/cli). It provides a visual interface for managing your self-hosted backend stack without reimplementing any CLI logic.

### Key Characteristics

- **UI Wrapper**: All operations delegate to `nself` CLI commands
- **Zero Footprint**: Never modifies user's project except through nself CLI
- **Self-Contained**: Internal state stored in embedded LokiJS database
- **Docker-First**: Designed to run in containers with volume mounts
- **Real-Time**: WebSocket and SSE for live updates

### Architecture at a Glance

```
Browser (User) → nself-admin (Next.js) → nself CLI → Docker → Services
                        ↓
                  LokiJS Database
```

---

## Core Principles

### 1. CLI Delegation Principle

**GOLDEN RULE**: Never reimplement nself CLI logic in nself-admin.

**Examples:**

```typescript
// ✅ CORRECT: Delegate to CLI
export async function POST() {
  const result = await execFile('nself', ['start'])
  return NextResponse.json({ output: result.stdout })
}

// ❌ WRONG: Reimplementing CLI logic
export async function POST() {
  const composeFile = readFileSync('docker-compose.yml')
  await execFile('docker-compose', ['up', '-d'])
  // This reimplements nself's logic!
}
```

### 2. Progressive Disclosure

Guide users through a logical flow:

1. **Password Setup** - First-time security
2. **Project Initialization** - 6-step wizard
3. **Service Build** - Configuration and build
4. **Service Start** - Launch containers
5. **Dashboard** - Monitor and manage

### 3. Separation of Concerns

- **Frontend**: React components, UI state
- **API Routes**: Business logic, CLI execution
- **Database**: Sessions, cache, audit logs
- **CLI Executor**: Isolated command execution
- **Services**: Background tasks (polling, WebSocket)

### 4. Fail-Safe Design

- **Graceful Degradation**: UI works without WebSocket
- **Error Boundaries**: Isolate component failures
- **Retry Logic**: Automatic retries with exponential backoff
- **Health Checks**: Monitor all critical services

---

## Technology Stack

### Frontend

| Technology       | Version | Purpose                      |
| ---------------- | ------- | ---------------------------- |
| Next.js          | 16.x    | React framework (App Router) |
| React            | 19.x    | UI library                   |
| TypeScript       | 5.9     | Type safety                  |
| Tailwind CSS     | 4.x     | Styling                      |
| Radix UI         | Latest  | Headless components          |
| Zustand          | 5.x     | Global state                 |
| SWR              | 2.x     | Data fetching                |
| Socket.io Client | 4.8     | WebSocket                    |
| Monaco Editor    | 4.x     | Code editor                  |
| Recharts         | 3.x     | Charts                       |

### Backend

| Technology | Version | Purpose           |
| ---------- | ------- | ----------------- |
| Node.js    | 18+     | Runtime           |
| LokiJS     | 1.5     | Embedded database |
| bcryptjs   | 3.x     | Password hashing  |
| Socket.io  | 4.8     | WebSocket server  |
| Dockerode  | 4.x     | Docker API        |
| Zod        | 4.x     | Validation        |

### Development

| Technology | Version | Purpose         |
| ---------- | ------- | --------------- |
| Jest       | 30.x    | Unit testing    |
| Playwright | 1.55    | E2E testing     |
| ESLint     | 9.x     | Linting         |
| Prettier   | 3.x     | Formatting      |
| pnpm       | 10.x    | Package manager |

---

## Architecture Diagrams

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Machine                          │
│                                                                 │
│  ┌──────────┐                                                  │
│  │  Browser │                                                  │
│  └────┬─────┘                                                  │
│       │ HTTP/WebSocket (Port 3021)                            │
│       ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              nself-admin Docker Container               │  │
│  │                                                         │  │
│  │  ┌────────────┐      ┌──────────┐      ┌───────────┐  │  │
│  │  │  Next.js   │◄────►│ API      │◄────►│  LokiJS   │  │  │
│  │  │  Frontend  │      │ Routes   │      │  Database │  │  │
│  │  └────────────┘      └────┬─────┘      └───────────┘  │  │
│  │                           │                            │  │
│  │                           ▼                            │  │
│  │                    ┌──────────────┐                    │  │
│  │                    │ nself CLI    │                    │  │
│  │                    │ Executor     │                    │  │
│  │                    └──────┬───────┘                    │  │
│  └───────────────────────────┼────────────────────────────┘  │
│                              │                               │
│         ┌────────────────────┼────────────────────┐          │
│         │                    ▼                    │          │
│    ┌────▼─────┐      ┌──────────────┐      ┌────▼──────┐   │
│    │  Docker  │      │   Project    │      │  Docker   │   │
│    │  Socket  │      │  Directory   │      │ Compose   │   │
│    └──────────┘      │  (/workspace)│      └───────────┘   │
│                      └──────────────┘                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Running Containers                     │  │
│  │  PostgreSQL │ Hasura │ Auth │ MinIO │ Redis ...     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

```
┌────────┐
│ User   │
└───┬────┘
    │
    │ 1. Click "Start Services"
    ▼
┌───────────────┐
│ React         │
│ Component     │
└───┬───────────┘
    │
    │ 2. Call API
    ▼
┌───────────────┐
│ API Route     │
│ /api/services │
│ /start        │
└───┬───────────┘
    │
    │ 3. Validate session
    ▼
┌───────────────┐
│ Auth Check    │
└───┬───────────┘
    │
    │ 4. Execute CLI
    ▼
┌───────────────┐
│ nself CLI     │
│ Executor      │
└───┬───────────┘
    │
    │ 5. Run command
    ▼
┌───────────────┐
│ execFile()    │
│ nself start   │
└───┬───────────┘
    │
    │ 6. Docker operations
    ▼
┌───────────────┐
│ Docker Engine │
└───┬───────────┘
    │
    │ 7. Start containers
    ▼
┌───────────────┐
│ Services      │
│ Running       │
└───────────────┘
```

---

## Directory Structure

### Project Root

```
nself-admin/
├── .claude/                   # Development instructions
│   └── CLAUDE.md             # Project guidelines
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md       # This file
│   ├── API.md                # API reference
│   ├── DEPLOYMENT.md         # Deployment guide
│   ├── DEVELOPMENT.md        # Development guide
│   ├── MIGRATION.md          # Migration guides
│   └── CHANGELOG.md          # Release notes
├── public/                   # Static assets
├── scripts/                  # Build/deployment scripts
├── src/                      # Source code
│   ├── app/                  # Next.js App Router
│   ├── components/           # React components
│   ├── contexts/             # React contexts
│   ├── hooks/                # Custom hooks
│   ├── lib/                  # Utilities
│   └── services/             # Background services
├── tests/                    # Test files
├── .env.example              # Example environment
├── Dockerfile                # Container definition
├── docker-compose.yml        # Local development
├── jest.config.js            # Jest configuration
├── next.config.mjs           # Next.js configuration
├── package.json              # Dependencies
├── pnpm-lock.yaml            # Lock file
├── tailwind.config.ts        # Tailwind configuration
└── tsconfig.json             # TypeScript configuration
```

### Source Code (`src/`)

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes (120+ endpoints)
│   │   ├── auth/            # Authentication (5 endpoints)
│   │   ├── config/          # Configuration (8 endpoints)
│   │   ├── database/        # Database (18 endpoints)
│   │   ├── deploy/          # Deployment (10 endpoints)
│   │   ├── docker/          # Docker (15 endpoints)
│   │   ├── services/        # Services (12 endpoints)
│   │   ├── cloud/           # Cloud providers (15 endpoints)
│   │   ├── k8s/             # Kubernetes (12 endpoints)
│   │   ├── monitor/         # Monitoring (8 endpoints)
│   │   ├── plugins/         # Plugins (10 endpoints)
│   │   └── system/          # System (7 endpoints)
│   ├── login/               # Login page
│   ├── build/               # Build wizard
│   ├── config/              # Configuration pages
│   ├── database/            # Database pages
│   ├── services/            # Service management
│   ├── deployment/          # Deployment pages
│   ├── cloud/               # Cloud provider pages
│   ├── plugins/             # Plugin pages
│   ├── monitor/             # Monitoring pages
│   ├── settings/            # Settings pages
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Dashboard
├── components/              # React components (60+)
│   ├── ui/                  # Base components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── build/               # Build wizard components
│   ├── config/              # Config components
│   ├── database/            # Database components
│   ├── services/            # Service components
│   ├── skeletons/           # Loading states
│   ├── Header.tsx           # Top navigation
│   ├── Layout.tsx           # Main layout
│   └── Navigation.tsx       # Sidebar
├── contexts/                # React contexts
│   └── AuthContext.tsx      # Auth state
├── hooks/                   # Custom hooks
│   ├── useDashboardData.ts  # Dashboard data
│   ├── useServiceStatus.ts  # Service status
│   ├── useSession.ts        # Session management
│   └── useWebSocket.ts      # WebSocket connection
├── lib/                     # Utilities
│   ├── api-client.ts        # API client
│   ├── auth-db.ts           # Auth database
│   ├── database.ts          # LokiJS interface
│   ├── nselfCLI.ts          # CLI executor
│   ├── validation.ts        # Zod schemas
│   └── utils.ts             # Utilities
└── services/                # Background services
    └── SimplifiedPolling.ts # Polling service
```

---

## Component Hierarchy

### Layout Components

```
<Layout>
  ├── <Header>
  │   ├── <Logo>
  │   ├── <ThemeToggle>
  │   └── <UserMenu>
  ├── <Navigation>
  │   └── <NavItem> × N
  ├── <PageContent>
  │   └── [Page Component]
  └── <Footer>
```

### Page Components

```
<DashboardPage>
  ├── <PageHeader>
  ├── <ServiceGrid>
  │   └── <ServiceCard> × N
  │       ├── <ServiceStatus>
  │       ├── <ServiceMetrics>
  │       └── <ServiceActions>
  ├── <MetricsSection>
  │   └── <MetricCard> × N
  └── <ActivityFeed>
      └── <ActivityItem> × N
```

### Form Components

```
<ConfigForm>
  ├── <FormSection>
  │   ├── <FormField>
  │   │   ├── <Label>
  │   │   ├── <Input>
  │   │   └── <ErrorMessage>
  │   └── <FormField> × N
  └── <FormActions>
      ├── <Button type="submit">
      └── <Button type="reset">
```

---

## Data Flow

### 1. Authentication Flow

```
User → Login Page → API Route → Database
  ↓                      ↓           ↓
Password              Validate    Check hash
  ↓                      ↓           ↓
Submit ────────────→ Create ──────→ Store
                     Session       Session
                        ↓
                   Set Cookie
                        ↓
                   Redirect
                        ↓
                   Dashboard
```

### 2. Service Management Flow

```
Dashboard → Click "Start" → API Route → CLI Executor
    ↓                          ↓             ↓
Service Card              Auth Check    nself start
    ↓                          ↓             ↓
Loading State             Execute       Docker Compose
    ↓                          ↓             ↓
WebSocket Update          Stream         Start Containers
    ↓                      Output            ↓
Update UI ◄───────────────────────────────────┘
```

### 3. Real-Time Update Flow

```
Container State Change
        ↓
Docker Event
        ↓
WebSocket Server
        ↓
Broadcast to Clients
        ↓
WebSocket Hook (useWebSocket)
        ↓
Update Zustand Store
        ↓
Re-render Components
```

---

## State Management

### Global State (Zustand)

```typescript
// Service Status Store
interface ServiceStore {
  services: Service[]
  setServices: (services: Service[]) => void
  updateService: (name: string, updates: Partial<Service>) => void
}

// Auth Store
interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (password: string) => Promise<void>
  logout: () => void
}

// UI Store
interface UIStore {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}
```

### Server State (SWR)

```typescript
// Data fetching with automatic caching
const { data, error, mutate } = useSWR('/api/services/status', fetcher, {
  refreshInterval: 5000, // Poll every 5 seconds
  revalidateOnFocus: true,
  dedupingInterval: 2000,
})
```

### Local State (React)

```typescript
// Component-specific state
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

### Form State (React Hook Form)

```typescript
const form = useForm<ConfigFormData>({
  resolver: zodResolver(configSchema),
  defaultValues: { ... },
})
```

---

## API Design

### Standard Response Format

**Success:**

```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**

```json
{
  "success": false,
  "error": "User-friendly message",
  "details": "Technical details (dev mode only)"
}
```

### Authentication

All API routes (except `/api/health` and `/api/auth/login`) require authentication.

**Session Token:**

- Stored in httpOnly cookie
- 7-day expiration
- Auto-renewed on activity

**Validation:**

```typescript
export async function GET(request: Request) {
  const session = await validateSession(request)
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }
  // ...
}
```

### Rate Limiting

**Default limits:**

- Authentication: 5 requests / 15 minutes
- General API: 100 requests / 15 minutes
- WebSocket: Unlimited (connection-based)

### Error Handling

**Standard pattern:**

```typescript
export async function POST(request: Request) {
  try {
    // Validate session
    const session = await validateSession(request)
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      )
    }

    // Validate input
    const body = await request.json()
    const validated = schema.parse(body)

    // Execute operation
    const result = await performOperation(validated)

    // Return success
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    // Log error
    console.error('Operation failed:', error)

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: 'Operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
```

---

## Real-Time Architecture

### WebSocket (Socket.io)

**Server-side:**

```typescript
// src/lib/websocket/server.ts
const io = new Server(httpServer, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Subscribe to service updates
  socket.on('subscribe:services', () => {
    socket.join('services')
  })

  // Broadcast service updates
  const broadcastUpdate = (service: Service) => {
    io.to('services').emit('service:update', service)
  }
})
```

**Client-side:**

```typescript
// src/hooks/useWebSocket.ts
export function useWebSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const newSocket = io('http://localhost:3021')

    newSocket.on('connect', () => {
      console.log('WebSocket connected')
      newSocket.emit('subscribe:services')
    })

    newSocket.on('service:update', (service) => {
      updateServiceStore(service)
    })

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [])

  return socket
}
```

### Server-Sent Events (SSE)

For long-running operations (build, deploy):

```typescript
// API route
export async function GET(request: Request) {
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  // Start operation
  execFile('nself', ['build'], {
    // Stream output
    onStdout: (data) => {
      writer.write(new TextEncoder().encode(`data: ${data}\n\n`))
    },
  })

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
```

---

## Security Model

### 1. Authentication

**Password Security:**

- bcrypt hashing (10 rounds)
- Minimum requirements (dev: 3 chars, prod: 12+ chars)
- Stored in LokiJS database (never in env vars)

**Session Management:**

- Secure httpOnly cookies
- 7-day expiration
- CSRF protection
- Auto-renewal on activity

### 2. Authorization

**Environment-Based Access:**

- Dev: Access to local and dev environments
- Sr Dev: Access to local, dev, staging
- Lead Dev: Access to all environments including prod and secrets

**API Protection:**

- All routes require valid session (except health/login)
- Rate limiting on sensitive endpoints
- Audit logging of all actions

### 3. Input Validation

**Zod Schemas:**

```typescript
const configSchema = z.object({
  projectName: z.string().min(3).max(50),
  port: z.number().min(1000).max(65535),
  enableSSL: z.boolean(),
})
```

**Command Injection Prevention:**

```typescript
// ✅ SAFE: execFile with array arguments
execFile('nself', ['start', serviceName])

// ❌ UNSAFE: exec with string interpolation
exec(`nself start ${serviceName}`) // Vulnerable!
```

### 4. Data Protection

- Secrets encrypted in database
- Environment variables validated
- Sensitive data masked in logs
- Audit trail for all changes

---

## Performance Optimizations

### 1. Code Splitting

**Route-based splitting:**

```typescript
// Automatic with Next.js App Router
// Each page is a separate bundle
```

**Component splitting:**

```typescript
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <CodeEditorSkeleton />,
})
```

### 2. Caching

**SWR caching:**

```typescript
const { data } = useSWR('/api/services', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 5000,
})
```

**API response caching:**

```typescript
export const revalidate = 30 // Cache for 30 seconds
```

### 3. Virtual Scrolling

For large lists:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
})
```

### 4. Image Optimization

```typescript
import Image from 'next/image'

<Image
  src="/logo.png"
  width={200}
  height={50}
  alt="Logo"
  priority
/>
```

### 5. Memoization

```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data)
}, [data])

const memoizedCallback = useCallback(() => {
  doSomething(value)
}, [value])
```

---

## Database Schema

### LokiJS Collections

**config:**

```typescript
{
  key: string // Unique key
  value: any // Value (JSON)
  updatedAt: number // Timestamp
}
```

**sessions:**

```typescript
{
  token: string // Session token
  userId: string // User ID (always 'admin' for now)
  expiresAt: number // Expiration timestamp
  ip: string // Client IP
  userAgent: string // User agent
  createdAt: number
}
```

**audit_log:**

```typescript
{
  action: string // Action type
  userId: string // Who performed it
  timestamp: number
  success: boolean
  details: any // Action-specific data
  ip: string
}
```

**project_cache:**

```typescript
{
  key: string // Cache key
  value: any // Cached data
  cachedAt: number // When cached
  ttl: number // Time to live (ms)
}
```

---

## Deployment Architecture

### Docker Container

**Base image:** `node:18-alpine`

**Ports:**

- 3021: Web UI

**Volumes:**

- `/workspace`: User's project (read-write)
- `/var/run/docker.sock`: Docker socket (read-write)
- `/app/data`: nAdmin database (persistent)

**Environment:**

- `NSELF_PROJECT_PATH=/workspace`
- `NODE_ENV=production`
- `PORT=3021`

### Production Setup

```
Internet
    ↓
[Reverse Proxy: Nginx/Caddy]
    ↓ HTTPS (443)
[nself-admin Container]
    ↓
[Docker Socket] → [Services]
    ↓
[Project Directory]
```

### High Availability (Future)

```
        ┌─────────────────┐
        │ Load Balancer   │
        └────┬────────┬───┘
             │        │
      ┌──────▼──┐  ┌─▼────────┐
      │ nAdmin  │  │ nAdmin   │
      │ Instance│  │ Instance │
      │    1    │  │    2     │
      └──┬──────┘  └────┬─────┘
         │              │
         └──────┬───────┘
                │
         ┌──────▼──────┐
         │   Shared    │
         │   Session   │
         │   Storage   │
         └─────────────┘
```

---

## Performance Metrics

### Target Metrics (v0.5.0)

- **Initial Load**: < 1.5s
- **Time to Interactive**: < 2s
- **API Response**: < 100ms (average)
- **Real-Time Latency**: < 50ms
- **Lighthouse Score**: 95+

### Monitoring

```typescript
// Custom performance monitoring
performance.mark('api-call-start')
await apiCall()
performance.mark('api-call-end')
performance.measure('api-call', 'api-call-start', 'api-call-end')
```

---

## Future Architecture Improvements

### v0.6.0 Planned

- **Multi-User Support**: User roles, permissions
- **Distributed Sessions**: Redis-backed sessions
- **Horizontal Scaling**: Multiple instances
- **Advanced Caching**: Redis cache layer
- **Metrics Export**: Prometheus metrics
- **Plugin System**: Extensible architecture

---

## Additional Resources

- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Development Guide](DEVELOPMENT.md)
- [nself CLI Documentation](https://github.com/nself-org/cli)

---

**Questions?** Open an issue on [GitHub](https://github.com/nself-org/admin/issues).
