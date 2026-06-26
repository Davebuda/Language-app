import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Rule-8 regression lock (vision audit 2026-06-26, P0).
//
// The conversation "constraint" challenge verdict is the LLM's UNVERIFIED self-report
// (CONSTRAINT_MET/MISSED, parsed from raw model text). It USED to be written straight to
// conceptMastery via `updateConceptMastery`, bypassing the `confirmedRepair` deterministic
// gate, on exactly the classes (v2-word-order, adjective-agreement, negation, modal,
// preterite) the correction path deliberately keeps show-don't-grade. That broke the
// load-bearing invariant "no unverified AI output moves mastery" and silently injected
// phantom weaknesses into the diagnosis moat. The fix demoted the constraint to
// show-don't-grade (banner feedback only, no fingerprint write).
//
// The conversation page mounts the Web Speech API and isn't cleanly render-testable in
// jsdom, so this locks the breach at the source: the conversation surface must NOT call
// updateConceptMastery directly — every mastery change on this surface flows ONLY through
// the confirmedRepair gate. If a future change re-arms a constraint mastery write, route it
// through a deterministic verifier (and update this guard accordingly), never the raw verdict.

const SRC = readFileSync(
  resolve(process.cwd(), 'src/app/conversation/page.tsx'),
  'utf8',
)

// Strip comments so the explanatory notes that mention the history don't trip the guard.
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')

describe('conversation surface — no ungated mastery write (Rule 8, P0)', () => {
  it('does NOT call updateConceptMastery directly (the constraint-eval breach)', () => {
    expect(CODE).not.toMatch(/updateConceptMastery\s*\(/)
  })

  it('does NOT import updateConceptMastery', () => {
    expect(CODE).not.toMatch(/import[^\n]*updateConceptMastery/)
  })

  it('still routes corrections through the confirmedRepair gate', () => {
    // The legitimate, deterministic mastery path on this surface must remain.
    expect(CODE).toMatch(/confirmedRepair\s*\(/)
  })
})
