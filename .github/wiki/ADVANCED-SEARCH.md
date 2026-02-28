# Advanced Search System

## Overview

The nself-admin advanced search system provides comprehensive full-text search across all system data including logs, configurations, audit trails, and files. The system uses real indexing and ranking algorithms to deliver fast, accurate search results.

## Features

### 1. Multi-Source Search

- **Container Logs**: Real-time search across Docker container logs
- **Audit Logs**: Search authentication and system audit trails
- **Configuration Files**: Search environment variables and config files (.env.\*)
- **Project Files**: Search YAML, JSON, shell scripts, and markdown files
- **Navigation**: Quick access to application pages

### 2. Advanced Filtering

- **Result Types**: Filter by log, audit, config, service, database, navigation, or file
- **Services**: Filter by specific Docker containers/services
- **Log Levels**: Filter by error, warn, info, or debug
- **Date Range**: Filter results by date range
- **Search Options**: Regex search and case-sensitive matching

### 3. Smart Ranking

Results are ranked by relevance using a scoring algorithm that considers:

- Exact title matches (highest score)
- Title prefix matches
- Title contains query
- Description matches
- Word frequency
- Recency (newer results ranked higher)
- Log level (errors boosted)
- Result type (navigation and service results boosted)

### 4. Auto-Suggestions

The system provides search suggestions based on:

- Frequently matched titles
- Service names
- Recent searches
- Popular queries

### 5. Performance Features

- Debounced search (300ms delay)
- Parallel data source searching
- Efficient result caching
- Pagination support
- Export results to JSON

## Architecture

### Files

```
src/
├── lib/
│   └── search-index.ts              # Search indexing and ranking engine
├── app/
│   ├── api/
│   │   └── search/
│   │       └── route.ts             # Search API endpoint
│   └── search/
│       └── page.tsx                 # Search page UI
└── components/
    ├── AdvancedSearch.tsx           # Advanced search modal
    └── Search.tsx                   # Basic navigation search
```

### API Endpoints

#### Main Search

```
GET /api/search?q=<query>&types=<types>&services=<services>&levels=<levels>&dateFrom=<date>&dateTo=<date>&regex=<bool>&caseSensitive=<bool>&limit=<number>&offset=<number>
```

#### Suggestions

```
GET /api/search?action=suggestions&q=<query>&limit=<number>
```

#### Filters

```
GET /api/search?action=filters
```

### Search Index

The search index (`src/lib/search-index.ts`) provides:

1. **`search(query, options)`**: Main search function
   - Searches across all data sources in parallel
   - Applies filters and ranking
   - Returns paginated results

2. **`getSuggestions(query, limit)`**: Get autocomplete suggestions
   - Returns relevant suggestions based on partial query
   - Extracts from titles and service names

3. **`getSearchFilters()`**: Get available filter options
   - Returns list of active services
   - Returns available result types
   - Returns available log levels

## Usage

### Global Search (Keyboard Shortcut)

Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) anywhere in the app to open the advanced search modal.

### Search Page

Navigate to `/search` for the full-featured search interface with all filters visible.

### Programmatic Usage

```typescript
import { search, getSuggestions, getSearchFilters } from '@/lib/search-index'

// Perform a search
const results = await search('error', {
  types: ['log'],
  services: ['postgres'],
  levels: ['error'],
  dateFrom: new Date('2025-01-01'),
  limit: 50,
})

// Get suggestions
const suggestions = await getSuggestions('post', 5)

// Get available filters
const filters = await getSearchFilters()
```

## Search Result Types

### Log Results

```typescript
{
  id: 'log-postgres-1234567890',
  type: 'log',
  title: 'postgres',
  description: 'ERROR: database connection failed',
  content: 'Full log message...',
  timestamp: Date,
  service: 'postgres',
  level: 'error',
  score: 75,
  url: '/services/logs?container=postgres',
}
```

### Audit Results

```typescript
{
  id: 'audit-1234567890',
  type: 'audit',
  title: 'login_attempt',
  description: 'Success - {"userId":"admin","ip":"192.168.1.1"}',
  timestamp: Date,
  level: 'info',
  score: 45,
  url: '/audit',
  metadata: { /* audit log data */ },
}
```

### Config Results

```typescript
{
  id: 'config-.env.dev-15',
  type: 'config',
  title: 'DATABASE_URL',
  description: '.env.dev: postgres://...',
  content: 'DATABASE_URL=postgres://...',
  score: 60,
  url: '/config/env?file=.env.dev',
  metadata: { file: '.env.dev', line: 15 },
}
```

### File Results

```typescript
{
  id: 'file-docker-compose.yml-42',
  type: 'file',
  title: 'docker-compose.yml',
  description: 'Match content from file...',
  content: 'Full line content',
  score: 40,
  metadata: { file: 'docker-compose.yml', line: 42 },
}
```

## Performance Considerations

### Indexing

- Container logs are limited to the last 500 lines per container
- Maximum 5 containers searched simultaneously
- File searches use `grep` with optimized patterns
- Results are limited to 50 by default (configurable)

### Caching

- No persistent cache (real-time search)
- Debounced queries prevent excessive API calls
- Filters are cached for the session

### Optimization Tips

1. Use specific filters to narrow search scope
2. Use date ranges for time-based queries
3. Enable case-sensitive search only when needed
4. Avoid very broad regex patterns

## Future Enhancements

Planned improvements:

- [ ] Persistent search index with periodic updates
- [ ] Search history and saved searches
- [ ] Advanced query syntax (AND, OR, NOT operators)
- [ ] Faceted search with auto-generated filters
- [ ] Search analytics and popular queries
- [ ] Machine learning-based result ranking
- [ ] Full-text search across database content
- [ ] Search result highlighting
- [ ] Search keyboard navigation
- [ ] Saved search filters/presets

## Troubleshooting

### No Results Found

- Check if services are running (`docker ps`)
- Verify file permissions for config files
- Try broader search terms
- Disable case-sensitive search
- Check date range filters

### Slow Search Performance

- Reduce the number of active filters
- Use more specific search terms
- Limit date range
- Reduce number of services being searched

### Missing Services in Filter

- Ensure Docker containers are running
- Check container naming in `docker ps`
- Verify service names match container names

## Examples

### Search for Errors

```
Query: "connection refused"
Filters:
  - Types: log
  - Levels: error
  - Services: postgres, redis
```

### Search Configuration

```
Query: "DATABASE_URL"
Filters:
  - Types: config
```

### Search Audit Trail

```
Query: "failed"
Filters:
  - Types: audit
  - Date From: 2025-01-01
  - Date To: 2025-01-31
```

### Regex Search

```
Query: "error.*timeout"
Filters:
  - Regex: enabled
  - Types: log
```

## Security Notes

- Search results respect system permissions
- Sensitive data in configs may appear in results
- Audit logs track all search activity
- No search query logging to prevent data leakage
- File search excludes .git and node_modules by default
