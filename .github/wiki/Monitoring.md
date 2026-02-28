# Monitoring & Metrics

nself Admin provides comprehensive monitoring capabilities for your development stack, including real-time metrics, health checks, and alerting.

## Overview

The monitoring system includes:

- **Service Health Monitoring** - Real-time service status
- **Resource Metrics** - CPU, memory, disk, and network usage
- **Log Aggregation** - Centralized log viewing and filtering
- **Performance Metrics** - Application and database performance
- **Alert System** - Configurable alerts and notifications

## Dashboard Overview

### Main Dashboard

The main dashboard provides at-a-glance information:

- **Service Status Grid** - Color-coded service health
- **Resource Usage Charts** - Real-time system metrics
- **Recent Activity** - Latest logs and events
- **Quick Actions** - Start, stop, restart services

### Monitor Page

Navigate to **Monitor** for detailed monitoring:

- **Service Details** - Individual service metrics
- **Log Viewer** - Filtered and searchable logs
- **Performance Graphs** - Historical performance data
- **Alert Configuration** - Set up monitoring alerts

## Service Health Monitoring

### Health Check System

Each service provides health endpoints:

```bash
# Service health endpoints
GET /health                    # Overall system health
GET /api/monitoring           # Detailed service status
GET /api/docker/stats         # Container statistics
GET /api/system/metrics       # System resource usage
```

### Health Status Indicators

| Status       | Color     | Description                        |
| ------------ | --------- | ---------------------------------- |
| **Healthy**  | 🟢 Green  | Service running normally           |
| **Warning**  | 🟡 Yellow | Minor issues, still functional     |
| **Critical** | 🟠 Orange | Major issues, degraded performance |
| **Down**     | 🔴 Red    | Service unavailable                |
| **Unknown**  | ⚪ Gray   | Status cannot be determined        |

### Service-Specific Health Checks

#### PostgreSQL

- Connection test
- Query response time
- Available connections
- Database size
- Replication lag (if applicable)

#### Hasura

- GraphQL endpoint response
- Metadata consistency
- Connected datasources
- Query performance

#### Redis (if enabled)

- Connection test
- Memory usage
- Key count
- Hit ratio

#### Custom Services

- HTTP health endpoint
- Response time
- Error rate
- Resource usage

## Resource Metrics

### System Metrics

Monitor system-wide resource usage:

#### CPU Usage

- **Current Usage** - Real-time CPU utilization
- **Per-Core Usage** - Individual core utilization
- **Load Average** - 1, 5, and 15-minute averages
- **Top Processes** - Highest CPU consuming processes

#### Memory Usage

- **Total Memory** - System memory capacity
- **Used Memory** - Current memory consumption
- **Available Memory** - Free memory for allocation
- **Buffer/Cache** - System cache usage
- **Swap Usage** - Virtual memory usage

#### Disk Usage

- **Disk Space** - Used and available space
- **Disk I/O** - Read/write operations per second
- **Disk Latency** - Average I/O response time
- **Mount Points** - All mounted filesystem usage

#### Network Usage

- **Network Interfaces** - All network adapters
- **Bandwidth Usage** - Incoming/outgoing traffic
- **Packet Statistics** - Packets sent/received/dropped
- **Connection Count** - Active network connections

### Container Metrics

Monitor Docker container performance:

```bash
# Container resource usage
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"

# Memory details
docker exec <container> cat /proc/meminfo

# Process list
docker exec <container> ps aux

# Network statistics
docker exec <container> cat /proc/net/dev
```

## Log Management

### Centralized Logging

All service logs are aggregated and accessible through the web interface:

#### Log Sources

- **Application Logs** - Your custom services
- **System Logs** - Docker, nginx, system services
- **Database Logs** - PostgreSQL query and error logs
- **Security Logs** - Authentication and access logs

#### Log Levels

- **ERROR** - Error conditions
- **WARN** - Warning conditions
- **INFO** - Informational messages
- **DEBUG** - Debug-level messages

### Log Viewer Features

#### Filtering

```bash
# Filter by service
service:postgres

# Filter by log level
level:ERROR

# Filter by time range
timestamp:[2024-01-01 TO 2024-01-02]

# Combine filters
service:hasura AND level:ERROR
```

#### Search

- **Full-text search** across all log messages
- **Regular expressions** for complex patterns
- **Field-specific search** (timestamp, service, level)
- **Saved searches** for common queries

#### Export

- **Download logs** as text or JSON
- **Email reports** with filtered logs
- **API access** for external log analysis tools

## Performance Monitoring

### Application Performance

Monitor application-specific metrics:

#### Response Times

- **Average Response Time** - Mean response time
- **95th Percentile** - 95% of requests faster than this
- **99th Percentile** - 99% of requests faster than this
- **Max Response Time** - Slowest request

#### Throughput

- **Requests per Second** - Current request rate
- **Peak RPS** - Highest recorded request rate
- **Success Rate** - Percentage of successful requests
- **Error Rate** - Percentage of failed requests

#### Database Performance

- **Query Response Time** - Average database query time
- **Connection Pool Usage** - Active vs available connections
- **Slow Query Log** - Queries exceeding time threshold
- **Index Usage** - Index hit ratios and effectiveness

### Custom Metrics

Add custom metrics to your applications:

```javascript
// Express.js middleware example
const prometheus = require('prom-client')

// Create custom counter
const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

// Middleware to track requests
app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    })
  })
  next()
})

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType)
  res.end(await prometheus.register.metrics())
})
```

## Alert System

### Alert Configuration

Set up alerts for critical conditions:

#### Threshold Alerts

- **CPU Usage** > 80% for 5 minutes
- **Memory Usage** > 90% for 2 minutes
- **Disk Space** < 10% remaining
- **Service Down** for more than 30 seconds

#### Performance Alerts

- **Response Time** > 2 seconds for 5 minutes
- **Error Rate** > 5% for 2 minutes
- **Database Connections** > 80% of pool size

#### Custom Alerts

```javascript
// Alert configuration example
const alerts = [
  {
    name: 'High CPU Usage',
    condition: 'cpu_usage > 80',
    duration: '5m',
    severity: 'warning',
    actions: ['email', 'slack'],
  },
  {
    name: 'Service Down',
    condition: "service_status == 'down'",
    duration: '30s',
    severity: 'critical',
    actions: ['email', 'sms', 'pagerduty'],
  },
]
```

### Notification Channels

Configure multiple notification methods:

#### Email Notifications

```bash
# Environment variables
ALERT_EMAIL_ENABLED=true
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_FROM=alerts@yourapp.com
ALERT_EMAIL_TO=admin@yourapp.com
```

#### Slack Integration

```bash
# Slack webhook configuration
ALERT_SLACK_ENABLED=true
ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
ALERT_SLACK_CHANNEL=#alerts
ALERT_SLACK_USERNAME=nself-admin
```

#### PagerDuty Integration

```bash
# PagerDuty configuration
ALERT_PAGERDUTY_ENABLED=true
ALERT_PAGERDUTY_SERVICE_KEY=your-service-key
ALERT_PAGERDUTY_SEVERITY=critical
```

## Monitoring Stack (Optional)

### Prometheus + Grafana

Enable the monitoring stack for advanced metrics:

```bash
# Environment variables
MONITORING_ENABLED=true
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
LOKI_ENABLED=true          # Log aggregation
TEMPO_ENABLED=true         # Distributed tracing
ALERTMANAGER_ENABLED=true  # Alert management
```

### Grafana Dashboards

Pre-configured dashboards available:

- **System Overview** - System resource usage
- **Service Health** - Service-specific metrics
- **Database Performance** - PostgreSQL metrics
- **Application Performance** - Custom application metrics
- **Log Analysis** - Log volume and patterns

### Prometheus Metrics

Exposed metrics endpoints:

```bash
# Application metrics
GET /metrics              # Application-specific metrics

# System metrics
GET /api/metrics/system   # System resource metrics

# Docker metrics
GET /api/metrics/docker   # Container metrics
```

## Best Practices

### Monitoring Strategy

1. **Start Simple** - Begin with basic health checks
2. **Add Gradually** - Incrementally add more detailed monitoring
3. **Focus on SLIs** - Monitor what matters to users
4. **Set Meaningful Alerts** - Avoid alert fatigue
5. **Regular Review** - Periodically review and adjust thresholds

### Performance Optimization

1. **Baseline Metrics** - Establish performance baselines
2. **Identify Bottlenecks** - Use metrics to find performance issues
3. **Capacity Planning** - Plan for growth based on trends
4. **Load Testing** - Validate performance under load
5. **Continuous Monitoring** - Monitor performance continuously

### Alert Management

1. **Alert Hierarchy** - Different alerts for different severities
2. **Escalation Procedures** - Define escalation paths
3. **Alert Documentation** - Document alert meanings and responses
4. **Regular Testing** - Test alert systems regularly
5. **Alert Fatigue Prevention** - Fine-tune to reduce false positives

## Troubleshooting

### Common Monitoring Issues

| Issue                    | Cause                        | Solution                     |
| ------------------------ | ---------------------------- | ---------------------------- |
| Missing metrics          | Service not exposing metrics | Configure metrics endpoint   |
| High monitoring overhead | Too frequent collection      | Reduce collection frequency  |
| Alert storms             | Cascade failures             | Implement alert dependencies |
| Disk space from logs     | Log retention too long       | Configure log rotation       |
| Slow dashboard loading   | Too much data                | Implement data aggregation   |

### Debugging Monitoring

```bash
# Check monitoring services
docker-compose ps prometheus grafana

# View monitoring logs
docker-compose logs prometheus
docker-compose logs grafana

# Test metrics endpoints
curl http://localhost:9090/metrics   # Prometheus
curl http://localhost:3000/api/health # Grafana

# Check alert rules
curl http://localhost:9090/api/v1/rules
```

## Integration Examples

### Custom Service Monitoring

```javascript
// Add monitoring to Express.js service
const express = require('express')
const prometheus = require('prom-client')

const app = express()

// Create metrics
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
})

// Middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    httpDuration.observe(
      { method: req.method, route: req.path, status_code: res.statusCode },
      duration,
    )
  })
  next()
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType)
  res.end(await prometheus.register.metrics())
})
```

### Database Monitoring

```sql
-- PostgreSQL monitoring queries
-- Active connections
SELECT count(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Database size
SELECT pg_size_pretty(pg_database_size(current_database())) as db_size;

-- Top queries by execution time
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

For more information, see:

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Docker Monitoring](https://docs.docker.com/config/containers/logging/)
- [System Metrics API](api/Monitoring.md)
