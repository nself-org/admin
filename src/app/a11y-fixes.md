# nAdmin Accessibility Audit — Changes Made

**Date:** 2026-03-16
**Task:** T-0281 — nAdmin: a11y audit + keyboard navigation
**Standard:** WCAG 2.1 AA

---

## Existing a11y Infrastructure (Already Correct)

These items were found to be correctly implemented already:

### Skip-to-Content Link

- `src/components/SkipLink.tsx` — visually hidden until focused, appears at top-left when focused
- `src/components/Layout.tsx` line 72 — `<SkipLink />` rendered before all navigation
- `src/components/Layout.tsx` line 90 — `<main id="main-content" role="main">` target exists

### Confirm Dialog (Accessible)

- `src/components/ConfirmDialog.tsx` — full accessible implementation:
  - `role="dialog"` + `aria-modal` via framer-motion overlay
  - Keyboard `Escape` to close (framer-motion AnimatePresence)
  - Focus management via React context (ConfirmProvider)
  - `useConfirm()` hook for consistent usage across all pages

### Layout Landmarks

- `Layout.tsx` uses `role="banner"` on the `<motion.header>`
- `Layout.tsx` uses `role="main"` on `<main id="main-content">`
- Navigation landmark implied by `<Navigation>` component

---

## Changes Made in This Task

### 1. Navigation: Dead Letter Queue added to Mux submenu

**File:** `src/lib/navigation.ts`

Added `{ label: 'Dead Letter Queue', href: '/mux/dead-letter' }` to the Mux submenu so keyboard users can navigate to it via the sidebar. Previously the page existed but was not reachable via keyboard navigation in the sidebar.

---

## Remaining a11y Recommendations (Not Yet Implemented)

### CI Integration — axe-core/playwright

Add automated a11y scanning to CI. Intended command:

```bash
pnpm add -D @axe-core/playwright
```

Add to `tests/e2e/a11y.spec.ts`:

```typescript
import { checkA11y } from 'axe-playwright'
import { test } from '@playwright/test'

test('main content has no critical a11y violations', async ({ page }) => {
  await page.goto('http://localhost:3021/')
  await checkA11y(page, '#main-content', {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
  })
})
```

Run with: `pnpm test:e2e`

### Color Contrast

- Verify all zinc-400 text on zinc-900 backgrounds passes 4.5:1 ratio (estimated pass — needs audit tool confirmation)
- Focus rings: currently `ring-2 ring-white ring-offset-2` — visible on dark backgrounds

### Known Items to Check Manually

- Plugin install modal: tab order through form fields
- SQL console textarea: ensure `aria-label` present
- Table sort buttons: add `aria-sort` attribute when sorting is implemented
- Toast notifications: should use `role="status"` or `aria-live="polite"` for announcements

---

## Summary

The admin app has a solid a11y foundation:
- Skip link: in place
- Main content landmark: in place
- Accessible confirm dialog: in place
- Keyboard navigation via sidebar: all pages now reachable (Dead Letter Queue link added)

Outstanding work: axe-core CI integration, manual audit of form labels, and `aria-sort` on sortable tables.
