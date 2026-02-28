# System Architecture Overview

## Introduction

nAdmin is a containerized web application designed to manage nself backend projects. It provides a clean separation between the admin interface and the projects it manages, ensuring zero footprint on user projects while maintaining full control capabilities.

## Core Architecture Principles

### 1. Container-First Design

- **Isolation**: Runs in its own Docker container
- **Portability**: Works on any system with Docker
- **Consistency**: Same behavior across environments
- **Security**: Sandboxed from host system

### 2. Zero Footprint

- Never writes configuration files to user projects
- All state maintained in internal database
- Project modifications only through explicit user actions
- Clean uninstall leaves no traces

### 3. Progressive Disclosure

- Guides users through setup → build → start → manage
- Context-aware UI shows only relevant options
- Smart defaults with override capabilities
- Learning curve matches user expertise

## System Components

### Frontend (Next.js 15)

```
src/app/
├── page.tsx              # Dashboard
├── login/               # Authentication
├── build/               # Project setup wizard
├── start/               # Service starter
├── services/            # Service management
├── database/            # Database tools
└── api/                 # API routes
```

**Key Technologies:**

- Next.js 15 with App Router
- React 18 with Server Components
- TypeScript for type safety
- Tailwind CSS for styling
- Framer Motion for animations

### Backend (Node.js)

```
src/lib/
├── database.ts          # LokiJS interface
├── auth-db.ts          # Authentication logic
├── project-utils.ts    # Project management
└── docker.ts           # Docker operations
```

**Key Features:**

- RESTful API design
- Session-based authentication
- Real-time Docker monitoring
- Streaming responses for long operations

### Database (LokiJS)

```javascript
{
  config: Collection<ConfigItem>,
  sessions: Collection<SessionItem>,
  projectCache: Collection<ProjectCacheItem>,
  auditLog: Collection<AuditLogItem>
}
```

**Benefits:**

- In-memory performance
- Automatic persistence
- TTL support for sessions
- No external dependencies

## Data Flow

### 1. Authentication Flow

```
Browser → Login Request → API Route → Database
         ← Session Token ← Create Session ←
```

### 2. Project Management Flow

```
Browser → Action Request → API Route → Docker/nself CLI
         ← Status Update ← Process Output ←
```

### 3. Monitoring Flow

```
Docker → Metrics Collection → Cache → API Route → Browser
       ← Poll Every 5s ←
```

## Deployment Architecture

### Development Mode

```
Developer Machine
├── nself-admin/         # This repository
│   ├── npm run dev     # Direct execution
│   └── data/nadmin.db  # Local database
└── nself/              # Test project (sibling)
```

### Production Mode

```
Docker Host
└── Container: nself-admin
    ├── /app            # Application code
    ├── /app/data       # Database storage
    └── /workspace      # Mounted user project
```

## Security Architecture

### Authentication Layers

1. **Password Setup**: First-run configuration
2. **Session Management**: 24-hour TTL tokens
3. **CSRF Protection**: Token validation
4. **Rate Limiting**: Brute force prevention

### Data Protection

- Passwords hashed with bcrypt (12 rounds)
- Sessions stored server-side only
- HttpOnly cookies prevent XSS
- SameSite cookies prevent CSRF

## Scalability Considerations

### Current Limitations

- Single admin user
- Local database storage
- Synchronous operations
- Single project management

### Future Enhancements

- Multi-user support with roles
- Distributed database (Redis)
- Async job queues (BullMQ)
- Multi-project dashboard

## Network Architecture

### Port Configuration

```
Default: 3021
Fallback: 3022-3030 (auto-increment)
```

### API Endpoints

```
/api/auth/*      # Authentication
/api/project/*   # Project management
/api/services/*  # Service control
/api/database/*  # Database operations
/api/system/*    # System monitoring
```

## Error Handling

### Graceful Degradation

- Cached data on API failures
- Retry logic for Docker operations
- User-friendly error messages
- Automatic recovery attempts

### Logging Strategy

- Audit log for security events
- Error log for debugging
- Metrics log for performance
- User activity tracking

## Performance Optimization

### Frontend

- Server-side rendering for initial load
- Client-side navigation after hydration
- Code splitting by route
- Image optimization

### Backend

- Database queries cached for 5 minutes
- Docker stats polled efficiently
- Streaming responses for large data
- Connection pooling for Docker API

## Monitoring & Observability

### Health Checks

- `/api/health` - Application health
- Database connectivity check
- Docker daemon availability
- Project path accessibility

### Metrics Collection

- CPU and memory usage
- Container statistics
- API response times
- Active session count

## Integration Points

### nself CLI

```bash
nself init    # Initialize project
nself build   # Build containers
nself start   # Start services
nself stop    # Stop services
```

### Docker API

- Container management
- Image operations
- Network configuration
- Volume management

### File System

- Project detection
- Configuration reading
- Log file access
- Backup operations
