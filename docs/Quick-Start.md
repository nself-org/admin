# Quick Start Guide

Get your complete development stack running in under 5 minutes with nself Admin.

## Prerequisites

Before you begin, ensure you have:

- ✅ **Docker Desktop** installed and running ([Download](https://www.docker.com/products/docker-desktop))
- ✅ **4GB RAM** available for Docker
- ✅ **10GB disk space** for containers and images
- ✅ **Terminal/Command Line** access

## 1. Launch nself Admin (30 seconds)

Open your terminal and run:

```bash
# Create a new project directory
mkdir my-project && cd my-project

# Launch nself Admin
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:latest
```

### What This Does:

- Creates a container running nself Admin
- Mounts your project directory
- Connects to Docker for container management
- Exposes the UI on port 3021

## 2. Access the UI (10 seconds)

Open your browser and navigate to:

```
http://localhost:3021
```

You'll see the nself Admin login screen.

## 3. Set Admin Password (20 seconds)

On first launch:

1. Enter a password (minimum 3 characters for development)
2. Click "Set Password"
3. You'll be redirected to the Init Wizard

## 4. Configure Your Stack (2 minutes)

The wizard will guide you through 6 simple steps:

### Step 1: Project Setup

```yaml
Project Name: my_app
Environment: Development
Domain: localhost
Admin Email: admin@localhost
Database Name: myapp
Database Password: [keep default for dev]
```

Click **Next** →

### Step 2: Required Services

These are pre-configured. Just click **Next** →

### Step 3: Optional Services

For a quick start, enable:

- ✅ **Redis** (for caching)
- ✅ **Storage** (for file uploads)

Click **Next** →

### Step 4: Custom Services

Add your first API service:

1. Click **"Add Service"**
2. Enter:
   - Name: `api`
   - Framework: `Express (TypeScript)`
   - Port: `4001`
   - Route: `api`
3. Click **Next** →

### Step 5: Frontend Apps

Add your frontend:

1. Click **"Add Your First App"**
2. Enter:
   - Name: `Web App`
   - Port: `3001`
   - URL: `app`
3. Click **Next** →

### Step 6: Review & Build

Review your configuration and click **Build Project** 🔨

## 5. Build Your Stack (1 minute)

Watch as nAdmin:

- Generates your docker-compose.yml
- Creates service configurations
- Sets up the database
- Configures networking

When complete, you'll be redirected to the Start page.

## 6. Start Services (30 seconds)

Click the **Start All Services** button.

nAdmin will launch:

- PostgreSQL database
- Hasura GraphQL engine
- Authentication service
- Nginx reverse proxy
- Redis cache
- MinIO storage
- Your custom API service

## 7. Access Your Services

Once running, you can access:

| Service              | URL                       | Credentials           |
| -------------------- | ------------------------- | --------------------- |
| **nAdmin Dashboard** | http://localhost:3021     | Your password         |
| **Hasura Console**   | http://localhost:8080     | Admin secret in .env  |
| **API Service**      | http://api.localhost      | No auth required      |
| **MinIO Console**    | http://localhost:9001     | minioadmin/minioadmin |
| **Frontend App**     | http://app.localhost:3001 | Your app              |

## 🎉 Congratulations!

You now have a complete development stack running with:

- ✅ PostgreSQL database
- ✅ GraphQL API (Hasura)
- ✅ Authentication service
- ✅ Redis cache
- ✅ S3-compatible storage
- ✅ Custom API service
- ✅ Nginx routing
- ✅ Real-time monitoring

## What's Next?

### Explore the Dashboard

Navigate to the Dashboard to see:

- Service health status
- Resource usage metrics
- Real-time logs
- Quick actions

### Test Your API

```bash
# Health check
curl http://api.localhost/health

# GraphQL endpoint
curl http://localhost:8080/v1/graphql \
  -H "x-hasura-admin-secret: your-secret" \
  -d '{"query":"{ __typename }"}'
```

### Add More Services

1. Go to **Services** → **Add Service**
2. Choose from 40+ framework templates
3. Configure and deploy instantly

### Connect Your Frontend

```javascript
// Example: Connect to Hasura
const client = new GraphQLClient('http://localhost:8080/v1/graphql', {
  headers: {
    'x-hasura-admin-secret': 'your-secret',
  },
})
```

## Common Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
```

### Stop Services

```bash
# Via UI
Navigate to Dashboard → Stop All

# Via CLI
docker-compose down
```

### Reset Everything

```bash
# Stop and remove everything
docker-compose down -v
rm -rf .env.* docker-compose.yml

# Start fresh
# Restart from step 1
```

## Troubleshooting Quick Fixes

### Port Already in Use

```bash
# Find what's using port 3021
lsof -i :3021

# Use a different port
docker run -d \
  --name nself-admin \
  -p 3022:3021 \  # Changed port
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:latest
```

### Docker Not Running

```bash
# Check Docker status
docker ps

# Start Docker Desktop
open -a Docker  # macOS
# or
systemctl start docker  # Linux
```

### Permission Denied

```bash
# Add sudo (Linux)
sudo docker run ...

# Or add user to docker group
sudo usermod -aG docker $USER
```

## Video Walkthrough

🎥 **[Watch 5-minute setup video](https://youtube.com/watch?v=demo)**

## Get Help

- 📚 **[Full Documentation](Home)**
- 💬 **[Discord Community](https://discord.gg/nself)**
- 🐛 **[Report Issues](https://github.com/nself-org/admin/issues)**
- ❓ **[FAQ](FAQ)**

## Pro Tips

1. **Use Chrome/Edge** for best UI experience
2. **Keep Docker Desktop open** while running
3. **Allocate 4GB+ RAM to Docker** for smooth operation
4. **Use the wizard's tooltips** - hover over ⓘ icons
5. **Check logs** if services don't start

## Example Projects

### E-Commerce API

```yaml
Services:
  - PostgreSQL + Hasura (GraphQL)
  - Redis (cart sessions)
  - MinIO (product images)
  - Node.js API (business logic)
  - Stripe webhook handler
```

### SaaS Platform

```yaml
Services:
  - PostgreSQL (multi-tenant)
  - Auth with OAuth providers
  - Redis (caching + queues)
  - Multiple microservices
  - Monitoring stack
```

### ML Application

```yaml
Services:
  - PostgreSQL (metadata)
  - MinIO (model storage)
  - MLflow (experiment tracking)
  - Python FastAPI (inference)
  - Redis (result caching)
```

---

**Ready for more?** Check out:

- [Init Wizard Detailed Guide](Init-Wizard-Guide)
- [Service Configuration](Service-Configuration)
- [Production Deployment](Production-Deployment)
