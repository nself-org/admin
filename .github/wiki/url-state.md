# Admin URL State, Deep-Linking Reference

Every admin page serializes its filter, tab, search, and cursor state into URL search params. This means any admin view is directly shareable by copying the browser URL.

## 6-Param Vocabulary

| Param                   | Type   | Purpose                        | Example                  |
| ----------------------- | ------ | ------------------------------ | ------------------------ |
| `?tab=<name>`           | string | Active tab on a multi-tab page | `?tab=metrics`           |
| `?q=<text>`             | string | Search query                   | `?q=postgres`            |
| `?since=<duration>`     | string | Time-range filter              | `?since=1h`              |
| `?filter.<key>=<value>` | string | Arbitrary filter               | `?filter.status=active`  |
| `?cursor=<opaque>`      | string | Pagination cursor              | `?cursor=eyJpZCI6MTAwfQ` |
| `?selected=<id>`        | string | Selected row ID                | `?selected=abc123`       |

Multiple params may be combined: `/monitor?tab=metrics&since=1h`

## The `useUrlState` Hook

```typescript
import { useUrlState } from '@/hooks/useUrlState'

// Tab state — syncs ?tab= to URL
const [activeTab, setActiveTab] = useUrlState<string>('tab', 'overview')

// Search with 300ms debounce — syncs ?q= to URL
const [query, setQuery] = useUrlState<string>('q', '', { debounce: 300 })

// Time range — syncs ?since= to URL
const [timeRange, setTimeRange] = useUrlState<string>('since', '1h')
```

### Options

| Option     | Default     | Description                                                              |
| ---------- | ----------- | ------------------------------------------------------------------------ |
| `pushMode` | `'replace'` | `'replace'` = no back-stack entry; `'push'` = adds browser history entry |
| `debounce` | `0`         | ms to wait before updating URL (use 200-400 for text inputs)             |

### Suspense requirement

`useUrlState` depends on Next.js `useSearchParams`, which requires the component to be wrapped in a `<Suspense>` boundary. If your page renders directly without a content component, wrap it:

```tsx
function MyContent() {
  const [tab, setTab] = useUrlState('tab', 'overview')
  // ...
}

export default function MyPage() {
  return (
    <Suspense>
      <MyContent />
    </Suspense>
  )
}
```

## Copy Link Button

Every page using `<PageHeader>` automatically includes a **Copy link** button in the top-right corner. Clicking it:

1. Copies the full current URL (including all search params) to the clipboard.
2. Shows a toast: "Link copied. Recipient must be signed in to view."

The button is hidden in print mode. To suppress it on a specific page, pass `showCopyLink={false}` to `<PageHeader>`.

## Rollout Status

| Group                | Routes                                                                                                                                                 | Params                   | Status         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | -------------- |
| Tab pages            | services/\*, monitor, notifications, reports, help, backup, plugins/[name], database/inspect, database/data, k8s/status, tools/webhooks, claw/sessions | `?tab=`                  | Done (P95 Y01) |
| Search pages         | plugins, help/search, helm/values, logs                                                                                                                | `?q=`, `?filter.*`       | Done (P95 Y01) |
| Time-range pages     | monitor                                                                                                                                                | `?since=`                | Done (P95 Y01) |
| Seed pages (P94 S35) | logs, plugins, services                                                                                                                                | Native `useSearchParams` | Done (P94 S35) |

## i18n Note

Admin is intentionally single-locale (`en`). next-intl `[locale]` segment routing is not used. If a second locale is added in a future version, convert to `[locale]` segment routing per next-intl docs at that time.

## Print Support

All admin pages include `@media print` styles in `src/styles/tailwind.css` that:

- Hide sidebar, topbar, nav, action buttons, tooltips
- Expand main content to full width
- Set font size to 11pt for A4/Letter compatibility
- Prevent overflow clipping
