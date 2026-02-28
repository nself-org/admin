# API Reference

Complete API documentation for nself Admin, including all endpoints, authentication, and examples.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [API Endpoints](#api-endpoints)
  - [Auth](#auth)
  - [Project](#project)
  - [Services](#services)
  - [Docker](#docker)
  - [System](#system)
  - [Database](#database)
  - [Files](#files)
  - [Monitoring](#monitoring)

## Overview

nself Admin provides a RESTful API for managing your development stack. All API operations that the UI performs are available for programmatic access.

### Key Features

- **RESTful Design**: Standard HTTP methods and status codes
- **JSON Format**: All requests and responses use JSON
- **Token Authentication**: Secure JWT-based authentication
- **Real-time Updates**: WebSocket support for live data
- **Comprehensive Coverage**: Full access to all nAdmin features

## Authentication

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "password": "your-admin-password"
}
```

**Response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### Using the Token

Include the token in the Authorization header:

```http
GET /api/services
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Logout

```http
POST /api/auth/logout
Authorization: Bearer <token>
```

## Base URL

```
Development: http://localhost:3021/api
Production: https://your-domain.com/api
Docker: http://nself-admin:3021/api
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "meta": {
    "timestamp": "2024-01-12T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

## Error Handling

### HTTP Status Codes

| Code | Description       | Usage                    |
| ---- | ----------------- | ------------------------ |
| 200  | OK                | Successful GET/PUT       |
| 201  | Created           | Successful POST          |
| 204  | No Content        | Successful DELETE        |
| 400  | Bad Request       | Invalid parameters       |
| 401  | Unauthorized      | Missing/invalid token    |
| 403  | Forbidden         | Insufficient permissions |
| 404  | Not Found         | Resource not found       |
| 409  | Conflict          | Resource already exists  |
| 422  | Unprocessable     | Validation failed        |
| 429  | Too Many Requests | Rate limit exceeded      |
| 500  | Server Error      | Internal error           |
| 503  | Unavailable       | Service down             |

### Error Codes

```javascript
const ErrorCodes = {
  // Authentication
  AUTH_FAILED: 'Authentication failed',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',

  // Validation
  VALIDATION_ERROR: 'Validation failed',
  MISSING_FIELD: 'Required field missing',
  INVALID_FORMAT: 'Invalid format',

  // Resources
  NOT_FOUND: 'Resource not found',
  ALREADY_EXISTS: 'Resource already exists',

  // Operations
  OPERATION_FAILED: 'Operation failed',
  DEPENDENCY_ERROR: 'Dependency not met',

  // System
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service unavailable',
}
```

## Rate Limiting

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 98
X-RateLimit-Reset: 1642847400
```

**Default Limits:**

- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users
- WebSocket connections: 10 per IP

## API Endpoints

### Auth

#### Set Initial Password

```http
POST /api/auth/setup
Content-Type: application/json

{
  "password": "secure-password-123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Password set successfully"
}
```

#### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "password": "your-password"
}
```

#### Check Auth Status

```http
GET /api/auth/status
Authorization: Bearer <token>
```

**Response:**

```json
{
  "authenticated": true,
  "user": "admin",
  "expiresAt": "2024-01-13T10:30:00Z"
}
```

#### Change Password

```http
PUT /api/auth/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "old-password",
  "newPassword": "new-password"
}
```

### Project

#### Get Project Info

```http
GET /api/project/info
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "my_app",
    "environment": "development",
    "initialized": true,
    "built": true,
    "running": true,
    "path": "/workspace",
    "services": ["postgres", "hasura", "auth", "nginx", "redis", "api"]
  }
}
```

#### Initialize Project

```http
POST /api/project/init
Authorization: Bearer <token>
Content-Type: application/json

{
  "projectName": "my_app",
  "environment": "development",
  "domain": "localhost",
  "adminEmail": "admin@localhost",
  "databaseName": "myapp",
  "databasePassword": "secure-password"
}
```

#### Build Project

```http
POST /api/project/build
Authorization: Bearer <token>
```

**Response (Streaming):**

```
data: {"type":"log","message":"Starting build process..."}
data: {"type":"log","message":"Generating docker-compose.yml..."}
data: {"type":"log","message":"Creating service configurations..."}
data: {"type":"complete","success":true}
```

#### Start Services

```http
POST /api/project/start
Authorization: Bearer <token>
```

#### Stop Services

```http
POST /api/project/stop
Authorization: Bearer <token>
```

#### Reset Project

```http
POST /api/project/reset
Authorization: Bearer <token>
Content-Type: application/json

{
  "confirm": true,
  "removeVolumes": false
}
```

### Services

#### List Services

```http
GET /api/services
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "postgres",
      "status": "running",
      "image": "postgres:15",
      "ports": ["5432:5432"],
      "health": "healthy",
      "uptime": "2h 34m",
      "cpu": "12%",
      "memory": "256MB"
    },
    {
      "name": "hasura",
      "status": "running",
      "image": "hasura/graphql-engine:latest",
      "ports": ["8080:8080"],
      "health": "healthy",
      "uptime": "2h 33m",
      "cpu": "8%",
      "memory": "128MB"
    }
  ]
}
```

#### Get Service Details

```http
GET /api/services/{service_name}
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "postgres",
    "containerId": "abc123def456",
    "image": "postgres:15",
    "status": "running",
    "created": "2024-01-12T08:00:00Z",
    "started": "2024-01-12T08:00:05Z",
    "ports": [
      {
        "container": 5432,
        "host": 5432,
        "protocol": "tcp"
      }
    ],
    "environment": {
      "POSTGRES_DB": "myapp",
      "POSTGRES_USER": "postgres"
    },
    "volumes": [
      {
        "source": "postgres_data",
        "destination": "/var/lib/postgresql/data",
        "mode": "rw"
      }
    ],
    "networks": ["nself_network"],
    "health": {
      "status": "healthy",
      "checks": 5,
      "lastCheck": "2024-01-12T10:30:00Z"
    }
  }
}
```

#### Start Service

```http
POST /api/services/{service_name}/start
Authorization: Bearer <token>
```

#### Stop Service

```http
POST /api/services/{service_name}/stop
Authorization: Bearer <token>
```

#### Restart Service

```http
POST /api/services/{service_name}/restart
Authorization: Bearer <token>
```

#### Service Logs

```http
GET /api/services/{service_name}/logs
Authorization: Bearer <token>

Query Parameters:
- lines: Number of lines (default: 100)
- follow: Stream logs (true/false)
- timestamps: Include timestamps (true/false)
```

**Response (Streaming if follow=true):**

```
data: 2024-01-12T10:30:00Z postgres: LOG: database system is ready
data: 2024-01-12T10:30:01Z postgres: LOG: connection received
```

#### Execute Command

```http
POST /api/services/{service_name}/exec
Authorization: Bearer <token>
Content-Type: application/json

{
  "command": ["psql", "-U", "postgres", "-c", "SELECT version();"]
}
```

### Docker

#### Docker Info

```http
GET /api/docker/info
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "version": "24.0.7",
    "apiVersion": "1.43",
    "os": "linux",
    "arch": "amd64",
    "containers": {
      "total": 12,
      "running": 10,
      "stopped": 2
    },
    "images": 18,
    "storage": {
      "driver": "overlay2",
      "used": "4.2GB",
      "available": "45.8GB"
    }
  }
}
```

#### List Containers

```http
GET /api/docker/containers
Authorization: Bearer <token>

Query Parameters:
- all: Include stopped containers (true/false)
- filters: JSON filters
```

#### Container Stats

```http
GET /api/docker/stats
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "container": "postgres",
      "cpu": "12.5%",
      "memory": {
        "usage": "256MB",
        "limit": "2GB",
        "percent": "12.5%"
      },
      "network": {
        "rx": "1.2MB",
        "tx": "3.4MB"
      },
      "disk": {
        "read": "10MB",
        "write": "25MB"
      }
    }
  ]
}
```

#### Pull Image

```http
POST /api/docker/images/pull
Authorization: Bearer <token>
Content-Type: application/json

{
  "image": "postgres:15"
}
```

#### Remove Image

```http
DELETE /api/docker/images/{image_id}
Authorization: Bearer <token>
```

#### Prune System

```http
POST /api/docker/prune
Authorization: Bearer <token>
Content-Type: application/json

{
  "containers": true,
  "images": true,
  "volumes": false,
  "networks": true
}
```

### System

#### System Metrics

```http
GET /api/system/metrics
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "cpu": {
      "cores": 8,
      "usage": 42.5,
      "loadAverage": [2.1, 1.8, 1.5]
    },
    "memory": {
      "total": "16GB",
      "used": "6.4GB",
      "free": "9.6GB",
      "percent": 40
    },
    "disk": {
      "total": "500GB",
      "used": "125GB",
      "free": "375GB",
      "percent": 25
    },
    "network": {
      "rx": "125MB/s",
      "tx": "45MB/s"
    },
    "uptime": "5d 12h 34m"
  }
}
```

#### Health Check

```http
GET /api/system/health
```

**Response:**

```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "docker": "ok",
    "disk": "ok",
    "memory": "ok"
  },
  "version": "1.0.0",
  "timestamp": "2024-01-12T10:30:00Z"
}
```

#### Environment Variables

```http
GET /api/system/env
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "NODE_ENV": "production",
    "PORT": "3021",
    "NSELF_PROJECT_PATH": "/workspace",
    "DATABASE_URL": "postgres://..."
  }
}
```

### Database

#### Database Info

```http
GET /api/database/info
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "name": "myapp",
    "size": "124MB",
    "tables": 18,
    "connections": {
      "active": 5,
      "idle": 10,
      "max": 100
    },
    "version": "PostgreSQL 15.2"
  }
}
```

#### List Tables

```http
GET /api/database/tables
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "schema": "public",
      "name": "users",
      "rows": 1234,
      "size": "5.2MB"
    },
    {
      "schema": "public",
      "name": "posts",
      "rows": 5678,
      "size": "12.4MB"
    }
  ]
}
```

#### Execute Query

```http
POST /api/database/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "SELECT * FROM users LIMIT 10",
  "database": "myapp"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "id": 1,
        "email": "user@example.com",
        "name": "John Doe"
      }
    ],
    "rowCount": 10,
    "fields": [
      { "name": "id", "type": "integer" },
      { "name": "email", "type": "varchar" },
      { "name": "name", "type": "varchar" }
    ]
  }
}
```

#### Backup Database

```http
POST /api/database/backup
Authorization: Bearer <token>
Content-Type: application/json

{
  "database": "myapp",
  "format": "sql",
  "compress": true
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "file": "backup-myapp-20240112-103000.sql.gz",
    "size": "45MB",
    "path": "/backups/backup-myapp-20240112-103000.sql.gz"
  }
}
```

#### Restore Database

```http
POST /api/database/restore
Authorization: Bearer <token>
Content-Type: application/json

{
  "file": "backup-myapp-20240112-103000.sql.gz",
  "database": "myapp",
  "dropExisting": true
}
```

#### Run Migrations

```http
POST /api/database/migrations/apply
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "applied": ["001_initial_schema.sql", "002_add_users_table.sql"],
    "skipped": ["003_already_applied.sql"]
  }
}
```

### Files

#### List Files

```http
GET /api/files
Authorization: Bearer <token>

Query Parameters:
- path: Directory path (default: /workspace)
- recursive: Include subdirectories (true/false)
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "name": "docker-compose.yml",
      "type": "file",
      "size": 2048,
      "modified": "2024-01-12T10:00:00Z",
      "permissions": "rw-r--r--"
    },
    {
      "name": "services",
      "type": "directory",
      "modified": "2024-01-12T09:00:00Z",
      "permissions": "rwxr-xr-x"
    }
  ]
}
```

#### Read File

```http
GET /api/files/read
Authorization: Bearer <token>

Query Parameters:
- path: File path
```

**Response:**

```json
{
  "success": true,
  "data": {
    "content": "version: '3.8'\n\nservices:\n  postgres:\n    image: postgres:15\n",
    "encoding": "utf-8",
    "size": 2048
  }
}
```

#### Write File

```http
POST /api/files/write
Authorization: Bearer <token>
Content-Type: application/json

{
  "path": "/workspace/.env",
  "content": "DATABASE_URL=postgres://localhost:5432/myapp\n"
}
```

#### Delete File

```http
DELETE /api/files
Authorization: Bearer <token>

Query Parameters:
- path: File path
```

#### Upload File

```http
POST /api/files/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

- file: Binary file data
- path: Destination path
```

### Monitoring

#### Get Metrics

```http
GET /api/monitoring/metrics
Authorization: Bearer <token>

Query Parameters:
- service: Service name (optional)
- metric: Metric type (cpu|memory|network|disk)
- period: Time period (1h|6h|24h|7d)
```

**Response:**

```json
{
  "success": true,
  "data": {
    "service": "postgres",
    "metric": "cpu",
    "period": "1h",
    "datapoints": [
      {
        "timestamp": "2024-01-12T09:30:00Z",
        "value": 12.5
      },
      {
        "timestamp": "2024-01-12T09:35:00Z",
        "value": 13.2
      }
    ],
    "summary": {
      "min": 8.1,
      "max": 25.3,
      "avg": 12.7,
      "current": 12.5
    }
  }
}
```

#### Get Alerts

```http
GET /api/monitoring/alerts
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "alert-123",
      "severity": "warning",
      "service": "postgres",
      "metric": "memory",
      "message": "Memory usage above 80%",
      "value": 82.5,
      "threshold": 80,
      "triggered": "2024-01-12T10:15:00Z",
      "resolved": null
    }
  ]
}
```

#### Create Alert Rule

```http
POST /api/monitoring/alerts/rules
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "High CPU Usage",
  "service": "api",
  "metric": "cpu",
  "condition": ">",
  "threshold": 80,
  "duration": "5m",
  "severity": "warning",
  "actions": [
    {
      "type": "email",
      "to": "admin@example.com"
    }
  ]
}
```

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3021/ws')

ws.onopen = () => {
  // Authenticate
  ws.send(
    JSON.stringify({
      type: 'auth',
      token: 'your-jwt-token',
    }),
  )
}
```

### Subscribe to Events

```javascript
// Subscribe to service logs
ws.send(
  JSON.stringify({
    type: 'subscribe',
    channel: 'logs',
    service: 'postgres',
  }),
)

// Subscribe to metrics
ws.send(
  JSON.stringify({
    type: 'subscribe',
    channel: 'metrics',
    services: ['postgres', 'api'],
  }),
)

// Subscribe to alerts
ws.send(
  JSON.stringify({
    type: 'subscribe',
    channel: 'alerts',
  }),
)
```

### Receive Events

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)

  switch (data.type) {
    case 'log':
      console.log(`[${data.service}] ${data.message}`)
      break

    case 'metric':
      console.log(`${data.service}: ${data.metric}=${data.value}`)
      break

    case 'alert':
      console.log(`Alert: ${data.message}`)
      break
  }
}
```

## Client Libraries

### JavaScript/TypeScript

```javascript
import { NselfAdminClient } from '@nself/admin-client'

const client = new NselfAdminClient({
  baseUrl: 'http://localhost:3021',
  token: 'your-jwt-token',
})

// Get services
const services = await client.services.list()

// Start a service
await client.services.start('postgres')

// Execute query
const result = await client.database.query('SELECT * FROM users LIMIT 10')
```

### Python

```python
from nself_admin import Client

client = Client(
    base_url="http://localhost:3021",
    token="your-jwt-token"
)

# Get services
services = client.services.list()

# Start a service
client.services.start("postgres")

# Execute query
result = client.database.query(
    "SELECT * FROM users LIMIT 10"
)
```

### cURL Examples

```bash
# Login
curl -X POST http://localhost:3021/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'

# Get services
curl http://localhost:3021/api/services \
  -H "Authorization: Bearer <token>"

# Start all services
curl -X POST http://localhost:3021/api/project/start \
  -H "Authorization: Bearer <token>"

# Get logs
curl http://localhost:3021/api/services/postgres/logs?lines=50 \
  -H "Authorization: Bearer <token>"
```

## Pagination

For endpoints that return lists:

```http
GET /api/database/tables?page=2&limit=20
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Filtering and Sorting

```http
GET /api/services?status=running&sort=name:asc
GET /api/database/tables?schema=public&sort=rows:desc
GET /api/files?type=file&name=*.yml
```

## Batch Operations

```http
POST /api/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "operations": [
    {
      "method": "POST",
      "path": "/api/services/postgres/start"
    },
    {
      "method": "POST",
      "path": "/api/services/hasura/start"
    },
    {
      "method": "GET",
      "path": "/api/services"
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "results": [
    {"success": true, "data": {"started": true}},
    {"success": true, "data": {"started": true}},
    {"success": true, "data": [...]}
  ]
}
```

## API Versioning

The API version is included in the response headers:

```http
HTTP/1.1 200 OK
X-API-Version: 1.0.0
```

Future versions will use URL versioning:

```
/api/v2/services
```

## Security Considerations

### CORS Configuration

```javascript
// Allowed origins
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-domain.com',
  ],
  credentials: true,
}
```

### Rate Limiting

```javascript
// Per-endpoint limits
const rateLimits = {
  '/api/auth/login': '5 per minute',
  '/api/database/query': '30 per minute',
  '/api/services/*/exec': '10 per minute',
  default: '100 per minute',
}
```

### Input Validation

All inputs are validated using JSON schemas:

```json
{
  "type": "object",
  "properties": {
    "password": {
      "type": "string",
      "minLength": 12,
      "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])"
    }
  },
  "required": ["password"]
}
```

## Testing the API

### Using Postman

1. Import the [Postman Collection](https://api.postman.com/collections/...)
2. Set environment variables:
   - `baseUrl`: http://localhost:3021
   - `token`: Your JWT token
3. Run requests

### Using Insomnia

1. Import the [Insomnia Workspace](https://github.com/...)
2. Configure environment
3. Execute requests

### Automated Testing

```javascript
// Jest example
describe('API Tests', () => {
  let token

  beforeAll(async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'test-password' }),
    })
    const data = await response.json()
    token = data.token
  })

  test('Get services', async () => {
    const response = await fetch('/api/services', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
  })
})
```

## Next Steps

- **[Authentication Guide](api/Authentication)** - Detailed auth documentation
- **[WebSocket Guide](api/WebSocket)** - Real-time communication
- **[Error Reference](api/Errors)** - Complete error code reference
- **[SDK Documentation](api/SDKs)** - Client library guides

---

**Related Documentation**:

- [Quick Start](Quick-Start)
- [Service Configuration](Service-Configuration)
- [Dashboard Overview](Dashboard-Overview)
- [Troubleshooting](Troubleshooting)
