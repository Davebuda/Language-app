// Deterministic compound-word (særskrivning) corrector (p4 Lever 2, mirrors the
// gender / conjugation / adjective verifiers).
//
// The flagship Norwegian L2 error is SPLITTING a compound that must be written as
// one word ("kjøkken benk" → "kjøkkenbenk"). An AI correction may not move mastery
// unless a deterministic check confirms it (project rule: no unverified AI output
// moves mastery). This verifier confirms a compound-word correction ONLY when:
//   1. the only diff between the learner's text and the correction is that two
//      ADJACENT tokens on the learner's side concatenate to a SINGLE token on the
//      corrected side (a split→join — the canonical særskrivning direction), AND
//   2. that joined form is a LEXICALLY ATTESTED word in the Norsk-ordbank POS map
//      (src/lib/pos-map.ts). If "fotball" is a real word, writing "fot ball" is
//      unambiguously wrong — so the confirmation is sound.
//
// Deliberately conservative / false-negative-biased:
//   - Productive compounds absent from the frequency-bounded lexicon (e.g.
//     "kaffekopp") → not-applicable. We confirm only the attested subset; the
//     rest stay show-don't-grade. Sound beats broad.
//   - The REVERSE direction (learner over-joined: "idag" → "i dag") is NOT
//     confirmed: a lexicon can't prove a join is INVALID (OOV ≠ ungrammatical),
//     and the canonical error is the split, not the join.
//   - REJECTED alternative anchor "both parts are known words → confirm the join":
//     two adjacent known words do NOT prove a compound ("jeg ser" → "jegser"
//     would false-confirm), and a false positive that moves mastery is exactly
//     the trap the hard rule forbids. Only the attested-join anchor is used.
import { POS_MAP } from './pos-map'

export type CompoundVerdict = 'confirmed' | 'rejected' | 'not-applicable'

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-zæøå\s]/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
}

/**
 * Verify an AI conversation/journal compound-word correction.
 * @param c.original  the learner's wrong words (the split form, e.g. "kjøkken benk")
 * @param c.corrected the AI's proposed correction (the joined form, e.g. "kjøkkenbenk")
 * (No context needed — the split↔join relationship is self-contained.)
 */
export function verifyCompoundCorrection(c: {
  original: string
  corrected: string
}): CompoundVerdict {
  const split = tokens(c.original)
  const joined = tokens(c.corrected)

  // Confirmed direction only: learner has exactly one MORE token than the
  // correction (they split a word the correction joins).
  if (split.length !== joined.length + 1) return 'not-applicable'
  if (split.length < 2) return 'not-applicable'

  // Find the single concatenation point: every token must align except one
  // adjacent pair on the split side that joins to one token on the corrected side.
  let i = 0
  while (i < joined.length && split[i] === joined[i]) i++
  // The aligned-prefix mismatch must be the join: split[i] + split[i+1] === joined[i].
  if (i >= split.length - 1) return 'not-applicable'
  const piece = split[i] + split[i + 1]
  if (piece !== joined[i]) return 'not-applicable'
  // The remainder after the join must align exactly (no other edits).
  for (let k = i + 1; k < joined.length; k++) {
    if (joined[k] !== split[k + 1]) return 'not-applicable'
  }

  // Deterministic anchor: the joined form must be a lexically attested word.
  // Present in the ordbank-derived POS map ⇒ it is a real Norwegian word, so the
  // learner's split was a genuine compound error. Absent ⇒ can't prove it (OOV).
  return POS_MAP[piece] !== undefined ? 'confirmed' : 'not-applicable'
}
