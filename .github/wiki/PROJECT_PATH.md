# Project Path Configuration

## Overview

The nself-admin app manages an nself backend project. The location of this project varies depending on the deployment context:

## Development Mode

When running in development (`npm run dev`), the app uses the `.backend` folder within the nself-admin project itself:

- Path: `/Users/admin/Sites/nself-admin/.backend`
- This folder contains a complete nself project structure
- Developers can test the admin interface against this local backend

## Production Mode (Docker Container)

When deployed as a Docker container (which is how nself CLI will run it), the app expects:

1. **Volume Mount**: The user's actual nself project directory is mounted into the container
2. **Environment Variable**: `PROJECT_PATH` is set to point to the mounted directory
3. **Docker Socket**: The Docker socket is mounted (read-only or read-write) for container management

### Example Docker Run Command (used by nself CLI):

```bash
docker run -d \
  -p 3021:3021 \
  -v /path/to/user/project:/project:rw \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e PROJECT_PATH=/project \
  -e ADMIN_PASSWORD=secure_password \
  nself/nself-admin:latest
```

## How It Works

1. The `getProjectPath()` function in `src/lib/paths.ts` determines the correct path:

- First checks for `PROJECT_PATH` environment variable (production)
- Falls back to `.backend` folder in development
- Default: `./.backend` as last resort

2. All nself CLI commands are executed in this project directory:

- `nself init` - Initialize project structure
- `nself build` - Generate Docker configurations
- `nself start` - Start backend services
- `nself stop` - Stop services
- `nself status` - Check service health

3. The admin interface provides:

- Real-time monitoring of Docker containers
- Service health checks
- Log viewing
- Configuration management
- Database management tools

## Security Considerations

- In production, the Docker socket should be mounted read-only (`:ro`) for security
- The project directory can be mounted read-write (`:rw`) if configuration changes are needed
- Always use strong passwords for `ADMIN_PASSWORD` in production
- Consider using HTTPS with proper certificates in production deployments
