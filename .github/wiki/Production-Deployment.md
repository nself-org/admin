# Production Deployment

> **Important:** ɳSelf Admin (`nself-admin`) is a **local tool**, not a hosted web service. It is designed to run on the same machine as your nself stack, accessed at `http://localhost:3021`. There is **no production deployment to a public server, load balancer, CDN, or Kubernetes cluster.** This page exists to clarify what running ɳSelf Admin in a production-like setup actually means.

## What ɳSelf Admin IS

| Trait              | Detail                                                |
| ------------------ | ----------------------------------------------------- |
| Deployment surface | Local Docker container on the operator's machine      |
| Network exposure   | Bound to `127.0.0.1:3021` by default , never public   |
| Distribution       | Docker image: `nself/nself-admin`                     |
| Launch mechanism   | `nself admin start` (the CLI launches the container)  |
| Repo type          | Type B , Local tool (per SPORT F12)                   |
| Comparable to      | Portainer, Docker Desktop UI, pgAdmin running locally |

## What ɳSelf Admin IS NOT

- A SaaS product hosted at any URL on the internet
- A multi-tenant control plane
- A production web service requiring load balancers, Kubernetes, or a CDN
- An alternative to the `nself` CLI, every action delegates to a CLI command

## Running ɳSelf Admin Alongside Your nself Stack

The "production" deployment of ɳSelf Admin is starting it on the same VPS or workstation that runs your nself project, then accessing it through SSH port-forwarding or a private VPN.

### Option 1, Start via the CLI (recommended)

```bash
# In your nself project directory:
nself admin start
```

This pulls the `nself/nself-admin` Docker image, mounts the project workspace, and binds the UI to `127.0.0.1:3021`. The CLI handles:

- Docker image pull and version pinning
- Volume mounts for the project workspace and Docker socket
- LokiJS state persistence via a named volume
- Auto-stop on `nself stop`

### Option 2, Manual Docker Run

If you need to run the container directly (for example, a server without the nself CLI installed locally):

```bash
docker run -d \
  --name nself-admin \
  --restart unless-stopped \
  -p 127.0.0.1:3021:3021 \
  -v /path/to/your/nself-project:/workspace:rw \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v nself-admin-data:/app/data \
  -e NSELF_PROJECT_PATH=/workspace \
  -e ADMIN_SESSION_SECRET="$(openssl rand -hex 64)" \
  nself/nself-admin:latest
```

| Flag                                              | Why it matters                                                                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `-p 127.0.0.1:3021:3021`                          | Binds to localhost only. Never use `0.0.0.0` , the UI is not designed for public exposure.                                      |
| `-v ...:/workspace:rw`                            | The admin needs read/write access to your nself project files (env vars, generated docker-compose, nginx configs).              |
| `-v /var/run/docker.sock:/var/run/docker.sock:ro` | Required for the admin to read container status. Read-only is sufficient because the admin shells out to the CLI for mutations. |
| `-v nself-admin-data:/app/data`                   | Persists the LokiJS database (sessions, audit log, project cache).                                                              |

## Accessing the UI Remotely

Because the admin binds to `127.0.0.1`, remote access requires an SSH tunnel or a private VPN.

### SSH Port Forwarding

```bash
ssh -L 3021:127.0.0.1:3021 user@your-server
```

Then open `http://localhost:3021` in your local browser.

### Tailscale or WireGuard

Run the admin on your nself host as above, then access `http://<host-tailscale-ip>:3021` from any device on your VPN. The admin still binds to `127.0.0.1` on the host, your VPN provides the secure transport.

## Authentication

On first launch, the admin prompts for an initial password. Sessions auto-expire after 24 hours. Both the password hash and session tokens live in the LokiJS database mounted at `/app/data/`.

For most operators a single password is sufficient. The admin is a single-user tool, it is not multi-tenant.

## Persistence and Backups

- **State location:** `nself-admin-data` Docker volume → `/app/data/nadmin.db`
- **What's stored:** project cache, session tokens, audit log, password hash
- **Backup:** `docker run --rm -v nself-admin-data:/data -v $(pwd):/backup alpine tar czf /backup/nadmin-data.tar.gz -C /data .`
- **Restore:** reverse the same command with `tar xzf` instead.

## Updating

```bash
nself admin stop
nself admin update     # pulls latest image
nself admin start
```

The admin and the nself CLI are version-locked from v1.0.6 onward. Run `nself update` first, then update the admin image.

## Health Check

```bash
curl -fsS http://localhost:3021/api/health
```

Expected: `200 OK` with JSON `{"status":"ok"}`. Anything else means the container is not healthy, check `docker logs nself-admin`.

## What Lives Where

| Concern                                         | Owner                                                        |
| ----------------------------------------------- | ------------------------------------------------------------ |
| Service lifecycle (start, stop, build, restart) | The `nself` CLI                                              |
| Reverse proxy, SSL, public domains              | nginx generated by `nself build`, served by your nself stack |
| Database backups, migrations                    | `nself db backup`, `nself db migrate`                        |
| The local management UI on `:3021`              | `nself-admin` (this tool)                                    |

The admin never replaces or duplicates CLI functionality, it surfaces it through a web UI.

## Why There Is No Public Deployment Story

ɳSelf Admin has direct access to:

- Your project's environment files (including secrets)
- Your Docker socket
- Your filesystem

Exposing it publicly would mean exposing all of those. The CLI-equivalent surface is `nself` itself, running on the operator's machine, never publicly. The admin follows the same model.

If you need a public dashboard for your nself stack, that is a different problem solved by:

- **Grafana** (via the monitoring bundle), public-safe, read-only metrics dashboards
- **Custom internal admin app**, built on top of Hasura + Auth, with proper RBAC

ɳSelf Admin is intentionally not that tool.

## Related Pages

- [Architecture](Architecture)
- [Configuration](Configuration)
- [Troubleshooting](Troubleshooting)
- [Security Guide](Security-Guide)
