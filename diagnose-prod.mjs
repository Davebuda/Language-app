// One-off diagnostic: load pandoai.no, record everything, screenshot, exit.
// Not committed. Delete after use.

import { chromium } from '@playwright/test'

const URL = 'https://pandoai.no'

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  bypassCSP: false,
})
const page = await ctx.newPage()

const consoleMessages = []
const pageErrors = []
const failedRequests = []
const allRequests = []

page.on('console', (msg) => {
  consoleMessages.push({ type: msg.type(), text: msg.text() })
})
page.on('pageerror', (err) => {
  pageErrors.push(String(err))
})
page.on('requestfailed', (req) => {
  failedRequests.push({ url: req.url(), failure: req.failure()?.errorText ?? 'unknown' })
})
page.on('response', (resp) => {
  const status = resp.status()
  if (status >= 400) {
    allRequests.push({ url: resp.url(), status })
  }
})

console.log('== navigating ==')
const start = Date.now()
try {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 })
} catch (e) {
  console.log('  goto error:', String(e).slice(0, 200))
}
const elapsed = Date.now() - start
console.log(`  loaded in ${elapsed}ms`)

console.log('')
console.log('== final URL ==')
console.log(' ', page.url())

console.log('')
console.log('== page title ==')
console.log(' ', await page.title())

console.log('')
console.log(`== console (${consoleMessages.length}) ==`)
for (const m of consoleMessages.slice(-40)) {
  console.log(`  [${m.type}] ${m.text.slice(0, 240)}`)
}

console.log('')
console.log(`== pageerror events (${pageErrors.length}) ==`)
for (const e of pageErrors.slice(0, 20)) {
  console.log('  ', e.slice(0, 400))
}

console.log('')
console.log(`== failed network requests (${failedRequests.length}) ==`)
for (const r of failedRequests.slice(0, 20)) {
  console.log(`  ${r.failure}  ${r.url}`)
}

console.log('')
console.log(`== HTTP 4xx/5xx responses (${allRequests.length}) ==`)
for (const r of allRequests.slice(0, 20)) {
  console.log(`  [${r.status}] ${r.url}`)
}

console.log('')
console.log('== window.__NEXT_DATA__ deploymentId ==')
const deploymentId = await page.evaluate(() => {
  // @ts-ignore
  return globalThis.__NEXT_DATA__?.buildId ?? globalThis.__NEXT_DATA__?.deploymentId ?? 'unknown'
}).catch((e) => String(e))
console.log(' ', deploymentId)

console.log('')
console.log('== sessionStorage deploy-reload-guard sentinel ==')
const sentinel = await page.evaluate(() => sessionStorage.getItem('deploy-reload-guard')).catch((e) => String(e))
console.log(' ', sentinel)

console.log('')
console.log('== screenshot ==')
await page.screenshot({ path: '/tmp/pandoai-diagnose.png', fullPage: true })
console.log('  saved /tmp/pandoai-diagnose.png')

console.log('')
console.log('== waiting 4s for late errors ==')
await page.waitForTimeout(4000)
console.log(`  total console after wait: ${consoleMessages.length}`)
console.log(`  total pageerror after wait: ${pageErrors.length}`)
console.log(`  total failed requests after wait: ${failedRequests.length}`)

await browser.close()
console.log('')
console.log('== done ==')
