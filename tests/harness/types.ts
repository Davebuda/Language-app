export type FindingCategory = 'broken' | 'fake' | 'disconnected' | 'a11y-fail' | 'mobile-fail' | 'bypassed' | 'random'
export type FindingStatus = 'pass' | 'fail' | 'warn'

export interface Finding {
  surface: string
  check: string
  status: FindingStatus
  category?: FindingCategory
  evidence: string
  screenshot?: string
  timestamp: string
}

export interface HarnessReport {
  runAt: string
  durationMs: number
  verdict: 'PASS' | 'PARTIAL' | 'FAIL'
  findings: Finding[]
  summary: { pass: number; fail: number; warn: number }
}
