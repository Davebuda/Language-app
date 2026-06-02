// Deterministic parser: norsk_b2_hverdagsord.md → content/vocab/b2-clusters.json
// No AI interpretation — pure structural extraction so the JSON faithfully
// mirrors the hand-authored source. Output is mechanically validated + linguist-
// gated downstream (Slice 3.1). Run: node scripts/parse-b2-vocab.mjs <src> <out>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const SRC = process.argv[2] || `${process.env.USERPROFILE || process.env.HOME}/Downloads/norsk_b2_hverdagsord.md`
const OUT = process.argv[3] || 'content/vocab/b2-clusters.json'

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Derive the ablaut/conjugation group from the form pattern (the source's
// "Mønstre du kan stole på" taxonomy: G1 -et/-et, G2 -te/-t, G3 -dde/-dd, strong).
function ablautGroup(preteritum, perfektum, irregular) {
  if (irregular) return 'strong'
  const pf = perfektum.replace(/^har\s+/, '')
  if (preteritum.endsWith('dde') || pf.endsWith('dd')) return 'group-3' // short-vowel -dde/-dd
  if (preteritum.endsWith('et') && pf.endsWith('et')) return 'group-1' // -et/-et
  if (/(te|de)$/.test(preteritum) || /t$/.test(pf)) return 'group-2' // -te/-t OR voiced -de/-d (bøyde/bøyd)
  return 'group-1'
}

// Parse one "→ å lemma (mods) – presens – preteritum – har perfektum [**(uregelrett)**]"
function parseWord(line, clusterId) {
  let body = line.replace(/^\s*→\s*/, '').trim()
  const irregular = /\*\*\(uregelrett\)\*\*/.test(body)
  body = body.replace(/\*\*\(uregelrett\)\*\*/g, '').trim()
  const parts = body.split('–').map((p) => p.trim()).filter(Boolean)
  if (parts.length < 4) return null // malformed — flag in validation
  const [inf, presens, preteritum, perfektum] = parts
  // infinitive: "å klø (seg)" / "å skru (igjen / på / av)"
  const mod = inf.match(/\(([^)]+)\)/)
  const reflexive = /\bseg\b/.test(inf) // "klø (seg)" or "vegre seg (for)"
  const particle = (() => {
    if (!mod) return null
    const p = mod[1].replace(/\bseg\b/g, '').replace(/\s+/g, ' ').trim()
    return p || null
  })()
  const lemma = inf.replace(/^å\s+/, '').replace(/\s*\([^)]*\)/, '').trim()
  return {
    id: slug(lemma),
    infinitive: inf,
    lemma,
    presens,
    preteritum,
    perfektum,
    irregular,
    ablautGroup: ablautGroup(preteritum, perfektum, irregular),
    reflexive,
    particle,
    clusterId,
    // gloss intentionally null — not in the source per-word; added later, never fabricated here.
    gloss: null,
  }
}

const lines = readFileSync(SRC, 'utf8').split(/\r?\n/)
const clusters = []
const wordsById = new Map()
const sentences = []
let cluster = null
let cur = null // current sentence being assembled

const flush = () => {
  if (cur) sentences.push(cur)
  cur = null
}

for (const raw of lines) {
  const line = raw.replace(/\s+$/, '')
  const cm = line.match(/^##\s+(\d+)\.\s+(.+)$/)
  if (cm) {
    flush()
    const name = cm[2].trim()
    cluster = { id: slug(name), index: Number(cm[1]), name, wordIds: [], sentenceIds: [] }
    clusters.push(cluster)
    continue
  }
  if (/^##\s/.test(line)) { flush(); cluster = null; continue } // non-numbered ## = end of clusters (Mønstre)
  const sm = line.match(/^(\d+)\.\s+(.+)$/)
  if (sm && cluster) {
    flush()
    const noRaw = sm[2]
    const targetSurfaces = [...noRaw.matchAll(/\*\*(.+?)\*\*/g)].map((m) => m[1])
    cur = {
      id: `b2v-${sm[1]}`,
      no: noRaw.replace(/\*\*/g, ''),
      en: null,
      targetSurfaces,
      wordIds: [],
      clusterId: cluster.id,
      cefrLevel: 'B2',
    }
    cluster.sentenceIds.push(cur.id)
    continue
  }
  const em = line.match(/^\s*\*(.+)\*\s*$/)
  if (em && cur && cur.en === null) { cur.en = em[1].trim(); continue }
  if (/^\s*→/.test(line) && cur && cluster) {
    const w = parseWord(line, cluster.id)
    if (w) {
      if (!wordsById.has(w.id)) {
        wordsById.set(w.id, w)
        cluster.wordIds.push(w.id)
      }
      if (!cur.wordIds.includes(w.id)) cur.wordIds.push(w.id)
    }
  }
}
flush()

// De-dup wordIds on clusters (a verb can recur across sentences in a cluster)
for (const c of clusters) c.wordIds = [...new Set(c.wordIds)]

// ── Linguist-gated corrections (norwegian-linguist agent report, Slice 3.1) ──
// The parser mirrors the source; these are the corrections the linguist mandated
// where the SOURCE was non-standard or its bold markup was incomplete. Kept in
// the parser (not hand-edited into the JSON) so the build stays reproducible.
function applyLinguistOverrides(data) {
  // gni: source wrote "gned (uregelrett)", but standard modern Bokmål is the weak
  // gnidde/gnidd (Bokmålsordboka). "gned" would teach the wrong preteritum.
  const gni = data.words.find((w) => w.id === 'gni')
  if (gni) Object.assign(gni, {
    preteritum: 'gnidde', perfektum: 'har gnidd', irregular: false, ablautGroup: 'group-3',
  })
  // b2v-57: source omitted bold markup on its target verbs; fill from the sentence.
  const s57 = data.sentences.find((s) => s.id === 'b2v-57')
  if (s57 && s57.targetSurfaces.length === 0) s57.targetSurfaces = ['gjemte', 'fant']
  // b2v-30: EN gloss mismatch ("by morning" vs "om natten" = overnight).
  const s30 = data.sentences.find((s) => s.id === 'b2v-30')
  if (s30) s30.en = 'He forgot to turn off the tap, and the whole bathroom floor was flooded overnight.'
  // NOTE (linguist minors #9–12, intentionally NOT changed): in cluster 6 the
  // source bolds NOUN vocabulary (haug/skuff/støv/krok/flekk/sprekk) while the
  // → lines give the conjugable verbs. So targetSurfaces (source-bolded vocab,
  // sometimes nouns) legitimately differs from wordIds (verbs). Faithful, not a bug.
}

const out = {
  level: 'B2',
  source: 'norsk_b2_hverdagsord.md',
  generatedBy: 'scripts/parse-b2-vocab.mjs (deterministic; linguist-gated 2026-06-02)',
  clusters,
  words: [...wordsById.values()],
  sentences,
}
applyLinguistOverrides(out)

mkdirSync(dirname(OUT), { recursive: true })
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log(
  `Parsed: ${clusters.length} clusters, ${out.words.length} words, ${sentences.length} sentences → ${OUT}`,
)
// quick integrity echo
const noEn = sentences.filter((s) => !s.en).length
const noWords = sentences.filter((s) => s.wordIds.length === 0).length
const irr = out.words.filter((w) => w.irregular).length
console.log(`  sentences missing gloss: ${noEn} | sentences with 0 words: ${noWords} | irregular verbs: ${irr}`)
