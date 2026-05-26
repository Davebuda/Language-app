import { test, expect } from './fixtures'

const S = 'mobile'
const MOBILE_VIEWPORT = { width: 375, height: 812 }

const PAGES_TO_CHECK = [
  { path: '/', name: 'Landing' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/session', name: 'Session' },
  { path: '/conversation', name: 'Conversation' },
  { path: '/journal', name: 'Journal' },
  { path: '/reading', name: 'Reading' },
  { path: '/listen', name: 'Listen' },
  { path: '/profile', name: 'Profile' },
  { path: '/uke', name: 'Weekly check' },
] as const

for (const { path, name } of PAGES_TO_CHECK) {
  test.describe(`Mobile 375px — ${name}`, () => {
    test.use({ viewport: MOBILE_VIEWPORT })

    test(`${name} — no horizontal overflow`, async ({ page, emit, captureScreenshot }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)

      const overflow = await page.evaluate(() => {
        const body = document.body
        const html = document.documentElement
        return {
          scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
          clientWidth: html.clientWidth,
        }
      })

      const hasOverflow = overflow.scrollWidth > overflow.clientWidth + 2

      if (hasOverflow) {
        const screenshot = await captureScreenshot(page, S, `${name}-overflow`)
        emit({
          surface: S, check: `${name} no horizontal overflow at 375px`,
          status: 'fail', category: 'mobile-fail',
          evidence: `scrollWidth=${overflow.scrollWidth} > clientWidth=${overflow.clientWidth}`,
          screenshot,
        })
      } else {
        emit({
          surface: S, check: `${name} no horizontal overflow at 375px`,
          status: 'pass',
          evidence: `scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`,
        })
      }
      expect(hasOverflow).toBe(false)
    })

    test(`${name} — touch targets >= 44px`, async ({ page, emit }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)

      const smallTargets = await page.evaluate(() => {
        const interactives = document.querySelectorAll('button, a, input, [role="button"]')
        const violations: string[] = []
        interactives.forEach((el) => {
          const rect = el.getBoundingClientRect()
          if (rect.width > 0 && rect.height > 0) {
            if (rect.width < 44 || rect.height < 44) {
              const label = el.getAttribute('aria-label') || el.textContent?.slice(0, 30) || el.tagName
              violations.push(`${label}: ${Math.round(rect.width)}x${Math.round(rect.height)}`)
            }
          }
        })
        return violations.slice(0, 5)
      })

      emit({
        surface: S, check: `${name} touch targets >= 44px`,
        status: smallTargets.length === 0 ? 'pass' : 'warn',
        category: smallTargets.length === 0 ? undefined : 'mobile-fail',
        evidence: smallTargets.length === 0
          ? 'All visible touch targets >= 44px'
          : `${smallTargets.length} undersized targets: ${smallTargets.join(', ')}`,
      })
    })

    test(`${name} — BottomNav visible`, async ({ page, emit }) => {
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1500)

      const nav = page.locator('nav').last()
      const navVisible = await nav.isVisible().catch(() => false)

      const isLanding = path === '/'

      if (isLanding) {
        emit({
          surface: S, check: `${name} BottomNav visible`,
          status: 'pass',
          evidence: 'Landing page — BottomNav not expected',
        })
      } else {
        emit({
          surface: S, check: `${name} BottomNav visible`,
          status: navVisible ? 'pass' : 'warn',
          category: navVisible ? undefined : 'mobile-fail',
          evidence: navVisible ? 'BottomNav visible at 375px' : 'BottomNav not visible',
        })
      }
    })
  })
}
