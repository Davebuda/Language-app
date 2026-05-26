import { test, expect, hasNorwegianText } from './fixtures'

const S = 'reading'

test.describe('Reading — Truth Audit', () => {
  test('library view renders text cards', async ({ page, emit }) => {
    await page.goto('/reading')
    await page.waitForLoadState('networkidle')

    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    const heading = (await h1.textContent()) ?? ''

    const textCards = page.locator('button').filter({ hasText: /En dag i Oslo|På kafeen|Friluftsliv|Norsk mat/ })
    const cardCount = await textCards.count()

    emit({
      surface: S, check: 'Library view renders text cards',
      status: cardCount >= 3 ? 'pass' : 'fail',
      category: cardCount >= 3 ? undefined : 'broken',
      evidence: `Heading: "${heading}", found ${cardCount} text cards`,
    })
    expect(cardCount).toBeGreaterThanOrEqual(3)
  })

  test('text cards show CEFR level badges', async ({ page, emit }) => {
    await page.goto('/reading')
    await page.waitForLoadState('networkidle')

    const cefrBadges = page.locator('text=/^(A1|A2|B1|B2)$/')
    const count = await cefrBadges.count()

    emit({
      surface: S, check: 'CEFR level badges on cards',
      status: count >= 3 ? 'pass' : 'warn',
      category: count >= 3 ? undefined : 'fake',
      evidence: `Found ${count} CEFR badges`,
    })
  })

  test('can open a text and see Norwegian content', async ({ page, emit }) => {
    await page.goto('/reading')
    await page.waitForLoadState('networkidle')

    await page.locator('button').filter({ hasText: /En dag i Oslo/ }).click()
    await page.waitForTimeout(500)

    const readerText = (await page.locator('main').textContent()) ?? ''
    const hasNorwegian = hasNorwegianText(readerText) && readerText.includes('Oslo')

    emit({
      surface: S, check: 'Text reader shows Norwegian content',
      status: hasNorwegian ? 'pass' : 'fail',
      category: hasNorwegian ? undefined : 'fake',
      evidence: hasNorwegian ? `Norwegian text rendered (${readerText.length} chars)` : `Reader content: "${readerText.slice(0, 200)}"`,
    })
    expect(hasNorwegian).toBe(true)
  })

  test('parallel translation toggle works', async ({ page, emit }) => {
    await page.goto('/reading')
    await page.waitForLoadState('networkidle')
    await page.locator('button').filter({ hasText: /En dag i Oslo/ }).click()
    await page.waitForTimeout(500)

    const toggleBtn = page.locator('button').filter({ hasText: /Vis engelsk/ })
    const toggleExists = await toggleBtn.isVisible().catch(() => false)

    if (toggleExists) {
      await toggleBtn.click()
      await page.waitForTimeout(300)
      const hasEnglish = ((await page.locator('main').textContent()) ?? '').includes('lives in Oslo')
      emit({
        surface: S, check: 'Translation toggle works',
        status: hasEnglish ? 'pass' : 'fail',
        category: hasEnglish ? undefined : 'broken',
        evidence: hasEnglish ? 'English translation appeared after toggle' : 'Toggle clicked but no English text found',
      })
    } else {
      emit({ surface: S, check: 'Translation toggle works', status: 'fail', category: 'broken', evidence: 'Vis engelsk button not found' })
    }
  })

  test('reading has NO comprehension items (known stub)', async ({ page, emit }) => {
    await page.goto('/reading')
    await page.waitForLoadState('networkidle')
    await page.locator('button').filter({ hasText: /En dag i Oslo/ }).click()
    await page.waitForTimeout(500)

    const mainText = (await page.locator('main').textContent()) ?? ''
    const hasQuizOrComprehension = /spørsmål|quiz|svar|besvar|comprehension|oppgave/i.test(mainText)

    emit({
      surface: S, check: 'Comprehension or production items present',
      status: hasQuizOrComprehension ? 'pass' : 'warn',
      category: hasQuizOrComprehension ? undefined : 'disconnected',
      evidence: hasQuizOrComprehension
        ? 'Comprehension items found in reading view'
        : 'No comprehension or production items found. CLAUDE.md lists "reading comprehension scoring" as a stub. Text is read-only with exposure logging only.',
    })
  })
})
