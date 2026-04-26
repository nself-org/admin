# Frequently Asked Questions (FAQ)

Full answers to common questions about nself Admin.

## Table of Contents

- [General Questions](#general-questions)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Services](#services)
- [Database](#database)
- [Performance](#performance)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Production](#production)

## General Questions

### What is nself Admin?

**Answer**: nself Admin (nAdmin) is a web-based UI wrapper for the nself CLI that provides a visual interface for setting up and managing modern development stacks. It runs in a Docker container and helps you configure, deploy, and monitor services like PostgreSQL, Hasura, Redis, and your custom applications.

### How is nself Admin different from Docker Compose?

**Answer**: While Docker Compose requires manual configuration file editing, nself Admin provides:

- Visual wizard for configuration
- Pre-configured templates for 40+ frameworks
- Real-time monitoring dashboard
- Automatic service discovery and routing
- Built-in backup and migration tools
- One-click deployment features

### Is nself Admin free to use?

**Answer**: Yes! nself Admin is open-source software licensed under the MIT License. You can use it for personal and commercial projects without any fees.

### What are the system requirements?

**Answer**:

- Docker Desktop (or Docker Engine on Linux)
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Port 3021 available for the UI

### Can I use nself Admin without Docker?

**Answer**: No, nself Admin is designed to run as a Docker container and manages other Docker containers. Docker is a core requirement.

## Installation & Setup

### How do I install nself Admin?

**Answer**: Run this single command:

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:latest
```

### Can I change the default port (3021)?

**Answer**: Yes! Map to a different port:

```bash
# Use port 8080 instead
docker run -d \
  --name nself-admin \
  -p 8080:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:latest
```

Then access at `http://localhost:8080`

### How do I update nself Admin?

**Answer**:

```bash
# Stop and remove old container
docker stop nself-admin
docker rm nself-admin

# Pull latest image
docker pull nself/nself-admin:latest

# Run new container with same volumes
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:latest
```

### Can I run multiple nself Admin instances?

**Answer**: Yes! Use different names and ports:

```bash
# Instance 1
docker run -d --name nself-admin-1 -p 3021:3021 ...

# Instance 2
docker run -d --name nself-admin-2 -p 3022:3021 ...
```

## Configuration

### Where are configuration files stored?

**Answer**: Configuration files are stored in your project directory:

- `.env.development` - Development environment variables
- `.env.staging` - Staging environment variables
- `.env.production` - Production environment variables
- `docker-compose.yml` - Service orchestration
- `nadmin.db` - nAdmin database (inside container)

### Can I edit configuration files manually?

**Answer**: Yes! You can edit `.env` files and `docker-compose.yml` directly. After editing:

1. Stop services: `docker-compose down`
2. Restart services: `docker-compose up -d`
3. Refresh nAdmin dashboard

### How do I add environment variables?

**Answer**: Three methods:

1. **Via UI**: Config → Environment Variables → Add
2. **Edit .env file**: Add `MY_VAR=value`
3. **Docker Compose**: Add to service environment section

### Can I use existing docker-compose.yml?

**Answer**: Yes! nAdmin can work with existing projects:

1. Navigate to your project directory
2. Launch nAdmin
3. It will detect existing configuration
4. Use "Edit Existing" option in wizard

### How do I change database passwords?

**Answer**:

1. **Development**: Edit `.env.development`
2. **Production**:
 - Stop services
 - Update password in `.env.production`
 - Update in PostgreSQL: `ALTER USER postgres PASSWORD 'new-password';`
 - Restart services

## Services

### What services are included?

**Answer**:
**Core Services** (Always enabled):

- PostgreSQL - Database
- Hasura - GraphQL API
- Auth - Authentication
- Nginx - Reverse proxy

**Optional Services**:

- Redis - Caching
- MinIO - Object storage
- Mailpit - Email testing
- MeiliSearch - Search engine
- MLflow - ML tracking
- Monitoring Stack (8 services)

### Can I add custom services?

**Answer**: Yes! The wizard supports:

- 40+ pre-configured templates
- Custom Docker containers
- Any programming language
- Automatic routing configuration

### How do I add a Python/FastAPI service?

**Answer**:

1. In wizard Step 4, click "Add Service"
2. Select "FastAPI" from framework dropdown
3. Set port (e.g., 4001)
4. Set route (e.g., "api")
5. Complete wizard and build

### Can I use my own Docker images?

**Answer**: Yes! Select "Custom Docker" and specify:

- Your Docker image name
- Required environment variables
- Port mappings
- Volume mounts

### How do I access service logs?

**Answer**: Multiple methods:

1. **Dashboard**: Click service → View Logs
2. **CLI**: `docker-compose logs -f service-name`
3. **API**: `GET /api/docker/logs?service=postgres`

## Database

### How do I connect to PostgreSQL?

**Answer**:
**From host machine**:

```bash
psql -h localhost -p 5432 -U postgres -d myapp
```

**From application**:

```
postgres://postgres:password@postgres:5432/myapp
```

**From Hasura**:
Automatically configured via `DATABASE_URL`

### How do I run migrations?

**Answer**:

1. **Via Hasura Console**: Data → Migrations
2. **Via CLI**: `hasura migrate apply`
3. **Via nAdmin**: Database → Migrations → Apply

### How do I backup the database?

**Answer**:
**Manual Backup**:

```bash
docker exec postgres pg_dump -U postgres myapp > backup.sql
```

**Via nAdmin**:

1. Database → Backup → Create Backup
2. Or enable automated backups in wizard

### How do I restore from backup?

**Answer**:

```bash
# Restore from file
docker exec -i postgres psql -U postgres myapp < backup.sql

# Via nAdmin
Database → Backup → Select file → Restore
```

### Can I use an external database?

**Answer**: Yes! In the wizard:

1. Disable the PostgreSQL service
2. Set `DATABASE_URL` to your external database
3. Ensure network connectivity

## Performance

### How much RAM does nself Admin need?

**Answer**:

- nAdmin itself: 256MB
- Minimum total: 4GB
- Recommended: 8GB+
- Production: 16GB+

### How can I improve performance?

**Answer**:

1. **Allocate more Docker resources**:
 - Docker Desktop → Settings → Resources
 - Increase CPU and Memory

2. **Optimize services**:

   ```yaml
   services:
     postgres:
       mem_limit: 2g
       cpus: '2.0'
   ```

3. **Enable caching**: Add Redis service

4. **Use production builds**: Set `NODE_ENV=production`

### Why are my services slow to start?

**Answer**: Common causes:

- First run downloads images (normal)
- Insufficient RAM allocated to Docker
- Many services starting simultaneously
- Database initialization on first run

Solutions:

- Increase Docker memory
- Start services sequentially
- Use faster storage (SSD)

### How do I monitor resource usage?

**Answer**:

1. **Dashboard**: Real-time metrics displayed
2. **CLI**: `docker stats`
3. **Grafana**: If monitoring stack enabled
4. **API**: `GET /api/system/metrics`

## Security

### Is nself Admin secure for production?

**Answer**: nAdmin includes security features but requires proper configuration:

- Change all default passwords
- Use SSL/TLS in production
- Enable firewall rules
- Regular security updates
- Implement backup strategy

### How do I enable SSL/HTTPS?

**Answer**:
**Let's Encrypt (Production)**:

1. Set domain in wizard
2. Enable SSL in Nginx config
3. Provide valid email
4. Auto-renewal configured

**Custom Certificate**:

```bash
# Place certificates in nginx/ssl/
nginx/ssl/cert.pem
nginx/ssl/key.pem
```

### How do I secure the database?

**Answer**:

1. Change default password
2. Limit connections: `max_connections=100`
3. Enable SSL: `ssl=on`
4. Restrict network access
5. Regular backups
6. Audit logging

### Can I use OAuth providers?

**Answer**: Yes! Configure in Auth service:

- Google OAuth
- GitHub OAuth
- Facebook Login
- Custom OIDC providers

### How do I manage secrets?

**Answer**: Best practices:

1. Never commit `.env` files
2. Use Docker secrets in production
3. Rotate credentials regularly
4. Use secret management tools (Vault, AWS Secrets Manager)

## Troubleshooting

### nAdmin won't start

**Answer**: Check:

```bash
# Is Docker running?
docker ps

# Check logs
docker logs nself-admin

# Port conflict?
lsof -i :3021

# Permissions issue?
sudo docker run ...
```

### "Cannot connect to Docker daemon"

**Answer**:

1. Ensure Docker Desktop is running
2. Check socket permissions:
   ```bash
   ls -la /var/run/docker.sock
   sudo chmod 666 /var/run/docker.sock
   ```
3. Add user to docker group:
   ```bash
   sudo usermod -aG docker $USER
   ```

### Services won't start

**Answer**: Common fixes:

```bash
# Check logs
docker-compose logs service-name

# Remove and recreate
docker-compose down
docker-compose up -d

# Clear volumes (data loss!)
docker-compose down -v
```

### Port already in use

**Answer**:

```bash
# Find process using port
lsof -i :5432

# Kill process
kill -9 <PID>

# Or change port in .env
POSTGRES_PORT=5433
```

### Build fails

**Answer**:

1. Check Docker space: `docker system df`
2. Clean up: `docker system prune -a`
3. Increase memory allocation
4. Check network connectivity
5. Review error logs

## Development

### How do I enable hot reload?

**Answer**: Hot reload is enabled by default for custom services in development. Ensure:

- `NODE_ENV=development`
- Volume mounted correctly
- Using nodemon/webpack-dev-server

### Can I use TypeScript?

**Answer**: Yes! Select TypeScript variants:

- Express (TS)
- Fastify (TS)
- NestJS (TS)
- Node (TS)

### How do I debug services?

**Answer**:

1. **Enable debug logs**: `DEBUG=*`
2. **Attach debugger**:
   ```json
   {
     "type": "node",
     "request": "attach",
     "port": 9229,
     "remoteRoot": "/app"
   }
   ```
3. **Use dashboard terminal**: Shell access to containers

### Can I use custom domains locally?

**Answer**: Yes! Edit `/etc/hosts`:

```
127.0.0.1 api.myapp.local
127.0.0.1 app.myapp.local
```

## Production

### How do I deploy to production?

**Answer**:

1. **Build production config**: Set environment to "Production"
2. **Generate files**: Complete wizard
3. **Copy to server**: Transfer files
4. **Run on server**:
   ```bash
   docker-compose -f docker-compose.yml \
     -f docker-compose.production.yml up -d
   ```

### Can I use Kubernetes?

**Answer**: Yes! Export configurations:

1. Generate docker-compose.yml
2. Use Kompose to convert:
   ```bash
   kompose convert -f docker-compose.yml
   ```
3. Deploy to Kubernetes cluster

### How do I scale services?

**Answer**:

```bash
# Scale horizontally
docker-compose up -d --scale api=3

# Or in docker-compose.yml
services:
  api:
    deploy:
      replicas: 3
```

### What about CI/CD?

**Answer**: nAdmin generated files work with:

- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Any Docker-based CI/CD

### How do I monitor production?

**Answer**: Enable monitoring stack for:

- Prometheus metrics
- Grafana dashboards
- Loki log aggregation
- Alertmanager notifications

## Still Have Questions?

### Where can I get help?

- 📚 **[Full Documentation](Home)**
- 💬 **[GitHub Discussions](https://github.com/nself-org/admin/discussions)**
- 🐛 **[Report Issues](https://github.com/nself-org/admin/issues)**
- 🎮 **[community at chat.nself.org](https://chat.nself.org)**

### How can I contribute?

We welcome contributions!

- Read [Contributing Guide](Contributing)
- Check [open issues](https://github.com/nself-org/admin/issues)
- Submit pull requests
- Improve documentation
- Share your workflow

---

**Didn't find your answer?** [Ask in Discussions](https://github.com/nself-org/admin/discussions/new)
