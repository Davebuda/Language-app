import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Finding } from './types'

const REPORTS_DIR = path.join(process.cwd(), 'reports')
const FINDINGS_PATH = path.join(REPORTS_DIR, 'findings.jsonl')

export function emitFinding(finding: Finding): void {
  fs.mkdirSync(REPORTS_DIR, { recursive: true })
  fs.appendFileSync(FINDINGS_PATH, JSON.stringify(finding) + '\n')
}

export function clearFindings(): void {
  if (fs.existsSync(FINDINGS_PATH)) fs.unlinkSync(FINDINGS_PATH)
}

export function readFindings(): Finding[] {
  if (!fs.existsSync(FINDINGS_PATH)) return []
  return fs
    .readFileSync(FINDINGS_PATH, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Finding)
}
