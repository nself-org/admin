# Database Architecture

## Overview

nAdmin uses LokiJS as its embedded database, providing a lightweight, high-performance solution with no external dependencies. All application state is stored in a single file: `nadmin.db`.

## Why LokiJS?

### Chosen Over Alternatives

| Feature          | LokiJS | LowDB | SQLite | NeDB |
| ---------------- | ------ | ----- | ------ | ---- |
| **Size**         | 19KB   | 10KB  | 400KB+ | 50KB |
| **In-Memory**    | ✅     | ❌    | ❌     | ✅   |
| **Persistence**  | ✅     | ✅    | ✅     | ✅   |
| **Indexes**      | ✅     | ❌    | ✅     | ✅   |
| **TTL Support**  | ✅     | ❌    | ❌     | ❌   |
| **TypeScript**   | ✅     | ✅    | ✅     | ❌   |
| **Transactions** | ✅     | ❌    | ✅     | ❌   |

### Key Benefits

1. **In-Memory Performance**: Entire database loaded in memory for instant queries
2. **Automatic Persistence**: Changes saved to disk every 4 seconds
3. **TTL Support**: Built-in expiration for sessions and cache
4. **Zero Configuration**: No setup or installation required
5. **Embedded**: Runs inside the Node.js process

## Database Schema

### Collections

nAdmin uses four main collections:

#### 1. Config Collection

Stores application configuration and settings.

```typescript
interface ConfigItem {
  key: string // Unique identifier
  value: any // Configuration value
  updatedAt: Date // Last update timestamp
  updatedBy?: string // User who made the change
}
```

**Example Records**:

```javascript
{
  key: "admin_password_hash",
  value: "$2b$12$...",
  updatedAt: "2024-01-20T10:00:00Z"
}
{
  key: "setup_completed",
  value: true,
  updatedAt: "2024-01-20T10:05:00Z"
}
```

#### 2. Sessions Collection

Manages user authentication sessions with automatic expiration.

```typescript
interface SessionItem {
  token: string // Unique session token
  userId: string // User identifier (currently always 'admin')
  expiresAt: Date // Session expiration (24 hours)
  createdAt: Date // Creation timestamp
  ip?: string // Client IP address
  userAgent?: string // Browser user agent
}
```

**TTL Configuration**: Sessions automatically expire after 24 hours

**Example Record**:

```javascript
{
  token: "a3f2d8c9b1e4...",
  userId: "admin",
  expiresAt: "2024-01-21T10:00:00Z",
  createdAt: "2024-01-20T10:00:00Z",
  ip: "192.168.1.100",
  userAgent: "Mozilla/5.0..."
}
```

#### 3. Project Cache Collection

Caches project information to reduce file system operations.

```typescript
interface ProjectCacheItem {
  key: string // Cache key
  value: any // Cached data
  cachedAt: Date // Cache timestamp
  expiresAt: Date // Cache expiration (5 minutes)
}
```

**TTL Configuration**: Cache entries expire after 5 minutes

**Common Cache Keys**:

- `project_info` - Basic project information
- `services_list` - Available services
- `docker_status` - Container statuses
- `env_config` - Environment variables

#### 4. Audit Log Collection

Tracks security events and user actions for compliance.

```typescript
interface AuditLogItem {
  action: string // Action type
  timestamp: Date // When it occurred
  userId?: string // User who performed action
  details?: any // Additional context
  success: boolean // Whether action succeeded
  ip?: string // Client IP address
}
```

**TTL Configuration**: Logs retained for 30 days

**Common Actions**:

- `login_attempt` - Authentication attempt
- `login_success` - Successful login
- `password_change` - Password modification
- `service_start` - Service started
- `service_stop` - Service stopped
- `config_update` - Configuration changed

## Database Operations

### Initialization

```typescript
// src/lib/database.ts
export async function initDatabase(): Promise<void> {
  db = new Loki(DB_PATH, {
    autoload: true,
    autosave: true,
    autosaveInterval: 4000,
    persistenceMethod: 'fs',
    autoloadCallback: () => {
      // Initialize collections
      setupCollections()
      // Configure TTL
      configureTTL()
    },
  })
}
```

### Collection Setup

```typescript
function setupCollections() {
  // Config collection with unique index
  config =
    db.getCollection('config') ||
    db.addCollection('config', {
      unique: ['key'],
      indices: ['key'],
    })

  // Sessions with TTL
  sessions =
    db.getCollection('sessions') ||
    db.addCollection('sessions', {
      unique: ['token'],
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      ttlInterval: 60000, // Check every minute
    })

  // Project cache with TTL
  projectCache =
    db.getCollection('project_cache') ||
    db.addCollection('project_cache', {
      unique: ['key'],
      ttl: 5 * 60 * 1000, // 5 minutes
      ttlInterval: 30000, // Check every 30 seconds
    })

  // Audit log with TTL
  auditLog =
    db.getCollection('audit_log') ||
    db.addCollection('audit_log', {
      ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
      ttlInterval: 3600000, // Check every hour
    })
}
```

### Common Queries

#### Authentication

```typescript
// Check if admin password exists
export function hasAdminPassword(): boolean {
  const config = db.getCollection('config')
  const record = config.findOne({ key: 'admin_password_hash' })
  return !!record
}

// Get password hash
export async function getAdminPasswordHash(): Promise<string | null> {
  const config = db.getCollection('config')
  const record = config.findOne({ key: 'admin_password_hash' })
  return record?.value || null
}
```

#### Session Management

```typescript
// Create session
export async function createSession(
  userId: string,
  ip?: string,
  userAgent?: string,
): Promise<string> {
  const sessions = db.getCollection('sessions')
  const token = crypto.randomBytes(32).toString('hex')

  sessions.insert({
    token,
    userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    ip,
    userAgent,
  })

  return token
}

// Validate session
export async function getSession(token: string): Promise<SessionItem | null> {
  const sessions = db.getCollection('sessions')
  const session = sessions.findOne({ token })

  if (!session) return null
  if (new Date(session.expiresAt) < new Date()) {
    sessions.remove(session)
    return null
  }

  return session
}
```

#### Caching

```typescript
// Set cache
export async function setCacheValue(key: string, value: any): Promise<void> {
  const cache = db.getCollection('project_cache')
  const existing = cache.findOne({ key })

  const data = {
    key,
    value,
    cachedAt: new Date(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  }

  if (existing) {
    Object.assign(existing, data)
    cache.update(existing)
  } else {
    cache.insert(data)
  }
}

// Get cache
export async function getCacheValue(key: string): Promise<any> {
  const cache = db.getCollection('project_cache')
  const record = cache.findOne({ key })

  if (!record) return null
  if (new Date(record.expiresAt) < new Date()) {
    cache.remove(record)
    return null
  }

  return record.value
}
```

## File Storage

### Location

- **Development**: `./data/nadmin.db` (relative to application root)
- **Production**: `/app/data/nadmin.db` (inside Docker container)
- **Docker Volume**: Mounted at `/app/data` for persistence

### File Format

LokiJS stores data as JSON with additional metadata:

```json
{
  "filename": "nadmin.db",
  "collections": [
    {
      "name": "config",
      "data": [...],
      "idIndex": [...],
      "binaryIndices": {},
      "constraints": null,
      "uniqueNames": ["key"],
      "transforms": {},
      "objType": "config",
      "dirty": false,
      "cachedIndex": null,
      "cachedBinaryIndex": null,
      "ttl": null,
      "maxId": 5,
      "DynamicViews": []
    }
  ],
  "databaseVersion": 1.5,
  "engineVersion": 1.5,
  "autosave": true,
  "autosaveInterval": 4000,
  "autosaveHandle": null,
  "throttledSaves": true,
  "options": {
    "autoload": true,
    "autosave": true,
    "autosaveInterval": 4000,
    "serializationMethod": "normal",
    "destructureDelimiter": "$<\n"
  },
  "persistenceMethod": "fs",
  "persistenceAdapter": null
}
```

## Performance Characteristics

### Memory Usage

- **Base**: ~2MB for empty database
- **Per Session**: ~500 bytes
- **Per Config Item**: ~200 bytes
- **Per Cache Entry**: Variable (depends on cached data)
- **Per Audit Log**: ~300 bytes

### Query Performance

- **Indexed Queries**: O(log n) - microseconds
- **Full Scan**: O(n) - milliseconds for 10k records
- **Insert**: O(1) - microseconds
- **Update**: O(log n) - microseconds
- **Delete**: O(log n) - microseconds

### Persistence

- **Autosave**: Every 4 seconds
- **Write Time**: ~10ms for 1MB database
- **Load Time**: ~20ms for 1MB database

## Backup and Recovery

### Manual Backup

```bash
# Backup database file
docker exec nself-admin cat /app/data/nadmin.db > backup.db

# Restore from backup
docker exec -i nself-admin sh -c 'cat > /app/data/nadmin.db' < backup.db
```

### Automated Backup

```typescript
// src/lib/backup.ts
export async function backupDatabase(): Promise<Buffer> {
  const data = await fs.readFile(DB_PATH)
  return data
}

export async function restoreDatabase(data: Buffer): Promise<void> {
  await fs.writeFile(DB_PATH, data)
  await initDatabase() // Reload
}
```

## Migration Strategy

### Future Scaling

When scaling beyond single-user:

1. **Phase 1**: Keep LokiJS for config and cache
2. **Phase 2**: Move sessions to Redis
3. **Phase 3**: Move audit logs to PostgreSQL
4. **Phase 4**: Implement user management in PostgreSQL

### Migration Path

```typescript
// Future multi-database architecture
interface DatabaseAdapter {
  config: LokiJS // Application settings
  sessions: Redis // User sessions
  users: PostgreSQL // User accounts
  audit: PostgreSQL // Audit logs
  cache: Redis // Application cache
}
```

## Security Considerations

### Data Protection

1. **Passwords**: Hashed with bcrypt (12 rounds)
2. **Sessions**: Cryptographically random tokens
3. **File Permissions**: 600 (read/write owner only)
4. **No Encryption**: Database file is plaintext JSON

### Access Control

```bash
# Set proper permissions
chmod 600 /app/data/nadmin.db
chown node:node /app/data/nadmin.db
```

### Sensitive Data

Never store in database:

- Plain text passwords
- API keys (use environment variables)
- SSL certificates
- Private keys

## Monitoring

### Health Checks

```typescript
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const config = db.getCollection('config')
    config.count() // Test query
    return true
  } catch {
    return false
  }
}
```

### Metrics

```typescript
export async function getDatabaseMetrics() {
  return {
    collections: db.listCollections().length,
    configItems: db.getCollection('config').count(),
    activeSessions: db.getCollection('sessions').count(),
    cacheEntries: db.getCollection('project_cache').count(),
    auditLogs: db.getCollection('audit_log').count(),
    databaseSize: await fs.stat(DB_PATH).size,
  }
}
```

## Best Practices

1. **Regular Cleanup**: TTL automatically removes old data
2. **Index Usage**: Always query by indexed fields
3. **Batch Operations**: Use transactions for multiple updates
4. **Error Handling**: Always wrap database calls in try-catch
5. **Validation**: Validate data before insertion
6. **Monitoring**: Check database size regularly

## Troubleshooting

### Database Locked

```bash
# Remove lock file if exists
rm /app/data/nadmin.db.lock
```

### Corrupted Database

```bash
# Backup corrupted file
mv /app/data/nadmin.db /app/data/nadmin.db.corrupt

# Restart to create new database
docker restart nself-admin
```

### Performance Issues

1. Check database size: `ls -lh /app/data/nadmin.db`
2. Review TTL settings
3. Manually clean old records
4. Consider increasing autosave interval
