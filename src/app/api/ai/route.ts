import { NextResponse } from 'next/server'
import {
  buildExplanationPrompt, buildConversationPrompt,
  buildWritingFeedbackPrompt, buildErrorDetectionPrompt,
  buildGenerationPrompt,
} from '@/ai/prompts'
import {
  validateNorwegianOutput, validateGenerated,
  difficultyTier, likelySyntheticCompound,
} from '@/ai/validate'
import { stripTutorScaffolding } from '@/lib/conversation-format'
import type {
  ExplainParams, ConversationMessage, TaggedError, GenerateParams,
} from '@/ai/types'
import type { CEFRLevel } from '@/types/fingerprint'
import type { ResolvedContent } from '@/types/content'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.1-8b-instant'
// Free-form conversation (Kari) is the most quality-sensitive Norwegian-prose
// path: an empirical bake-off (2026-06-26) showed llama-3.1-8b-instant produces
// non-native, error-prone Bokmål (wrong gender/pronoun, anglicisms, its own
// grammar slips), while llama-3.3-70b-versatile is near-native AND reliably
// flags real learner errors. Both are free-tier-eligible on Groq; 70B is only
// used here (low-volume conversation), not for the high-volume JSON generation
// path, to respect the free-tier budget. Override with CONVERSATION_MODEL.
const CONVERSATION_MODEL = process.env.CONVERSATION_MODEL ?? 'llama-3.3-70b-versatile'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT = 30
const WINDOW_MS = 60_000
let cleanupCounter = 0

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(ip) ?? []
  const recent = timestamps.filter(t => now - t < WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return false
  recent.push(now)
  rateLimitMap.set(ip, recent)
  if (++cleanupCounter % 100 === 0) {
    for (const [key, vals] of rateLimitMap) {
      const filtered = vals.filter(t => now - t < WINDOW_MS)
      if (filtered.length === 0) rateLimitMap.delete(key)
      else rateLimitMap.set(key, filtered)
    }
  }
  return true
}

async function groqComplete(
  system: string,
  messages: Array<{ role: string; content: string }>,
  maxTokens = 400,
  temperature = 0.7,
  jsonMode = false,
  model: string = GROQ_MODEL,
): Promise<string | null> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      max_tokens: maxTokens,
      temperature,
      // Groq honours OpenAI-compatible JSON mode; the generation prompts already
      // instruct "Output JSON only", which JSON mode requires.
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) return null
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  return data.choices?.[0]?.message?.content ?? null
}

function templateExplanation(params: ExplainParams): string {
  const byTag: Partial<Record<string, string>> = {
    'word-order': `You wrote "${params.wrong}". Norwegian uses the V2 rule — verb must be in position 2. Correct: "${params.correct}".`,
    'negation-placement': `You wrote "${params.wrong}". "Ikke" follows the finite verb in main clauses. Correct: "${params.correct}".`,
    'noun-gender': `You wrote "${params.wrong}". Norwegian nouns have three genders (en/ei/et). Correct: "${params.correct}".`,
    'verb-conjugation': `You wrote "${params.wrong}". Norwegian present tense adds -r to the stem. Correct: "${params.correct}".`,
    'modal-verb': `You wrote "${params.wrong}". Modals (kan, vil, skal, må) take a bare infinitive — no "å". Correct: "${params.correct}".`,
  }
  return byTag[params.errorTag] ?? `You wrote "${params.wrong}". The correct answer is "${params.correct}".`
}

async function handleExplain(params: ExplainParams) {
  const { system, user } = buildExplanationPrompt(params)
  const text = await groqComplete(system, [{ role: 'user', content: user }], 200)
  if (!text) return { text: templateExplanation(params), source: 'template' as const }
  return { text: text.trim(), source: 'ai' as const }
}

async function handleConversation(params: {
  messages: ConversationMessage[]
  level: CEFRLevel
  topic: string
  constraintEvalSuffix?: string
  focusConceptId?: string
}) {
  const fallback = (msgs: ConversationMessage[]) =>
    msgs.length === 0
      ? `Hei! La oss snakke om ${params.topic}. Hva tenker du på?`
      : 'Bra! Kan du fortelle mer?'

  const chatMessages = params.messages.map((m) => ({
    role: m.role === 'tutor' ? 'assistant' : 'user',
    content: m.content,
  }))
  const { system, messages } = buildConversationPrompt(
    chatMessages, params.level, params.topic, params.constraintEvalSuffix, params.focusConceptId,
  )
  // Temp 0.6 (was 0.85): the bake-off showed lower temperature gives markedly
  // more reliable grammar on this model while keeping conversational warmth.
  const raw = await groqComplete(system, messages, 300, 0.6, false, CONVERSATION_MODEL)
  if (!raw) return { tutorResponse: fallback(params.messages), source: 'template' as const }

  const correctionMatch = raw.match(/CORRECTION:(\{.*?\})/s)
  let correction: { original: string; corrected: string; errorTag: string; explanation: string } | undefined
  if (correctionMatch) {
    try {
      const c = JSON.parse(correctionMatch[1]) as { original: string; correct: string; tag: string; why: string }
      correction = { original: c.original, corrected: c.correct, errorTag: c.tag, explanation: c.why }
    } catch { /* ignore */ }
  }

  let constraintMet: boolean | undefined
  let constraintFeedback: string | undefined
  if (raw.includes('\nCONSTRAINT_MET')) constraintMet = true
  const missedMatch = raw.match(/\nCONSTRAINT_MISSED: (.+)/)
  if (missedMatch) { constraintMet = false; constraintFeedback = missedMatch[1]?.trim() }

  // Robust scaffolding strip — the model doesn't always emit the exact JSON shape
  // (e.g. " CORRECTION: None"), so split on the markers rather than match a rigid regex.
  // The CORRECTION JSON is still parsed from `raw` above when present.
  const tutorResponse = stripTutorScaffolding(raw)

  const validity = validateNorwegianOutput(tutorResponse, { minWords: 3 })
  if (!validity.valid) return { tutorResponse: fallback(params.messages), source: 'template' as const }

  return { tutorResponse, correction, constraintMet, constraintFeedback, source: 'ai' as const }
}

async function handleReview(params: { userText: string; level: CEFRLevel }) {
  const fallback = {
    errors: [] as TaggedError[],
    praise: 'Bra innsats! Fortsett å skrive på norsk.',
    suggestion: 'Fokuser på verbalplasseringen — V2-regelen gjelder i helsetninger.',
    source: 'template' as const,
  }

  const { system, user } = buildWritingFeedbackPrompt(params.userText, params.level)
  const raw = await groqComplete(system, [{ role: 'user', content: user }], 500)
  if (!raw) return fallback

  try {
    const parsed = JSON.parse(raw) as {
      errors?: Array<{ wrong: string; correct: string; tag: string; why: string }>
      praise?: string
      suggestion?: string
    }
    const safePraise = parsed.praise && validateNorwegianOutput(parsed.praise, { minWords: 3 }).valid
      ? parsed.praise : fallback.praise
    const safeSuggestion = parsed.suggestion && validateNorwegianOutput(parsed.suggestion, { minWords: 3 }).valid
      ? parsed.suggestion : fallback.suggestion
    const safeErrors = (parsed.errors ?? []).filter((e) =>
      validateNorwegianOutput(e.correct, { minWords: 2 }).valid
    )
    return {
      errors: safeErrors.map((e) => ({ tag: e.tag, wrong: e.wrong, correct: e.correct, briefWhy: e.why })),
      praise: safePraise,
      suggestion: safeSuggestion,
      source: 'ai' as const,
    }
  } catch {
    return fallback
  }
}

async function handleDetect(params: { text: string; level: CEFRLevel }) {
  const { system, user } = buildErrorDetectionPrompt(params.text, params.level)
  const raw = await groqComplete(system, [{ role: 'user', content: user }], 300)
  if (!raw) return { errors: [] }
  try {
    const parsed = JSON.parse(raw) as { errors?: Array<{ wrong: string; correct: string; tag: string; why: string }> }
    return {
      errors: (parsed.errors ?? []).map((e) => ({
        tag: e.tag, wrong: e.wrong, correct: e.correct, briefWhy: e.why,
      })),
    }
  } catch {
    return { errors: [] }
  }
}

// Server-side content generation — the Groq sibling of WebLLMService.generateContent
// (src/ai/webllm.ts). Mirrors that recipe exactly so the desktop and mobile paths
// produce identically-shaped, identically-validated ResolvedContent. Returns null on
// any failure so the caller's honest "Repetisjon" fallback fires (no silent
// substitution — see CLAUDE.md Rule 6). Capped at 2 attempts to respect the 30/min
// rate limiter and the Groq free-tier token budget.
async function handleGenerate(params: GenerateParams): Promise<ResolvedContent | null> {
  const { system, user } = buildGenerationPrompt(params)
  for (let attempt = 0; attempt < 2; attempt++) {
    const userPrompt = attempt > 0
      ? `${user}\n\nIMPORTANT: Use only short, common Norwegian words (under 15 characters each). No compound words.`
      : user
    const raw = await groqComplete(system, [{ role: 'user', content: userPrompt }], 400, 0.7, true)
    if (!raw) continue

    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { continue }

    const result = validateGenerated(parsed, params)
    if (!result.valid) continue
    const { content } = result

    // Same two guards as the desktop path: reject fabricated compounds, then the
    // Norwegian-validity gate (strip the fill-in-blank marker first so the
    // underscores don't trip the char check).
    if (likelySyntheticCompound(content.norwegian)) continue
    if (!validateNorwegianOutput(content.norwegian.replace(/___/g, ' ')).valid) continue

    return {
      id: crypto.randomUUID(),
      norwegian: content.norwegian,
      english: content.english,
      notes: content.notes,
      conceptIds: [params.conceptId],
      vocabularyClusters: [],
      errorTagsDetectable: params.recentErrors ?? [],
      cefrLevel: params.level,
      difficulty: difficultyTier(params.masteryScore),
      exerciseTypes: [params.exerciseType],
      audioUrl: undefined,
      scenarioId: content.scenarioId,
      source: 'generated',
      distractors: content.distractors,
    }
  }
  return null
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'For mange forespørsler. Prøv igjen om litt.' },
      { status: 429 },
    )
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  try {
    const body = await request.json() as { action: string; params: Record<string, unknown> }
    const { action, params } = body

    switch (action) {
      case 'ping':
        return NextResponse.json({ ok: true })
      case 'explain':
        return NextResponse.json(await handleExplain(params as unknown as ExplainParams))
      case 'conversation':
        return NextResponse.json(await handleConversation(params as unknown as Parameters<typeof handleConversation>[0]))
      case 'review':
        return NextResponse.json(await handleReview(params as unknown as { userText: string; level: CEFRLevel }))
      case 'detect':
        return NextResponse.json(await handleDetect(params as unknown as { text: string; level: CEFRLevel }))
      case 'generate':
        return NextResponse.json(await handleGenerate(params as unknown as GenerateParams))
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
