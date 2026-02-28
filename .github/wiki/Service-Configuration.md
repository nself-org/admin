# Service Configuration Guide

Comprehensive guide to configuring all service types in nself Admin, from core services to custom applications.

## Table of Contents

- [Core Services](#core-services)
  - [PostgreSQL](#postgresql)
  - [Hasura GraphQL](#hasura-graphql)
  - [Authentication](#authentication)
  - [Nginx](#nginx)
- [Optional Services](#optional-services)
  - [Redis](#redis)
  - [MinIO Storage](#minio-storage)
  - [Mailpit](#mailpit)
  - [MeiliSearch](#meilisearch)
  - [MLflow](#mlflow)
- [Custom Services](#custom-services)
  - [Framework Templates](#framework-templates)
  - [Configuration Options](#configuration-options)
  - [Environment Variables](#environment-variables)
- [Monitoring Stack](#monitoring-stack)
- [Service Dependencies](#service-dependencies)
- [Resource Management](#resource-management)
- [Health Checks](#health-checks)
- [Networking](#networking)
- [Volumes and Storage](#volumes-and-storage)
- [Security Configuration](#security-configuration)

## Core Services

Core services are always included in your stack and provide essential functionality.

### PostgreSQL

**Purpose**: Primary relational database

#### Configuration Options

```yaml
# Basic Configuration
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: ${POSTGRES_DB:-myapp}
    POSTGRES_USER: ${POSTGRES_USER:-postgres}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_INITDB_ARGS: '--encoding=UTF8 --locale=en_US.UTF-8'
```

#### Advanced Settings

```yaml
# Performance Tuning
postgres:
  command:
    - postgres
    - -c
    - max_connections=200
    - -c
    - shared_buffers=256MB
    - -c
    - effective_cache_size=1GB
    - -c
    - maintenance_work_mem=64MB
    - -c
    - checkpoint_completion_target=0.9
    - -c
    - wal_buffers=16MB
    - -c
    - default_statistics_target=100
    - -c
    - random_page_cost=1.1
```

#### Connection Strings

```bash
# Internal (from other containers)
postgres://postgres:password@postgres:5432/myapp

# External (from host)
postgres://postgres:password@localhost:5432/myapp

# With SSL
postgres://postgres:password@postgres:5432/myapp?sslmode=require
```

#### Backup Configuration

```bash
# Manual backup
docker exec postgres pg_dump -U postgres myapp > backup.sql

# Automated backup (cron)
0 2 * * * docker exec postgres pg_dump -U postgres myapp > /backups/daily-$(date +\%Y\%m\%d).sql
```

### Hasura GraphQL

**Purpose**: Instant GraphQL API over PostgreSQL

#### Configuration Options

```yaml
hasura:
  image: hasura/graphql-engine:v2.35.0
  environment:
    # Database
    HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:password@postgres:5432/myapp

    # Admin
    HASURA_GRAPHQL_ADMIN_SECRET: ${HASURA_ADMIN_SECRET}
    HASURA_GRAPHQL_ENABLE_CONSOLE: "true"

    # Dev Mode
    HASURA_GRAPHQL_DEV_MODE: "true"
    HASURA_GRAPHQL_ENABLE_TELEMETRY: "false"

    # CORS
    HASURA_GRAPHQL_CORS_DOMAIN: "*"

    # JWT
    HASURA_GRAPHQL_JWT_SECRET: '{
      "type": "HS256",
      "key": "${JWT_SECRET}"
    }'
```

#### Metadata Configuration

```yaml
# hasura/metadata/databases/databases.yaml
- name: default
  kind: postgres
  configuration:
    connection_info:
      database_url:
        from_env: HASURA_GRAPHQL_DATABASE_URL
      pool_settings:
        max_connections: 50
        idle_timeout: 180
        retries: 1
```

#### Permissions Example

```yaml
# hasura/metadata/databases/default/tables/public_users.yaml
table:
  name: users
  schema: public

select_permissions:
  - role: user
    permission:
      columns:
        - id
        - email
        - name
      filter:
        id:
          _eq: X-Hasura-User-Id
```

### Authentication

**Purpose**: JWT-based authentication service

#### Configuration Options

```yaml
auth:
  image: nself/auth:latest
  environment:
    # JWT Configuration
    JWT_SECRET: ${JWT_SECRET}
    JWT_EXPIRY: '7d'
    REFRESH_TOKEN_EXPIRY: '30d'

    # Database
    DATABASE_URL: postgres://postgres:password@postgres:5432/myapp

    # OAuth Providers (optional)
    GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
    GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
    GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID}
    GITHUB_CLIENT_SECRET: ${GITHUB_CLIENT_SECRET}

    # Email (optional)
    SMTP_HOST: ${SMTP_HOST}
    SMTP_PORT: ${SMTP_PORT}
    SMTP_USER: ${SMTP_USER}
    SMTP_PASS: ${SMTP_PASS}
```

#### API Endpoints

```javascript
// Register
POST /auth/register
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}

// Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "securepassword"
}

// Refresh Token
POST /auth/refresh
{
  "refresh_token": "..."
}

// OAuth
GET /auth/google
GET /auth/github
```

### Nginx

**Purpose**: Reverse proxy and load balancer

#### Basic Configuration

```nginx
# nginx/default.conf
server {
    listen 80;
    server_name localhost;
    client_max_body_size 100M;

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://api:4001;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    # GraphQL
    location /v1/graphql {
        proxy_pass http://hasura:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket
    location /ws {
        proxy_pass http://api:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

#### SSL Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # ... rest of configuration
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

## Optional Services

### Redis

**Purpose**: In-memory data store for caching and queues

#### Configuration

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass ${REDIS_PASSWORD}
  environment:
    REDIS_PASSWORD: ${REDIS_PASSWORD}
  volumes:
    - redis_data:/data
  healthcheck:
    test: ['CMD', 'redis-cli', '--raw', 'incr', 'ping']
```

#### Connection Examples

```javascript
// Node.js
const redis = require('redis');
const client = redis.createClient({
  url: 'redis://:password@redis:6379'
});

// Python
import redis
r = redis.Redis(
    host='redis',
    port=6379,
    password='password',
    decode_responses=True
)
```

#### Use Cases

```yaml
# Session Store
sessions:
  store: redis
  prefix: 'sess:'
  ttl: 86400

# Cache
cache:
  driver: redis
  prefix: 'cache:'
  ttl: 3600

# Queue
queue:
  driver: redis
  prefix: 'queue:'
  retries: 3
```

### MinIO Storage

**Purpose**: S3-compatible object storage

#### Configuration

```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    MINIO_BROWSER_REDIRECT_URL: http://localhost:9001
  volumes:
    - minio_data:/data
  ports:
    - '9000:9000' # API
    - '9001:9001' # Console
```

#### Bucket Configuration

```bash
# Create bucket
docker exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec minio mc mb local/uploads
docker exec minio mc mb local/backups

# Set public policy
docker exec minio mc anonymous set public local/uploads
```

#### SDK Usage

```javascript
// Node.js
const Minio = require('minio')

const minioClient = new Minio.Client({
  endPoint: 'minio',
  port: 9000,
  useSSL: false,
  accessKey: 'minioadmin',
  secretKey: 'minioadmin',
})

// Upload file
minioClient.fPutObject('uploads', 'photo.jpg', '/tmp/photo.jpg')
```

### Mailpit

**Purpose**: Email testing and development

#### Configuration

```yaml
mailpit:
  image: axllent/mailpit:latest
  environment:
    MP_SMTP_AUTH_ACCEPT_ANY: 1
    MP_SMTP_AUTH_ALLOW_INSECURE: 1
  ports:
    - '1025:1025' # SMTP
    - '8025:8025' # Web UI
```

#### SMTP Configuration

```javascript
// Node.js with Nodemailer
const transporter = nodemailer.createTransport({
  host: 'mailpit',
  port: 1025,
  secure: false,
  auth: null,
})
```

### MeiliSearch

**Purpose**: Fast, typo-tolerant search engine

#### Configuration

```yaml
meilisearch:
  image: getmeili/meilisearch:latest
  environment:
    MEILI_MASTER_KEY: ${MEILI_MASTER_KEY}
    MEILI_ENV: development
    MEILI_HTTP_PAYLOAD_SIZE_LIMIT: '100Mb'
    MEILI_LOG_LEVEL: INFO
  volumes:
    - meilisearch_data:/meili_data
  ports:
    - '7700:7700'
```

#### Index Creation

```javascript
// JavaScript SDK
const { MeiliSearch } = require('meilisearch')

const client = new MeiliSearch({
  host: 'http://meilisearch:7700',
  apiKey: 'masterKey',
})

// Create index
await client.createIndex('products', { primaryKey: 'id' })

// Add documents
await client.index('products').addDocuments([
  { id: 1, name: 'iPhone', price: 999 },
  { id: 2, name: 'iPad', price: 799 },
])

// Search
const results = await client.index('products').search('iphone')
```

### MLflow

**Purpose**: Machine learning lifecycle management

#### Configuration

```yaml
mlflow:
  image: ghcr.io/mlflow/mlflow:latest
  command: >
    mlflow server
    --backend-store-uri postgresql://postgres:password@postgres/mlflow
    --default-artifact-root s3://mlflow/
    --host 0.0.0.0
    --port 5000
  environment:
    MLFLOW_S3_ENDPOINT_URL: http://minio:9000
    AWS_ACCESS_KEY_ID: minioadmin
    AWS_SECRET_ACCESS_KEY: minioadmin
  ports:
    - '5000:5000'
```

## Custom Services

### Framework Templates

nself Admin provides 40+ pre-configured templates:

#### Node.js Templates

| Framework    | Port | Description           | Best For              |
| ------------ | ---- | --------------------- | --------------------- |
| Express      | 4001 | Minimal, flexible     | REST APIs             |
| Express (TS) | 4001 | TypeScript version    | Type-safe APIs        |
| Fastify      | 4001 | High performance      | Microservices         |
| Fastify (TS) | 4001 | TypeScript version    | Fast microservices    |
| NestJS       | 4001 | Enterprise-grade      | Large applications    |
| Koa          | 4001 | Lightweight           | Modern middleware     |
| Hapi         | 4001 | Configuration-centric | Complex routing       |
| Hono         | 4001 | Ultra-fast            | Edge computing        |
| Socket.io    | 4001 | Real-time             | WebSocket apps        |
| tRPC         | 4001 | Type-safe RPC         | Full-stack TypeScript |

#### Python Templates

| Framework | Port | Description        | Best For          |
| --------- | ---- | ------------------ | ----------------- |
| FastAPI   | 4002 | Modern, fast       | REST + GraphQL    |
| Django    | 4002 | Batteries included | Full applications |
| Flask     | 4002 | Minimal            | Simple APIs       |
| Tornado   | 4002 | Non-blocking       | Real-time apps    |
| Pyramid   | 4002 | Flexible           | Scalable apps     |

#### Other Languages

| Language | Framework   | Port | Description         |
| -------- | ----------- | ---- | ------------------- |
| Go       | Gin         | 4003 | Fast HTTP framework |
| Go       | Fiber       | 4003 | Express-inspired    |
| Go       | Echo        | 4003 | High performance    |
| Ruby     | Sinatra     | 4004 | Minimal DSL         |
| Ruby     | Rails       | 4004 | Full framework      |
| PHP      | Laravel     | 4005 | Modern PHP          |
| PHP      | Slim        | 4005 | Micro framework     |
| Java     | Spring Boot | 4006 | Enterprise Java     |
| Rust     | Actix       | 4007 | Blazing fast        |
| Rust     | Rocket      | 4007 | Type-safe           |
| C#       | ASP.NET     | 4008 | Microsoft stack     |
| Kotlin   | Ktor        | 4009 | Coroutine-based     |
| Scala    | Play        | 4010 | Reactive            |
| Elixir   | Phoenix     | 4011 | Real-time           |

### Configuration Options

#### Basic Service Configuration

```yaml
services:
  api:
    build:
      context: ./services/api
      dockerfile: Dockerfile
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      PORT: 4001
      DATABASE_URL: ${DATABASE_URL}
    volumes:
      - ./services/api:/app
      - /app/node_modules
    ports:
      - '4001:4001'
    depends_on:
      - postgres
      - redis
    networks:
      - nself_network
    restart: unless-stopped
```

#### Advanced Configuration

```yaml
services:
  api:
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 256M

    # Health check
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:4001/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    # Logging
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'

    # Labels
    labels:
      com.example.service: 'api'
      com.example.description: 'Main API service'
```

### Environment Variables

#### Service-Specific Variables

```bash
# API Service
API_PORT=4001
API_HOST=0.0.0.0
API_BASE_URL=http://api.localhost
API_SECRET_KEY=secret-key-32-chars
API_RATE_LIMIT=100
API_CORS_ORIGIN=*

# Worker Service
WORKER_CONCURRENCY=5
WORKER_QUEUE_NAME=default
WORKER_REDIS_URL=redis://:password@redis:6379
WORKER_MAX_RETRIES=3

# Frontend
NEXT_PUBLIC_API_URL=http://api.localhost
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8080/v1/graphql
NEXT_PUBLIC_WS_URL=ws://localhost:4001
```

#### Shared Variables

```bash
# Database
DATABASE_URL=postgres://postgres:password@postgres:5432/myapp

# Redis
REDIS_URL=redis://:password@redis:6379

# S3/MinIO
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=uploads

# Email
SMTP_HOST=mailpit
SMTP_PORT=1025
SMTP_FROM=noreply@localhost
```

## Monitoring Stack

### Complete Stack Configuration

```yaml
# Prometheus
prometheus:
  image: prom/prometheus:latest
  volumes:
    - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    - prometheus_data:/prometheus
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
  ports:
    - '9090:9090'

# Grafana
grafana:
  image: grafana/grafana:latest
  environment:
    GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
    GF_INSTALL_PLUGINS: redis-datasource
  volumes:
    - grafana_data:/var/lib/grafana
    - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
  ports:
    - '3030:3000'

# Loki
loki:
  image: grafana/loki:latest
  volumes:
    - ./loki/loki-config.yml:/etc/loki/local-config.yaml
    - loki_data:/loki
  ports:
    - '3100:3100'

# Promtail
promtail:
  image: grafana/promtail:latest
  volumes:
    - ./promtail/promtail-config.yml:/etc/promtail/config.yml
    - /var/log:/var/log
    - /var/run/docker.sock:/var/run/docker.sock
  command: -config.file=/etc/promtail/config.yml

# Node Exporter
node-exporter:
  image: prom/node-exporter:latest
  ports:
    - '9100:9100'

# cAdvisor
cadvisor:
  image: gcr.io/cadvisor/cadvisor:latest
  volumes:
    - /:/rootfs:ro
    - /var/run:/var/run:ro
    - /sys:/sys:ro
    - /var/lib/docker/:/var/lib/docker:ro
  ports:
    - '8090:8080'

# Alertmanager
alertmanager:
  image: prom/alertmanager:latest
  volumes:
    - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
  ports:
    - '9093:9093'
```

### Prometheus Configuration

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'cadvisor'
    static_configs:
      - targets: ['cadvisor:8080']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'api'
    static_configs:
      - targets: ['api:4001']
    metrics_path: '/metrics'
```

## Service Dependencies

### Dependency Graph

```yaml
# Explicit dependencies
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  hasura:
    depends_on:
      postgres:
        condition: service_healthy

  auth:
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
```

### Startup Order

```mermaid
graph LR
    A[PostgreSQL] --> B[Hasura]
    A --> C[Auth]
    D[Redis] --> C
    D --> E[API]
    A --> E
    F[MinIO] --> E
    G[Nginx] --> B
    G --> C
    G --> E
```

## Resource Management

### Resource Allocation Guidelines

| Service     | Min CPU | Rec CPU | Min RAM | Rec RAM |
| ----------- | ------- | ------- | ------- | ------- |
| PostgreSQL  | 0.5     | 2.0     | 512MB   | 2GB     |
| Hasura      | 0.25    | 1.0     | 256MB   | 512MB   |
| Redis       | 0.25    | 0.5     | 128MB   | 256MB   |
| Nginx       | 0.1     | 0.25    | 64MB    | 128MB   |
| API Service | 0.25    | 1.0     | 256MB   | 512MB   |
| Worker      | 0.25    | 1.0     | 256MB   | 512MB   |
| MinIO       | 0.25    | 1.0     | 512MB   | 1GB     |
| Monitoring  | 0.5     | 2.0     | 1GB     | 2GB     |

### Docker Resource Configuration

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Health Checks

### Health Check Configuration

```yaml
# HTTP health check
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s

# TCP health check
healthcheck:
  test: ["CMD-SHELL", "nc -z localhost 5432"]
  interval: 10s
  timeout: 5s
  retries: 5

# Custom script
healthcheck:
  test: ["CMD", "/healthcheck.sh"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Health Endpoints

```javascript
// Express health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis()
    }
  });
});
```

## Networking

### Network Configuration

```yaml
networks:
  nself_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
          gateway: 172.20.0.1

  frontend_network:
    driver: bridge

  backend_network:
    driver: bridge
    internal: true
```

### Service Network Assignment

```yaml
services:
  nginx:
    networks:
      - frontend_network
      - backend_network

  api:
    networks:
      - backend_network

  postgres:
    networks:
      - backend_network
```

## Volumes and Storage

### Volume Configuration

```yaml
volumes:
  # Named volumes
  postgres_data:
    driver: local
  redis_data:
    driver: local
  minio_data:
    driver: local

  # Bind mounts
  api_code:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ./services/api
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh

# Database backup
docker exec postgres pg_dump -U postgres myapp > ./backups/db-$(date +%Y%m%d).sql

# Redis backup
docker exec redis redis-cli --rdb /data/dump.rdb BGSAVE
cp ./data/redis/dump.rdb ./backups/redis-$(date +%Y%m%d).rdb

# MinIO backup
docker run --rm \
  -v minio_data:/data \
  -v ./backups:/backup \
  alpine tar czf /backup/minio-$(date +%Y%m%d).tar.gz /data
```

## Security Configuration

### Security Best Practices

```yaml
services:
  api:
    # Read-only root filesystem
    read_only: true
    tmpfs:
      - /tmp
      - /app/tmp

    # Drop capabilities
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE

    # Security options
    security_opt:
      - no-new-privileges:true

    # User
    user: '1000:1000'
```

### Secret Management

```yaml
# Docker secrets
secrets:
  postgres_password:
    file: ./secrets/postgres_password.txt
  jwt_secret:
    file: ./secrets/jwt_secret.txt

services:
  postgres:
    secrets:
      - postgres_password
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
```

### Network Security

```yaml
# Firewall rules
services:
  postgres:
    ports: [] # No external access
    networks:
      - backend_network

  api:
    expose:
      - '4001' # Internal only
    networks:
      - backend_network
```

## Service Templates

### Microservice Template

```yaml
# Template for new microservice
service_name:
  build:
    context: ./services/${SERVICE_NAME}
    dockerfile: Dockerfile
    args:
      NODE_ENV: ${NODE_ENV}
  environment:
    - NODE_ENV=${NODE_ENV}
    - PORT=${SERVICE_PORT}
    - DATABASE_URL=${DATABASE_URL}
    - REDIS_URL=${REDIS_URL}
  volumes:
    - ./services/${SERVICE_NAME}:/app
    - /app/node_modules
  depends_on:
    - postgres
    - redis
  networks:
    - nself_network
  restart: unless-stopped
  healthcheck:
    test: ['CMD', 'curl', '-f', 'http://localhost:${SERVICE_PORT}/health']
    interval: 30s
    timeout: 10s
    retries: 3
```

### Worker Template

```yaml
# Background worker template
worker:
  build:
    context: ./services/worker
  environment:
    - WORKER_CONCURRENCY=5
    - QUEUE_NAME=default
    - REDIS_URL=${REDIS_URL}
    - DATABASE_URL=${DATABASE_URL}
  depends_on:
    - redis
    - postgres
  networks:
    - backend_network
  restart: unless-stopped
  deploy:
    replicas: 2
```

## Configuration Examples

### Multi-Environment Setup

```yaml
# docker-compose.override.yml (Development)
services:
  api:
    environment:
      - DEBUG=true
      - LOG_LEVEL=debug
    volumes:
      - ./services/api:/app

# docker-compose.production.yml
services:
  api:
    environment:
      - DEBUG=false
      - LOG_LEVEL=info
    deploy:
      replicas: 3
```

### Load Balancing

```yaml
# Multiple API instances
services:
  api:
    deploy:
      replicas: 3

  nginx:
    depends_on:
      - api
    volumes:
      - ./nginx/upstream.conf:/etc/nginx/conf.d/upstream.conf
```

```nginx
# nginx/upstream.conf
upstream api_backend {
    least_conn;
    server api:4001 max_fails=3 fail_timeout=30s;
}
```

## Performance Optimization

### Caching Strategy

```yaml
# Redis caching
api:
  environment:
    - CACHE_TTL=3600
    - CACHE_PREFIX=api:
    - CACHE_ENABLED=true
```

### Database Optimization

```sql
-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- Connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
```

## Troubleshooting Services

### Common Issues

#### Service Won't Start

```bash
# Check logs
docker-compose logs service_name

# Check configuration
docker-compose config

# Validate environment
docker-compose run --rm service_name env
```

#### Connection Refused

```bash
# Check network
docker network ls
docker network inspect nself_network

# Test connectivity
docker exec api ping postgres
docker exec api nc -zv postgres 5432
```

#### Performance Issues

```bash
# Check resources
docker stats

# Inspect service
docker inspect service_name

# Check limits
docker-compose exec service_name cat /proc/meminfo
```

## Next Steps

- **[API Reference](api/Reference)** - Complete API documentation
- **[Deployment Guide](Deployment-Guide)** - Production deployment
- **[Monitoring Setup](Monitoring-Metrics)** - Metrics and alerting
- **[Security Guide](Security-Guide)** - Security best practices

---

**Related Documentation**:

- [Init Wizard Guide](Init-Wizard-Guide)
- [Environment Management](Environment-Management)
- [Docker Compose Reference](Docker-Compose-Reference)
- [Troubleshooting Guide](Troubleshooting)
