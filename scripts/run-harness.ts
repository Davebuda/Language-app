import * as fs from 'node:fs'
import * as path from 'node:path'
import { execSync } from 'node:child_process'
import { clearFindings, readFindings } from '../tests/harness/collector'
import type { HarnessReport, Finding } from '../tests/harness/types'

const REPORTS_DIR = path.join(process.cwd(), 'reports')
const SCREENSHOTS_DIR = path.join(REPORTS_DIR, 'screenshots')

function ensureDirs() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true })
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })
}

function generateMarkdown(report: HarnessReport): string {
  const date = new Date(report.runAt).toISOString().split('T')[0]
  const durationSec = Math.round(report.durationMs / 1000)

  const lines: string[] = [
    `# NorskCoach Truth Audit — ${date}`,
    '',
    `**Verdict: ${report.verdict}** | Duration: ${durationSec}s`,
    '',
    '| Status | Count |',
    '|--------|-------|',
    `| Pass | ${report.summary.pass} |`,
    `| Fail | ${report.summary.fail} |`,
    `| Warn | ${report.summary.warn} |`,
    '',
  ]

  const failures = report.findings.filter((f) => f.status === 'fail')
  const warnings = report.findings.filter((f) => f.status === 'warn')
  const passes = report.findings.filter((f) => f.status === 'pass')

  if (failures.length > 0) {
    lines.push('## Failures', '')
    for (const f of failures) {
      lines.push(`### ${f.surface} — ${f.check}`)
      if (f.category) lines.push(`**Category:** ${f.category}`)
      lines.push(`**Evidence:** ${f.evidence}`)
      if (f.screenshot) lines.push(`**Screenshot:** ${f.screenshot}`)
      lines.push('')
    }
  }

  if (warnings.length > 0) {
    lines.push('## Warnings', '')
    for (const w of warnings) {
      lines.push(`### ${w.surface} — ${w.check}`)
      if (w.category) lines.push(`**Category:** ${w.category}`)
      lines.push(`**Evidence:** ${w.evidence}`)
      lines.push('')
    }
  }

  if (passes.length > 0) {
    lines.push('## Passes', '')
    for (const p of passes) {
      lines.push(`- ${p.surface} — ${p.check}`)
    }
    lines.push('')
  }

  lines.push('---', `Generated at ${report.runAt}`)
  return lines.join('\n')
}

function categorySummary(findings: Finding[]): string {
  const cats: Record<string, number> = {}
  for (const f of findings) {
    if (f.category) cats[f.category] = (cats[f.category] ?? 0) + 1
  }
  if (Object.keys(cats).length === 0) return 'none'
  return Object.entries(cats).map(([k, v]) => `${k}: ${v}`).join(', ')
}

async function main() {
  const startTime = Date.now()

  ensureDirs()
  clearFindings()

  console.log('\n=== NorskCoach Truth Audit Harness ===\n')
  console.log('Running Playwright tests...\n')

  try {
    execSync(
      'npx playwright test --config tests/harness/playwright.config.ts',
      { stdio: 'inherit', cwd: process.cwd(), timeout: 300_000 },
    )
  } catch {
    console.log('\nSome tests failed — generating report from findings...\n')
  }

  const findings = readFindings()
  const durationMs = Date.now() - startTime

  const summary = {
    pass: findings.filter((f) => f.status === 'pass').length,
    fail: findings.filter((f) => f.status === 'fail').length,
    warn: findings.filter((f) => f.status === 'warn').length,
  }

  let verdict: HarnessReport['verdict']
  if (summary.fail === 0 && summary.warn === 0) verdict = 'PASS'
  else if (summary.fail === 0) verdict = 'PARTIAL'
  else verdict = 'FAIL'

  const report: HarnessReport = {
    runAt: new Date().toISOString(),
    durationMs,
    verdict,
    findings,
    summary,
  }

  fs.writeFileSync(
    path.join(REPORTS_DIR, 'harness-report.json'),
    JSON.stringify(report, null, 2),
  )

  const markdown = generateMarkdown(report)
  fs.writeFileSync(path.join(REPORTS_DIR, 'harness-report.md'), markdown)

  console.log('\n=== HARNESS RESULTS ===')
  console.log(`Verdict: ${verdict}`)
  console.log(`Pass: ${summary.pass} | Fail: ${summary.fail} | Warn: ${summary.warn}`)
  console.log(`Categories: ${categorySummary(findings)}`)
  console.log(`Duration: ${Math.round(durationMs / 1000)}s`)
  console.log(`\nReports:`)
  console.log(`  JSON:     reports/harness-report.json`)
  console.log(`  Markdown: reports/harness-report.md`)
  console.log(`  Raw:      reports/findings.jsonl`)
  if (fs.readdirSync(SCREENSHOTS_DIR).length > 0) {
    console.log(`  Screenshots: reports/screenshots/`)
  }
  console.log('')
}

main().catch((err) => {
  console.error('Harness runner failed:', err)
  process.exit(1)
})
