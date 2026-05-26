import { test, expect } from './fixtures'

const S = 'listening'

test.describe('Listening — Truth Audit', () => {
  test('page loads and renders exercise UI', async ({ page, emit }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const mainText = (await page.locator('main, [class*="listen"], body').first().textContent()) ?? ''
    const hasContent = mainText.trim().length > 20

    emit({
      surface: S, check: 'Page loads with content',
      status: hasContent ? 'pass' : 'fail',
      category: hasContent ? undefined : 'broken',
      evidence: hasContent ? `Content rendered (${mainText.trim().length} chars)` : 'Page appears blank',
    })
    expect(hasContent).toBe(true)
  })

  test('audio play button exists with aria-label', async ({ page, emit }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const questionButtons = page.locator('button[aria-label]')
    const count = await questionButtons.count()

    const selectButton = page.locator('button[aria-label*="Velg spørsmål"]')
    const selectCount = await selectButton.count()

    if (selectCount > 0) {
      await selectButton.first().click()
      await page.waitForTimeout(1000)
    }

    const playButton = page.locator('button[aria-label*="Spill av"]')
    const playExists = await playButton.isVisible().catch(() => false)

    emit({
      surface: S, check: 'Audio play button exists',
      status: playExists ? 'pass' : 'warn',
      category: playExists ? undefined : 'fake',
      evidence: playExists
        ? 'Play button with aria-label found'
        : `No play button found. Total aria-label buttons: ${count}, question select buttons: ${selectCount}`,
    })
  })

  test('listening uses real audio (not text-only fallback)', async ({ page, emit }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const selectButton = page.locator('button[aria-label*="Velg spørsmål"]')
    if ((await selectButton.count()) > 0) {
      await selectButton.first().click()
      await page.waitForTimeout(1000)
    }

    const audioCreated = await page.evaluate(() => {
      const origAudio = window.Audio
      let audioCallCount = 0
      // @ts-expect-error monkey-patch for detection
      window.__harnessAudioCalls = 0
      const Proxy = function (this: HTMLAudioElement, src?: string) {
        audioCallCount++
        // @ts-expect-error
        window.__harnessAudioCalls = audioCallCount
        return new origAudio(src)
      } as unknown as typeof Audio
      Proxy.prototype = origAudio.prototype
      window.Audio = Proxy
      return true
    })

    const playButton = page.locator('button[aria-label*="Spill av"]')
    if (await playButton.isVisible().catch(() => false)) {
      await playButton.click().catch(() => {})
      await page.waitForTimeout(2000)
    }

    const audioCalls = await page.evaluate(() => {
      // @ts-expect-error
      return window.__harnessAudioCalls ?? 0
    })
    const audioElements = await page.locator('audio').count()
    const hasRealAudio = audioCalls > 0 || audioElements > 0

    const hasSpeechSynthesis = await page.evaluate(() => {
      return typeof window.speechSynthesis !== 'undefined'
    })

    emit({
      surface: S, check: 'Uses real audio (not text-only)',
      status: hasRealAudio ? 'pass' : 'warn',
      category: hasRealAudio ? undefined : 'fake',
      evidence: hasRealAudio
        ? `Audio detected: new Audio() calls=${audioCalls}, <audio> elements=${audioElements}`
        : `No audio detected. Audio() calls=${audioCalls}, <audio> elements=${audioElements}. speechSynthesis available=${hasSpeechSynthesis}. May use browser TTS fallback.`,
    })
  })

  test('listening routes to real concept IDs', async ({ page, emit }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const pageContent = (await page.locator('body').textContent()) ?? ''
    const hasCatchAll = /catch-?all|placeholder|todo|dummy-concept|fallback-id/i.test(pageContent)

    emit({
      surface: S, check: 'No catch-all or placeholder concept routing',
      status: hasCatchAll ? 'fail' : 'pass',
      category: hasCatchAll ? 'fake' : undefined,
      evidence: hasCatchAll ? 'Found catch-all/placeholder text in listening page' : 'No placeholder text detected',
    })
  })
})
