# API Reference

Complete API documentation for nself-admin v0.5.0.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Endpoints](#endpoints)
5. [WebSocket Events](#websocket-events)
6. [Code Examples](#code-examples)

---

## Overview

The nself-admin API provides RESTful endpoints for managing your self-hosted backend stack.

**Base URL**: `http://localhost:3021/api`

**Content-Type**: `application/json`

**Authentication**: Session-based (httpOnly cookies)

---

## Authentication

### Session-Based Auth

All endpoints (except `/health` and `/auth/login`) require a valid session cookie.

**Login:**

```bash
POST /api/auth/login
{
  "password": "admin123"
}
```

**Response includes httpOnly cookie** with 7-day expiration.

---

## Response Format

### Success

```json
{
  "success": true,
  "data": { ... }
}
```

### Error

```json
{
  "success": false,
  "error": "User-friendly message",
  "details": "Technical details"
}
```

### HTTP Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Rate Limited
- `500` - Server Error

---

## Endpoints

### Authentication

**POST `/api/auth/login`** - Login

Request:

```json
{ "password": "admin123" }
```

**POST `/api/auth/logout`** - Logout

**GET `/api/auth/check`** - Validate session

**POST `/api/auth/password`** - Change password

---

### Services

**GET `/api/services/status`** - Get all service status

Response:

```json
{
  "success": true,
  "data": {
    "services": [
      {
        "name": "postgres",
        "status": "running",
        "uptime": 3600,
        "cpu": 2.5,
        "memory": 128.5
      }
    ]
  }
}
```

**POST `/api/services/start`** - Start services

Request:

```json
{ "services": ["postgres", "hasura"] }
```

**POST `/api/services/stop`** - Stop services

**POST `/api/services/restart`** - Restart service

Request:

```json
{ "service": "postgres" }
```

**GET `/api/services/:name/logs`** - Get service logs

Query params: `tail`, `since`, `follow`

---

### Database

**GET `/api/database/status`** - Database connection info

**POST `/api/database/query`** - Execute SQL

Request:

```json
{
  "query": "SELECT * FROM users LIMIT 10",
  "params": []
}
```

**GET `/api/database/schema`** - Get database schema

**POST `/api/database/backup`** - Create backup

Request:

```json
{
  "name": "backup-2024-01-31",
  "compress": true
}
```

**POST `/api/database/restore`** - Restore backup

Request:

```json
{ "filename": "backup-2024-01-31.sql.gz" }
```

**GET `/api/database/backup`** - List backups

**POST `/api/database/migrations`** - Run migrations

Request:

```json
{ "action": "up" }
```

---

### Docker

**GET `/api/docker/status`** - Docker daemon status

**GET `/api/docker/containers`** - List containers

**POST `/api/docker/exec`** - Execute in container

Request:

```json
{
  "container": "postgres",
  "command": ["psql", "-c", "SELECT 1"]
}
```

**GET `/api/docker/logs`** - Container logs

---

### Configuration

**GET `/api/config/env`** - Get environment variables

Query: `?environment=dev`

**POST `/api/config/env`** - Update environment

Request:

```json
{
  "environment": "dev",
  "variables": {
    "PROJECT_NAME": "myapp"
  }
}
```

**POST `/api/config/build`** - Build project (`nself build`)

**GET `/api/config/ssl`** - SSL certificate status

**POST `/api/config/ssl/generate-local`** - Generate local SSL (mkcert)

---

### Deployment

**POST `/api/deploy/staging`** - Deploy to staging

Request:

```json
{ "strategy": "rolling" }
```

**POST `/api/deploy/production`** - Deploy to production

Request:

```json
{
  "strategy": "blue-green",
  "confirm": true
}
```

**GET `/api/deploy/status/:id`** - Deployment status

**POST `/api/deploy/rollback`** - Rollback deployment

---

### Cloud

**GET `/api/cloud/providers`** - List cloud providers

**POST `/api/cloud/aws/deploy`** - Deploy to AWS

**POST `/api/cloud/gcp/deploy`** - Deploy to GCP

**POST `/api/cloud/digitalocean/deploy`** - Deploy to DigitalOcean

---

### Kubernetes

**GET `/api/k8s/clusters`** - List clusters

**GET `/api/k8s/namespaces`** - List namespaces

**GET `/api/k8s/pods`** - List pods

Query: `?namespace=default`

**POST `/api/k8s/apply`** - Apply manifest

---

### Monitoring

**GET `/api/monitor/metrics`** - System metrics

Response:

```json
{
  "success": true,
  "data": {
    "cpu": 45.2,
    "memory": {
      "used": 4096,
      "total": 8192,
      "percent": 50
    }
  }
}
```

**GET `/api/monitor/prometheus/query`** - Query Prometheus

Query: `?query=cpu_usage`

**GET `/api/monitor/loki/query`** - Query Loki logs

Query: `?query={service="postgres"}&start=...&end=...`

**GET `/api/monitor/alerts`** - List alerts

**POST `/api/monitor/alerts/rules`** - Create alert rule

---

### Plugins

**GET `/api/plugins`** - List plugins

**POST `/api/plugins/install`** - Install plugin

Request:

```json
{
  "plugin": "stripe",
  "config": { "apiKey": "sk_test_..." }
}
```

**GET `/api/plugins/stripe/revenue`** - Stripe revenue metrics

**GET `/api/plugins/github/repos`** - GitHub repositories

---

### System

**GET `/api/health`** - Health check (no auth)

Response:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-31T12:00:00Z",
  "version": "0.5.0",
  "checks": {
    "docker": true,
    "filesystem": true,
    "database": true,
    "cli": true
  }
}
```

**GET `/api/system/resources`** - System resources

**GET `/api/system/audit`** - Audit logs

Query: `?limit=100&offset=0&action=service_start`

---

## WebSocket Events

### Connect

```javascript
import { io } from 'socket.io-client'
const socket = io('http://localhost:3021')
```

### Events to Emit (Client → Server)

**subscribe:services** - Subscribe to service updates

```javascript
socket.emit('subscribe:services')
```

**subscribe:logs** - Subscribe to logs

```javascript
socket.emit('subscribe:logs', { service: 'postgres' })
```

**unsubscribe:services** - Unsubscribe

```javascript
socket.emit('unsubscribe:services')
```

### Events to Listen (Server → Client)

**service:update** - Service status changed

```javascript
socket.on('service:update', (data) => {
  // {
  //   service: 'postgres',
  //   status: 'running',
  //   uptime: 3600
  // }
})
```

**log:line** - New log line

```javascript
socket.on('log:line', (data) => {
  // {
  //   service: 'postgres',
  //   line: '2024-01-31 12:00:00 [INFO] Started'
  // }
})
```

**container:start** - Container started

```javascript
socket.on('container:start', (data) => {
  // { name: 'postgres', id: 'abc123' }
})
```

**container:stop** - Container stopped

```javascript
socket.on('container:stop', (data) => {
  // { name: 'postgres', id: 'abc123' }
})
```

**deployment:progress** - Deployment progress

```javascript
socket.on('deployment:progress', (data) => {
  // {
  //   deploymentId: 'deploy-123',
  //   progress: 75,
  //   message: 'Building containers...'
  // }
})
```

---

## Server-Sent Events (SSE)

For long-running operations:

**GET `/api/sse/stream?operation=build`**

Response stream:

```
data: {"type":"progress","message":"Starting build..."}

data: {"type":"progress","message":"Installing dependencies..."}

data: {"type":"complete","success":true}
```

Usage:

```javascript
const eventSource = new EventSource('/api/sse/stream?operation=build')

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log(data)
}

eventSource.onerror = () => {
  eventSource.close()
}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important!
  body: JSON.stringify({ password: 'admin123' }),
})
const data = await response.json()

// Start services
const startResponse = await fetch('/api/services/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ services: ['postgres'] }),
})

// WebSocket
import { io } from 'socket.io-client'
const socket = io('http://localhost:3021')

socket.on('connect', () => {
  socket.emit('subscribe:services')
})

socket.on('service:update', (data) => {
  console.log('Service updated:', data)
})
```

### Python

```python
import requests

session = requests.Session()

# Login
response = session.post('http://localhost:3021/api/auth/login', json={
    'password': 'admin123'
})

# Start services
response = session.post('http://localhost:3021/api/services/start', json={
    'services': ['postgres']
})
print(response.json())
```

### curl

```bash
# Login
curl -X POST http://localhost:3021/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"admin123"}' \
  -c cookies.txt

# Start services
curl -X POST http://localhost:3021/api/services/start \
  -H "Content-Type: application/json" \
  -d '{"services":["postgres"]}' \
  -b cookies.txt
```

---

## Rate Limiting

- **Authentication**: 5 requests / 15 minutes
- **General API**: 100 requests / 15 minutes
- **WebSocket**: Unlimited (connection-based)

Rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

---

## Additional Resources

- [Development Guide](DEVELOPMENT.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Architecture Documentation](ARCHITECTURE.md)

---

**Questions?** Open an issue on [GitHub](https://github.com/nself-org/admin/issues).
