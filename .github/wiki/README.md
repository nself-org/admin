# nself Admin Documentation

Welcome to the nself Admin documentation. This full guide will help you understand, deploy, and use nself Admin effectively.

## 🚀 Quick Start

- **[Installation & Setup](Quick-Start.md)** - Get nself Admin running in 5 minutes
- **[First Project](guides/First-Time-Setup.md)** - Create your first project with the wizard
- **[Docker Deployment](deployment/Docker.md)** - Deploy with Docker

## 📖 Core Guides

### Getting Started

- **[Quick Start](Quick-Start.md)** - 5-minute setup guide
- **[Installation](setup/Installation.md)** - Detailed installation instructions
- **[Init Wizard Guide](Init-Wizard-Guide.md)** - Complete wizard walkthrough
- **[First Time Setup](guides/First-Time-Setup.md)** - Step-by-step first project

### User Guides

- **[Dashboard Overview](Dashboard-Overview.md)** - Understanding the dashboard
- **[Service Configuration](Service-Configuration.md)** - Managing services
- **[Database Management](Database-Management.md)** - Working with databases
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - Configuration reference

### Plugin System (NEW in v0.0.8)

- **[Plugins Overview](Plugins.md)** - Complete plugin documentation
- **[Stripe Plugin](Plugins.md#stripe-plugin)** - Payment processing integration
- **[GitHub Plugin](Plugins.md#github-plugin)** - Repository and DevOps data
- **[Shopify Plugin](Plugins.md#shopify-plugin)** - E-commerce integration
- **[Webhook Integration](Plugins.md#webhook-integration)** - Real-time event handling
- **[Plugin Development](Plugins.md#plugin-development)** - Create custom plugins

### Advanced Usage

- **[Production Deployment](Production-Deployment.md)** - Deploy to production
- **[CLI Integration](CLI_INTEGRATION.md)** - nself CLI integration
- **[Build Process](Build-Process.md)** - Understanding builds
- **[Monitoring](Monitoring.md)** - Health monitoring and metrics

## 🏗️ Architecture & Development

### Architecture

- **[System Architecture](ARCHITECTURE.md)** - Complete architecture overview
- **[Database Design](architecture/Database.md)** - Database schema and design
- **[Security Model](SECURITY.md)** - Authentication and security

### API Reference

- **[API Documentation](API.md)** - Complete REST API reference
- **[Authentication](api/Authentication.md)** - API authentication guide
- **[WebSocket Events](api/WebSocket.md)** - Real-time events

### Development

- **[Development Setup](development/Setup.md)** - Local development guide
- **[Contributing](contributing/CONTRIBUTING.md)** - How to contribute
- **[CI/CD Setup](CI_SETUP.md)** - Continuous integration

## 🔧 Operations

### Deployment

- **[Docker Deployment](deployment/Docker.md)** - Deploy with Docker
- **[Kubernetes](deployment/Kubernetes.md)** - Deploy to Kubernetes
- **[Environment Setup](deployment/Environment.md)** - Environment configuration

### Maintenance

- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions
- **[FAQ](FAQ.md)** - Frequently asked questions
- **[Updates](Updates.md)** - Updating nself Admin

## 📋 Reference

- **[Changelog](CHANGELOG.md)** - Version history and changes
- **[Security Policy](SECURITY.md)** - Security reporting and policy
- **[License](LICENSE.md)** - License information

## 🆘 Support

- **[GitHub Issues](https://github.com/nself-org/admin/issues)** - Report bugs or request features
- **[Discussions](https://github.com/nself-org/admin/discussions)** - Community support
- **[Community chat](https://chat.nself.org)** - Real-time chat support

---

## Quick Navigation

| Topic | Description | Link |
| ---------------------- | -------------------------- | ------------------------------------- |
| 🚀 **Quick Start** | Get running in 5 minutes | [Quick Start](Quick-Start.md) |
| 🎯 **Setup Wizard** | Complete wizard guide | [Init Wizard](Init-Wizard-Guide.md) |
| 📊 **Dashboard** | Using the dashboard | [Dashboard](Dashboard-Overview.md) |
| 🔧 **Services** | Managing services | [Services](Service-Configuration.md) |
| 🧩 **Plugins** | Third-party integrations | [Plugins](Plugins.md) |
| 🗄️ **Database** | Database operations | [Database](Database-Management.md) |
| 🏗️ **Architecture** | System design | [Architecture](ARCHITECTURE.md) |
| 📡 **API** | REST API reference | [API Docs](API.md) |
| 🐳 **Docker** | Docker deployment | [Docker](deployment/Docker.md) |
| 🚨 **Troubleshooting** | Common issues | [Troubleshooting](TROUBLESHOOTING.md) |
| ❓ **FAQ** | Frequently asked questions | [FAQ](FAQ.md) |

---

## Key Features

### 🎯 Setup Wizard

- **6-step guided configuration** with progress tracking
- **Auto-save** functionality preserves changes instantly
- **Smart defaults** based on environment (dev/staging/prod)
- **Validation** ensures correct configuration
- **Visual builders** for cron schedules and service configuration

### 🔧 Service Management

- **Core Services**: PostgreSQL, Hasura, Auth, Nginx (always enabled)
- **Optional Services**: Redis, Storage, Search, Monitoring, Email
- **Custom Services**: Add your own backend services
- **Frontend Apps**: Configure multiple frontend applications

### 🧩 Plugin System (NEW)

- **Stripe Integration**: Sync customers, subscriptions, invoices, payments
- **GitHub Integration**: Sync repositories, issues, PRs, Actions, deployments
- **Shopify Integration**: Sync products, orders, customers, inventory
- **Webhook Handlers**: Real-time event processing with signature verification
- **GraphQL Ready**: Query plugin data via Hasura GraphQL immediately

### 📊 Monitoring & Management

- **Real-time logs** from all services
- **Service health** monitoring
- **Database management** tools
- **Backup configuration** with visual scheduling
- **Resource usage** tracking

### 🔒 Security

- **Admin authentication** with secure sessions
- **Secret management** with proper validation
- **Environment isolation** (dev/staging/prod)
- **CORS configuration** for production
- **JWT authentication** setup

## Environment Variables

nself-admin follows the official **nself Environment Variable Specification v1.0**.

### Key Principles

1. **Service Enable Flags**: All services have `*_ENABLED` flags
2. **Core Services**: Default to `true` for backward compatibility
3. **File Hierarchy**: `.env.dev` → `.env.staging` → `.env.prod` → `.env`
4. **Naming Convention**: Consistent, predictable variable names
5. **Backward Compatibility**: Supports deprecated variables

### Quick Reference

```bash
# Core Configuration
ENV=dev                    # Environment mode
PROJECT_NAME=my-app       # Project identifier
BASE_DOMAIN=localhost     # Base domain

# Service Flags (examples)
POSTGRES_ENABLED=true     # Core service
STORAGE_ENABLED=true      # Core service (MinIO)
REDIS_ENABLED=false       # Optional service
NSELF_ADMIN_ENABLED=true  # This admin UI

# Hasura Configuration
HASURA_GRAPHQL_ADMIN_SECRET=<32+ chars>
HASURA_JWT_KEY=<32+ chars>
HASURA_JWT_TYPE=HS256

# Custom Services
CS_1=api:express:4000:api
CS_2=worker:python:4001

# Frontend Apps
FRONTEND_APP_1_PORT=3001  # Required!
FRONTEND_APP_1_ROUTE=app
```

See [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) for complete reference.

## Development

### Prerequisites

- Node.js 18+
- Docker Desktop
- nself CLI (optional)

### Local Development

```bash
# Install dependencies
npm install

# Set project path (optional)
export NSELF_PROJECT_PATH=../my-project

# Start development server
PORT=3021 npm run dev

# Access at http://localhost:3021
```

### Build for Production

```bash
# Build application
npm run build

# Build Docker image
docker build -t nself-admin .

# Run container
docker run -p 3021:3021 \
  -v /path/to/project:/workspace \
  nself-admin
```

### Testing

```bash
# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## Contributing

We welcome contributions! Please see [contributing/CONTRIBUTING.md](contributing/CONTRIBUTING.md) for:

- Code of Conduct
- Development setup
- Coding standards
- Pull request process
- Issue reporting

## Security

### Reporting Issues

Please report security vulnerabilities to our [security policy](SECURITY.md). Do not create public issues for security problems.

### Best Practices

1. **Never commit secrets** to version control
2. **Use strong passwords** (32+ characters for production)
3. **Enable HTTPS** in production
4. **Restrict CORS** domains in production
5. **Disable dev tools** (Hasura console, dev mode) in production

## Support

### Getting Help

1. **Documentation**: Start with this full documentation
2. **GitHub Issues**: https://github.com/nself-org/admin/issues
3. **Community**: Join the community chat at chat.nself.org
4. **Commercial Support**: Available for enterprise users

### Useful Links

- [nself CLI Repository](https://github.com/nself-org/cli)
- [Docker Documentation](https://docs.docker.com)
- [Hasura Documentation](https://hasura.io/docs)

## License

nself-admin is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

---

**Need help?** Check our [FAQ](FAQ.md) or [open an issue](https://github.com/nself-org/admin/issues).

**Want to contribute?** See our [Contributing Guide](contributing/CONTRIBUTING.md).
