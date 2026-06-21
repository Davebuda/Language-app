// Deterministic verb-conjugation corrector (p4 Lever 2, mirrors gender-verifier).
//
// AI conversation/journal corrections may not move mastery unless a deterministic
// check confirms them (project rule: no unverified AI output moves mastery). Most
// conjugation errors use a VALID verb form in the WRONG tense ("i går spiser" →
// "spiste"), which a lexicon alone can't catch — so this verifier confirms a
// conjugation correction ONLY when:
//   1. the changed token pair are forms of the SAME verb lemma at different tense
//      slots (a genuine conjugation change, not a different word / hallucination), AND
//   2. an unambiguous tense marker in the learner's sentence ("i går" → preterite,
//      "i dag" → present) matches the CORRECTED form's tense and not the original's.
// No clear marker, OOV verb, or a corrected form that contradicts the marker →
// not-applicable / rejected. OOV-safe and false-negative-biased by design.
import { VERB_PARADIGMS } from './verb-forms'

export type ConjugationVerdict = 'confirmed' | 'rejected' | 'not-applicable'

const SLOTS = ['pres', 'pret', 'perf'] as const
type Tense = (typeof SLOTS)[number]

// form -> the (lemma, tense) slots it fills. Built once from the paradigm table.
const FORM_INDEX = new Map<string, Array<{ lemma: string; tense: Tense }>>()
for (const [lemma, forms] of Object.entries(VERB_PARADIGMS)) {
  forms.forEach((slot, i) => {
    for (const form of slot.split('|')) {
      if (!form) continue
      const entry = { lemma, tense: SLOTS[i] }
      const list = FORM_INDEX.get(form)
      if (list) list.push(entry)
      else FORM_INDEX.set(form, [entry])
    }
  })
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-zæøå\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

// High-precision adverbial tense markers. Multi-word where possible to avoid
// false matches; '|'-anchored on spaces. Returns the expected tense or null.
const PAST_MARKERS = ['i gar', 'i fjor', 'forrige', 'tidligere', 'for lenge siden', 'den gangen', 'i forfjor', 'sist uke', 'sist helg']
const PRESENT_MARKERS = ['i dag', 'akkurat na', 'for tiden', 'om dagen', 'hver dag', 'vanligvis', 'na for tiden', 'til daglig']

function detectTense(context: string): Tense | null {
  const c = ` ${norm(context).replace(/å/g, 'a').replace(/ø/g, 'o').replace(/æ/g, 'a')} `
  const past = PAST_MARKERS.some((m) => c.includes(` ${m} `) || c.includes(` ${m}`))
  const present = PRESENT_MARKERS.some((m) => c.includes(` ${m} `) || c.includes(` ${m}`))
  if (past && !present) return 'pret'
  if (present && !past) return 'pres'
  return null // none, or ambiguous → can't deterministically decide
}

// Isolate the single changed verb token between original and corrected.
function changedPair(original: string, corrected: string): [string, string] | null {
  const o = norm(original).split(' ').filter(Boolean)
  const c = norm(corrected).split(' ').filter(Boolean)
  if (o.length === 1 && c.length === 1) return [o[0], c[0]]
  if (o.length === c.length) {
    const diffs: Array<[string, string]> = []
    for (let i = 0; i < o.length; i++) if (o[i] !== c[i]) diffs.push([o[i], c[i]])
    if (diffs.length === 1) return diffs[0]
  }
  return null // can't isolate a single verb change → don't guess
}

/**
 * Verify an AI conversation/journal verb-conjugation correction.
 * @param c.original  the learner's wrong words ("exact words they used wrong")
 * @param c.corrected the AI's proposed correction
 * @param c.context   the learner's full utterance (for tense markers)
 */
export function verifyConjugationCorrection(c: {
  original: string
  corrected: string
  context: string
}): ConjugationVerdict {
  const pair = changedPair(c.original, c.corrected)
  if (!pair) return 'not-applicable'
  const [oForm, cForm] = pair
  if (oForm === cForm) return 'not-applicable'

  const oEntries = FORM_INDEX.get(oForm)
  const cEntries = FORM_INDEX.get(cForm)
  if (!oEntries || !cEntries) return 'not-applicable' // OOV verb form → can't verify

  // Find a shared lemma where the two forms sit in DIFFERENT tense slots.
  let oTense: Tense | undefined
  let cTense: Tense | undefined
  for (const oe of oEntries) {
    for (const ce of cEntries) {
      if (oe.lemma === ce.lemma && oe.tense !== ce.tense) {
        oTense = oe.tense
        cTense = ce.tense
        break
      }
    }
    if (oTense) break
  }
  if (!oTense || !cTense) return 'not-applicable' // not a same-lemma tense swap

  const expected = detectTense(c.context)
  if (expected === null) return 'not-applicable' // no deterministic tense evidence

  // Confirm only when the corrected form matches the marked tense and the original did not.
  if (cTense === expected && oTense !== expected) return 'confirmed'
  return 'rejected'
}
