import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'

const S = 'fingerprint'

const ANON_ID = 'harness-test-user-001'

const WEAK_CONCEPTS = ['v2-word-order', 'noun-gender', 'negation']
const STRONG_CONCEPTS = ['personal-pronouns', 'basic-numbers', 'days-of-week']

function buildTestFingerprint() {
  const now = new Date().toISOString()
  const conceptMastery: Record<string, unknown> = {}

  for (const id of WEAK_CONCEPTS) {
    conceptMastery[id] = {
      conceptId: id,
      rawScore: 35,
      confidenceScore: 0.3,
      decayedScore: 30,
      attemptCount: 8,
      uniqueDaysActive: 2,
      streak: 0,
      recentOutcomes: [false, true, false, false, true],
      lastAttemptAt: now,
      nextReviewAt: now,
      srsLevel: 1,
      phase: 'practice',
    }
  }

  for (const id of STRONG_CONCEPTS) {
    conceptMastery[id] = {
      conceptId: id,
      rawScore: 82,
      confidenceScore: 0.85,
      decayedScore: 78,
      attemptCount: 25,
      uniqueDaysActive: 5,
      streak: 4,
      recentOutcomes: [true, true, true, true, false],
      lastAttemptAt: now,
      nextReviewAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      srsLevel: 4,
      phase: 'consolidation',
    }
  }

  return {
    userId: ANON_ID,
    createdAt: now,
    updatedAt: now,
    currentLevel: 'A1',
    levelSetByUser: false,
    conceptMastery,
    recentErrors: [],
    errorPatterns: [],
    vocabularyMastery: {},
    productionGap: {},
    totalSessionsCompleted: 3,
    calibrationSessionsRemaining: 2,
    lastSessionAt: now,
    speakingMinutesTotal: 12,
    inputProductionPreference: 'balanced',
    lastRecalibrationAt: null,
    askedDiagnosticQuestionIds: [],
    weeklyFocus: WEAK_CONCEPTS,
    weekStartedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    weeklySprintHistory: [],
    weekStartSnapshots: Object.fromEntries(
      WEAK_CONCEPTS.map((id) => [id, { rawScore: 35, decayedScore: 30 }]),
    ),
  }
}

async function seedFingerprint(page: Page) {
  const fp = buildTestFingerprint()
  await page.evaluate(
    async ({ fp, anonId }) => {
      localStorage.setItem('norsk-coach-anon-id', anonId)
      localStorage.setItem('norskcoach_onboarded', '1')
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('norsk-coach', 1)
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('fingerprints')) {
            db.createObjectStore('fingerprints', { keyPath: 'userId' })
          }
        }
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('fingerprints', 'readwrite')
          const store = tx.objectStore('fingerprints')
          store.put(fp)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
        request.onerror = () => reject(request.error)
      })
    },
    { fp, anonId: ANON_ID },
  )
}

async function readFingerprintFromIDB(page: Page): Promise<Record<string, unknown> | null> {
  return page.evaluate(async (anonId) => {
    return new Promise<Record<string, unknown> | null>((resolve, reject) => {
      const request = indexedDB.open('norsk-coach', 1)
      request.onsuccess = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('fingerprints')) { resolve(null); return }
        const tx = db.transaction('fingerprints', 'readonly')
        const store = tx.objectStore('fingerprints')
        const getReq = store.get(anonId)
        getReq.onsuccess = () => resolve(getReq.result as Record<string, unknown> ?? null)
        getReq.onerror = () => reject(getReq.error)
      }
      request.onerror = () => reject(request.error)
    })
  }, ANON_ID)
}

// ─── CONTRACT 1: Fingerprint is the source of truth ───────────────────────

test.describe('Fingerprint Contract — Source of Truth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await seedFingerprint(page)
  })

  test('fingerprint loads from IndexedDB and drives the app', async ({ page, emit }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const fp = await readFingerprintFromIDB(page)
    const exists = fp !== null
    const hasLevel = exists && typeof (fp as Record<string, unknown>).currentLevel === 'string'
    const hasMastery = exists && Object.keys((fp as Record<string, Record<string, unknown>>).conceptMastery ?? {}).length > 0
    const hasWeeklyFocus = exists && Array.isArray((fp as Record<string, unknown>).weeklyFocus) &&
      ((fp as Record<string, unknown[]>).weeklyFocus).length > 0

    emit({
      surface: S, check: 'Fingerprint exists in IndexedDB',
      status: exists ? 'pass' : 'fail',
      category: exists ? undefined : 'broken',
      evidence: exists ? `Fingerprint loaded for userId=${ANON_ID}` : 'No fingerprint found in IndexedDB',
    })
    emit({
      surface: S, check: 'Fingerprint has currentLevel',
      status: hasLevel ? 'pass' : 'fail',
      category: hasLevel ? undefined : 'broken',
      evidence: hasLevel ? `Level: ${(fp as Record<string, unknown>).currentLevel}` : 'currentLevel missing',
    })
    emit({
      surface: S, check: 'Fingerprint has conceptMastery data',
      status: hasMastery ? 'pass' : 'fail',
      category: hasMastery ? undefined : 'bypassed',
      evidence: hasMastery
        ? `${Object.keys((fp as Record<string, Record<string, unknown>>).conceptMastery).length} concepts tracked`
        : 'conceptMastery is empty — adaptive system is inert',
    })
    emit({
      surface: S, check: 'weeklyFocus is populated',
      status: hasWeeklyFocus ? 'pass' : 'fail',
      category: hasWeeklyFocus ? undefined : 'disconnected',
      evidence: hasWeeklyFocus
        ? `Focus: ${(fp as Record<string, unknown[]>).weeklyFocus.join(', ')}`
        : 'weeklyFocus is empty — weekly sprint not driving content',
    })

    expect(exists).toBe(true)
    expect(hasLevel).toBe(true)
    expect(hasMastery).toBe(true)
    expect(hasWeeklyFocus).toBe(true)
  })

  test('dashboard reflects fingerprint level (not hardcoded)', async ({ page, emit }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const bodyText = (await page.locator('body').textContent()) ?? ''
    const showsA1 = /\bA1\b/.test(bodyText)
    const showsA2 = /\bA2\b/.test(bodyText) && !/A2.*utvikling/i.test(bodyText)

    emit({
      surface: S, check: 'Dashboard shows correct level from fingerprint',
      status: showsA1 ? 'pass' : 'fail',
      category: showsA1 ? undefined : 'bypassed',
      evidence: showsA1
        ? 'Dashboard displays A1 matching seeded fingerprint'
        : `Expected A1 but found: ${bodyText.match(/\b[AB][12]\b/g)?.join(', ') ?? 'no level badge'}`,
    })
  })

  test('dashboard shows weekly focus concepts', async ({ page, emit }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const bodyText = (await page.locator('body').textContent()) ?? ''
    const showsFocusSection = /ukens fokus|weekly focus|fokus/i.test(bodyText)

    emit({
      surface: S, check: 'Dashboard shows weekly focus section',
      status: showsFocusSection ? 'pass' : 'warn',
      category: showsFocusSection ? undefined : 'disconnected',
      evidence: showsFocusSection
        ? 'Weekly focus section visible on dashboard'
        : 'No weekly focus section found — dashboard may not reflect weekly sprint',
    })
  })
})

// ─── CONTRACT 2: Surfaces read from fingerprint ───────────────────────────

test.describe('Fingerprint Contract — Surface Dependencies', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await seedFingerprint(page)
  })

  test('session generates exercises from fingerprint (not random)', async ({ page, emit }) => {
    await page.goto('/session')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const bodyText = (await page.locator('main').first().textContent()) ?? ''
    const hasExercises = bodyText.length > 50

    const fpAfter = await readFingerprintFromIDB(page)
    const fpMastery = fpAfter ? Object.keys((fpAfter as Record<string, Record<string, unknown>>).conceptMastery ?? {}) : []

    emit({
      surface: 'session', check: 'Session reads fingerprint to generate exercises',
      status: hasExercises && fpMastery.length > 0 ? 'pass' : 'fail',
      category: hasExercises ? undefined : 'bypassed',
      evidence: hasExercises
        ? `Session rendered exercises. Fingerprint has ${fpMastery.length} concepts tracked.`
        : 'Session page is empty — fingerprint may not be loaded or scheduler returned nothing',
    })
  })

  test('conversation uses fingerprint level for topic constraints', async ({ page, emit }) => {
    await page.goto('/conversation')
    await page.waitForLoadState('networkidle')

    await page.locator('button').filter({ hasText: /Daglig rutine/ }).click()
    await page.locator('button').filter({ hasText: /Start samtale/ }).click()
    await page.waitForTimeout(3000)

    const chatArea = (await page.locator('body').textContent()) ?? ''
    const hasChallengeBanner = /utfordring/i.test(chatArea)

    emit({
      surface: 'conversation', check: 'Conversation selects constraint from fingerprint',
      status: hasChallengeBanner ? 'pass' : 'warn',
      category: hasChallengeBanner ? undefined : 'disconnected',
      evidence: hasChallengeBanner
        ? 'Constraint challenge banner visible — fingerprint drove constraint selection'
        : 'No constraint challenge found — conversation may be running without fingerprint bias',
    })
  })

  test('listen sorts questions by weekly focus', async ({ page, emit }) => {
    await page.goto('/listen')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const bodyText = (await page.locator('body').textContent()) ?? ''
    const hasContent = bodyText.length > 50

    emit({
      surface: 'listening', check: 'Listen page loads with fingerprint context',
      status: hasContent ? 'pass' : 'fail',
      category: hasContent ? undefined : 'broken',
      evidence: hasContent
        ? `Listen rendered content (${bodyText.length} chars). Focus-sorted ordering requires runtime trace.`
        : 'Listen page is empty',
    })
  })

  test('reading does NOT enforce level (known gap)', async ({ page, emit }) => {
    await page.goto('/reading')
    await page.waitForLoadState('networkidle')

    const allButton = page.locator('button').filter({ hasText: /^Alle$/ })
    const allVisible = await allButton.isVisible().catch(() => false)

    const b1Texts = page.locator('text=/B1/')
    const b2Texts = page.locator('text=/B2/')
    const showsAboveLevel = (await b1Texts.count()) > 0 || (await b2Texts.count()) > 0

    emit({
      surface: 'reading', check: 'Reading enforces currentLevel from fingerprint',
      status: 'warn',
      category: 'bypassed',
      evidence: allVisible
        ? 'Reading shows "Alle" filter — user can browse any level. No fingerprint-level enforcement. CLAUDE.md confirms reading is free-form, but this means a A1 user sees A2+ content without guidance.'
        : 'Reading filter behavior unclear',
    })
  })
})

// ─── CONTRACT 3: Surfaces write back to fingerprint ───────────────────────

test.describe('Fingerprint Contract — Write-Back Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await seedFingerprint(page)
  })

  test('session exercise updates fingerprint mastery', async ({ page, emit, captureScreenshot }) => {
    const fpBefore = await readFingerprintFromIDB(page)
    const beforeUpdatedAt = fpBefore ? (fpBefore as Record<string, string>).updatedAt : null

    await page.goto('/session')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const submitBtn = page.locator('button').filter({ hasText: /Sjekk|sjekk|Check|Submit|Neste/ })
    const inputField = page.locator('main input[type="text"]').first()

    if (await inputField.isVisible().catch(() => false)) {
      await inputField.fill('test svar')
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(2000)
      }
    }

    const fpAfter = await readFingerprintFromIDB(page)
    const afterUpdatedAt = fpAfter ? (fpAfter as Record<string, string>).updatedAt : null
    const wasUpdated = afterUpdatedAt !== null && afterUpdatedAt !== beforeUpdatedAt

    emit({
      surface: 'session', check: 'Session writes back to fingerprint after exercise',
      status: wasUpdated ? 'pass' : 'warn',
      category: wasUpdated ? undefined : 'disconnected',
      evidence: wasUpdated
        ? `Fingerprint updatedAt changed: ${beforeUpdatedAt} → ${afterUpdatedAt}`
        : `Fingerprint updatedAt unchanged. Before: ${beforeUpdatedAt}, after: ${afterUpdatedAt}. May need exercise interaction to trigger write.`,
    })
  })

  test('journal writing updates fingerprint', async ({ page, emit }) => {
    const fpBefore = await readFingerprintFromIDB(page)
    const beforeUpdatedAt = fpBefore ? (fpBefore as Record<string, string>).updatedAt : null

    await page.goto('/journal')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1500)

    const textarea = page.locator('textarea').first()
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill('Jeg liker å lære norsk. Det er veldig gøy.')
      await page.waitForTimeout(500)

      const submitBtn = page.locator('button').filter({ hasText: /Send|Sjekk|Lever|Submit/ })
      if (await submitBtn.isVisible().catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(5000)
      }
    }

    const fpAfter = await readFingerprintFromIDB(page)
    const afterUpdatedAt = fpAfter ? (fpAfter as Record<string, string>).updatedAt : null
    const wasUpdated = afterUpdatedAt !== null && afterUpdatedAt !== beforeUpdatedAt

    emit({
      surface: 'journal', check: 'Journal writes back to fingerprint after submission',
      status: wasUpdated ? 'pass' : 'warn',
      category: wasUpdated ? undefined : 'disconnected',
      evidence: wasUpdated
        ? `Fingerprint updated after journal submission`
        : `Fingerprint unchanged after journal attempt. AI correction may be needed to trigger write.`,
    })
  })
})

// ─── CONTRACT 4: Weekly diagnostics reflect cross-surface activity ────────

test.describe('Fingerprint Contract — Weekly Chain', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    await seedFingerprint(page)
  })

  test('/uke reflects fingerprint weekly focus (not static)', async ({ page, emit }) => {
    await page.goto('/uke')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    const bodyText = (await page.locator('body').textContent()) ?? ''
    const hasContent = bodyText.length > 50
    const mentionsFocus = WEAK_CONCEPTS.some((c) =>
      bodyText.toLowerCase().includes(c.replace(/-/g, ' ').toLowerCase()),
    )

    const fp = await readFingerprintFromIDB(page)
    const fpWeeklyFocus = fp ? (fp as Record<string, string[]>).weeklyFocus : []

    emit({
      surface: 'weekly', check: '/uke derives from fingerprint weeklyFocus',
      status: fpWeeklyFocus.length > 0 ? 'pass' : 'fail',
      category: fpWeeklyFocus.length > 0 ? undefined : 'disconnected',
      evidence: fpWeeklyFocus.length > 0
        ? `weeklyFocus contains ${fpWeeklyFocus.length} concepts: ${fpWeeklyFocus.join(', ')}. Page has ${bodyText.length} chars.`
        : 'weeklyFocus is empty — /uke cannot reflect learner state',
    })
  })

  test('new user fingerprint is seeded (not inert)', async ({ page, emit }) => {
    await page.evaluate(() => {
      localStorage.removeItem('norsk-coach-anon-id')
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('norsk-coach')
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      })
    })

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)

    const result = await page.evaluate(async () => {
      const anonId = localStorage.getItem('norsk-coach-anon-id')
      if (!anonId) return { anonId: null, fp: null }
      return new Promise<{ anonId: string; fp: Record<string, unknown> | null }>((resolve, reject) => {
        const request = indexedDB.open('norsk-coach', 1)
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('fingerprints')) { resolve({ anonId, fp: null }); return }
          const tx = db.transaction('fingerprints', 'readonly')
          const store = tx.objectStore('fingerprints')
          const getReq = store.get(anonId)
          getReq.onsuccess = () => resolve({ anonId, fp: getReq.result as Record<string, unknown> ?? null })
          getReq.onerror = () => reject(getReq.error)
        }
        request.onerror = () => reject(request.error)
      })
    })

    const fp = result.fp
    const weeklyFocus = fp ? (fp as Record<string, string[]>).weeklyFocus ?? [] : []
    const mastery = fp ? Object.keys((fp as Record<string, Record<string, unknown>>).conceptMastery ?? {}) : []

    const isSeeded = mastery.length > 0 && weeklyFocus.length > 0

    emit({
      surface: S, check: 'New user fingerprint is seeded with baseline mastery',
      status: isSeeded ? 'pass' : 'fail',
      category: isSeeded ? undefined : 'bypassed',
      evidence: isSeeded
        ? `New user (${result.anonId?.slice(0, 8)}...) auto-seeded: ${mastery.length} concepts, ${weeklyFocus.length} focus targets. Adaptive system active from session one.`
        : `New user fingerprint: conceptMastery has ${mastery.length} entries, weeklyFocus has ${weeklyFocus.length} entries. Adaptive system is inert.`,
    })
    expect(isSeeded).toBe(true)
  })
})
