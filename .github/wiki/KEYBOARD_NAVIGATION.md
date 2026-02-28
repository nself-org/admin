# Keyboard Navigation Guide - nself-admin

This document describes all keyboard shortcuts and navigation patterns in the nself-admin application to ensure full keyboard accessibility.

---

## Global Keyboard Shortcuts

### Navigation

- **Tab** - Move focus to next interactive element
- **Shift + Tab** - Move focus to previous interactive element
- **Enter** - Activate focused link or button
- **Space** - Activate focused button or checkbox
- **Escape** - Close modals, dialogs, dropdowns

### Skip Links

- **Tab (from page load)** - Focus skip link (visible on focus)
- **Enter (on skip link)** - Jump directly to main content

---

## Page-Specific Navigation

### Login Page (`/login`)

**Tab Order:**

1. Username field (if shown)
2. Password field
3. Show/hide password button
4. Confirm password field (setup mode only)
5. Show/hide confirm password button (setup mode only)
6. Remember me checkbox (login mode only)
7. Submit button

**Keyboard Actions:**

- **Enter** (in password field) - Submit form
- **Space** (on show/hide password) - Toggle password visibility
- **Space** (on remember me checkbox) - Toggle checkbox

**ARIA Live Regions:**

- Caps Lock warning announced when detected
- Password strength announced as you type (setup mode)
- Error messages announced with role="alert"
- Rate limit warnings announced

---

### Dashboard (`/`)

**Tab Order:**

1. Skip to main content link
2. Search field
3. Mobile navigation toggle
4. Theme toggle
5. Logout button
6. Navigation sections (collapsible)
7. Service cards
8. Action buttons on each card

**Navigation Section Interaction:**

- **Enter/Space** - Expand/collapse section
- **Tab** - Navigate to links within expanded section
- **aria-expanded** announces state to screen readers

**Service Cards:**

- **Tab** - Navigate through service cards
- **Enter** - Activate focused button (Start, Stop, Restart, View Logs, etc.)

**ARIA Live Regions:**

- System alerts announced as they appear (role="alert" for critical, role="status" for warnings)
- Activity feed updates announced (aria-live="polite")

---

### Services Page (`/services/*`)

**Tab Order:**

1. Skip to main content
2. Main navigation
3. Service-specific tabs/controls
4. Service actions (start, stop, restart)
5. Logs viewer
6. Configuration forms

**Service Actions:**

- **Enter** - Execute action (start, stop, restart)
- Service status announced via sr-only text

---

### Configuration Pages (`/config/*`)

**Tab Order:**

1. Skip to main content
2. Main navigation
3. Environment tabs
4. Form fields
5. Save/Cancel buttons

**Environment Tabs:**

- **Left Arrow** - Previous tab
- **Right Arrow** - Next tab
- **Home** - First tab
- **End** - Last tab
- **Tab** - Exit tab list to form fields

**Form Fields:**

- **Tab** - Next field
- **Shift + Tab** - Previous field
- **Enter** - Submit form (on submit button)
- **Escape** - Cancel/close (if in modal)

---

## Component-Specific Patterns

### Modals/Dialogs

**Focus Management:**

1. When modal opens, focus moves to first interactive element
2. Focus is trapped within modal (Tab cycles through modal only)
3. **Escape** closes modal
4. When modal closes, focus returns to trigger element

**Tab Order within Modal:**

1. Close button
2. Modal content interactive elements
3. Action buttons (Cancel, Confirm, etc.)

**ARIA:**

- `role="dialog"`
- `aria-modal="true"`
- `aria-labelledby` points to modal title
- `aria-describedby` points to modal description

---

### Collapsible Navigation Groups

**Interaction:**

- **Enter/Space** on group header - Expand/collapse
- **Tab** - Navigate to next group or link
- **Shift + Tab** - Navigate to previous

**ARIA:**

- `aria-expanded="true|false"` announces state
- `aria-label` describes action (e.g., "Expand Services section")

---

### Forms

**Focus Order:**

1. First form field
2. Subsequent fields in logical order
3. Submit button
4. Cancel/Reset button (if present)

**Error Handling:**

- Errors announced via `role="alert"`
- Fields with errors have `aria-invalid="true"`
- `aria-describedby` links field to error message

**Required Fields:**

- Visual indicator (red asterisk)
- `aria-label="required"` on asterisk
- `required` attribute on input

---

### Dropdowns/Select Menus

**Interaction:**

- **Enter/Space** - Open dropdown
- **Arrow Down** - Next option
- **Arrow Up** - Previous option
- **Home** - First option
- **End** - Last option
- **Enter** - Select focused option
- **Escape** - Close dropdown without selecting

**ARIA:**

- `role="combobox"` or `role="listbox"`
- `aria-expanded` announces state
- `aria-activedescendant` announces focused option

---

### Data Tables

**Navigation:**

- **Tab** - Next interactive element in table
- **Shift + Tab** - Previous interactive element

**Structure:**

- `<th scope="col">` for column headers
- `<th scope="row">` for row headers (if applicable)
- `<caption>` describes table purpose
- `aria-label` or `aria-labelledby` for complex tables

---

### Alerts and Notifications

**ARIA Live Regions:**

- Critical errors: `role="alert"` + `aria-live="assertive"` (interrupts screen reader)
- Warnings: `role="status"` + `aria-live="polite"` (waits for pause)
- Info messages: `aria-live="polite"`

**Dismissible Alerts:**

- **Tab** to dismiss button
- **Enter/Space** - Dismiss alert
- `aria-label` describes which alert is being dismissed

---

## Screen Reader Landmarks

### Available Landmarks

1. **Banner** - Header with logo and top navigation
2. **Navigation** - Main sidebar navigation (aria-label="Main navigation")
3. **Main** - Main content area (id="main-content")
4. **Complementary** - Sidebar/aside content
5. **Contentinfo** - Footer

### Navigation Shortcuts (varies by screen reader)

- **VoiceOver (macOS):**
  - VO + U - Rotor (navigate by headings, landmarks, links)
  - VO + Command + H - Next heading
  - VO + Command + L - Next link
  - VO + Command + J - Next form control

- **NVDA (Windows):**
  - H - Next heading
  - K - Next link
  - F - Next form field
  - D - Next landmark
  - T - Next table

- **JAWS (Windows):**
  - H - Next heading
  - R - Next region/landmark
  - F - Next form field
  - T - Next table

---

## Focus Indicators

All interactive elements have visible focus indicators:

- **Minimum size:** 2px outline
- **Contrast ratio:** 3:1 against background
- **Color:** Blue ring (matches theme)
- **Style:** Tailwind's `focus-visible:ring-2` classes

---

## Testing Checklist

### Manual Keyboard Testing

- [ ] Unplug/hide mouse
- [ ] Navigate entire application using only keyboard
- [ ] Verify all interactive elements are reachable
- [ ] Verify focus order is logical
- [ ] Verify focus indicators visible at all times
- [ ] Test all forms can be completed
- [ ] Test all modals can be opened, used, and closed
- [ ] Verify Escape key closes dropdowns/modals
- [ ] Test collapsible sections work
- [ ] Verify no keyboard traps

### Screen Reader Testing

- [ ] Test with VoiceOver (macOS)
- [ ] Test with NVDA (Windows)
- [ ] Verify all text is readable
- [ ] Verify all images have alt text
- [ ] Verify headings are announced
- [ ] Verify landmarks are announced
- [ ] Test form labels announced
- [ ] Verify dynamic content announced (alerts, updates)
- [ ] Test button labels are descriptive
- [ ] Verify status indicators have text alternatives

---

## Common Issues & Solutions

### Issue: Lost focus after closing modal

**Solution:** Headless UI Dialog component handles this automatically. Focus returns to trigger element.

### Issue: Can't reach element with keyboard

**Solution:** Ensure element is not `pointer-events-none` and has proper tabindex (0 or not set).

### Issue: Focus ring not visible

**Solution:** Check for `outline: none` in styles. Use `focus-visible:ring-2` instead.

### Issue: Screen reader not announcing updates

**Solution:** Add appropriate `aria-live` region with correct politeness level.

### Issue: Keyboard trap in component

**Solution:** Review focus management. Ensure Tab/Shift+Tab cycle correctly and Escape provides exit.

---

## Accessibility Resources

### WCAG 2.1 Guidelines

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)

### Testing Tools

- **Browser Extensions:**
  - axe DevTools (Chrome, Firefox)
  - WAVE (Chrome, Firefox)
  - Lighthouse (Chrome DevTools)

- **Screen Readers:**
  - VoiceOver (macOS built-in)
  - NVDA (Windows, free)
  - JAWS (Windows, commercial)

- **Automated Testing:**
  - pa11y (CLI tool)
  - axe-core (JavaScript library)
  - jest-axe (Jest integration)

### Further Reading

- [MDN ARIA Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)

---

## Support

For accessibility issues or questions, please:

1. Check this document for guidance
2. Review WCAG 2.1 AA standards
3. Test with keyboard and screen reader
4. File an issue on GitHub with "A11y:" prefix

**Target:** 100% keyboard navigable, WCAG 2.1 AA compliant
