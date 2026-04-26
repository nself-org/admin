# Installation Guide

## Prerequisites

Before installing nAdmin, ensure you have the following:

- **Docker**: Version 20.10 or higher
- **nself CLI**: Latest version installed globally
- **Operating System**: macOS, Linux, or Windows with WSL2
- **Available Port**: 3021 (or configure alternative)

## Installation Methods

### Method 1: Using nself CLI (Recommended)

The simplest way to run nAdmin is through the nself CLI:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Start nAdmin
nself admin
```

This command will:

1. Pull the latest nAdmin Docker image
2. Start the container on port 3021
3. Mount your project directory as a volume
4. Open your browser to http://localhost:3021

### Method 2: Docker Run

For more control over the configuration:

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v /path/to/your/project:/workspace:rw \
  -v nself-admin-data:/app/data \
  -e NSELF_PROJECT_PATH=/workspace \
  nself/nself-admin:latest
```

### Method 3: Docker Compose

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  nself-admin:
    image: nself/nself-admin:latest
    container_name: nself-admin
    ports:
      - '3021:3021'
    volumes:
      - /path/to/your/project:/workspace:rw
      - nself-admin-data:/app/data
    environment:
      - NSELF_PROJECT_PATH=/workspace
      - NODE_ENV=production
    restart: unless-stopped

volumes:
  nself-admin-data:
```

Then run:

```bash
docker-compose up -d
```

## Port Configuration

If port 3021 is already in use, nAdmin will automatically try ports 3022-3030:

```bash
# Specify a custom port
docker run -d \
  -p 8080:3021 \
  # ... other options
  nself/nself-admin:latest
```

Then access at http://localhost:8080

## Volume Mounts

### Required Volumes

1. **Project Directory**: Your nself project mounted at `/workspace`

   ```bash
   -v /path/to/your/project:/workspace:rw
   ```

2. **Data Persistence**: Database storage
   ```bash
   -v nself-admin-data:/app/data
   ```

### Permissions

Ensure the Docker container has read/write access to your project:

```bash
# Check current permissions
ls -la /path/to/your/project

# If needed, adjust permissions (example)
chmod -R 755 /path/to/your/project
```

## Environment Variables

| Variable | Description | Default |
| -------------------- | -------------------------------- | ------------- |
| `NSELF_PROJECT_PATH` | Path to project inside container | `/workspace` |
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | Internal port | `3021` |
| `HOSTNAME` | Container hostname | Auto-detected |

## Verification

After installation, verify nAdmin is running:

### Check Container Status

```bash
docker ps | grep nself-admin
```

### Check Logs

```bash
docker logs nself-admin
```

### Access the Dashboard

Open your browser to http://localhost:3021

You should see:

- First-time setup: Password configuration screen
- Returning user: Login screen
- After login: Project setup wizard or dashboard

## Upgrading

### Pull Latest Image

```bash
docker pull nself/nself-admin:latest
```

### Restart Container

```bash
docker stop nself-admin
docker rm nself-admin
# Run the docker run command again
```

### Preserve Data

Your data is preserved in the `nself-admin-data` volume. To backup:

```bash
docker run --rm \
  -v nself-admin-data:/data \
  -v $(pwd):/backup \
  busybox tar czf /backup/nself-admin-backup.tar.gz /data
```

## Uninstallation

### Stop and Remove Container

```bash
docker stop nself-admin
docker rm nself-admin
```

### Remove Image (Optional)

```bash
docker rmi nself/nself-admin:latest
```

### Remove Data Volume (Optional)

⚠️ **Warning**: This will delete all nAdmin data including passwords and settings

```bash
docker volume rm nself-admin-data
```

## Password Management

### Setting Initial Password

On first launch, you'll be prompted to set an admin password. The requirements depend on your environment:

- **Development** (localhost, \*.local): Minimum 3 characters
- **Production**: Minimum 12 characters with uppercase, lowercase, number, and special character

### Resetting Password

If you need to reset the admin password:

#### Using nself CLI (Recommended)

```bash
nself admin reset-password
```

This command will:

1. Stop the nAdmin container
2. Clear the password from the database
3. Restart the container
4. Prompt for a new password on next login

#### Manual Reset

```bash
# Delete the database file
docker exec nself-admin rm /app/data/nadmin.db

# Restart the container
docker restart nself-admin
```

**Note**: This will also clear sessions and cached data, but your project data remains safe.

## Troubleshooting

### Container Won't Start

Check logs for errors:

```bash
docker logs nself-admin
```

### Permission Denied

Ensure proper volume permissions:

```bash
docker exec nself-admin ls -la /workspace
```

### Port Already in Use

Find what's using port 3021:

```bash
lsof -i :3021
```

Use a different port or stop the conflicting service.

### Can't Access Dashboard

1. Check container is running: `docker ps`
2. Check port mapping: `docker port nself-admin`
3. Try accessing: `curl http://localhost:3021/api/health`

## Next Steps

- [Quick Start Guide](quick-start.md) - Get up and running quickly
- [Configuration](configuration.md) - Detailed configuration options
- [First Time Setup](../guides/first-time-setup.md) - Initial password and project setup
