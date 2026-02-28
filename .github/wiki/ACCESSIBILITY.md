# Accessibility in nself-admin

nself-admin is committed to providing an accessible experience for all users, including those who rely on assistive technologies such as screen readers, keyboard navigation, or other accessibility tools.

---

## Standards & Compliance

**Target Standard:** WCAG 2.1 Level AA

We strive to meet or exceed the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA. This ensures our application is:

- **Perceivable** - Information and UI components are presentable to users in ways they can perceive
- **Operable** - UI components and navigation are operable by all users
- **Understandable** - Information and operation of UI is understandable
- **Robust** - Content can be interpreted by a wide variety of user agents, including assistive technologies

---

## Accessibility Features

### Keyboard Navigation

All functionality in nself-admin is fully accessible via keyboard:

- **Tab** - Navigate to next interactive element
- **Shift + Tab** - Navigate to previous interactive element
- **Enter** - Activate links and buttons
- **Space** - Activate buttons and checkboxes
- **Escape** - Close modals and dropdowns
- **Arrow Keys** - Navigate within menus and dropdowns

[Full Keyboard Navigation Guide →](./KEYBOARD_NAVIGATION.md)

### Skip to Main Content

A "Skip to main content" link is available when you press **Tab** on any page. This allows keyboard and screen reader users to bypass repetitive navigation and jump directly to the main content.

### Screen Reader Support

nself-admin is tested with and supports:

- **VoiceOver** (macOS)
- **NVDA** (Windows)
- **JAWS** (Windows)

All interactive elements have proper labels, all images have alternative text, and dynamic content updates are announced appropriately.

### Focus Indicators

All interactive elements display a visible focus indicator when navigated via keyboard, ensuring users always know where they are on the page.

- Minimum 2px outline
- 3:1 contrast ratio against background
- Consistent blue ring styling

### Semantic HTML

We use proper semantic HTML throughout the application:

- Heading hierarchy (h1 → h2 → h3)
- Landmark regions (header, nav, main, footer)
- Proper list structures
- Semantic form elements

### ARIA Support

Where semantic HTML is insufficient, we use ARIA (Accessible Rich Internet Applications) attributes to provide additional context to assistive technologies:

- `aria-label` for icon-only buttons
- `aria-expanded` for collapsible sections
- `aria-live` for dynamic content updates
- `aria-describedby` for form errors
- `role` attributes for custom components

### Form Accessibility

All forms in nself-admin are fully accessible:

- Every input has a properly associated label
- Required fields are clearly indicated (visually and programmatically)
- Errors are announced to screen readers
- Error messages are associated with their fields
- Password strength is communicated accessibly

### Status and Alerts

System status and alerts are communicated through multiple channels:

- Visual indicators (color, icons)
- Text alternatives for screen readers
- Live regions that announce updates
- Proper ARIA roles (alert, status)

---

## Testing

### Automated Testing

We use industry-standard automated accessibility testing tools:

```bash
# Run accessibility audit
pnpm run test:a11y

# This tests for WCAG 2.1 AA compliance using pa11y + axe-core
```

Our CI/CD pipeline includes accessibility tests that must pass before merging.

### Manual Testing

In addition to automated tests, we perform regular manual testing:

- **Keyboard Navigation Testing** - Navigate the entire app without a mouse
- **Screen Reader Testing** - Test with VoiceOver and NVDA
- **Color Contrast Testing** - Verify all text meets contrast ratios
- **Focus Management Testing** - Ensure logical focus order

### Browser Testing

We test accessibility across modern browsers:

- Chrome/Edge
- Firefox
- Safari

---

## Known Issues

We maintain transparency about accessibility limitations. See [ACCESSIBILITY_AUDIT.md](./ACCESSIBILITY_AUDIT.md) for a detailed list of any known issues and our plans to address them.

---

## Reporting Accessibility Issues

If you encounter an accessibility barrier while using nself-admin:

1. **Create an Issue**: File a GitHub issue with the "accessibility" label
2. **Provide Details**: Include:
   - What you were trying to do
   - What barrier you encountered
   - Your assistive technology (if applicable)
   - Browser and version
   - Screenshots/recordings (if possible)
3. **Priority**: We treat accessibility issues as high priority and aim to fix them promptly

---

## Accessibility Documentation

- [Accessibility Audit Report](./ACCESSIBILITY_AUDIT.md) - Detailed findings and compliance status
- [Keyboard Navigation Guide](./KEYBOARD_NAVIGATION.md) - Complete keyboard shortcuts and navigation patterns
- [Accessibility Fixes Summary](./ACCESSIBILITY_FIXES_SUMMARY.md) - Recent improvements and implementation details

---

## Resources for Developers

If you're contributing to nself-admin, please review:

### Guidelines

- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Testing Tools

- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension
- [WAVE](https://wave.webaim.org/) - Browser extension
- [pa11y](https://pa11y.org/) - Command-line tool (we use this in CI)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools

### Best Practices

1. **Always provide text alternatives** for images, icons, and visual content
2. **Use semantic HTML** before reaching for ARIA
3. **Test with keyboard** - If you can't use it with Tab and Enter, it's not accessible
4. **Ensure sufficient color contrast** - Use a contrast checker
5. **Announce dynamic changes** to screen readers using ARIA live regions
6. **Maintain focus management** in modals and custom components
7. **Label everything** - Buttons, links, form fields, regions

---

## Accessibility Commitment

Accessibility is not a feature - it's a requirement. We are committed to:

1. **Maintaining WCAG 2.1 AA compliance** across the entire application
2. **Regular accessibility audits** to catch issues early
3. **Prompt fixes** for reported accessibility barriers
4. **Training** for all contributors on accessibility best practices
5. **User testing** with people who rely on assistive technologies

We believe everyone should be able to use nself-admin effectively, regardless of how they interact with it.

---

## Contact

For accessibility questions or concerns:

- **GitHub Issues**: Use the "accessibility" label
- **Email**: Include "[Accessibility]" in the subject line
- **Documentation**: Check our accessibility docs first

We welcome feedback and are committed to continuous improvement.

---

**Last Updated:** 2026-01-31
**Next Audit:** Q2 2026
