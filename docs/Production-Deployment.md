# Production Deployment Guide

Comprehensive guide for deploying nself Admin in production environments with security, scalability, and reliability best practices.

## Table of Contents

- [Production Overview](#production-overview)
- [Prerequisites](#prerequisites)
- [Deployment Methods](#deployment-methods)
- [Security Configuration](#security-configuration)
- [SSL/TLS Setup](#ssltls-setup)
- [Reverse Proxy Configuration](#reverse-proxy-configuration)
- [Environment Configuration](#environment-configuration)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Disaster Recovery](#backup--disaster-recovery)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

## Production Overview

Deploying nself Admin in production requires careful consideration of security, performance, and reliability. This guide covers enterprise-ready deployment patterns.

### Production Architecture

```mermaid
graph TB
    subgraph "Internet"
        Users[👥 Users]
    end

    subgraph "Load Balancer/CDN"
        LB[🔄 Load Balancer]
        CDN[📡 CDN]
    end

    subgraph "Reverse Proxy"
        Nginx[🌐 Nginx]
        SSL[🔒 SSL Termination]
    end

    subgraph "Application Layer"
        nAdmin1[📊 nself Admin]
        nAdmin2[📊 nself Admin]
    end

    subgraph "Storage"
        DB[💾 Database]
        Logs[📝 Log Storage]
        Backups[💿 Backups]
    end

    subgraph "Monitoring"
        Metrics[📈 Metrics]
        Alerts[🚨 Alerts]
    end

    Users --> LB
    LB --> CDN
    CDN --> Nginx
    Nginx --> SSL
    SSL --> nAdmin1
    SSL --> nAdmin2
    nAdmin1 --> DB
    nAdmin2 --> DB
    nAdmin1 --> Logs
    nAdmin2 --> Logs
    Backups --> DB
    Metrics --> nAdmin1
    Metrics --> nAdmin2
    Alerts --> Metrics
```

## Prerequisites

### System Requirements

**Minimum Production Server:**

- **CPU**: 4 cores
- **RAM**: 8GB
- **Disk**: 50GB SSD
- **Network**: 1Gbps
- **OS**: Ubuntu 22.04 LTS / CentOS 8+ / RHEL 8+

**Recommended Production Server:**

- **CPU**: 8 cores
- **RAM**: 16GB
- **Disk**: 100GB SSD
- **Network**: 10Gbps
- **OS**: Ubuntu 22.04 LTS

### Software Requirements

```bash
# Required software
docker --version          # >= 24.0
docker-compose --version  # >= 2.20
nginx --version          # >= 1.20
certbot --version        # >= 1.0 (for Let's Encrypt)
```

### Network Requirements

```yaml
Ports:
  inbound:
    - 80/tcp # HTTP (redirect to HTTPS)
    - 443/tcp # HTTPS
    - 22/tcp # SSH (admin access)

  outbound:
    - 80/tcp # Package updates
    - 443/tcp # HTTPS to external services
    - 53/tcp # DNS
```

## Deployment Methods

### Method 1: Docker Compose (Recommended)

#### Production docker-compose.yml

```yaml
version: '3.8'

services:
  nself-admin:
    image: nself/nself-admin:latest
    container_name: nself-admin-prod
    restart: unless-stopped

    environment:
      NODE_ENV: production
      PORT: 3021
      NSELF_PROJECT_PATH: /workspace

      # Security
      ADMIN_SESSION_SECRET: ${ADMIN_SESSION_SECRET}
      ADMIN_JWT_SECRET: ${ADMIN_JWT_SECRET}

      # Database
      DATABASE_URL: postgresql://nself:${DB_PASSWORD}@postgres:5432/nself_admin

      # Redis (optional)
      REDIS_URL: redis://redis:6379

      # Monitoring
      ENABLE_METRICS: true
      METRICS_PORT: 9090

    volumes:
      - ./workspace:/workspace:rw
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - nself-admin-data:/app/data

    networks:
      - nself-network

    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3021/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '2.0'
        reservations:
          memory: 512M
          cpus: '1.0'

    security_opt:
      - no-new-privileges:true

    user: '1000:1000'

    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'

  postgres:
    image: postgres:15-alpine
    container_name: nself-postgres
    restart: unless-stopped

    environment:
      POSTGRES_DB: nself_admin
      POSTGRES_USER: nself
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_INITDB_ARGS: '--encoding=UTF8 --locale=en_US.UTF-8'

    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups:/backups

    networks:
      - nself-network

    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U nself']
      interval: 10s
      timeout: 5s
      retries: 5

    security_opt:
      - no-new-privileges:true

    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c maintenance_work_mem=64MB
      -c checkpoint_completion_target=0.9
      -c wal_buffers=16MB
      -c default_statistics_target=100
      -c random_page_cost=1.1
      -c effective_io_concurrency=200

  redis:
    image: redis:7-alpine
    container_name: nself-redis
    restart: unless-stopped

    command: redis-server --requirepass ${REDIS_PASSWORD}

    volumes:
      - redis-data:/data

    networks:
      - nself-network

    healthcheck:
      test: ['CMD', 'redis-cli', '--raw', 'incr', 'ping']
      interval: 10s
      timeout: 3s
      retries: 5

    security_opt:
      - no-new-privileges:true

  nginx:
    image: nginx:alpine
    container_name: nself-nginx
    restart: unless-stopped

    ports:
      - '80:80'
      - '443:443'

    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./ssl:/etc/nginx/ssl:ro
      - ./logs/nginx:/var/log/nginx

    networks:
      - nself-network

    depends_on:
      - nself-admin

    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:80/health']
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  nself-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.30.0.0/16

volumes:
  nself-admin-data:
    driver: local
  postgres-data:
    driver: local
  redis-data:
    driver: local
```

#### Environment Configuration (.env.production)

```bash
# Production Environment Configuration

# Application
NODE_ENV=production
PORT=3021

# Security (generate strong passwords)
ADMIN_SESSION_SECRET=your-very-long-random-session-secret-64-chars-min
ADMIN_JWT_SECRET=your-jwt-secret-32-chars-minimum
DB_PASSWORD=your-secure-database-password
REDIS_PASSWORD=your-secure-redis-password

# Domain
DOMAIN=admin.yourdomain.com
BASE_URL=https://admin.yourdomain.com

# SSL
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info

# Backup
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30

# Rate Limiting
RATE_LIMIT_WINDOW=900000   # 15 minutes
RATE_LIMIT_MAX=100         # 100 requests per window
```

### Method 2: Kubernetes Deployment

#### Kubernetes Manifests

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: nself-admin
  labels:
    app: nself-admin

---
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: nself-admin-secrets
  namespace: nself-admin
type: Opaque
stringData:
  ADMIN_SESSION_SECRET: 'your-session-secret'
  ADMIN_JWT_SECRET: 'your-jwt-secret'
  DB_PASSWORD: 'your-db-password'
  REDIS_PASSWORD: 'your-redis-password'

---
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nself-admin-config
  namespace: nself-admin
data:
  NODE_ENV: 'production'
  DOMAIN: 'admin.yourdomain.com'
  ENABLE_METRICS: 'true'
  LOG_LEVEL: 'info'

---
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nself-admin
  namespace: nself-admin
  labels:
    app: nself-admin
spec:
  replicas: 2
  selector:
    matchLabels:
      app: nself-admin
  template:
    metadata:
      labels:
        app: nself-admin
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: nself-admin
          image: nself/nself-admin:latest
          ports:
            - containerPort: 3021
          env:
            - name: PORT
              value: '3021'
          envFrom:
            - configMapRef:
                name: nself-admin-config
            - secretRef:
                name: nself-admin-secrets
          resources:
            requests:
              memory: '512Mi'
              cpu: '500m'
            limits:
              memory: '1Gi'
              cpu: '1000m'
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3021
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3021
            initialDelaySeconds: 5
            periodSeconds: 5
          volumeMounts:
            - name: data
              mountPath: /app/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: nself-admin-pvc

---
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: nself-admin-service
  namespace: nself-admin
spec:
  selector:
    app: nself-admin
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3021
  type: ClusterIP

---
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nself-admin-ingress
  namespace: nself-admin
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
    nginx.ingress.kubernetes.io/force-ssl-redirect: 'true'
spec:
  tls:
    - hosts:
        - admin.yourdomain.com
      secretName: nself-admin-tls
  rules:
    - host: admin.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: nself-admin-service
                port:
                  number: 80

---
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: nself-admin-pvc
  namespace: nself-admin
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
  storageClassName: gp2 # AWS EBS
```

### Method 3: Cloud Provider Deployment

#### AWS ECS/Fargate

```json
{
  "family": "nself-admin",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "nself-admin",
      "image": "nself/nself-admin:latest",
      "portMappings": [
        {
          "containerPort": 3021,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3021" }
      ],
      "secrets": [
        {
          "name": "ADMIN_SESSION_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:nself-admin/session-secret"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:nself-admin/db-password"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nself-admin",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3021/api/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### Google Cloud Run

```yaml
# service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: nself-admin
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/execution-environment: gen2
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/cpu-throttling: 'false'
        run.googleapis.com/memory: '2Gi'
        run.googleapis.com/cpu: '2'
        run.googleapis.com/max-scale: '10'
        run.googleapis.com/min-scale: '1'
    spec:
      containers:
        - image: gcr.io/project-id/nself-admin:latest
          ports:
            - containerPort: 3021
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: '3021'
            - name: ADMIN_SESSION_SECRET
              valueFrom:
                secretKeyRef:
                  name: nself-admin-secrets
                  key: session-secret
          resources:
            limits:
              memory: 2Gi
              cpu: 2000m
          startupProbe:
            httpGet:
              path: /api/health
              port: 3021
            initialDelaySeconds: 10
            timeoutSeconds: 5
            periodSeconds: 10
            failureThreshold: 3
```

## Security Configuration

### Security Hardening Checklist

```bash
#!/bin/bash
# Production Security Hardening Script

# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 3. Disable root login
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload sshd

# 4. Install fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 5. Configure automatic security updates
sudo apt install unattended-upgrades -y
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades

# 6. Set up log rotation
sudo logrotate -d /etc/logrotate.conf

# 7. Configure Docker security
sudo usermod -aG docker $USER
echo '{"live-restore": true, "userland-proxy": false, "no-new-privileges": true}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

### Container Security

```yaml
# Security-focused docker-compose.yml additions
services:
  nself-admin:
    # Security options
    security_opt:
      - no-new-privileges:true
      - apparmor:docker-default
      - seccomp:default

    # Read-only filesystem
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
      - /app/tmp:noexec,nosuid,size=100m

    # Resource limits
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '2.0'
          pids: 100

    # User specification
    user: '1001:1001'

    # Capabilities
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETGID
      - SETUID
```

### Secret Management

```bash
# Using Docker Secrets
docker secret create admin_session_secret session_secret.txt
docker secret create admin_jwt_secret jwt_secret.txt
docker secret create db_password db_password.txt

# In docker-compose.yml
secrets:
  admin_session_secret:
    external: true
  admin_jwt_secret:
    external: true
  db_password:
    external: true

services:
  nself-admin:
    secrets:
      - admin_session_secret
      - admin_jwt_secret
      - db_password
    environment:
      ADMIN_SESSION_SECRET_FILE: /run/secrets/admin_session_secret
      ADMIN_JWT_SECRET_FILE: /run/secrets/admin_jwt_secret
      DB_PASSWORD_FILE: /run/secrets/db_password
```

## SSL/TLS Setup

### Let's Encrypt with Certbot

```bash
#!/bin/bash
# Automated Let's Encrypt setup

# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot --nginx -d admin.yourdomain.com

# Auto-renewal cron job
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# Test renewal
sudo certbot renew --dry-run
```

### Manual SSL Certificate

```bash
# Create SSL directory
mkdir -p ssl

# Generate private key
openssl genrsa -out ssl/private.key 2048

# Generate certificate signing request
openssl req -new -key ssl/private.key -out ssl/certificate.csr

# Install certificate files
# Place your certificate files:
# ssl/certificate.crt (your certificate)
# ssl/ca_bundle.crt (intermediate certificate)
# ssl/private.key (private key)

# Combine certificate and CA bundle
cat ssl/certificate.crt ssl/ca_bundle.crt > ssl/cert.pem
```

### SSL Configuration

```nginx
# /etc/nginx/sites-available/nself-admin
server {
    listen 80;
    server_name admin.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/private.key;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:";

    # Proxy to nself-admin
    location / {
        proxy_pass http://localhost:3021;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3021;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy";
        add_header Content-Type text/plain;
    }
}
```

## Reverse Proxy Configuration

### Nginx Configuration

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                   '$status $body_bytes_sent "$http_referer" '
                   '"$http_user_agent" "$http_x_forwarded_for" '
                   'rt=$request_time uct="$upstream_connect_time" '
                   'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 100M;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/rss+xml
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/svg+xml
        image/x-icon
        text/css
        text/plain
        text/x-component;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;

    # Security
    server_tokens off;

    include /etc/nginx/conf.d/*.conf;
}
```

### Load Balancer Configuration

```nginx
# /etc/nginx/conf.d/upstream.conf
upstream nself_admin {
    least_conn;
    server nself-admin-1:3021 max_fails=3 fail_timeout=30s;
    server nself-admin-2:3021 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://nself_admin;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Health check
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
    }

    # Rate limiting for login
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://nself_admin;
    }

    # Rate limiting for API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://nself_admin;
    }
}
```

## Environment Configuration

### Production Environment Variables

```bash
# /opt/nself-admin/.env.production

# Application
NODE_ENV=production
PORT=3021
BASE_URL=https://admin.yourdomain.com

# Security
ADMIN_SESSION_SECRET=your-256-bit-secret-key-here
ADMIN_JWT_SECRET=your-jwt-secret-32-chars-minimum
SESSION_TIMEOUT=86400000  # 24 hours
PASSWORD_MIN_LENGTH=12
ENFORCE_HTTPS=true

# Database
DATABASE_URL=postgresql://nself:password@postgres:5432/nself_admin?sslmode=require
DB_POOL_MIN=5
DB_POOL_MAX=20
DB_TIMEOUT=30000

# Redis (optional)
REDIS_URL=redis://:password@redis:6379
REDIS_TTL=3600

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000
LOG_LEVEL=info
LOG_FORMAT=json

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION=30
BACKUP_S3_BUCKET=nself-admin-backups
BACKUP_S3_REGION=us-east-1

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_SKIP_TRUSTED=true

# CORS
CORS_ORIGIN=https://admin.yourdomain.com
CORS_CREDENTIALS=true

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=notifications@yourdomain.com
SMTP_PASS=your-smtp-password
SMTP_FROM=nself Admin <notifications@yourdomain.com>

# Alerts
ALERT_EMAIL=admin@yourdomain.com
ALERT_SLACK_WEBHOOK=https://hooks.slack.com/services/xxx
```

### Configuration Validation

```bash
#!/bin/bash
# validate-config.sh - Production configuration validator

set -e

echo "🔍 Validating production configuration..."

# Check required environment variables
required_vars=(
    "NODE_ENV"
    "ADMIN_SESSION_SECRET"
    "ADMIN_JWT_SECRET"
    "DATABASE_URL"
    "BASE_URL"
)

for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        echo "❌ Missing required environment variable: $var"
        exit 1
    else
        echo "✅ $var is set"
    fi
done

# Validate secret lengths
if [[ ${#ADMIN_SESSION_SECRET} -lt 64 ]]; then
    echo "❌ ADMIN_SESSION_SECRET must be at least 64 characters"
    exit 1
fi

if [[ ${#ADMIN_JWT_SECRET} -lt 32 ]]; then
    echo "❌ ADMIN_JWT_SECRET must be at least 32 characters"
    exit 1
fi

# Check SSL certificates
if [[ -n "$SSL_CERT_PATH" && -n "$SSL_KEY_PATH" ]]; then
    if [[ ! -f "$SSL_CERT_PATH" ]]; then
        echo "❌ SSL certificate not found: $SSL_CERT_PATH"
        exit 1
    fi
    if [[ ! -f "$SSL_KEY_PATH" ]]; then
        echo "❌ SSL private key not found: $SSL_KEY_PATH"
        exit 1
    fi
    echo "✅ SSL certificates found"
fi

# Test database connection
echo "🔗 Testing database connection..."
if command -v pg_isready &> /dev/null; then
    pg_isready -d "$DATABASE_URL" && echo "✅ Database connection OK" || (echo "❌ Database connection failed" && exit 1)
fi

echo "✅ Production configuration validation passed"
```

## Monitoring & Logging

### Prometheus Monitoring

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'nself-admin'
    static_configs:
      - targets: ['nself-admin:9090']
    scrape_interval: 10s
    metrics_path: '/metrics'

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'nginx-exporter'
    static_configs:
      - targets: ['nginx-exporter:9113']

rule_files:
  - '/etc/prometheus/alerts/*.yml'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093
```

### Alert Rules

```yaml
# alerts/nself-admin.yml
groups:
  - name: nself-admin
    rules:
      - alert: NselfAdminDown
        expr: up{job="nself-admin"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'nself Admin is down'
          description: 'nself Admin has been down for more than 1 minute'

      - alert: HighMemoryUsage
        expr: (container_memory_usage_bytes{name="nself-admin"} / container_spec_memory_limit_bytes{name="nself-admin"}) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage'
          description: 'nself Admin memory usage is above 80%'

      - alert: HighCPUUsage
        expr: rate(container_cpu_usage_seconds_total{name="nself-admin"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High CPU usage'
          description: 'nself Admin CPU usage is above 80%'

      - alert: DatabaseConnectionFailure
        expr: pg_up{job="postgres-exporter"} == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: 'Database connection failure'
          description: 'Cannot connect to PostgreSQL database'
```

### Logging Configuration

```yaml
# docker-compose.yml logging section
services:
  nself-admin:
    logging:
      driver: 'json-file'
      options:
        max-size: '100m'
        max-file: '5'
        labels: 'service,environment'
    labels:
      - 'service=nself-admin'
      - 'environment=production'
```

### Log Aggregation with ELK Stack

```yaml
# elk-stack.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - 'ES_JAVA_OPTS=-Xms1g -Xmx1g'
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    ports:
      - '9200:9200'

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - '5601:5601'
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash/config:/usr/share/logstash/pipeline
    ports:
      - '5044:5044'
    environment:
      - 'LS_JAVA_OPTS=-Xmx256m -Xms256m'
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    user: root
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - logstash

volumes:
  elasticsearch-data:
```

## Backup & Disaster Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh - Production backup script

set -e

# Configuration
BACKUP_DIR="/opt/backups"
S3_BUCKET="nself-admin-backups"
RETENTION_DAYS=30
DATE=$(date +"%Y%m%d_%H%M%S")

# Create backup directory
mkdir -p "$BACKUP_DIR/$DATE"

echo "🗄️ Starting backup process..."

# Database backup
echo "📊 Backing up database..."
docker exec nself-postgres pg_dump -U nself nself_admin | gzip > "$BACKUP_DIR/$DATE/database.sql.gz"

# Application data backup
echo "💾 Backing up application data..."
docker run --rm \
  -v nself-admin-data:/data \
  -v "$BACKUP_DIR/$DATE":/backup \
  alpine tar czf /backup/app-data.tar.gz -C /data .

# Configuration backup
echo "⚙️ Backing up configuration..."
tar czf "$BACKUP_DIR/$DATE/config.tar.gz" \
  /opt/nself-admin/.env.production \
  /opt/nself-admin/docker-compose.yml \
  /etc/nginx/sites-available/nself-admin

# SSL certificates backup
if [[ -d /etc/letsencrypt ]]; then
    echo "🔒 Backing up SSL certificates..."
    tar czf "$BACKUP_DIR/$DATE/ssl.tar.gz" /etc/letsencrypt
fi

# Upload to S3 (if configured)
if [[ -n "$AWS_ACCESS_KEY_ID" && -n "$S3_BUCKET" ]]; then
    echo "☁️ Uploading to S3..."
    aws s3 sync "$BACKUP_DIR/$DATE" "s3://$S3_BUCKET/$DATE/" --delete

    # Clean up old S3 backups
    aws s3api list-objects-v2 \
      --bucket "$S3_BUCKET" \
      --query "Contents[?LastModified<=\`$(date --date="-$RETENTION_DAYS days" --iso-8601)\`].Key" \
      --output text | xargs -I {} aws s3 rm "s3://$S3_BUCKET/{}"
fi

# Clean up old local backups
find "$BACKUP_DIR" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +

echo "✅ Backup completed successfully"
echo "📁 Backup location: $BACKUP_DIR/$DATE"
```

### Restore Script

```bash
#!/bin/bash
# restore.sh - Production restore script

set -e

BACKUP_DATE=$1
BACKUP_DIR="/opt/backups"
S3_BUCKET="nself-admin-backups"

if [[ -z "$BACKUP_DATE" ]]; then
    echo "Usage: $0 <backup_date>"
    echo "Available backups:"
    ls -la "$BACKUP_DIR" 2>/dev/null || echo "No local backups found"
    exit 1
fi

echo "🔄 Starting restore process for backup: $BACKUP_DATE"

# Download from S3 if needed
if [[ ! -d "$BACKUP_DIR/$BACKUP_DATE" && -n "$S3_BUCKET" ]]; then
    echo "📥 Downloading backup from S3..."
    aws s3 sync "s3://$S3_BUCKET/$BACKUP_DATE/" "$BACKUP_DIR/$BACKUP_DATE/"
fi

if [[ ! -d "$BACKUP_DIR/$BACKUP_DATE" ]]; then
    echo "❌ Backup not found: $BACKUP_DATE"
    exit 1
fi

# Stop services
echo "⏹️ Stopping services..."
docker-compose down

# Restore database
if [[ -f "$BACKUP_DIR/$BACKUP_DATE/database.sql.gz" ]]; then
    echo "📊 Restoring database..."
    docker-compose up -d postgres
    sleep 10
    gunzip -c "$BACKUP_DIR/$BACKUP_DATE/database.sql.gz" | \
        docker exec -i nself-postgres psql -U nself -d nself_admin
fi

# Restore application data
if [[ -f "$BACKUP_DIR/$BACKUP_DATE/app-data.tar.gz" ]]; then
    echo "💾 Restoring application data..."
    docker volume rm nself-admin-data 2>/dev/null || true
    docker volume create nself-admin-data
    docker run --rm \
        -v nself-admin-data:/data \
        -v "$BACKUP_DIR/$BACKUP_DATE":/backup \
        alpine tar xzf /backup/app-data.tar.gz -C /data
fi

# Restore configuration
if [[ -f "$BACKUP_DIR/$BACKUP_DATE/config.tar.gz" ]]; then
    echo "⚙️ Restoring configuration..."
    tar xzf "$BACKUP_DIR/$BACKUP_DATE/config.tar.gz" -C /
fi

# Restore SSL certificates
if [[ -f "$BACKUP_DIR/$BACKUP_DATE/ssl.tar.gz" ]]; then
    echo "🔒 Restoring SSL certificates..."
    tar xzf "$BACKUP_DIR/$BACKUP_DATE/ssl.tar.gz" -C /
    systemctl reload nginx
fi

# Start services
echo "▶️ Starting services..."
docker-compose up -d

# Wait for health check
echo "🏥 Waiting for services to become healthy..."
sleep 30

if curl -f http://localhost:3021/api/health >/dev/null 2>&1; then
    echo "✅ Restore completed successfully"
else
    echo "❌ Service health check failed"
    exit 1
fi
```

### Disaster Recovery Plan

```yaml
# Disaster Recovery Runbook

Recovery Time Objectives (RTO):
  - Database: 15 minutes
  - Application: 10 minutes
  - Total System: 30 minutes

Recovery Point Objectives (RPO):
  - Database: 1 hour (hourly backups)
  - Configuration: 24 hours (daily backups)

Recovery Procedures:
  1. Assess Damage:
    - Identify failed components
    - Check backup integrity
    - Estimate recovery time

  2. Infrastructure Recovery:
    - Provision new server if needed
    - Install Docker and dependencies
    - Configure networking and security

  3. Data Recovery:
    - Restore latest database backup
    - Restore application data
    - Restore configuration files

  4. Service Recovery:
    - Start all containers
    - Verify health checks
    - Test critical functionality

  5. Post-Recovery:
    - Update DNS if needed
    - Notify stakeholders
    - Document lessons learned

Emergency Contacts:
  - Technical Lead: +1-xxx-xxx-xxxx
  - System Administrator: +1-xxx-xxx-xxxx
  - Management: +1-xxx-xxx-xxxx

Recovery Checklist: □ New server provisioned
  □ Docker installed and configured
  □ Backup files downloaded
  □ Database restored
  □ Application data restored
  □ Configuration restored
  □ SSL certificates restored
  □ Services started
  □ Health checks passing
  □ DNS updated (if needed)
  □ Monitoring restored
  □ Stakeholders notified
```

## Performance Optimization

### Application Performance

```typescript
// Production optimizations in next.config.js
module.exports = {
  // Enable compression
  compress: true,

  // Optimize images
  images: {
    optimization: true,
    formats: ['image/webp', 'image/avif'],
  },

  // Bundle analyzer
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    if (!dev && !isServer) {
      // Enable bundle splitting
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      }
    }
    return config
  },

  // Enable static optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@headlessui/react', '@heroicons/react'],
  },
}
```

### Database Performance

```sql
-- PostgreSQL production optimizations

-- Connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- Write performance
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Monitoring
ALTER SYSTEM SET log_min_duration_statement = 1000;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;

-- Apply settings
SELECT pg_reload_conf();
```

### Container Resource Limits

```yaml
# Optimized resource allocation
services:
  nself-admin:
    deploy:
      resources:
        limits:
          memory: 2G # Increased for production
          cpus: '2.0' # 2 CPU cores
        reservations:
          memory: 1G # Guaranteed memory
          cpus: '1.0' # 1 CPU core minimum

    # JVM tuning for better memory management
    environment:
      NODE_OPTIONS: '--max-old-space-size=1536 --gc-interval=100'

  postgres:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '4.0'
        reservations:
          memory: 2G
          cpus: '2.0'

  redis:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
        reservations:
          memory: 256M
          cpus: '0.5'
```

## Troubleshooting

### Common Production Issues

#### High Memory Usage

```bash
# Monitor memory usage
docker stats nself-admin

# Check for memory leaks
docker exec nself-admin node --inspect=0.0.0.0:9229 &
# Connect with Chrome DevTools

# Increase memory limit if needed
# In docker-compose.yml:
mem_limit: 2g
```

#### Database Connection Issues

```bash
# Check PostgreSQL status
docker exec nself-postgres pg_isready -U nself

# Check connection pool
docker exec nself-postgres psql -U nself -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
docker exec nself-postgres psql -U nself -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"
```

#### SSL Certificate Issues

```bash
# Check certificate expiration
openssl x509 -in /etc/nginx/ssl/cert.pem -text -noout | grep "Not After"

# Renew Let's Encrypt certificate
certbot renew --nginx

# Test SSL configuration
ssl-checjer admin.yourdomain.com

# Check Nginx configuration
nginx -t
systemctl reload nginx
```

#### Service Discovery Issues

```bash
# Check Docker network
docker network ls
docker network inspect nself_network

# Test internal connectivity
docker exec nself-admin ping postgres
docker exec nself-admin nc -zv postgres 5432

# Check DNS resolution
docker exec nself-admin nslookup postgres
```

### Performance Troubleshooting

```bash
# Monitor system resources
top -p $(docker inspect -f '{{.State.Pid}}' nself-admin)
iotop -p $(docker inspect -f '{{.State.Pid}}' nself-admin)

# Check disk usage
df -h
docker system df

# Monitor network
iftop
netstat -i

# Check container logs for errors
docker logs --tail 100 nself-admin
docker logs --tail 100 nself-postgres
```

### Emergency Procedures

#### Service Rollback

```bash
#!/bin/bash
# rollback.sh - Emergency rollback script

set -e

PREVIOUS_VERSION=${1:-"latest-stable"}

echo "🔄 Rolling back to version: $PREVIOUS_VERSION"

# Stop current service
docker-compose down

# Pull previous image
docker pull "nself/nself-admin:$PREVIOUS_VERSION"

# Update image tag
sed -i "s|nself/nself-admin:.*|nself/nself-admin:$PREVIOUS_VERSION|" docker-compose.yml

# Start with previous version
docker-compose up -d

# Wait for health check
sleep 30

if curl -f http://localhost:3021/api/health >/dev/null 2>&1; then
    echo "✅ Rollback completed successfully"
else
    echo "❌ Rollback failed - service unhealthy"
    exit 1
fi
```

#### Emergency Shutdown

```bash
#!/bin/bash
# emergency-shutdown.sh

echo "🚨 Emergency shutdown initiated"

# Graceful shutdown with timeout
timeout 30 docker-compose down || {
    echo "⚠️ Graceful shutdown timeout, forcing stop"
    docker kill $(docker ps -q)
}

# Verify all containers stopped
if [[ -z $(docker ps -q) ]]; then
    echo "✅ All containers stopped"
else
    echo "❌ Some containers still running"
    docker ps
fi
```

## Next Steps

- **[Security Guide](Security-Guide)** - Comprehensive security practices
- **[Monitoring Setup](Monitoring-Metrics)** - Advanced monitoring configuration
- **[API Reference](api/Reference)** - Complete API documentation
- **[Troubleshooting](Troubleshooting)** - Detailed troubleshooting guide

---

**Related Documentation**:

- [Architecture Overview](Architecture)
- [Environment Management](Environment-Management)
- [Performance Tuning](Performance-Tuning)
- [Backup Strategies](Backup-Strategies)
