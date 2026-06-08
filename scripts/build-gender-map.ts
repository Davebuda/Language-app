/**
 * build-gender-map.ts — generate src/lib/gender-map.ts (Lever 3, deterministic gender corrector).
 *
 * Emits a form → gender-bitmask lookup for Norwegian Bokmål nouns, used by
 * src/lib/gender-verifier.ts to verify AI gender corrections deterministically.
 *
 * SOURCE DATA (not committed; fetched into .tmp/ordbank/, gitignored):
 *   1. Norsk ordbank – bokmål 2005 (Språkrådet/Nasjonalbiblioteket, CC-BY 4.0)
 *        curl -sL -o .tmp/ordbank/ob.tar.gz \
 *          https://www.nb.no/sbfil/leksikalske_databaser/ordbank/20220201_norsk_ordbank_nob_2005.tar.gz
 *        tar -xzf .tmp/ordbank/ob.tar.gz -C .tmp/ordbank
 *      -> provides the AUTHORITATIVE gender data that ships in gender-map.ts.
 *   2. OpenSubtitles 2016 frequency list (FrequencyWords, hermitdave) — used ONLY as a
 *      build-time FILTER to pick which lemmas to keep. Its data is NOT bundled; the shipped
 *      artifact contains only ordbank (CC-BY) gender facts keyed by word form.
 *        curl -sL -o .tmp/ordbank/nb_freq.txt \
 *          https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/no/no_50k.txt
 *
 * The script auto-runs the two curl/tar steps if the files are missing (needs curl + tar on PATH).
 *
 * Run:  npx tsx scripts/build-gender-map.ts   (commit the regenerated src/lib/gender-map.ts)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const TMP = resolve('.tmp/ordbank')
const FULLFORM = resolve(TMP, 'fullformsliste.txt')
const FREQ = resolve(TMP, 'nb_freq.txt')
const CORPUS = ['a1', 'a2', 'b1', 'b2'].map((l) => resolve('content/sentences', `${l}.json`))
const OUT = resolve('src/lib/gender-map.ts')

// How many top-frequency forms to admit (∪ corpus nouns). Tuned to keep the artifact ~300KB.
const FREQ_CUTOFF = 15_000

// Gender bitmask. Mirrors GENDER bits in gender-verifier.ts.
const M = 1, F = 2, N = 4

function ensureSources(): void {
  if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true })
  if (!existsSync(FULLFORM)) {
    console.log('[build-gender-map] fetching Norsk ordbank…')
    execSync(
      `curl -sL -o "${TMP}/ob.tar.gz" https://www.nb.no/sbfil/leksikalske_databaser/ordbank/20220201_norsk_ordbank_nob_2005.tar.gz && tar -xzf "${TMP}/ob.tar.gz" -C "${TMP}"`,
      { stdio: 'inherit', shell: '/bin/bash' },
    )
  }
  if (!existsSync(FREQ)) {
    console.log('[build-gender-map] fetching frequency list…')
    execSync(
      `curl -sL -o "${FREQ}" https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/no/no_50k.txt`,
      { stdio: 'inherit', shell: '/bin/bash' },
    )
  }
}

function genderBit(tag: string): number {
  // A noun row carries exactly one gender token. Latin-1 'nøyt' has ø (0xF8).
  if (tag.includes('mask')) return M
  if (tag.includes('fem')) return F
  if (tag.includes('nøyt')) return N
  return 0
}

function main(): void {
  ensureSources()

  // fullformsliste.txt is Latin-1 (ISO-8859-1), tab-separated, \r\n, with a header row.
  // Columns: 0 LOEPENR | 1 LEMMA_ID | 2 OPPSLAG (form) | 3 TAG | …
  const text = readFileSync(FULLFORM, 'latin1')

  const lemmaGender = new Map<string, number>()      // LEMMA_ID -> bit-union of its genders
  const formLemmas = new Map<string, Set<string>>()  // form -> LEMMA_IDs it appears under
  const lemmaForms = new Map<string, Set<string>>()  // LEMMA_ID -> its forms

  for (const line of text.split('\n')) {
    if (!line) continue
    const c = line.split('\t')
    if (c.length < 4 || !/^\d+$/.test(c[0])) continue // skip header / malformed
    const tag = c[3]
    if (!tag.includes('subst') || tag.includes('prop')) continue // common nouns only
    const bit = genderBit(tag)
    if (!bit) continue
    const lemmaId = c[1]
    const form = c[2].toLowerCase().trim()
    if (!form || form.includes(' ')) continue // single-word forms only

    lemmaGender.set(lemmaId, (lemmaGender.get(lemmaId) ?? 0) | bit)
    if (!formLemmas.has(form)) formLemmas.set(form, new Set())
    formLemmas.get(form)!.add(lemmaId)
    if (!lemmaForms.has(lemmaId)) lemmaForms.set(lemmaId, new Set())
    lemmaForms.get(lemmaId)!.add(form)
  }

  // Lemmas to keep: every noun in the app corpus ∪ the top-N frequency forms' lemmas.
  const keep = new Set<string>()
  const corpusTokens = new Set<string>()
  for (const file of CORPUS) {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const list: Array<{ norwegian?: string; notes?: string }> = Array.isArray(parsed)
      ? parsed
      : (Object.values(parsed)[0] as [])
    for (const s of list) {
      for (const w of (s.norwegian ?? '').toLowerCase().split(/[^a-zæøå]+/)) if (w) corpusTokens.add(w)
      for (const w of (s.notes ?? '').toLowerCase().split(/[^a-zæøå]+/)) if (w) corpusTokens.add(w)
    }
  }
  for (const t of corpusTokens) for (const id of formLemmas.get(t) ?? []) keep.add(id)

  const freqWords = readFileSync(FREQ, 'utf8').split('\n').map((l) => l.split(' ')[0]).filter(Boolean)
  for (let i = 0; i < Math.min(FREQ_CUTOFF, freqWords.length); i++) {
    for (const id of formLemmas.get(freqWords[i]) ?? []) keep.add(id)
  }

  // Resolve each kept lemma's forms -> bit-union of that lemma's gender(s).
  // A form shared across lemmas (homograph) unions their genders (accept-all = safe).
  const map: Record<string, number> = {}
  for (const lemmaId of keep) {
    const g = lemmaGender.get(lemmaId) ?? 0
    for (const form of lemmaForms.get(lemmaId) ?? []) map[form] = (map[form] ?? 0) | g
  }

  // Sort keys for stable diffs; emit COMPACT (one line) — generated data, parse-speed + size beat readability.
  const sorted: Record<string, number> = {}
  for (const k of Object.keys(map).sort()) sorted[k] = map[k]
  const out = `// AUTO-GENERATED by scripts/build-gender-map.ts — DO NOT EDIT BY HAND.
// Regenerate: npx tsx scripts/build-gender-map.ts
//
// Source: Norsk ordbank – bokmål 2005, Språkrådet/Nasjonalbiblioteket, CC-BY 4.0
//   https://www.nb.no/sprakbanken/en/resource-catalogue/oai-nb-no-sbr-5/
// Coverage: top-${FREQ_CUTOFF.toLocaleString('en')} OpenSubtitles-frequency forms ∪ app corpus nouns.
// Nouns outside this set are intentionally ABSENT — the verifier treats an unknown
// noun as not-applicable and never moves mastery (OOV-safe by design).
//
// Value = gender bitmask: 1=masculine(en) · 2=feminine(ei) · 4=neuter(et). A noun's
// value is the bit-union of every gender Bokmål allows for it (e.g. "bok" = 3 = m|f),
// so the two-gender class never false-flags a valid masculine usage.
//
// ${Object.keys(sorted).length} forms.
export const GENDER_MAP: Record<string, number> = ${JSON.stringify(sorted)}
`
  writeFileSync(OUT, out, 'utf8')
  const kb = (Buffer.byteLength(out, 'utf8') / 1024).toFixed(0)
  console.log(`[build-gender-map] wrote ${OUT}: ${Object.keys(sorted).length} forms, ${keep.size} lemmas, ${kb}KB`)
}

main()
