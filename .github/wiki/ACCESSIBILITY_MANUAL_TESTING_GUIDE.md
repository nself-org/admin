# Accessibility Manual Testing Guide

**Purpose:** Quick reference guide for manual accessibility testing on nself-admin
**Standard:** WCAG 2.1 Level AA
**Last Updated:** 2026-02-01

---

## Quick Test Checklist

Use this checklist when adding new features or pages:

### ✅ Keyboard Navigation (5 minutes per page)

1. **Tab through entire page:**
   - [ ] Can navigate to all interactive elements
   - [ ] Tab order follows visual layout
   - [ ] Focus visible on all elements (2px blue ring)
   - [ ] No keyboard traps

2. **Test keyboard actions:**
   - [ ] Enter activates buttons and links
   - [ ] Space activates buttons
   - [ ] Escape closes modals/dropdowns
   - [ ] Arrow keys work in custom widgets (tabs, menus)

3. **Skip navigation:**
   - [ ] Skip link appears on first Tab press
   - [ ] Skip link moves focus to main content

### ✅ Screen Reader (10 minutes per page)

**Using VoiceOver (Mac):** Cmd+F5 to enable

1. **Navigate page structure:**
   - [ ] Page title announced correctly
   - [ ] Landmarks announced (banner, navigation, main)
   - [ ] Headings in logical order (H1 → H2 → H3)

2. **Test form fields:**
   - [ ] All labels announced before input
   - [ ] Required fields announced as "required"
   - [ ] Errors announced immediately (role="alert")
   - [ ] Error text associated with field

3. **Test dynamic content:**
   - [ ] Loading states announced ("Loading...")
   - [ ] Status changes announced automatically
   - [ ] Alerts announced without navigation
   - [ ] Success/error messages announced

4. **Test interactive elements:**
   - [ ] Buttons have descriptive labels
   - [ ] Links describe destination
   - [ ] Icon-only buttons have aria-label
   - [ ] Collapsible sections announce expanded/collapsed

### ✅ Color Contrast (2 minutes per page)

**Using Chrome DevTools:**

1. Inspect element → Styles panel → Color picker
2. Check contrast ratio badge
3. Verify:
   - [ ] Regular text: ≥ 4.5:1
   - [ ] Large text (18pt+): ≥ 3:1
   - [ ] UI components: ≥ 3:1
   - [ ] Focus indicators: ≥ 3:1

---

## Page-Specific Tests

### Login Page

**Keyboard:**

- [ ] Tab: Password → Show/Hide → Submit
- [ ] Enter submits form
- [ ] Space toggles Show/Hide button

**Screen Reader:**

- [ ] "Password, required, secure input"
- [ ] "Toggle password visibility, button"
- [ ] Password strength announced automatically
- [ ] Errors announced: "Invalid password, alert"

**Focus:**

- [ ] All elements have visible focus ring
- [ ] No focus loss after toggling password visibility

---

### Dashboard

**Keyboard:**

- [ ] Skip link appears first (Tab once)
- [ ] Navigate service cards in order
- [ ] All action buttons accessible
- [ ] Collapsible sections toggle with Enter/Space

**Screen Reader:**

- [ ] Service status announced: "PostgreSQL, Running"
- [ ] Not just "green dot" - actual status text
- [ ] Each card has proper heading (H3)
- [ ] Action buttons have descriptive labels

**Focus:**

- [ ] Focus visible on service cards
- [ ] Focus visible on all buttons
- [ ] Focus order matches visual layout

---

### Config → Environment Variables

**Keyboard:**

- [ ] Navigate tabs with arrow keys
- [ ] Tab moves to table
- [ ] Navigate table cells with Tab
- [ ] Enter activates Edit/Delete
- [ ] Escape closes modal
- [ ] Focus trapped in modal

**Screen Reader:**

- [ ] Tab role announced
- [ ] Table headers announced
- [ ] Cell values announced with column context
- [ ] Modal title announced when opened

**Focus:**

- [ ] Tab indicator visible
- [ ] Table cells have focus ring
- [ ] Modal focus trapped and returned

---

### Service Pages

**Keyboard:**

- [ ] Navigate tabs (Overview, Logs, Config, Metrics)
- [ ] Action buttons (Start, Stop, Restart)
- [ ] Tab content interactive elements

**Screen Reader:**

- [ ] Service name in page title
- [ ] Status announced: "PostgreSQL is running"
- [ ] Tab labels announced
- [ ] Confirmation dialogs announced

**Focus:**

- [ ] Tab selection visible
- [ ] Action buttons have focus ring
- [ ] Focus managed correctly in dialogs

---

## Common Issues & Fixes

### Issue: Focus Not Visible

**Problem:** No outline when tabbing
**Fix:** Add `focus-visible:ring-2 focus-visible:ring-blue-500`
**Example:**

```tsx
<button className="focus-visible:ring-2 focus-visible:ring-blue-500 ...">
  Click me
</button>
```

---

### Issue: Icon Button Not Labeled

**Problem:** Screen reader says "button" without context
**Fix:** Add `aria-label`
**Example:**

```tsx
<button aria-label="Close dialog">
  <X className="h-4 w-4" aria-hidden="true" />
</button>
```

---

### Issue: Status Only Shown with Color

**Problem:** Color-blind users can't distinguish status
**Fix:** Add sr-only text
**Example:**

```tsx
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-green-500" />
  <span className="sr-only">Running</span>
  <span>PostgreSQL</span>
</div>
```

---

### Issue: Error Not Announced

**Problem:** Error appears but screen reader doesn't announce it
**Fix:** Add `role="alert"` or `aria-live="assertive"`
**Example:**

```tsx
<div role="alert" className="text-red-600">
  {error}
</div>
```

---

### Issue: Loading Not Announced

**Problem:** Screen reader doesn't know content is loading
**Fix:** Add `aria-live="polite"` and `aria-busy="true"`
**Example:**

```tsx
{
  loading && (
    <div aria-live="polite" aria-busy="true">
      Loading content...
    </div>
  )
}
```

---

### Issue: Modal Focus Not Trapped

**Problem:** Tab moves focus outside modal
**Fix:** Use Headless UI Dialog (already handles this)
**Example:**

```tsx
import { Dialog } from '@headlessui/react'
;<Dialog open={isOpen} onClose={setIsOpen}>
  {/* Focus automatically trapped */}
</Dialog>
```

---

### Issue: Form Error Not Associated

**Problem:** Error shown but not linked to input
**Fix:** Use `aria-describedby`
**Example:**

```tsx
;<input id="password" aria-describedby={error ? 'password-error' : undefined} />
{
  error && (
    <div id="password-error" role="alert">
      {error}
    </div>
  )
}
```

---

## Automated Testing

### Quick axe DevTools Test

1. Install: [axe DevTools Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
2. Open DevTools → axe DevTools tab
3. Click "Scan ALL of my page"
4. Fix any Critical or Serious issues
5. Document Moderate/Minor for backlog

**Target:** 0 Critical, 0 Serious issues

---

### Quick Lighthouse Test

1. Open DevTools → Lighthouse tab
2. Select "Accessibility" only
3. Select "Desktop" mode
4. Click "Analyze page load"
5. Review failures and fix

**Target:** 100/100 score

---

### Color Contrast Checker

**Online Tool:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

1. Get foreground color (text) hex code
2. Get background color hex code
3. Paste into tool
4. Verify:
   - Normal text: WCAG AA (4.5:1) ✅
   - Large text: WCAG AA (3:1) ✅

---

## VoiceOver Quick Reference (macOS)

### Enable/Disable

- **Toggle VoiceOver:** Cmd + F5

### Navigation

- **Next item:** VO + Right Arrow (VO = Ctrl + Option)
- **Previous item:** VO + Left Arrow
- **Click item:** VO + Space
- **Interact with element:** VO + Shift + Down Arrow
- **Stop interacting:** VO + Shift + Up Arrow

### Rotor (Quick Navigation)

- **Open rotor:** VO + U
- **Navigate sections:** Left/Right Arrow
- **Select item:** Enter

### Reading

- **Read from cursor:** VO + A
- **Stop reading:** Control

---

## WCAG 2.1 AA Quick Reference

### Level A (Must Have)

| Guideline                  | Requirement                       | Test                                |
| -------------------------- | --------------------------------- | ----------------------------------- |
| 1.1.1 Non-text Content     | Images have alt text              | Check all `<img>` have `alt`        |
| 1.3.1 Info & Relationships | Semantic HTML                     | Use `<nav>`, `<main>`, `<h1>`, etc. |
| 2.1.1 Keyboard             | All functions keyboard accessible | Tab through page                    |
| 2.4.1 Bypass Blocks        | Skip navigation link              | First tab shows skip link           |
| 3.3.1 Error Identification | Errors clearly described          | Errors have `role="alert"`          |
| 4.1.2 Name, Role, Value    | All UI has accessible name        | All buttons/links have labels       |

### Level AA (Should Have)

| Guideline              | Requirement          | Test                          |
| ---------------------- | -------------------- | ----------------------------- |
| 1.4.3 Contrast         | 4.5:1 text, 3:1 UI   | Use contrast checker          |
| 2.4.7 Focus Visible    | Focus always visible | Tab and verify outline        |
| 3.3.3 Error Suggestion | Errors suggest fix   | Error text includes guidance  |
| 4.1.3 Status Messages  | Changes announced    | aria-live for dynamic content |

---

## Testing Schedule

### For Each New Feature

1. **During Development:** Test keyboard navigation
2. **Before PR:** Run axe DevTools
3. **Code Review:** Check ARIA attributes in code review
4. **Before Merge:** Full accessibility test (keyboard + screen reader)

### Monthly Audit

- [ ] Run full accessibility audit with axe DevTools on all pages
- [ ] Test 5 critical pages with VoiceOver
- [ ] Run Lighthouse on 10 pages
- [ ] Update accessibility testing report

### Before Release

- [ ] Full keyboard navigation test on all pages
- [ ] VoiceOver test on 10 critical pages
- [ ] axe DevTools scan on all pages
- [ ] Lighthouse audit on 10 pages
- [ ] Color contrast verification on new components
- [ ] Update ACCESSIBILITY_TESTING_REPORT.md

---

## Resources

### Tools

- **axe DevTools:** [Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- **Lighthouse:** Built into Chrome DevTools
- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **VoiceOver:** Built into macOS (Cmd+F5)
- **NVDA:** Free screen reader for Windows

### Documentation

- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **Headless UI Accessibility:** https://headlessui.com/

### Reference Docs

- `/docs/ACCESSIBILITY_AUDIT.md` - All 37 fixes documented
- `/docs/ACCESSIBILITY_TESTING_REPORT.md` - Test results
- This guide - Manual testing procedures

---

**Last Verified:** February 1, 2026
**All 37 accessibility fixes verified working correctly**
**WCAG 2.1 AA Compliant**
