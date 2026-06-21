/**
 * build-pos-map.ts — generate src/lib/pos-map.ts (deterministic part-of-speech lookup).
 *
 * Emits a form → POS-bitmask lookup for Norwegian Bokmål, used by
 * src/lib/classify-error.ts to distinguish wrong-word-SAME-category from
 * wrong-word-DIFFERENT-category: a single-token substitution whose two words have
 * DISJOINT POS sets (e.g. a noun typed where a verb belongs) is different-category.
 *
 * Mirrors scripts/build-gender-map.ts exactly (same source, same freq∪corpus
 * filter, same Latin-1 decode, same compact emit). Source data is NOT committed;
 * it is fetched into .tmp/ordbank/ (gitignored):
 *   Norsk ordbank – bokmål 2005 (Språkrådet/Nasjonalbiblioteket, CC-BY 4.0)
 *   + OpenSubtitles 2016 frequency list (hermitdave) as a build-time keep-filter only.
 * The POS lives in the TAG column's FIRST token (subst/verb/adj/adv/prep/pron/det/…).
 *
 * Run:  npx tsx scripts/build-pos-map.ts   (commit the regenerated src/lib/pos-map.ts)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const TMP = resolve('.tmp/ordbank')
const FULLFORM = resolve(TMP, 'fullformsliste.txt')
const LEMMA = resolve(TMP, 'lemma.txt')
const FREQ = resolve(TMP, 'nb_freq.txt')
const CORPUS = ['a1', 'a2', 'b1', 'b2'].map((l) => resolve('content/sentences', `${l}.json`))
const OUT = resolve('src/lib/pos-map.ts')

// Keep the top-N frequency forms ∪ corpus words (same budget as gender-map).
const FREQ_CUTOFF = 15_000

// POS bitmask. Mirrors POS_* in classify-error.ts. Open + closed classes that
// matter for distinguishing word categories; symbols/abbreviations are dropped.
const NOUN = 1, VERB = 2, ADJ = 4, ADV = 8, PREP = 16, PRON = 32, DET = 64, CONJ = 128, NUM = 256, INTERJ = 512

// ordbank ordklasse (first TAG token) → our POS bit. Unmapped tokens (symb,
// forkorting, clb, ukjent…) contribute nothing.
function posBit(tag: string): number {
  const k = tag.split(/\s+/)[0]
  switch (k) {
    case 'subst': return NOUN
    case 'verb': return VERB
    case 'adj': return ADJ
    case 'adv': return ADV
    case 'prep': return PREP
    case 'pron': return PRON
    case 'det': return DET
    case 'konj': return CONJ
    case 'sbu': return CONJ // subjunksjon — a conjunction for our purposes
    case 'interj': return INTERJ
    default:
      // determiner-class numerals are tagged "det … kvant"; count words "verb"? no.
      if (k === 'symb' && /tall|num/.test(tag)) return NUM
      return 0
  }
}

function ensureSources(): void {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
  if (!existsSync(FULLFORM)) {
    console.log('[build-pos-map] fetching Norsk ordbank…')
    execSync(
      `curl -sL -o "${TMP}/ob.tar.gz" https://www.nb.no/sbfil/leksikalske_databaser/ordbank/20220201_norsk_ordbank_nob_2005.tar.gz && tar -xzf "${TMP}/ob.tar.gz" -C "${TMP}"`,
      { stdio: 'inherit', shell: '/bin/bash' },
    )
  }
  if (!existsSync(FREQ)) {
    console.log('[build-pos-map] fetching frequency list…')
    execSync(
      `curl -sL -o "${FREQ}" https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/no/no_50k.txt`,
      { stdio: 'inherit', shell: '/bin/bash' },
    )
  }
}

function main(): void {
  ensureSources()

  // Frequency-allowed base forms: the top-N OpenSubtitles forms ∪ app-corpus tokens.
  // A POS reading is only admitted if its LEMMA's base form is in this set — this
  // drops rare homograph lemmas (e.g. the marginal verb "katte" → form "katt"),
  // so "katt" stays a clean noun rather than noun|verb. Without it the union pulls
  // in archaic/imperative readings and over-broadens every form's POS set.
  const allowedBase = new Set<string>()
  const freqWords = readFileSync(FREQ, 'utf8').split('\n').map((l) => l.split(' ')[0]).filter(Boolean)
  for (let i = 0; i < Math.min(FREQ_CUTOFF, freqWords.length); i++) allowedBase.add(freqWords[i])
  const corpusTokens = new Set<string>()
  for (const file of CORPUS) {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const list: Array<{ norwegian?: string; notes?: string }> = Array.isArray(parsed)
      ? parsed
      : (Object.values(parsed)[0] as [])
    for (const s of list) {
      for (const w of (s.norwegian ?? '').toLowerCase().split(/[^a-zæøå]+/)) if (w) { corpusTokens.add(w); allowedBase.add(w) }
      for (const w of (s.notes ?? '').toLowerCase().split(/[^a-zæøå]+/)) if (w) { corpusTokens.add(w); allowedBase.add(w) }
    }
  }

  // lemma.txt (Latin-1, header, \r\n): col 1 LEMMA_ID | col 2 GRUNNFORM (base form).
  const lemmaBase = new Map<string, string>()
  for (const line of readFileSync(LEMMA, 'latin1').split('\n')) {
    if (!line) continue
    const c = line.split('\t')
    if (c.length < 3 || !/^\d+$/.test(c[0])) continue
    lemmaBase.set(c[1], c[2].toLowerCase().trim())
  }

  // fullformsliste.txt is Latin-1, tab-separated, header row.
  // Columns: 0 LOEPENR | 1 LEMMA_ID | 2 OPPSLAG (form) | 3 TAG | …
  const formPos = new Map<string, number>() // form -> bit-union of admitted POS
  for (const line of readFileSync(FULLFORM, 'latin1').split('\n')) {
    if (!line) continue
    const c = line.split('\t')
    if (c.length < 4 || !/^\d+$/.test(c[0])) continue // skip header / malformed
    const bit = posBit(c[3])
    if (!bit) continue
    const base = lemmaBase.get(c[1])
    if (!base || !allowedBase.has(base)) continue // drop rare-lemma POS readings
    const form = c[2].toLowerCase().trim()
    if (!form || form.includes(' ') || !/^[a-zæøå]+$/.test(form)) continue // single plain word forms
    formPos.set(form, (formPos.get(form) ?? 0) | bit)
  }

  // Keep: every word in the app corpus ∪ the top-N frequency forms (that have a POS).
  const keep = new Set<string>()
  for (const w of corpusTokens) if (formPos.has(w)) keep.add(w)
  for (let i = 0; i < Math.min(FREQ_CUTOFF, freqWords.length); i++) {
    if (formPos.has(freqWords[i])) keep.add(freqWords[i])
  }

  const map: Record<string, number> = {}
  for (const form of keep) map[form] = formPos.get(form)!
  const sorted: Record<string, number> = {}
  for (const k of Object.keys(map).sort()) sorted[k] = map[k]

  const out = `// AUTO-GENERATED by scripts/build-pos-map.ts — DO NOT EDIT BY HAND.
// Regenerate: npx tsx scripts/build-pos-map.ts
//
// Source: Norsk ordbank – bokmål 2005, Språkrådet/Nasjonalbiblioteket, CC-BY 4.0
//   https://www.nb.no/sprakbanken/en/resource-catalogue/oai-nb-no-sbr-5/
// Coverage: top-${FREQ_CUTOFF.toLocaleString('en')} OpenSubtitles-frequency forms ∪ app corpus words.
// Forms outside this set are intentionally ABSENT — classify-error treats an
// unknown word as POS-unknown and never claims wrong-word-DIFFERENT-category
// (OOV-safe by design: it falls back to wrong-word-same-category).
//
// Value = POS bitmask (a form may hold several): 1=noun · 2=verb · 4=adj · 8=adv ·
// 16=prep · 32=pron · 64=det · 128=conj · 256=num · 512=interj. A different-category
// error is only claimed when two words' POS sets are DISJOINT (bit-AND === 0).
//
// ${Object.keys(sorted).length} forms.
export const POS_MAP: Record<string, number> = ${JSON.stringify(sorted)}
`
  writeFileSync(OUT, out)
  console.log(`[build-pos-map] wrote ${OUT} (${Object.keys(sorted).length} forms)`)
}

main()
