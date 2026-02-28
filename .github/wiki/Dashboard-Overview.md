# Dashboard Overview

The nself Admin Dashboard is your central command center for monitoring and managing your entire development stack in real-time.

## Dashboard Layout

### Top Navigation Bar

- **Logo/Home**: Returns to dashboard
- **Environment Indicator**: Shows current environment (Dev/Staging/Prod)
- **Quick Actions**: Stop All, Restart All, View Logs
- **User Menu**: Settings, Logout

### Sidebar Navigation

```
📊 Dashboard          # Main overview
🚀 Services          # Service management
💾 Database          # Database tools
⚙️  Config           # Configuration
📈 Monitor           # Detailed metrics
🛠️  Tools            # Developer tools
📁 Operations        # Backup, deploy
🔧 System            # System management
```

## Main Dashboard Sections

### Service Health Overview

**Real-Time Status Grid**:

```
┌─────────────────────────────────────────┐
│ PostgreSQL     ✅ Running  CPU: 12%     │
│ Hasura         ✅ Running  CPU: 8%      │
│ Auth           ✅ Running  CPU: 5%      │
│ Nginx          ✅ Running  CPU: 2%      │
│ Redis          ✅ Running  CPU: 3%      │
│ MinIO          ✅ Running  CPU: 4%      │
│ API Service    ✅ Running  CPU: 15%     │
└─────────────────────────────────────────┘
```

**Status Indicators**:

- 🟢 **Running**: Service healthy and responding
- 🟡 **Starting**: Service initializing
- 🔴 **Stopped**: Service not running
- 🟠 **Unhealthy**: Running but failing health checks
- ⚪ **Unknown**: Status cannot be determined

### Resource Metrics

**System Overview**:

```
CPU Usage:        [████████░░░░░░░] 42%
Memory Usage:     [██████░░░░░░░░░] 38%
Disk Usage:       [████░░░░░░░░░░░] 25%
Network I/O:      ↓ 2.4 MB/s  ↑ 1.1 MB/s
```

**Per-Service Metrics**:

- CPU percentage
- Memory usage (MB/GB)
- Network I/O rates
- Disk usage
- Container uptime

### Quick Actions Panel

**Service Controls**:

```
[Start All] [Stop All] [Restart All]
[View Logs] [Shell Access] [Backup Now]
```

**Individual Service Actions**:

- Start/Stop/Restart
- View Logs
- Shell Access
- Inspect Container
- View Configuration

## Service Management

### Service Cards

Each service displays:

```
┌──────────────────────────┐
│ 🐘 PostgreSQL           │
│ Status: ✅ Running       │
│ Uptime: 2h 34m          │
│ Port: 5432              │
│ CPU: 12% | RAM: 256MB   │
│ [Stop] [Logs] [Shell]   │
└──────────────────────────┘
```

### Service Details View

Click any service for detailed information:

**Overview Tab**:

- Container ID
- Image version
- Created timestamp
- Started timestamp
- Health check status
- Restart count

**Configuration Tab**:

- Environment variables
- Volume mounts
- Network settings
- Port mappings
- Labels

**Logs Tab**:

- Real-time log streaming
- Log level filtering
- Search functionality
- Download logs
- Clear logs

**Metrics Tab**:

- CPU usage graph (24h)
- Memory usage graph (24h)
- Network I/O graph (24h)
- Disk I/O graph (24h)

## Database Management

### Quick Stats

```
Database: myapp
Size: 124 MB
Tables: 18
Connections: 5/100
Queries/sec: 142
```

### Database Tools

**SQL Query Console**:

```sql
-- Execute queries directly
SELECT * FROM users LIMIT 10;

-- Features:
- Syntax highlighting
- Auto-completion
- Query history
- Export results
```

**Migration Management**:

```
Applied Migrations:
✅ 001_initial_schema.sql
✅ 002_add_users_table.sql
✅ 003_add_auth_tables.sql

Pending:
⏳ 004_add_indexes.sql
```

**Backup & Restore**:

```
Recent Backups:
📦 2024-01-12 14:30 (124 MB) [Download] [Restore]
📦 2024-01-11 14:30 (122 MB) [Download] [Restore]
📦 2024-01-10 14:30 (120 MB) [Download] [Restore]

[Create Backup] [Schedule Backups] [Import]
```

## Monitoring Features

### Real-Time Metrics

**Live Graphs** (updates every 5 seconds):

- CPU usage per service
- Memory consumption
- Network throughput
- Request rates
- Response times
- Error rates

### Log Aggregation

**Unified Log Viewer**:

```
Filter: [All Services ▼] [All Levels ▼] [Search...]

2024-01-12 14:32:15 [nginx] INFO: Request to /api/users
2024-01-12 14:32:15 [api] DEBUG: Processing user request
2024-01-12 14:32:15 [postgres] INFO: Query executed in 12ms
2024-01-12 14:32:16 [hasura] INFO: GraphQL query processed
```

**Log Filters**:

- Service selector
- Log level (DEBUG, INFO, WARN, ERROR)
- Time range
- Text search
- Regex patterns

### Alert Configuration

**Alert Rules**:

```yaml
CPU Alert:
  Threshold: > 80%
  Duration: 5 minutes
  Action: Email notification

Memory Alert:
  Threshold: > 90%
  Duration: 2 minutes
  Action: Slack notification

Service Down:
  Check: Health endpoint
  Interval: 30 seconds
  Action: PagerDuty
```

## Configuration Management

### Environment Variables

**View and Edit**:

```
DATABASE_URL=postgres://user:pass@postgres:5432/db
HASURA_ADMIN_SECRET=****************
JWT_SECRET=****************
REDIS_URL=redis://redis:6379

[Edit] [Add Variable] [Export .env]
```

### Service Configuration

**Modify Service Settings**:

- Resource limits (CPU/Memory)
- Restart policies
- Health check parameters
- Network settings
- Volume mounts

## Developer Tools

### API Testing

**Built-in API Client**:

```
Method: [GET ▼]
URL: http://api.localhost/users

Headers:
Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "query": "test"
}

[Send Request]
```

### GraphQL Playground

**Integrated Hasura Console**:

- GraphQL query builder
- Schema explorer
- Real-time subscriptions
- Performance analyzer

### Terminal Access

**Web-based Shell**:

```bash
# Access any container
$ docker exec -it postgres psql -U postgres
$ docker exec -it api sh
$ docker exec -it nginx sh
```

## Operations

### Backup Management

**Backup Dashboard**:

```
Scheduled Backups: ✅ Enabled
Schedule: Daily at 2:00 AM
Retention: 7 days
Storage: Local + S3

Manual Actions:
[Backup Now] [Restore] [Download] [Configure]
```

### Deployment Tools

**Deploy to Production**:

```
Current: v1.2.3 (Development)
Target: Production

Pre-deployment Checks:
✅ All tests passing
✅ No pending migrations
✅ Backup completed
✅ Resource availability

[Deploy to Staging] [Deploy to Production]
```

## System Information

### Docker Status

```
Docker Version: 24.0.7
Containers: 12 (12 running)
Images: 18
Volumes: 8
Networks: 2
Storage: 4.2 GB / 50 GB
```

### Resource Usage

```
Total CPU Cores: 8
Total Memory: 16 GB
Used Memory: 6.4 GB
Disk Space: 120 GB free

Per-Service Limits:
PostgreSQL: 2 CPU, 2 GB RAM
Hasura: 1 CPU, 512 MB RAM
Custom Services: 1 CPU, 512 MB RAM each
```

## Dashboard Customization

### Layout Options

**Widget Management**:

- Drag and drop to rearrange
- Resize widgets
- Add/remove widgets
- Save custom layouts

**Available Widgets**:

- Service status grid
- Resource meters
- Log viewer
- Quick actions
- Custom metrics
- Alerts panel

### Theme Settings

**Appearance**:

- Light/Dark mode
- Accent colors
- Font size
- Compact/Comfortable view

## Keyboard Shortcuts

| Shortcut | Action               |
| -------- | -------------------- |
| `Ctrl+K` | Quick search         |
| `Ctrl+L` | View logs            |
| `Ctrl+S` | Stop all services    |
| `Ctrl+R` | Restart all services |
| `Ctrl+/` | Show shortcuts       |
| `Esc`    | Close modal          |

## Performance Tips

### Dashboard Optimization

1. **Reduce Update Frequency**:
   - Settings → Performance → Update Interval
   - Default: 5s, Can set to 10s or 30s

2. **Limit Log Retention**:
   - Settings → Logs → Max Lines
   - Default: 1000, Reduce for better performance

3. **Disable Unused Widgets**:
   - Remove widgets you don't need
   - Reduces API calls and rendering

### Browser Recommendations

**Best Performance**:

- Chrome/Edge (Chromium-based)
- Firefox (latest)
- Safari 15+

**Enable Hardware Acceleration**:

- Chrome: Settings → Advanced → System
- Improves graph rendering

## Troubleshooting Dashboard Issues

### Dashboard Not Loading

```bash
# Check if nAdmin is running
docker ps | grep nself-admin

# Check logs
docker logs nself-admin

# Restart nAdmin
docker restart nself-admin
```

### Metrics Not Updating

```bash
# Check metrics collector
docker exec nself-admin ps aux | grep collector

# Restart metrics service
docker exec nself-admin supervisorctl restart metrics
```

### Connection Issues

```bash
# Verify Docker socket
ls -la /var/run/docker.sock

# Check permissions
docker exec nself-admin whoami
```

## Mobile Access

The dashboard is responsive and works on mobile devices:

**Mobile Features**:

- Touch-optimized controls
- Swipe navigation
- Condensed view
- Essential metrics only

**Access from Mobile**:

1. Find your computer's IP: `ifconfig` or `ipconfig`
2. Navigate to: `http://[YOUR-IP]:3021`
3. Use same credentials

## API Access

The dashboard data is available via API:

```bash
# Get service status
curl http://localhost:3021/api/services \
  -H "Authorization: Bearer <token>"

# Get metrics
curl http://localhost:3021/api/system/metrics \
  -H "Authorization: Bearer <token>"

# Get logs
curl http://localhost:3021/api/docker/logs?service=postgres \
  -H "Authorization: Bearer <token>"
```

## Next Steps

- **[Service Management](Service-Management)** - Deep dive into service control
- **[Monitoring & Metrics](Monitoring-Metrics)** - Advanced monitoring setup
- **[Database Management](Database-Management)** - Database operations
- **[API Reference](api/Reference)** - Complete API documentation

---

**Related Documentation**:

- [Quick Start](Quick-Start)
- [Troubleshooting](Troubleshooting)
- [Keyboard Shortcuts](Keyboard-Shortcuts)
- [Performance Tuning](Performance-Tuning)
