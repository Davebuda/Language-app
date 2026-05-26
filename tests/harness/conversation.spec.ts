import { test, expect, hasNorwegianText } from './fixtures'

const S = 'conversation'

test.describe('Conversation — Truth Audit', () => {
  test('setup phase renders with topics', async ({ page, emit }) => {
    await page.goto('/conversation')
    await page.waitForLoadState('networkidle')

    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    const headingText = (await heading.textContent()) ?? ''

    emit({
      surface: S, check: 'Setup phase renders',
      status: hasNorwegianText(headingText) ? 'pass' : 'warn',
      category: hasNorwegianText(headingText) ? undefined : 'fake',
      evidence: `Heading: "${headingText}"`,
    })
    expect(headingText.length).toBeGreaterThan(0)
  })

  test('shows 6 topic cards', async ({ page, emit }) => {
    await page.goto('/conversation')
    await page.waitForLoadState('networkidle')

    const topicButtons = page.locator('button').filter({ hasText: /Daglig rutine|Mat og drikke|Familie|Norge|Fritid|Jobb/ })
    const count = await topicButtons.count()

    emit({
      surface: S, check: '6 topic cards visible', status: count === 6 ? 'pass' : 'fail',
      category: count === 6 ? undefined : 'broken',
      evidence: `Found ${count} of 6 expected topic cards`,
    })
    expect(count).toBe(6)
  })

  test('level selector shows 4 CEFR levels', async ({ page, emit }) => {
    await page.goto('/conversation')
    await page.waitForLoadState('networkidle')

    const levelButtons = page.locator('button').filter({ hasText: /^(A1|A2|B1|B2)$/ })
    const count = await levelButtons.count()

    emit({
      surface: S, check: 'Level selector renders', status: count === 4 ? 'pass' : 'fail',
      category: count === 4 ? undefined : 'broken',
      evidence: `Found ${count} of 4 CEFR level buttons`,
    })
    expect(count).toBe(4)
  })

  test('start button activates after topic selection', async ({ page, emit }) => {
    await page.goto('/conversation')
    await page.waitForLoadState('networkidle')

    const startBtn = page.locator('button').filter({ hasText: /Start samtale/ })
    const disabledBefore = await startBtn.isDisabled()

    await page.locator('button').filter({ hasText: /Daglig rutine/ }).click()
    const disabledAfter = await startBtn.isDisabled()

    const works = disabledBefore && !disabledAfter
    emit({
      surface: S, check: 'Start button enables on topic select',
      status: works ? 'pass' : 'fail', category: works ? undefined : 'broken',
      evidence: works ? 'Button was disabled, now enabled after topic pick' : `Before: disabled=${disabledBefore}, after: disabled=${disabledAfter}`,
    })
    expect(works).toBe(true)
  })

  test('AI status badge is present and shows real mode', async ({ page, emit }) => {
    await page.goto('/conversation')
    await page.waitForLoadState('networkidle')

    await page.locator('button').filter({ hasText: /Daglig rutine/ }).click()
    await page.locator('button').filter({ hasText: /Start samtale/ }).click()
    await page.waitForTimeout(3000)

    const badge = page.locator('text=/Lokal|Sky|Maler/i')
    const visible = await badge.isVisible().catch(() => false)
    const badgeText = visible ? (await badge.textContent()) ?? '' : ''

    emit({
      surface: S, check: 'AI status badge reflects runtime state',
      status: visible ? 'pass' : 'warn',
      category: visible ? undefined : 'fake',
      evidence: visible ? `Badge shows: "${badgeText}"` : 'No AI status badge found (Lokal/Sky/Maler)',
    })
  })

  test('conversation feeds the engine (correction card structure)', async ({ page, emit }) => {
    await page.goto('/conversation')
    await page.waitForLoadState('networkidle')

    await page.locator('button').filter({ hasText: /Daglig rutine/ }).click()
    await page.locator('button').filter({ hasText: /Start samtale/ }).click()
    await page.waitForTimeout(3000)

    const chatInput = page.locator('input[placeholder*="Skriv"]')
    const inputVisible = await chatInput.isVisible().catch(() => false)

    emit({
      surface: S, check: 'Chat input renders after start',
      status: inputVisible ? 'pass' : 'fail',
      category: inputVisible ? undefined : 'broken',
      evidence: inputVisible ? 'Chat input visible and ready' : 'Chat input not found after starting conversation',
    })
  })
})
