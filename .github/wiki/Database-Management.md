# Database Management

nself Admin provides comprehensive database management tools for PostgreSQL databases in your stack.

## Overview

The Database section provides tools for:

- **SQL Console** - Interactive SQL query execution
- **Schema Management** - View and manage database structure
- **Data Seeding** - Load sample or test data
- **Migrations** - Run database migrations
- **Backup & Restore** - Database backup operations

## SQL Console

### Running Queries

1. Navigate to **Database > SQL Console**
2. Enter your SQL query in the editor
3. Click **Execute Query** or press `Ctrl+Enter`
4. View results in the results panel

### Supported Operations

```sql
-- Data queries
SELECT * FROM users LIMIT 10;
SELECT COUNT(*) FROM orders WHERE status = 'completed';

-- Schema queries
\dt                    -- List tables
\d users              -- Describe table structure
\l                    -- List databases

-- Data manipulation
INSERT INTO users (name, email) VALUES ('John', 'john@example.com');
UPDATE users SET status = 'active' WHERE id = 1;
DELETE FROM orders WHERE created_at < '2024-01-01';

-- Administrative
SHOW max_connections;
SELECT version();
```

### Query History

The console automatically saves your query history. Access previous queries using:

- **Up/Down arrows** - Navigate through history
- **History panel** - View and rerun past queries

## Schema Management

### Viewing Schema

The Schema tab provides:

- **Tables list** with row counts
- **Column details** with types and constraints
- **Indexes** and foreign key relationships
- **Views** and stored procedures

### Schema Operations

```sql
-- Create table
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add column
ALTER TABLE products ADD COLUMN description TEXT;

-- Create index
CREATE INDEX idx_products_name ON products(name);

-- Add foreign key
ALTER TABLE orders ADD CONSTRAINT fk_user_id
    FOREIGN KEY (user_id) REFERENCES users(id);
```

## Data Seeding

### Automatic Seeding

nself can automatically seed your database with sample data:

1. Navigate to **Database > Seed**
2. Select your seeding options:
   - **Sample Users** - Test user accounts
   - **Product Catalog** - Sample products/items
   - **Transaction Data** - Sample orders/transactions
3. Click **Run Seeding**

### Custom Seeding

Create custom seed files in your project:

```sql
-- seeds/users.sql
INSERT INTO users (name, email, role) VALUES
    ('Admin User', 'admin@example.com', 'admin'),
    ('Test User', 'test@example.com', 'user'),
    ('Demo User', 'demo@example.com', 'user');

-- seeds/products.sql
INSERT INTO products (name, price, category) VALUES
    ('Widget A', 19.99, 'widgets'),
    ('Widget B', 29.99, 'widgets'),
    ('Gadget X', 49.99, 'gadgets');
```

## Migrations

### Running Migrations

nself Admin can execute database migrations:

1. Navigate to **Database > Migrations**
2. View pending migrations
3. Click **Run Migrations** to execute
4. Monitor progress and view results

### Migration Files

Place migration files in your project's `migrations/` directory:

```sql
-- migrations/001_create_users.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- migrations/002_add_user_status.sql
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
CREATE INDEX idx_users_status ON users(status);
```

### Migration Status

The migrations panel shows:

- **Executed migrations** with timestamps
- **Pending migrations** ready to run
- **Failed migrations** with error details
- **Rollback options** for reversible migrations

## Backup & Restore

### Creating Backups

1. Navigate to **Database > Backup**
2. Configure backup options:
   - **Database** - Select target database
   - **Format** - SQL dump or custom format
   - **Compression** - Enable gzip compression
   - **Tables** - Select specific tables (optional)
3. Click **Create Backup**

### Backup Formats

```bash
# SQL dump (human readable)
pg_dump --format=plain --no-owner --no-privileges

# Custom format (PostgreSQL specific)
pg_dump --format=custom --compress=9

# Directory format (parallel dump)
pg_dump --format=directory --jobs=4
```

### Automated Backups

Configure automatic backups in the wizard:

```bash
# Environment variables
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"    # Daily at 2 AM
BACKUP_RETENTION_DAYS=7        # Keep 7 days
BACKUP_COMPRESSION=true        # Enable compression
```

### Restoring Backups

1. Navigate to **Database > Restore**
2. Select backup file or upload new backup
3. Choose restore options:
   - **Target database** - Destination database
   - **Drop existing** - Replace existing data
   - **Schema only** - Structure without data
   - **Data only** - Data without structure
4. Click **Restore Database**

## Connection Management

### Multiple Databases

Connect to multiple PostgreSQL databases:

```bash
# Environment configuration
POSTGRES_DATABASES="main,analytics,logs"
POSTGRES_MAIN_URL="postgres://user:pass@host:5432/main"
POSTGRES_ANALYTICS_URL="postgres://user:pass@host:5432/analytics"
POSTGRES_LOGS_URL="postgres://user:pass@host:5432/logs"
```

### Connection Pooling

Configure connection pooling for better performance:

```bash
# Connection pool settings
POSTGRES_MAX_CONNECTIONS=20
POSTGRES_IDLE_TIMEOUT=30000
POSTGRES_CONNECTION_TIMEOUT=5000
```

## Performance Monitoring

### Query Performance

Monitor database performance:

1. **Slow Query Log** - View slowest queries
2. **Active Connections** - Monitor current connections
3. **Lock Information** - View table and row locks
4. **Index Usage** - Analyze index effectiveness

### Performance Queries

```sql
-- Find slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan;

-- View active connections
SELECT pid, usename, application_name, state, query
FROM pg_stat_activity
WHERE state = 'active';

-- Check database size
SELECT datname, pg_size_pretty(pg_database_size(datname))
FROM pg_database
ORDER BY pg_database_size(datname) DESC;
```

## Security Best Practices

### Database Security

1. **Strong Passwords** - Use complex database passwords
2. **Limited Privileges** - Grant minimal required permissions
3. **Network Security** - Restrict database access to known hosts
4. **SSL Connections** - Enable SSL for remote connections
5. **Regular Updates** - Keep PostgreSQL version current

### Access Control

```sql
-- Create limited user for application
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE myapp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE myapp TO analytics_user;
GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
```

## Troubleshooting

### Common Issues

| Issue              | Cause                   | Solution                                      |
| ------------------ | ----------------------- | --------------------------------------------- |
| Connection timeout | Network/firewall        | Check network connectivity and firewall rules |
| Permission denied  | Insufficient privileges | Grant appropriate database permissions        |
| Lock timeout       | Long-running queries    | Identify and terminate blocking queries       |
| Disk space full    | Large database/logs     | Clean up old data and logs                    |
| Slow queries       | Missing indexes         | Analyze and add appropriate indexes           |

### Diagnostic Queries

```sql
-- Check for blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Check table sizes
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Integration with Hasura

### GraphQL Schema Sync

After database changes, sync with Hasura:

1. Navigate to **Services > Hasura**
2. Click **Reload Metadata**
3. Track new tables/relationships
4. Update permissions as needed

### Automatic Tracking

Enable automatic table tracking:

```bash
# Environment variable
HASURA_GRAPHQL_ENABLE_CONSOLE=true
HASURA_GRAPHQL_DEV_MODE=true
```

## Best Practices

### Development Workflow

1. **Use Migrations** - All schema changes through migrations
2. **Test Queries** - Test complex queries in development first
3. **Backup Before Changes** - Always backup before major changes
4. **Monitor Performance** - Regular performance monitoring
5. **Document Schema** - Maintain schema documentation

### Production Considerations

1. **Read Replicas** - Use read replicas for analytics
2. **Connection Pooling** - Implement connection pooling
3. **Monitoring** - Set up comprehensive monitoring
4. **Backup Strategy** - Implement robust backup strategy
5. **Security Hardening** - Follow PostgreSQL security guidelines

---

For more information, see:

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Hasura Database Guide](https://hasura.io/docs/latest/graphql/core/databases/index.html)
- [SQL Console Reference](api/Database.md)
