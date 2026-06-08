// Deterministic noun-gender verifier (Lever 3). NO AI.
//
// Re-arms the gated-off conversation + journal AI corrections — but ONLY for gender
// errors a lexicon can prove. Given an AI correction (learner's `original` vs the AI's
// `corrected`), it returns:
//   - 'confirmed'      → a real gender error: the learner's article gender is NOT allowed
//                         for the noun AND the AI's proposed gender IS. Safe to grade.
//   - 'rejected'       → the learner was actually valid (two-gender class, e.g. "en bok"),
//                         or the AI's own proposal is wrong (e.g. "jobb" → "et jobb"). No grade.
//   - 'not-applicable' → no verifiable article+noun gender pair (OOV noun, no article,
//                         spelling-only diff, definite-form swap). No grade.
//
// Only 'confirmed' may move mastery — every other verdict is a no-op write, upholding
// the hard rule "no unverified AI output moves mastery". The verifier ignores the AI's
// claimed error tag and decides purely from the indefinite article (en/ei/et) + the noun.
import { GENDER_MAP } from './gender-map'

// Gender bitmask — mirrors the values baked into gender-map.ts.
const M = 1, F = 2, N = 4

const ARTICLE_GENDER: Record<string, number> = { en: M, ei: F, et: N }

export type GenderVerdict = 'confirmed' | 'rejected' | 'not-applicable'

/** Lowercase word tokens (drops punctuation, keeps Norwegian letters). */
function words(s: string): string[] {
  return s.toLowerCase().split(/[^a-zæøå]+/).filter(Boolean)
}

/**
 * Allowed gender bitmask for a noun form: direct lexicon hit, else a longest-suffix
 * compound fallback (gender of a compound = gender of its final element, e.g.
 * "sommerjobb" → "jobb"). Returns 0 when the noun is unknown (OOV → not-applicable).
 */
export function resolveGender(noun: string): number {
  const direct = GENDER_MAP[noun]
  if (direct) return direct
  // Compound: strip leading characters, find the LONGEST known noun suffix. Require the
  // suffix to be ≥4 chars so a coincidental short tail (e.g. "ord" inside a non-word)
  // can't mis-resolve a garbage token — we'd rather return 0 (not-applicable) than guess.
  for (let i = 1; i <= noun.length - 4; i++) {
    const hit = GENDER_MAP[noun.slice(i)]
    if (hit) return hit
  }
  return 0
}

/** (article, noun, asserted gender) pairs in a string — an article immediately followed by a word. */
function articleNounPairs(s: string): Array<{ noun: string; gender: number }> {
  const toks = words(s)
  const pairs: Array<{ noun: string; gender: number }> = []
  for (let i = 0; i < toks.length - 1; i++) {
    const g = ARTICLE_GENDER[toks[i]]
    if (g) pairs.push({ noun: toks[i + 1], gender: g })
  }
  return pairs
}

/**
 * Verify an AI gender correction deterministically.
 * @param c.original  the learner's text (or just the wrong phrase)
 * @param c.corrected the AI's proposed correction
 */
export function verifyGenderCorrection(c: { original: string; corrected: string }): GenderVerdict {
  const orig = articleNounPairs(c.original)
  const corr = articleNounPairs(c.corrected)
  if (orig.length === 0 || corr.length === 0) return 'not-applicable'

  // Match on the SAME noun across both sides with a DIFFERENT article — a pure gender swap.
  for (const proposed of corr) {
    const learner = orig.find((o) => o.noun === proposed.noun)
    if (!learner || learner.gender === proposed.gender) continue

    const allowed = resolveGender(proposed.noun)
    if (!allowed) return 'not-applicable' // OOV noun — cannot verify, never grade

    const learnerValid = (learner.gender & allowed) !== 0
    const proposedValid = (proposed.gender & allowed) !== 0
    // Confirmed only when the learner was genuinely wrong AND the AI's fix is genuinely right.
    if (!learnerValid && proposedValid) return 'confirmed'
    return 'rejected' // learner was valid (two-gender class) or the AI's own proposal is wrong
  }
  return 'not-applicable'
}
