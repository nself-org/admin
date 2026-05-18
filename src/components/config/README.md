# Config Environment Editor Components

This directory contains standalone components for the Config Env Editor (`/config/env`).

## Components

### EnvVariableRow

**Purpose**: Display and edit a single environment variable

**Props**:

- `variable`: EnvVariable object
- `editingKey`: Currently editing variable key
- `tempValue`: Temporary value during editing
- `showSecrets`: Whether to reveal secret values
- `deleteConfirm`: Key of variable awaiting delete confirmation
- `onSetEditingKey`: Start/stop editing mode
- `onSetTempValue`: Update temporary value
- `onUpdateVariable`: Save variable change
- `onDeleteVariable`: Delete variable
- `onCopyToClipboard`: Copy value to clipboard

**Features**:

- Inline editing with textarea (multiline support)
- Secret masking with lock icon
- Status badges (set, default, modified)
- Copy to clipboard
- Two-click delete confirmation
- Keyboard shortcuts (Enter to save, Escape to cancel)

**Usage**:

```tsx
<EnvVariableRow
  variable={variable}
  editingKey={editingKey}
  tempValue={tempValue}
  showSecrets={showSecrets}
  deleteConfirm={deleteConfirm}
  onSetEditingKey={setEditingKey}
  onSetTempValue={setTempValue}
  onUpdateVariable={updateVariable}
  onDeleteVariable={deleteVariable}
  onCopyToClipboard={copyToClipboard}
/>
```

---

### EnvTabBar

**Purpose**: Environment switcher with role-based access control

**Props**:

- `tabs`: Array of EnvironmentTab objects
- `activeTab`: Currently selected tab ID
- `hasUnsavedChanges`: Whether user has unsaved edits
- `onTabChange`: Callback when tab is clicked

**Features**:

- Role-based visibility (dev, sr_dev, lead_dev)
- Unsaved changes warning dialog
- Tooltip descriptions

**Usage**:

```tsx
<EnvTabBar
  tabs={visibleTabs}
  activeTab={environment}
  hasUnsavedChanges={hasChanges}
  onTabChange={handleTabChange}
/>
```

---

### SecretInput

**Purpose**: Masked input field for sensitive values

**Props**:

- `value`: Current value
- `onChange`: Value change handler
- `placeholder`: Optional placeholder text
- `className`: Additional CSS classes

**Features**:

- Password-style masking by default
- Toggle visibility with eye icon
- Copy to clipboard button
- Secure input handling

**Usage**:

```tsx
<SecretInput value={secretValue} onChange={setSecretValue} placeholder="Enter API key..." />
```

---

### EnvImportExport

**Purpose**: Bulk operations menu for import/export/find-replace

**Props**:

- `environment`: Current environment name
- `variables`: Array of variables
- `onImport`: Import variables callback
- `onExport`: Export to file callback
- `onCopyFrom`: Copy from environment callback
- `onFindReplace`: Find and replace callback

**Features**:

- Import from text or file
- Export to .env file download
- Copy variables from another environment
- Find and replace across all values
- Modal-based UI for operations

**Usage**:

```tsx
<EnvImportExport
  environment={environment}
  variables={variables}
  onImport={importVariables}
  onExport={exportEnvironment}
  onCopyFrom={copyFromEnvironment}
  onFindReplace={findReplace}
/>
```

---

## Types

### EnvVariable

```typescript
interface EnvVariable {
  key: string
  value: string
  defaultValue?: string
  isSecret?: boolean
  source?: 'env' | 'default' | 'override'
  category?: string
  hasChanges?: boolean
  description?: string
}
```

### AccessRole

```typescript
type AccessRole = 'dev' | 'sr_dev' | 'lead_dev'
```

### EnvironmentTab

```typescript
interface EnvironmentTab {
  id: string
  label: string
  file: string
  description: string
  minRole: AccessRole
}
```

## Architecture Notes

### Why Standalone Components?

These components were extracted from the main page to:

1. **Fix Tech Debt #1**: Prevent unnecessary re-renders
2. **Improve testability**: Each component can be tested in isolation
3. **Enable reusability**: Use in other pages (e.g., secrets, deployment)
4. **Better maintainability**: Clear separation of concerns

### Performance Considerations

- All event handlers use `useCallback` to prevent re-renders
- Components are memoized where appropriate
- Expensive operations (sorting, filtering) are computed once

### Accessibility

- All interactive elements have proper ARIA labels
- Keyboard navigation fully supported
- Screen reader announcements for status changes
- Focus management (auto-focus on edit/add)

## Testing

Test files are located in `/src/__tests__/config/`:

- `ConfigEnv.test.tsx` - Main page tests
- Component-specific tests coming soon

Run tests:

```bash
pnpm test src/__tests__/config/
```

## Development

### Adding a New Variable Type

1. Update `EnvVariable` interface in `types.ts`
2. Add validation logic in main page
3. Update `EnvVariableRow` display logic
4. Add tests

### Adding a New Bulk Operation

1. Add menu item in `EnvImportExport`
2. Create modal UI for operation
3. Implement handler callback
4. Wire up in main page
5. Add tests

### Debugging Tips

- Enable React DevTools profiler to check for re-renders
- Check localStorage for draft data: `nself_env_draft_*`
- API calls logged to browser console
- Use `showSecrets` toggle to inspect masked values
