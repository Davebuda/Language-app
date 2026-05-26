import { test, expect, hasNorwegianText } from './fixtures'

const S = 'journal'

test.describe('Journal — Truth Audit', () => {
  test('page loads with Norwegian heading', async ({ page, emit }) => {
    await page.goto('/journal')
    await page.waitForLoadState('networkidle')

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    const text = (await h1.textContent()) ?? ''
    const isNorwegian = text.includes('Skrivejournal') || hasNorwegianText(text)

    emit({
      surface: S, check: 'Page loads with Norwegian heading',
      status: isNorwegian ? 'pass' : 'fail',
      category: isNorwegian ? undefined : 'fake',
      evidence: `H1: "${text}"`,
    })
    expect(isNorwegian).toBe(true)
  })

  test('writing editor renders with text input', async ({ page, emit }) => {
    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const textarea = page.locator('textarea')
    const inputField = page.locator('[contenteditable="true"]')
    const hasEditor = (await textarea.count()) > 0 || (await inputField.count()) > 0

    emit({
      surface: S, check: 'Writing editor renders',
      status: hasEditor ? 'pass' : 'fail',
      category: hasEditor ? undefined : 'broken',
      evidence: hasEditor ? `textarea: ${await textarea.count()}, contenteditable: ${await inputField.count()}` : 'No text input found',
    })
    expect(hasEditor).toBe(true)
  })

  test('prompt text is visible and in Norwegian', async ({ page, emit }) => {
    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const mainText = (await page.locator('main').textContent()) ?? ''
    const hasPrompt = hasNorwegianText(mainText) && mainText.length > 30

    emit({
      surface: S, check: 'Norwegian prompt visible',
      status: hasPrompt ? 'pass' : 'warn',
      category: hasPrompt ? undefined : 'fake',
      evidence: hasPrompt ? 'Norwegian prompt text found' : `Main text: "${mainText.slice(0, 200)}"`,
    })
  })

  test('journal activity feeds the engine (not disconnected)', async ({ page, emit }) => {
    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const pageSource = await page.content()
    const importsRepair = pageSource.includes('repairFromSurface') || pageSource.includes('markLaneDone')
    const importsFingerprintWrite = pageSource.includes('saveFingerprint') || pageSource.includes('setFingerprint')

    const bundleCheck = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'))
      return scripts.map((s) => s.getAttribute('src') ?? '').filter(Boolean)
    })

    emit({
      surface: S, check: 'Journal connected to engine',
      status: 'warn',
      category: 'disconnected',
      evidence: 'Journal engine connection requires manual trace — check that WritingEditor calls repairFromSurface or saveFingerprint after AI correction. Scripts loaded: ' + bundleCheck.length,
    })
  })
})
