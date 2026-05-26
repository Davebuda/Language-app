import { test, expect, hasNorwegianText, collectConsoleErrors } from './fixtures'

const S = 'session'

test.describe('Session Loop — Truth Audit', () => {
  test('page loads without errors', async ({ page, emit }) => {
    const errors = await collectConsoleErrors(page)
    await page.goto('/session')
    await page.waitForLoadState('networkidle')

    const status = errors.length === 0 ? 'pass' : 'fail' as const
    emit({
      surface: S, check: 'Page loads without console errors', status,
      category: status === 'fail' ? 'broken' : undefined,
      evidence: status === 'pass' ? 'Zero console errors' : `Errors: ${errors.join('; ')}`,
    })
    expect(errors).toHaveLength(0)
  })

  test('renders exercise content (not blank)', async ({ page, emit, captureScreenshot }) => {
    await page.goto('/session')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const mainText = (await page.locator('main').first().textContent()) ?? ''
    const interactiveCount = await page.locator('main button, main input, main [role="button"]').count()
    const hasContent = mainText.trim().length > 20

    if (hasContent && interactiveCount > 0) {
      emit({ surface: S, check: 'Renders exercise content', status: 'pass', evidence: `${interactiveCount} interactive elements, ${mainText.trim().length} chars` })
    } else {
      const screenshot = await captureScreenshot(page, S, 'renders-exercise-content')
      emit({ surface: S, check: 'Renders exercise content', status: 'fail', category: 'broken', evidence: `Interactive: ${interactiveCount}, chars: ${mainText.trim().length}`, screenshot })
    }
    expect(hasContent).toBe(true)
  })

  test('exercises contain Norwegian text', async ({ page, emit }) => {
    await page.goto('/session')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const mainText = (await page.locator('main').first().textContent()) ?? ''
    const norwegian = hasNorwegianText(mainText)

    emit({
      surface: S, check: 'Norwegian text in exercises', status: norwegian ? 'pass' : 'warn',
      category: norwegian ? undefined : 'fake',
      evidence: norwegian ? 'Norwegian text detected' : `No Norwegian found. Preview: "${mainText.slice(0, 200)}"`,
    })
  })

  test('session has progress indicator', async ({ page, emit }) => {
    await page.goto('/session')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const hasProgress = (await page.locator('[role="progressbar"], progress, .progress, [class*="progress"]').count()) > 0
    const hasStepText = /\d+\s*\/\s*\d+|\d+\s*av\s*\d+/i.test((await page.locator('main').first().textContent()) ?? '')

    emit({
      surface: S, check: 'Progress indicator exists',
      status: hasProgress || hasStepText ? 'pass' : 'warn',
      category: hasProgress || hasStepText ? undefined : 'disconnected',
      evidence: hasProgress ? 'Progress bar found' : hasStepText ? 'Step counter text found' : 'No progress indicator visible',
    })
  })
})
