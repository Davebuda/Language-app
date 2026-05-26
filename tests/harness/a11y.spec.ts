import AxeBuilder from '@axe-core/playwright'
import { test, expect } from './fixtures'

const S = 'a11y'

const PAGES_TO_SCAN = [
  { path: '/', name: 'Landing' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/session', name: 'Session' },
  { path: '/conversation', name: 'Conversation' },
  { path: '/journal', name: 'Journal' },
  { path: '/reading', name: 'Reading' },
  { path: '/listen', name: 'Listen' },
  { path: '/uke', name: 'Weekly check' },
  { path: '/profile', name: 'Profile' },
] as const

for (const { path, name } of PAGES_TO_SCAN) {
  test(`${name} (${path}) — accessibility scan`, async ({ page, emit, captureScreenshot }) => {
    await page.goto(path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    const critical = results.violations.filter((v) => v.impact === 'critical')
    const serious = results.violations.filter((v) => v.impact === 'serious')
    const moderate = results.violations.filter((v) => v.impact === 'moderate')
    const minor = results.violations.filter((v) => v.impact === 'minor')

    const totalViolations = results.violations.length
    const highImpact = critical.length + serious.length

    const formatViolation = (v: typeof results.violations[0]) =>
      `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`

    const violationSummary = results.violations
      .slice(0, 10)
      .map(formatViolation)
      .join('\n')

    if (highImpact > 0) {
      const screenshot = await captureScreenshot(page, S, `${name}-violations`)
      emit({
        surface: S, check: `${name} accessibility`,
        status: 'fail', category: 'a11y-fail',
        evidence: `${totalViolations} violations (${critical.length} critical, ${serious.length} serious, ${moderate.length} moderate, ${minor.length} minor):\n${violationSummary}`,
        screenshot,
      })
    } else if (totalViolations > 0) {
      emit({
        surface: S, check: `${name} accessibility`,
        status: 'warn', category: 'a11y-fail',
        evidence: `${totalViolations} low-impact violations (${moderate.length} moderate, ${minor.length} minor):\n${violationSummary}`,
      })
    } else {
      emit({
        surface: S, check: `${name} accessibility`,
        status: 'pass',
        evidence: `No WCAG 2.1 AA violations found. ${results.passes.length} rules passed.`,
      })
    }

    expect(highImpact).toBe(0)
  })
}
