import { test, expect, hasNorwegianText } from './fixtures'

const S = 'weekly'

test.describe('Weekly Check (/uke) — Truth Audit', () => {
  test('page loads without errors', async ({ page, emit }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto('/uke')
    await page.waitForLoadState('networkidle')

    emit({
      surface: S, check: 'Page loads without console errors',
      status: errors.length === 0 ? 'pass' : 'fail',
      category: errors.length === 0 ? undefined : 'broken',
      evidence: errors.length === 0 ? 'Zero console errors' : `Errors: ${errors.join('; ')}`,
    })
    expect(errors).toHaveLength(0)
  })

  test('renders weekly check content', async ({ page, emit }) => {
    await page.goto('/uke')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const mainText = (await page.locator('main').first().textContent()) ?? ''
    const hasContent = mainText.trim().length > 20
    const hasNorwegian = hasNorwegianText(mainText)
    const hasInteraction = (await page.locator('main button, main input').count()) > 0

    emit({
      surface: S, check: 'Weekly check renders content',
      status: hasContent && hasNorwegian ? 'pass' : hasContent ? 'warn' : 'fail',
      category: hasContent ? (hasNorwegian ? undefined : 'fake') : 'broken',
      evidence: `Content: ${mainText.trim().length} chars, Norwegian: ${hasNorwegian}, interactive: ${hasInteraction}`,
    })
    expect(hasContent).toBe(true)
  })

  test('weekly check has exercise interaction targets', async ({ page, emit }) => {
    await page.goto('/uke')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const buttons = await page.locator('main button').count()
    const inputs = await page.locator('main input, main textarea').count()

    emit({
      surface: S, check: 'Has exercise interaction targets',
      status: (buttons + inputs) > 0 ? 'pass' : 'warn',
      category: (buttons + inputs) > 0 ? undefined : 'disconnected',
      evidence: `Buttons: ${buttons}, inputs: ${inputs}`,
    })
  })

  test('weekly check is reachable from dashboard', async ({ page, emit }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const ukeLink = page.locator('a[href="/uke"]')
    const ukeButton = page.locator('button[aria-label*="ukentlig"], button[aria-label*="sjekk"]')
    const ukeText = page.locator('text=/Ukens sjekk/i')

    const linkExists = (await ukeLink.count()) > 0
    const buttonExists = (await ukeButton.count()) > 0
    const textExists = (await ukeText.count()) > 0

    emit({
      surface: S, check: 'Reachable from dashboard',
      status: linkExists || buttonExists || textExists ? 'pass' : 'fail',
      category: linkExists || buttonExists || textExists ? undefined : 'disconnected',
      evidence: `Link: ${linkExists}, button: ${buttonExists}, text: ${textExists}`,
    })
  })
})
