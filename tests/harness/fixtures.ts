import { test as base } from '@playwright/test'
import type { Page } from '@playwright/test'
import { emitFinding } from './collector'
import type { FindingCategory, FindingStatus } from './types'

export interface EmitOpts {
  surface: string
  check: string
  status: FindingStatus
  category?: FindingCategory
  evidence: string
  screenshot?: string
}

interface HarnessFixtures {
  emit: (opts: EmitOpts) => void
  captureScreenshot: (page: Page, surface: string, check: string) => Promise<string>
}

export const test = base.extend<HarnessFixtures>({
  emit: async ({}, use) => {
    await use((opts) => {
      emitFinding({ ...opts, timestamp: new Date().toISOString() })
    })
  },
  captureScreenshot: async ({}, use) => {
    await use(async (page, surface, check) => {
      const slug = `${surface}-${check.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`
      const screenshotPath = `reports/screenshots/${slug}-${Date.now()}.png`
      await page.screenshot({ path: screenshotPath, fullPage: true })
      return screenshotPath
    })
  },
})

export { expect } from '@playwright/test'

const NORWEGIAN_PATTERN =
  /[æøåÆØÅ]|\b(er|har|kan|vil|det|ikke|jeg|du|hun|han|vi|og|på|med|til|fra|den|denne|som|hva|hvor|norsk|snakk|skriv|les|velg|tema|nivå|start|ferdig|neste|tilbake|samtale|ukens|økt)\b/i

export function hasNorwegianText(text: string): boolean {
  return NORWEGIAN_PATTERN.test(text)
}

export async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  return errors
}

export const SURFACES = [
  '/', '/dashboard', '/session', '/conversation', '/journal',
  '/reading', '/listen', '/drills', '/shadow', '/uke',
  '/profile', '/progress', '/eval',
] as const
