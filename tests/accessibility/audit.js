#!/usr/bin/env node

/**
 * Automated Accessibility Testing Script
 * Uses Playwright + axe-core to test pages for WCAG 2.1 AA compliance
 *
 * Usage:
 *   node tests/accessibility/audit.js
 *
 * Requirements:
 *   - Development server must be running on port 3021
 *   - pnpm dev
 */

const { chromium } = require('@playwright/test')
const fs = require('fs').promises

const BASE_URL = 'http://localhost:3021'

const PAGES = [
  {
    url: `${BASE_URL}/login`,
    name: 'Login Page',
  },
  // Add more pages after authentication is implemented in testing
  // {
  //   url: `${BASE_URL}/`,
  //   name: 'Dashboard',
  // },
  // {
  //   url: `${BASE_URL}/services`,
  //   name: 'Services Page',
  // },
]

async function runAudit() {
  console.log('Starting Accessibility Audit...\n')
  console.log(`Testing ${PAGES.length} pages for WCAG 2.1 AA compliance\n`)

  const browser = await chromium.launch()
  const results = []
  let totalIssues = 0
  let criticalIssues = 0

  try {
    for (const page of PAGES) {
      console.log(`Testing: ${page.name}`)
      console.log(`URL: ${page.url}`)

      try {
        const context = await browser.newContext()
        const browserPage = await context.newPage()
        await browserPage.goto(page.url, {
          waitUntil: 'networkidle',
          timeout: 30000,
        })
        await browserPage.waitForTimeout(1000)

        // Inject axe-core and run analysis
        await browserPage.addScriptTag({
          path: require.resolve('axe-core/axe.min.js'),
        })

        const axeResults = await browserPage.evaluate(() => {
          return new Promise((resolve) => {
            window.axe.run(
              document,
              {
                runOnly: {
                  type: 'tag',
                  values: ['wcag2a', 'wcag2aa'],
                },
              },
              (_err, results) => resolve(results),
            )
          })
        })

        const violations = axeResults.violations || []
        const critical = violations.filter(
          (v) => v.impact === 'critical' || v.impact === 'serious',
        ).length
        const warnings = violations.filter(
          (v) => v.impact === 'moderate',
        ).length
        const notices = violations.filter((v) => v.impact === 'minor').length

        totalIssues += violations.length
        criticalIssues += critical

        results.push({
          page: page.name,
          url: page.url,
          violations,
          critical,
          warnings,
          notices,
        })

        console.log(`  ✓ Critical/Serious: ${critical}`)
        console.log(`  ⚠ Moderate: ${warnings}`)
        console.log(`  ℹ Minor: ${notices}`)
        console.log('')

        await context.close()
      } catch (error) {
        console.error(`  ✗ Error testing ${page.name}:`, error.message)
        console.log('')
      }
    }
  } finally {
    await browser.close()
  }

  // Generate report
  await generateReport(results, { totalIssues, criticalIssues })

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('ACCESSIBILITY AUDIT SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total Issues: ${totalIssues}`)
  console.log(`Critical/Serious Errors: ${criticalIssues}`)
  console.log(`\nDetailed report saved to: tests/accessibility/report.md`)

  // Exit with error if critical issues found
  if (criticalIssues > 0) {
    console.log('\n⚠️  FAILED: Critical accessibility issues found!')
    process.exit(1)
  } else {
    console.log('\n✅ PASSED: No critical accessibility issues found!')
    process.exit(0)
  }
}

async function generateReport(results, summary) {
  const timestamp = new Date().toISOString()

  let report = `# Accessibility Audit Report

**Date:** ${timestamp}
**Standard:** WCAG 2.1 AA
**Tool:** Playwright + axe-core

---

## Summary

- **Total Issues:** ${summary.totalIssues}
- **Critical/Serious Errors:** ${summary.criticalIssues}
- **Pages Tested:** ${results.length}

---

## Detailed Results

`

  for (const result of results) {
    report += `### ${result.page}

**URL:** \`${result.url}\`

- Critical/Serious: ${result.critical}
- Moderate: ${result.warnings}
- Minor: ${result.notices}

`

    if (result.violations.length > 0) {
      report += `#### Issues Found:\n\n`

      for (const violation of result.violations) {
        const nodeCount = violation.nodes ? violation.nodes.length : 0
        report += `- **[${(violation.impact || 'unknown').toUpperCase()}]** ${violation.description}
  - Rule: \`${violation.id}\`
  - Help: ${violation.helpUrl}
  - Affected nodes: ${nodeCount}

`
      }
    } else {
      report += `✅ No accessibility issues found!\n\n`
    }

    report += '\n---\n\n'
  }

  await fs.writeFile('tests/accessibility/report.md', report, 'utf8')
}

// Run the audit
runAudit().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
