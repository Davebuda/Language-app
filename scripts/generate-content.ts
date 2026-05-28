/**
 * Phase 1 — Gate-protected content generation (Ollama + NB-Llama).
 *
 * Generates CEFR-tagged Norwegian Bokmål sentences for a (level, concept) and
 * runs EVERY candidate through the same validation gate the app uses, plus
 * structural/tag/level/dedup checks, before writing to staging. Nothing reaches
 * the live corpus from here — output goes to content/sentences/staging/ for
 * review + `npm run audit:corpus` before any seed.
 *
 * The moat depends on correct tags, so rejection is cheap and acceptance is strict.
 *
 *   npx tsx scripts/generate-content.ts --level=A1 --concept=noun-gender --count=10
 *   npx tsx scripts/generate-content.ts --level=A1 --concept=noun-gender --dry-run   (prints prompt, no model call)
 *   flags: --type=translation-to-norwegian|fill-in-blank  --model=<ollama tag>
 *
 * NOTE: this replaces an earlier Anthropic-based generator that wrote directly
 * to the live corpus with no validation — that pattern poisons the diagnostic
 * moat and is intentionally not reproduced here.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateNorwegianOutput } from '../src/ai/validate'
import { gateRow } from './lib/content-gate'

// tsx does not auto-load .env.local the way Next.js does for the app, so the
// Groq authoring key would be missing. Load it explicitly (without clobbering
// any var already set in the real environment).
function loadEnvLocal(): void {
  const p = join(process.cwd(), '.env.local')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnvLocal()

const ROOT = process.cwd()
const SENT_DIR = join(ROOT, 'content', 'sentences')
const STAGE_DIR = join(SENT_DIR, 'staging')
const CONCEPT_DIR = join(ROOT, 'content', 'concepts')
const OLLAMA = process.env.OLLAMA_URL ?? 'http://localhost:11434'
const DEFAULT_MODEL = 'hf.co/NbAiLab/nb-llama-3.1-8B-Instruct-Q4_K_M-GGUF'
// Groq is used for ONE-TIME corpus authoring of structural concepts that the
// local 8B model cannot do (proven 2026-05-29: NB-Llama parrots V2 examples).
// A 70B model handles A1 structure far better; footprint is irrelevant offline.
const GROQ_KEY = process.env.GROQ_API_KEY
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_AUTHOR_MODEL = process.env.GROQ_AUTHOR_MODEL ?? 'llama-3.3-70b-versatile'

const LEVEL_MAX_WORDS: Record<string, number> = { A1: 8, A2: 12, B1: 18, B2: 18 }
const LEVEL_GUIDE: Record<string, string> = {
  A1: 'Absolute beginner. Present tense, very common everyday vocabulary, simple main clauses only. No subordinate clauses. 4-8 words.',
  A2: 'Elementary. Present + past, common vocabulary, simple connectors (og, men, fordi). Short clauses. Up to 12 words.',
  B1: 'Intermediate. All common tenses, subordinate clauses, everyday + some abstract vocabulary. Up to 18 words.',
  B2: 'Upper-intermediate. Complex structures, register awareness, abstract/academic vocabulary, idioms. Up to 18 words.',
}

interface Concept { id: string; label: string; description: string; cefrLevel: string; errorTags?: string[]; vocabularyClusters?: string[] }

// Concept-specific guidance + few-shot. The 8B model follows concrete examples
// far better than abstract rules; these target exactly the failure modes the
// 2026-05-28 linguist review found (declaratives in question files, SVO in V2
// files, "<subject> å <verb>" hallucinations, past/perfect in A1 present files).
const CONCEPT_HINTS: Record<string, string> = {
  'v2-word-order':
    'KRITISK: HVER setning MÅ begynne med et IKKE-subjekt (tidsuttrykk eller sted: «I dag», «I morgen», «Om morgenen», «På mandag», «Hjemme»), så det finitte verbet kommer som ledd nr. 2 og subjektet RETT ETTER verbet. Eksempler: «I dag spiser jeg frokost.» «Om morgenen drikker hun kaffe.» «På mandag går vi på skolen.» ALDRI start med jeg/du/han/hun/vi/de.',
  'question-formation':
    'KRITISK: HVER setning MÅ være et spørsmål som slutter med «?». Bruk enten spørreord («Hva gjør du?», «Hvor bor han?», «Når kommer dere?») eller ja/nei-inversjon med verbet først («Liker du kaffe?», «Bor du i Oslo?»). ALDRI en vanlig påstandssetning.',
  'infinitive-form':
    'KRITISK: infinitiv brukes ETTER et modalverb (kan/vil/skal/må) eller etter «å» inne i en setning. Eksempler: «Jeg vil spise nå.» «Hun kan svømme.» «Det er fint å lese.» ALDRI skriv «Jeg å spise» — det finnes ikke på norsk.',
  'definite-articles-singular':
    'KRITISK: HVER setning MÅ inneholde et substantiv i BESTEMT form entall (endelse -en/-et/-a): boken, huset, bilen, jenta. Eksempler: «Jeg leser boken.» «Han åpner døren.» «Katten sover.» IKKE bruk ubestemt «en/et bok».',
  'definite-articles-plural':
    'KRITISK: HVER setning MÅ inneholde et substantiv i BESTEMT form FLERTALL (endelse -ene/-a): bøkene, husene, bilene, barna. Eksempler: «Bøkene ligger på bordet.» «Hundene er store.» «Barna leker ute.»',
  'to-have-verb':
    'KRITISK: bruk KUN presens «har» som hovedverb + et substantiv. Eksempler: «Jeg har en bil.» «Hun har to barn.» «Vi har et hus.» ALDRI «hadde», «har hatt», «har lest» (det er fortid/perfektum, for høyt nivå).',
  'to-be-verb':
    'KRITISK: bruk KUN presens «er». Eksempler: «Jeg er lærer.» «Hun er hjemme.» «Vi er venner.» ALDRI «var», «blir» eller «bli».',
  'present-tense-regular':
    'KRITISK: bruk et regelrett verb i presens (+ -r): spiser, jobber, leser, snakker. HVER setning MÅ ha subjekt + verb + et ledd til (objekt eller sted). Eksempler: «Jeg spiser frokost.» «Hun leser en bok.» IKKE bare «Jeg spiser».',
  'plural-formation':
    'KRITISK: HVER setning MÅ inneholde et substantiv i FLERTALL (ubestemt: biler, bøker, barn; eller bestemt: bilene). Skriv HELE setninger, ikke enkeltord. Eksempler: «Jeg har tre bøker.» «Hun ser mange biler.»',
}
interface Cand { norwegian?: unknown; english?: unknown; concept_ids?: unknown; error_tags_detectable?: unknown; exercise_types?: unknown; difficulty?: unknown; notes?: unknown }

function arg(name: string, def?: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : def
}
const FLAG = (n: string) => process.argv.includes(`--${n}`)
function norm(s: string): string { return s.toLowerCase().replace(/[.,!?;:«»“”‘’…"'()/\-–—%]/g, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim() }

function loadConcepts(): Map<string, Concept> {
  const m = new Map<string, Concept>()
  for (const lvl of ['a1', 'a2', 'b1', 'b2']) {
    const g = JSON.parse(readFileSync(join(CONCEPT_DIR, `${lvl}-graph.json`), 'utf-8')) as { concepts: Concept[] }
    for (const c of g.concepts) m.set(c.id, c)
  }
  return m
}

// Normalized norwegian strings already in the corpus + staging (dedup set).
function loadExistingNorwegian(): Set<string> {
  const seen = new Set<string>()
  const files = ['a1.json', 'a2.json', 'b1.json', 'b2.json'].map((f) => join(SENT_DIR, f))
  if (existsSync(STAGE_DIR)) for (const f of readdirSync(STAGE_DIR)) if (f.endsWith('.json')) files.push(join(STAGE_DIR, f))
  for (const f of files) {
    if (!existsSync(f)) continue
    try {
      const rows = JSON.parse(readFileSync(f, 'utf-8')) as Array<{ norwegian?: string }>
      for (const r of rows) if (typeof r.norwegian === 'string') seen.add(norm(r.norwegian))
    } catch { /* skip unreadable */ }
  }
  return seen
}

// The model produces ONLY the sentence content (norwegian + english + difficulty,
// and the answer for fill-in-blank). All metadata — concept_ids, error tags,
// exercise type, level — is assigned deterministically from the invocation, so
// the model can't mis-tag (an 8B model follows prose well but JSON schema poorly).
function buildPrompt(concept: Concept, level: string, type: string, count: number): { system: string; user: string } {
  const tags = (concept.errorTags ?? []).join(', ')
  const maxWords = LEVEL_MAX_WORDS[level]
  const system = [
    'Du er en norsklærer som lager øvingssetninger på korrekt norsk bokmål.',
    'Alle setninger MÅ være grammatisk korrekte, naturlige, og på riktig CEFR-nivå.',
    'Svar KUN med gyldig JSON. Ingen forklaring utenfor JSON. Aldri nynorsk.',
  ].join(' ')
  const user = [
    `Lag NØYAKTIG ${count} øvingssetninger på norsk bokmål for CEFR-nivå ${level}.`,
    `Grammatisk fokus: "${concept.label}" — ${concept.description}`,
    `VIKTIG: HVER setning MÅ eksplisitt bruke og teste «${concept.label}». Lag IKKE generelle setninger som ikke viser dette fokuset tydelig.`,
    ...(CONCEPT_HINTS[concept.id] ? [CONCEPT_HINTS[concept.id]] : []),
    'Bruk FORSKJELLIGE verb, subjekt og substantiv i hver setning — ikke gjenta samme verb. Skriv KOMPLETTE setninger (aldri "...").',
    `Typiske feil som setningen skal kunne avsløre: ${tags || 'n/a'}.`,
    `Nivåkrav: ${LEVEL_GUIDE[level]} Maks ${maxWords} ord per setning.`,
    type === 'fill-in-blank'
      ? 'Øvingstype: fill-in-blank. Bruk NØYAKTIG "___" (tre understreker) der svarordet skal stå, og oppgi svaret i "notes".'
      : 'Øvingstype: oversettelse. Hele setningen i "norwegian", engelsk oversettelse i "english".',
    '',
    `Returner JSON: {"sentences":[ ... ${count} objekter ... ]} der hvert objekt er:`,
    '{"norwegian":"...","english":"...","difficulty":1' + (type === 'fill-in-blank' ? ',"notes":"<svaret som fyller ___>"' : '') + '}',
    'difficulty er 1 (lett), 2 (middels) eller 3 (vanskelig) innenfor nivået.',
  ].join('\n')
  return { system, user }
}

interface CallResult { sentences: Cand[] }

async function ollamaChat(model: string, system: string, user: string, timeoutMs: number): Promise<string> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: ctrl.signal,
      // keep_alive holds the model in memory between calls (avoids slow reloads);
      // num_predict caps response length so a call can't run away.
      body: JSON.stringify({ model, stream: false, format: 'json', keep_alive: '15m', options: { temperature: 0.7, num_predict: 1200 }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`)
    return ((await res.json()) as { message?: { content?: string } }).message?.content ?? '{}'
  } finally { clearTimeout(t) }
}

// One-time warm-up: the first call cold-loads ~5GB into memory and can drop the
// socket. Pay that cost once up front with a long timeout.
async function warmUp(model: string): Promise<void> {
  process.stdout.write('Warming up model… ')
  try { await ollamaChat(model, 'Svar kort.', 'Returner {"sentences":[]}', 300000); console.log('ready.') }
  catch (e) { console.log(`warm-up failed (continuing): ${(e as Error).message}`) }
}

// OpenAI-compatible chat (Groq). JSON mode keeps the output parseable; the 70B
// model follows the schema reliably, unlike the local 8B.
async function groqChat(model: string, system: string, user: string, timeoutMs: number): Promise<string> {
  if (!GROQ_KEY) throw new Error('GROQ_API_KEY not set (.env.local)')
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${GROQ_KEY}` },
      signal: ctrl.signal,
      body: JSON.stringify({ model, temperature: 0.7, max_tokens: 1500, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`)
    return ((await res.json()) as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? '{}'
  } finally { clearTimeout(t) }
}

type ChatFn = (system: string, user: string, timeoutMs: number) => Promise<string>

async function callModel(chat: ChatFn, system: string, user: string): Promise<Cand[]> {
  let lastErr: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const parsed = JSON.parse(await chat(system, user, 180000)) as Partial<CallResult>
      return Array.isArray(parsed.sentences) ? parsed.sentences : []
    } catch (e) {
      lastErr = e as Error
      if (attempt < 3) { console.warn(`  (retry ${attempt}/3 after: ${lastErr.message})`); await new Promise((r) => setTimeout(r, 2000)) }
    }
  }
  throw lastErr ?? new Error('unknown')
}

function wc(s: string): number { return s.trim().replace(/_+/g, 'BLANK').split(/\s+/).filter(Boolean).length }

// Validates only what the MODEL controls: sentence quality, length, dedup, and
// (for fill-in-blank) the blank + answer. Metadata is assigned deterministically
// in main(), so it is correct by construction and not re-checked here.
function validate(c: Cand, level: string, type: string, seen: Set<string>): { ok: boolean; reasons: string[] } {
  const reasons: string[] = []
  const no = typeof c.norwegian === 'string' ? c.norwegian.trim() : ''
  const en = typeof c.english === 'string' ? c.english.trim() : ''
  if (!no) reasons.push('empty norwegian')
  if (!en) reasons.push('empty english')
  if (no) {
    const v = validateNorwegianOutput(no.replace(/_+/g, ''))
    if (!v.valid) reasons.push(`norwegian-gate: ${v.reason}`)
    if (wc(no) > LEVEL_MAX_WORDS[level]) reasons.push(`too long (${wc(no)} > ${LEVEL_MAX_WORDS[level]})`)
    if (/(\.\.\.|…)/.test(no)) reasons.push('incomplete sentence (ellipsis)')
    if (seen.has(norm(no))) reasons.push('duplicate of existing/staged sentence')
  }
  if (type === 'fill-in-blank') {
    if (!no.includes('___')) reasons.push('fill-in-blank without ___')
    if (typeof c.notes !== 'string' || !c.notes.trim()) reasons.push('fill-in-blank without notes(answer)')
  }
  return { ok: reasons.length === 0, reasons }
}

async function main() {
  const level = (arg('level') ?? 'A1').toUpperCase()
  const conceptId = arg('concept')
  const type = arg('type') ?? 'translation-to-norwegian'
  const count = parseInt(arg('count') ?? '10', 10)
  const provider = (arg('provider') ?? 'ollama').toLowerCase()
  const model = arg('model') ?? (provider === 'groq' ? GROQ_AUTHOR_MODEL : DEFAULT_MODEL)
  const chat: ChatFn = provider === 'groq'
    ? (s, u, ms) => groqChat(model, s, u, ms)
    : (s, u, ms) => ollamaChat(model, s, u, ms)
  const dry = FLAG('dry-run')
  if (!conceptId) { console.error('Missing --concept=<conceptId>'); process.exit(1) }
  if (provider === 'groq' && !GROQ_KEY) { console.error('provider=groq but GROQ_API_KEY not found in env/.env.local'); process.exit(1) }

  const concepts = loadConcepts()
  const concept = concepts.get(conceptId)
  if (!concept) { console.error(`Unknown concept: ${conceptId}`); process.exit(1) }
  if (concept.cefrLevel !== level) console.warn(`⚠️  concept ${conceptId} is ${concept.cefrLevel}, not ${level} — proceeding anyway`)

  const PER_CALL = 12
  if (dry) { const { system, user } = buildPrompt(concept, level, type, PER_CALL); console.log('=== SYSTEM ===\n' + system + '\n\n=== USER ===\n' + user); return }

  const seen = loadExistingNorwegian()
  const errorTags = concept.errorTags && concept.errorTags.length ? concept.errorTags : ['unspecified']
  console.log(`Generating up to ${count} ${type} for ${level}/${conceptId} via ${provider}:${model}…`)
  if (provider !== 'groq') await warmUp(model) // only the local model needs a cold-load warm-up

  const accepted: Record<string, unknown>[] = []
  let totalSeen = 0, rejected = 0, failedCalls = 0
  const MAX_ATTEMPTS = Math.max(6, Math.ceil(count / 4))
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && accepted.length < count; attempt++) {
    const { system, user } = buildPrompt(concept, level, type, PER_CALL)
    let cands: Cand[] = []
    try { cands = await callModel(chat, system, user) }
    catch (e) { failedCalls++; console.warn(`  attempt ${attempt} failed (skipping): ${(e as Error).message}`); continue }
    for (const c of cands) {
      if (accepted.length >= count) break
      totalSeen++
      const { ok, reasons } = validate(c, level, type, seen)
      if (!ok) { rejected++; console.log(`  ✗ ${JSON.stringify(c.norwegian)} — ${reasons.join('; ')}`); continue }
      const diff = [1, 2, 3].includes(c.difficulty as number) ? (c.difficulty as number) : 2
      const row = {
        id: randomUUID(), norwegian: (c.norwegian as string).trim(), english: (c.english as string).trim(),
        concept_ids: [conceptId], vocab_clusters: concept.vocabularyClusters ?? [],
        error_tags_detectable: errorTags, cefr_level: level,
        difficulty: diff, exercise_types: [type],
        ...(type === 'fill-in-blank' ? { notes: (c.notes as string).trim() } : {}),
      }
      // Concept-aware gate: rejects content that passes the shallow checks but
      // fails to demonstrate the concept, leaks Nynorsk, drifts off the A1 tense
      // scope, or carries generation artifacts. This is the moat-protection layer.
      const gated = gateRow(row)
      if (!gated.ok) { rejected++; console.log(`  ✗ ${JSON.stringify(c.norwegian)} — gate: ${gated.reasons.join('; ')}`); continue }
      seen.add(norm(c.norwegian as string))
      accepted.push(row)
    }
  }

  if (!existsSync(STAGE_DIR)) mkdirSync(STAGE_DIR, { recursive: true })
  const outPath = join(STAGE_DIR, `gen-${level}-${conceptId}.json`)
  const prev = existsSync(outPath) ? (JSON.parse(readFileSync(outPath, 'utf-8')) as unknown[]) : []
  writeFileSync(outPath, JSON.stringify([...prev, ...accepted], null, 2) + '\n', 'utf-8')
  console.log(`\nAccepted ${accepted.length} / ${totalSeen} candidates (rejected ${rejected}, failed calls ${failedCalls}). Wrote → ${outPath}`)
  console.log('Review staged sentences, then run `npm run audit:corpus` before seeding.')
}

main()
