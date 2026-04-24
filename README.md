# ɳSelf Admin

[![Version](https://img.shields.io/github/v/release/nself-org/admin?label=version)](https://github.com/nself-org/admin/releases)
[![Docker](https://img.shields.io/docker/v/nself/nself-admin?label=docker)](https://hub.docker.com/r/nself/nself-admin)
[![Docker Pulls](https://img.shields.io/docker/pulls/nself/nself-admin)](https://hub.docker.com/r/nself/nself-admin)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

[![Build](https://github.com/nself-org/admin/actions/workflows/test.yml/badge.svg)](https://github.com/nself-org/admin/actions/workflows/test.yml)
[![Security](https://github.com/nself-org/admin/actions/workflows/dependency-audit.yml/badge.svg)](https://github.com/nself-org/admin/actions/workflows/dependency-audit.yml)

[![GitHub stars](https://img.shields.io/github/stars/nself-org/admin?style=social)](https://github.com/nself-org/admin)
[![GitHub issues](https://img.shields.io/github/issues/nself-org/admin)](https://github.com/nself-org/admin/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/nself-org/admin)](https://github.com/nself-org/admin/pulls)

**Production-ready web UI for the [nself CLI](https://github.com/nself-org/cli)** - Enterprise-grade management interface for your self-hosted backend stack.

> **v1.0.11** is the current release featuring 198 fully functional pages, 60+ production-grade components, real-time updates, error handling, and security hardening.

---

## Table of Contents

- [What is nself-admin?](#what-is-nself-admin)
- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Screenshots](#screenshots)
- [Documentation](#documentation)
- [Technology Stack](#technology-stack)
- [System Requirements](#system-requirements)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

---

## What is ɳSelf Admin?

ɳSelf Admin is a **web-based administration interface** that wraps the [nself CLI](https://github.com/nself-org/cli). Instead of running commands in your terminal, you get a real-time dashboard to manage your self-hosted backend stack.

### Why ɳSelf Admin?

- **Visual Interface** - No need to memorize CLI commands
- **Real-Time Updates** - WebSocket-powered live monitoring
- **Team Collaboration** - Share access to your infrastructure
- **Production-Ready** - Enterprise-grade security and error handling
- **Mobile-Friendly** - Manage your stack from anywhere
- **Zero Lock-In** - Pure UI wrapper, all data stays with nself CLI

### Who Should Use ɳSelf Admin?

- **Developers** who prefer GUIs over command-line interfaces
- **Teams** who need shared access to infrastructure management
- **DevOps Engineers** managing multiple environments (dev, staging, prod)
- **Startups** who want production-grade tooling without complexity
- **Anyone** running the nself CLI and wanting a better UX

---

## Key Features

### Service Management

- Real-time service status monitoring
- One-click start/stop/restart controls
- Live container logs with ANSI support
- Resource usage metrics (CPU, memory, disk)
- Service dependency visualization
- Container shell access

### Database Tools

- Full-featured SQL console with Monaco editor
- Backup creation and restoration wizard
- Automated backup scheduling
- Migration management (create, run, rollback)
- Schema browser with table visualization
- Query history and saved queries
- Export results (CSV, JSON)
- Query explain/analyze support

### Multi-Environment Deployment

- Environment selector (Local, Dev, Staging, Production)
- Side-by-side configuration comparison
- Blue-green deployment strategy
- Canary deployment controls
- Preview environment generation
- One-click rollback
- Deployment history and audit log

### Real-Time Updates

- WebSocket-based live monitoring
- Server-sent events for long operations
- Live log streaming
- Real-time metrics dashboards
- Instant container status updates

### Security & Access Control

- Bcrypt password hashing
- Session management with httpOnly cookies
- Environment-based access control (dev/staging/prod)
- Secrets management per environment
- Audit logging for all actions
- CSRF protection
- Rate limiting

### SSL Certificate Management

- Local certificates via mkcert
- Let's Encrypt automation
- Certificate renewal automation
- Trust store management
- Multi-domain support

### Monitoring & Observability

- Grafana dashboard integration
- Prometheus metrics viewer
- Loki log aggregation
- Custom metrics dashboards
- Performance profiling
- Uptime monitoring

### Cloud Integration

- AWS (EC2, RDS, S3, Route53)
- Google Cloud Platform
- DigitalOcean
- Microsoft Azure
- Server provisioning wizard
- Multi-cloud deployment

### Kubernetes Ready

- Cluster management
- Namespace viewer
- Pod monitoring and logs
- Helm chart management
- Service mesh integration
- Resource quotas and limits

---

## Quick Start

### Option 1: Via nself CLI (Recommended)

```bash
# If you have nself installed
nself admin
```

Open http://localhost:3021 and follow the setup wizard.

### Option 2: Direct Docker

```bash
docker run -d \
  --name nself-admin \
  -p 3021:3021 \
  -v $(pwd):/workspace \
  -v /var/run/docker.sock:/var/run/docker.sock \
  nself/nself-admin:latest
```

### First-Time Setup

1. **Set Admin Password** - Create your secure admin password
2. **Initialize Project** - Run the 6-step setup wizard
3. **Start Services** - Launch your backend stack
4. **Access Dashboard** - Monitor and manage everything in real-time

That's it! You're ready to go.

---

## Screenshots

Screenshots are coming in a future release. For a live tour, run `nself admin start` and open `http://localhost:3021`.

---

## Documentation

### Getting Started

- [User Guide](https://github.com/nself-org/admin/wiki/USER_GUIDE) - Step-by-step tutorials for common tasks
- [Deployment Guide](https://github.com/nself-org/admin/wiki/DEPLOYMENT) - Production deployment instructions
- [Development Guide](https://github.com/nself-org/admin/wiki/DEVELOPMENT) - Local development setup

### Technical Documentation

- [Architecture](https://github.com/nself-org/admin/wiki/ARCHITECTURE) - System architecture and design
- [API Reference](https://github.com/nself-org/admin/wiki/API) - API documentation
- [Migration Guide](https://github.com/nself-org/admin/wiki/MIGRATION) - Upgrading between versions

### Additional Resources

- [Changelog](https://github.com/nself-org/admin/wiki/CHANGELOG) - Release history
- [Roadmap](https://github.com/nself-org/admin/wiki/ROADMAP) - Upcoming features
- [Security](https://github.com/nself-org/admin/wiki/SECURITY) - Security policies
- [Troubleshooting](https://github.com/nself-org/admin/wiki/TROUBLESHOOTING) - Common issues and solutions

---

## Technology Stack

### Frontend

- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript 5.9 (strict mode)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, Headless UI
- **State Management**: Zustand, SWR
- **Real-Time**: Socket.io (WebSocket)
- **Code Editor**: Monaco Editor
- **Charts**: Recharts

### Backend

- **Runtime**: Node.js 18+
- **Database**: LokiJS (embedded)
- **Authentication**: bcryptjs
- **Container**: Docker 20+

### Development

- **Testing**: Jest, Playwright, Testing Library
- **Linting**: ESLint (strict)
- **Formatting**: Prettier
- **Package Manager**: pnpm 8+

---

## System Requirements

### Development

- Node.js 18+
- pnpm 8+
- Docker 20+
- 4GB RAM minimum
- 10GB disk space

### Production

- Docker 20+
- 2GB RAM minimum
- 10GB disk space
- Linux/macOS/Windows (WSL2)

### Browser Support

- Chrome/Edge 100+
- Firefox 100+
- Safari 15+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Performance

- **Initial Load**: < 1.5s on average connection
- **API Response**: < 100ms for most operations
- **Real-Time Updates**: < 50ms latency
- **Lighthouse Score**: 95+ across all metrics
- **Bundle Size**: Optimized with code splitting

---

## Environment Variables

### Required (Docker deployment)

| Variable             | Description                | Default      |
| -------------------- | -------------------------- | ------------ |
| `NSELF_PROJECT_PATH` | Path to your nself project | `/workspace` |

### Optional

| Variable        | Description                          | Default |
| --------------- | ------------------------------------ | ------- |
| `PORT`          | Server port                          | `3021`  |
| `NODE_ENV`      | Environment (development/production) | -       |
| `ADMIN_VERSION` | Version displayed in UI              | `1.0.0` |

**Note**: Admin password is stored securely in the internal database (`nadmin.db`), not in environment variables.

---

## Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

```bash
# Clone repository
git clone https://github.com/nself-org/admin.git
cd nself-admin

# Install dependencies
pnpm install

# Run development server
PORT=3021 pnpm dev

# Run tests
pnpm test

# Type checking
pnpm run type-check

# Linting
pnpm run lint

# Format code
pnpm run format

# Build for production
pnpm run build
```

### Code Quality Standards

All code must pass:

- TypeScript type checking (strict mode)
- ESLint (zero warnings, zero errors)
- Prettier formatting
- Unit tests (90%+ coverage target)
- E2E tests for critical flows

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run quality checks (`pnpm run lint && pnpm run type-check && pnpm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

See [Contributing](https://github.com/nself-org/admin/wiki/Contributing) for detailed guidelines.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/nself-org/admin/issues)
- **Discussions**: [GitHub Discussions](https://github.com/nself-org/admin/discussions)
- **Security**: See [Security](https://github.com/nself-org/admin/wiki/SECURITY) for reporting vulnerabilities
- **Documentation**: [Full Documentation](https://github.com/nself-org/admin/wiki)

---

## Roadmap

### Upcoming

- Multi-tenant support
- Advanced RBAC (role-based access control)
- Plugin marketplace
- Advanced analytics dashboard
- AI-powered troubleshooting
- Enhanced mobile app experience

See [Roadmap](https://github.com/nself-org/admin/wiki/ROADMAP) for the full roadmap.

---

## Access Control

Admin is single-operator in v1.x. One password authenticates one operator with full access. There are no roles, no per-user MFA enrollment, and no multi-tenant user separation in the Admin UI. Hasura roles continue to govern data-layer permissions for end-users of your nSelf-powered apps. Multi-user Admin (role-based operator access) is planned for v1.2.0. See [Admin Single-Operator Posture](https://docs.nself.org/admin/single-user-posture) for details.

---

## License

MIT - See [LICENSE](LICENSE) for details.

---

## Credits

Built by [nself](https://nself.org) · [GitHub](https://github.com/nself-org) · [Docker Hub](https://hub.docker.com/r/nself/nself-admin)

### Key Technologies

- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [Radix UI](https://www.radix-ui.com/) - Headless components
- [Socket.io](https://socket.io/) - Real-time communication
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [Recharts](https://recharts.org/) - Charting library

---

**Star us on GitHub** if you find ɳSelf Admin useful!

[![GitHub stars](https://img.shields.io/github/stars/nself-org/admin?style=social)](https://github.com/nself-org/admin)
