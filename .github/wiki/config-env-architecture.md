# Config Env Editor - Architecture

## Component Hierarchy

```
EnvEditorPage (/config/env)
│
├─ PageShell (wrapper)
│  └─ Header Actions
│     ├─ Save Message (toast)
│     ├─ Unsaved Changes Indicator
│     ├─ EnvImportExport (bulk operations menu)
│     ├─ Sync Button
│     ├─ Discard Button
│     └─ Save & Build Button
│
├─ Rebuild Required Banner
│  └─ Rebuild Now Button
│
├─ Undo Delete Banner
│  └─ Undo Button
│
├─ Controls Bar
│  ├─ EnvTabBar (environment switcher)
│  ├─ Search Input
│  ├─ Show Defaults Toggle
│  ├─ Show Secrets Toggle
│  ├─ Group By Toggle
│  ├─ Add Variable Button
│  └─ Variable Count
│
├─ Add Variable Form (conditional)
│  ├─ Key Input (uppercase, validated)
│  ├─ Value Textarea (multiline)
│  ├─ Description Input
│  ├─ Secret Checkbox
│  ├─ Add Button
│  └─ Cancel Button
│
├─ Variables Table (grouped by category)
│  └─ For each category:
│     ├─ Category Header (collapsible)
│     │  ├─ Collapse Icon
│     │  ├─ Category Name
│     │  ├─ Variable Count Badge
│     │  └─ Modified Count Badge
│     │
│     └─ Table (when expanded)
│        ├─ Header Row
│        │  ├─ Key Column (sortable)
│        │  ├─ Value Column (sortable)
│        │  └─ Actions Column
│        │
│        └─ For each variable:
│           └─ EnvVariableRow
│              ├─ Key Cell
│              │  ├─ Variable Key
│              │  └─ Lock Icon (if secret)
│              │
│              ├─ Value Cell
│              │  ├─ Display Value (masked if secret)
│              │  └─ Status Badges
│              │     ├─ Default Badge
│              │     ├─ Set Badge
│              │     └─ Modified Badge
│              │
│              └─ Actions Cell (hover visible)
│                 ├─ Copy Button
│                 ├─ Edit Button
│                 └─ Delete Button
│
└─ Unsaved Changes Banner (fixed bottom)
   ├─ Alert Icon
   ├─ Change Count
   ├─ Discard Button
   └─ Save & Build Button
```

## Data Flow

```
User Action → Event Handler → State Update → LocalStorage Draft → UI Update
                                   ↓
                            API Call (on Save)
                                   ↓
                          nself CLI Execution
                                   ↓
                         .env File Written
                                   ↓
                         nself build Triggered
                                   ↓
                         Success/Error Feedback
```

## State Management

### Local State (React useState)

```typescript
- environment: string              // Current env tab (local, dev, stage, prod, secrets)
- variables: EnvVariable[]         // All variables for current env
- originalVariables: EnvVariable[] // Backup for discard
- hasChanges: boolean              // Unsaved changes flag
- editingKey: string | null        // Currently editing variable
- tempValue: string                // Temp value during edit
- showSecrets: boolean             // Toggle secret visibility
- showDefaults: boolean            // Show default values
- searchTerm: string               // Search filter
- sortColumn: 'key' | 'value'      // Sort column
- sortDirection: 'asc' | 'desc'    // Sort direction
- groupBy: 'category' | 'none'     // Grouping mode
- collapsedSections: Set<string>   // Collapsed categories
- showAddForm: boolean             // Add form visibility
- deleteConfirm: string | null     // Delete confirmation key
- deletedVariable: EnvVariable     // For undo
- rebuildRequired: boolean         // Rebuild banner
- saveMessage: { type, text }      // Toast notification
```

### LocalStorage (Persistent)

```typescript
nself_env_draft_local // Draft for .env.local
nself_env_draft_dev // Draft for .env.dev
nself_env_draft_stage // Draft for .env.stage
nself_env_draft_prod // Draft for .env.prod
nself_env_draft_secrets // Draft for .env.secrets
```

## API Routes

### GET /api/config/env

**Query Params**:

- `env`: Environment name (local, dev, stage, prod, secrets)
- `defaults`: Include default values (true/false)

**Response**:

```json
{
  "success": true,
  "data": {
    "environment": "local",
    "variables": [
      {
        "key": "DATABASE_URL",
        "value": "postgres://localhost",
        "defaultValue": "postgres://postgres:5432/nself",
        "isSecret": false,
        "source": "env",
        "category": "2. PostgreSQL"
      }
    ],
    "availableEnvironments": ["local", "dev", "stage", "prod", "secrets"]
  }
}
```

### POST /api/config/env

**Action: save**

```json
{
  "action": "save",
  "environment": "local",
  "variables": [{ "key": "DATABASE_URL", "value": "postgres://localhost" }]
}
```

**Response**:

```json
{
  "success": true,
  "message": "Environment file saved: local",
  "buildTriggered": true,
  "buildSuccess": true,
  "buildOutput": "..."
}
```

### POST /api/config/build

**Request**: Empty body (POST)

**Response**:

```json
{
  "success": true,
  "message": "Build completed successfully",
  "output": "..."
}
```

## Role-Based Access Control

```typescript
const ROLE_HIERARCHY = {
  dev: 0, // Can access: Local, Dev
  sr_dev: 1, // Can access: Local, Dev, Stage
  lead_dev: 2, // Can access: All (Local, Dev, Stage, Prod, Secrets)
}

function canAccessTab(userRole: AccessRole, tabMinRole: AccessRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[tabMinRole]
}
```

## Category Grouping

Variables are grouped by prefix:

```typescript
0. Admin Settings     → ADMIN_*, PROJECT_PATH
1. Core Project       → ENV, PROJECT_NAME, BASE_DOMAIN
2. PostgreSQL         → POSTGRES_*, DATABASE_URL
3. Hasura GraphQL     → HASURA_* (not AUTH)
4. Authentication     → AUTH_*, JWT_*
5. File Storage       → STORAGE_*, MINIO_*, S3_*
6. Nginx & SSL        → NGINX_*, SSL_*
7. Redis Cache        → REDIS_*
8. Email              → MAIL_*, SMTP_*
9. Monitoring         → LOG_*, MONITOR_*, ANALYTICS_*
10. API & Frontend    → API_*, FRONTEND_*, NEXT_PUBLIC_*
11. Other             → Everything else
```

## Validation Rules

### Key Validation

- Pattern: `/^[A-Za-z_][A-Za-z0-9_]*$/`
- Must start with letter or underscore
- Can contain letters, numbers, underscores
- Auto-converted to UPPERCASE

### Value Validation

- No restrictions (supports multiline)
- Quotes removed during parse
- Spaces preserved

### Secret Detection

Variable is marked as secret if key contains:

- `password`
- `secret`
- `key`
- `token`
- Exact match: `HASURA_GRAPHQL_ADMIN_SECRET`

## Performance Optimizations

### Memoization

```typescript
// All handlers wrapped in useCallback
const updateVariable = useCallback((key, value) => { ... }, [])
const deleteVariable = useCallback((key) => { ... }, [deleteConfirm])
const saveEnvironmentVariables = useCallback(async () => { ... }, [environment, variables])
```

### Efficient Filtering

```typescript
// Filter once, then group
const filteredVariables = variables.filter(matchesSearch)
const groupedVariables =
  groupBy === 'category'
    ? filteredVariables.reduce(groupByCategory, {})
    : { All: filteredVariables }
```

### LocalStorage Throttling

```typescript
// Only save draft when hasChanges is true
useEffect(() => {
  if (hasChanges) {
    localStorage.setItem(draftKey, JSON.stringify(variables))
  }
}, [variables, hasChanges, environment])
```

## Security Considerations

### Secret Masking

- Secrets masked as `••••••••` by default
- Toggle visibility with eye icon
- Copy still works when masked
- Lock icon indicates secret status

### Role-Based Tabs

- Production tab hidden from dev/sr_dev roles
- Secrets tab only visible to lead_dev
- Tab switching respects access control

### Input Validation

- Key format validated before save
- Duplicate keys prevented
- SQL injection not possible (write to file, not database)

## Error Handling

### API Errors

```typescript
try {
  const res = await fetch('/api/config/env', { ... })
  const json = await res.json()
  if (json.success) {
    // Handle success
  } else {
    setSaveMessage({ type: 'error', text: json.error })
  }
} catch (err) {
  setSaveMessage({
    type: 'error',
    text: err instanceof Error ? err.message : 'Failed to save'
  })
}
```

### Validation Errors

- Shown as toast messages (red)
- Auto-dismiss after 4 seconds
- Prevent save action

### Build Errors

- Non-fatal (file still saved)
- Shown in build output
- Rebuild banner appears

## Accessibility Features

### Keyboard Navigation

- Tab through all controls
- Enter to save/add
- Escape to cancel
- Arrow keys in search

### Screen Reader Support

- ARIA labels on buttons
- Status announcements
- Semantic HTML (table, button, input)

### Focus Management

- Auto-focus on edit field
- Focus trap in modals
- Visible focus indicators

## Testing Strategy

### Unit Tests

- Component rendering
- Event handlers
- State updates
- Validation logic

### Integration Tests

- Add variable flow
- Edit variable flow
- Delete with undo
- Bulk import
- Save & build

### E2E Tests

- Full user journey
- Role-based access
- Cross-environment operations
- Error scenarios

## Future Enhancements

### Planned Features

1. Variable templates (presets)
2. URL/port validation
3. Change history/versioning
4. Multi-user collaboration
5. AI-powered suggestions

### Performance Improvements

1. Virtual scrolling for large datasets
2. Debounced search
3. Web Workers for parsing
4. IndexedDB for larger drafts

### UX Improvements

1. Drag-and-drop import
2. Inline validation warnings
3. Smart autocomplete
4. Diff view for changes
5. Export format options (JSON, YAML)
