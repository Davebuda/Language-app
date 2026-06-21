// Deterministic adjective-agreement corrector (p4 Lever 2, mirrors conjugation-verifier).
//
// Norwegian attributive adjectives agree with the noun phrase: en/ei → common (base),
// et → neuter (+t), den/det/de/mange/… → plural-or-definite (+e). The DETERMINER before
// the adjective fixes the required form deterministically, so this verifier confirms an
// AI adjective-agreement correction ONLY when:
//   1. the changed token pair are forms of the SAME adjective lemma, AND
//   2. a determiner immediately precedes the (learner's) adjective in the sentence, AND
//   3. the CORRECTED form is the lemma's form for the determiner-required slot while the
//      ORIGINAL form is not.
// No determiner / OOV adjective / predicative position → not-applicable. OOV-safe,
// false-negative-biased, deterministic. (Predicative agreement — "huset er stort" — is
// intentionally out of scope here; it needs subject-noun gender, not a determiner.)
import { ADJ_PARADIGMS } from './adj-forms'

export type AdjectiveVerdict = 'confirmed' | 'rejected' | 'not-applicable'

// Agreement slot index into a paradigm's [common, neuter, pluralDefinite].
type AgrSlot = 0 | 1 | 2

// form -> lemmas whose paradigm contains it (any slot).
const FORM_LEMMAS = new Map<string, Set<string>>()
for (const [lemma, forms] of Object.entries(ADJ_PARADIGMS)) {
  for (const slot of forms) {
    for (const form of slot.split('|')) {
      if (!form) continue
      const s = FORM_LEMMAS.get(form)
      if (s) s.add(lemma)
      else FORM_LEMMAS.set(form, new Set([lemma]))
    }
  }
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-zæøå\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

const COMMON_DET = new Set(['en', 'ei'])
const NEUTER_DET = new Set(['et'])
const PLURDEF_DET = new Set([
  'den', 'det', 'denne', 'dette', 'de', 'disse',
  'mange', 'flere', 'noen', 'alle', 'begge', 'fa',
  'to', 'tre', 'fire', 'fem', 'seks', 'sju', 'syv', 'atte', 'ni', 'ti',
])

// The agreement slot the determiner immediately before `adjForm` requires, or null.
function expectedSlot(context: string, adjForm: string): AgrSlot | null {
  const toks = norm(context).replace(/å/g, 'a').replace(/ø/g, 'o').replace(/æ/g, 'a').split(' ')
  const target = adjForm.replace(/å/g, 'a').replace(/ø/g, 'o').replace(/æ/g, 'a')
  const idx = toks.lastIndexOf(target)
  if (idx <= 0) return null
  const det = toks[idx - 1]
  if (COMMON_DET.has(det)) return 0
  if (NEUTER_DET.has(det)) return 1
  if (PLURDEF_DET.has(det)) return 2
  return null
}

function changedPair(original: string, corrected: string): [string, string] | null {
  const o = norm(original).split(' ').filter(Boolean)
  const c = norm(corrected).split(' ').filter(Boolean)
  if (o.length === 1 && c.length === 1) return [o[0], c[0]]
  if (o.length === c.length) {
    const diffs: Array<[string, string]> = []
    for (let i = 0; i < o.length; i++) if (o[i] !== c[i]) diffs.push([o[i], c[i]])
    if (diffs.length === 1) return diffs[0]
  }
  return null
}

function slotForms(lemma: string, slot: AgrSlot): string[] {
  return ADJ_PARADIGMS[lemma][slot].split('|').filter(Boolean)
}

/**
 * Verify an AI adjective-agreement correction.
 * @param c.original  the learner's wrong words
 * @param c.corrected the AI's proposed correction
 * @param c.context   the learner's full utterance (locates the determiner before the adjective)
 */
export function verifyAdjectiveCorrection(c: {
  original: string
  corrected: string
  context: string
}): AdjectiveVerdict {
  const pair = changedPair(c.original, c.corrected)
  if (!pair) return 'not-applicable'
  const [oForm, cForm] = pair
  if (oForm === cForm) return 'not-applicable'

  const oLemmas = FORM_LEMMAS.get(oForm)
  const cLemmas = FORM_LEMMAS.get(cForm)
  if (!oLemmas || !cLemmas) return 'not-applicable' // OOV adjective form

  // Locate the agreement requirement from the learner's determiner (use the original form).
  const expected = expectedSlot(c.context, oForm)
  if (expected === null) return 'not-applicable'

  // Confirm only when, for a shared adjective lemma, the corrected form fills the required
  // slot and the original form does not. No shared lemma → the two words are different
  // adjectives (not an agreement change) → not-applicable.
  let sharedLemma = false
  for (const lemma of oLemmas) {
    if (!cLemmas.has(lemma)) continue
    sharedLemma = true
    const required = slotForms(lemma, expected)
    if (required.includes(cForm) && !required.includes(oForm)) return 'confirmed'
  }
  return sharedLemma ? 'rejected' : 'not-applicable'
}
