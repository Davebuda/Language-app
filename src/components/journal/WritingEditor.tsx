'use client'

import { useRef, useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { aiService } from '@/ai'
import type { WritingFeedback } from '@/ai/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useFingerprint } from '@/hooks/useFingerprint'
import { saveFingerprint } from '@/storage/indexeddb'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { errorTagToConceptId } from '@/lib/error-tag-to-concept'
import { repairBatchFromSurface, recordProductionFromSurface } from '@/engine/repair-from-surface'
import { getJournalPrompt, getDailyPrompt, sortErrorsByFocus } from '@/lib/journal-prompts'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { markLaneDone } from '@/lib/lane-completion'

function buildCorrectedText(
  original: string,
  errors: WritingFeedback['errors'],
): { text: string; unapplied: number } {
  let result = original
  let unapplied = 0
  for (const err of errors) {
    if (!err.wrong || !err.correct) continue
    // Case-insensitive: the AI often lowercases excerpts (e.g. "jeg" when the
    // original has "Jeg"). String.replace is case-sensitive and would silently miss.
    const escaped = err.wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(escaped, 'i')
    const next = result.replace(regex, err.correct)
    if (next === result) {
      unapplied++
      console.warn('[journal] correction could not be applied:', err.wrong, '→', err.correct)
    }
    result = next
  }
  return { text: result, unapplied }
}

// ── Speech recognition helpers ────────────────────────────────────────
interface SpeechRecA { onresult: ((e: { results: { length: number; [i: number]: { [i: number]: { transcript: string }; isFinal: boolean } } }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; lang: string; continuous: boolean; interimResults: boolean; start(): void; stop(): void }
function getSpeechCtor(): (new () => SpeechRecA) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { SpeechRecognition?: new () => SpeechRecA; webkitSpeechRecognition?: new () => SpeechRecA }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function WritingEditor() {
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showCorrected, setShowCorrected] = useState(false)
  // Voice mode: 'text' is the stable SSR/first-paint default; user opts into voice via the toggle.
  const [hasSpeechAPI, setHasSpeechAPI] = useState(false)
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('text')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecA | null>(null)
  // Last text we already wrote a brick for — guards against a second "Analyser"
  // press on unchanged text double-crediting production (honesty: one real
  // production = one brick).
  const lastCommittedTextRef = useRef<string | null>(null)
  useEffect(() => {
    const ctor = getSpeechCtor()
    if (ctor) {
      setHasSpeechAPI(true)
      // Do NOT auto-switch inputMode to 'voice' — that causes an SSR-vs-CSR
      // primary-affordance flip (textarea ↔ mic button) on every page load.
      // The Snakk/Skriv toggle appears below; users opt into voice via click.
    }
  }, [])

  const { user } = useAuth()
  // Side-effect mount: triggers IndexedDB → Zustand store hydration so a direct
  // /journal visit (without going via /dashboard first) sees the user's
  // fingerprint. Pre-existing journal-hydration gap surfaced during Phase 3
  // SMOKE — without this, weeklyFocus would never reach getJournalPrompt.
  useFingerprint()
  const { fingerprint, setFingerprint } = useFingerprintStore()

  // Stream 5.5 Phase 3: focus-biased prompt. Falls back to a daily rotation
  // when no weekly focus exists OR the focus concept has no Norwegian label
  // (silent English-in-Norwegian prevention). Pre-hydration (fingerprint null)
  // also falls through to the daily rotation so guests still see real content.
  const journalPrompt = useMemo(
    () =>
      fingerprint
        ? getJournalPrompt(fingerprint)
        : { prompt: getDailyPrompt(), focusConceptId: null, focusLabel: null },
    [fingerprint],
  )
  const prompt = journalPrompt.prompt
  const focusLabel = journalPrompt.focusLabel
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const canAnalyze = wordCount >= 5

  // Stream 5.5 Phase 3 D4: silent sort focus errors to the top of the
  // rendered list. The fingerprint write loop is unchanged — mastery is
  // commutative across error order — but readers see focus errors first.
  const focusConceptIds = useMemo(
    () => new Set(fingerprint?.weeklyFocus ?? []),
    [fingerprint?.weeklyFocus],
  )
  const orderedErrors = useMemo(
    () =>
      feedback
        ? sortErrorsByFocus(feedback.errors, (err) =>
            focusConceptIds.has(errorTagToConceptId(err.tag)),
          )
        : [],
    [feedback, focusConceptIds],
  )

  function toggleListening() {
    const Ctor = getSpeechCtor()
    if (!Ctor) return
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const rec = new Ctor()
    recognitionRef.current = rec
    rec.lang = 'no-NO'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => {
      const parts: string[] = []
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript)
      setText(parts.join(' '))
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    rec.start()
    setIsListening(true)
  }

  async function persistSubmission(result: WritingFeedback): Promise<void> {
    if (!user) return
    try {
      const supabase = createClient()
      await supabase.from('writing_submissions').insert({
        user_id: user.id,
        content: text,
        prompt_text: prompt,
        feedback: result as unknown as Record<string, unknown>,
        error_tags: result.errors.map((e) => e.tag),
        error_count: result.errors.length,
        word_count: wordCount,
        cefr_level: fingerprint?.currentLevel ?? 'A1',
      })
    } catch { /* silent */ }
  }

  // Fold a journal submission into the fingerprint with BOTH directions of the
  // engine: errors → repair (negative mastery), and correct FREE production →
  // one full mastery brick. Previously this only handled errors and returned
  // early on a clean entry, so a flawless journal post — the most productive act
  // in the app — wrote nothing to mastery (Rule 8 failure). Now a clean entry
  // earns a real production brick on the prompt's focus concept.
  function commitJournalToFingerprint(result: WritingFeedback): void {
    if (!fingerprint) return
    // Re-submit guard: a clean re-submit is now a real write (it lays a brick),
    // so skip it if the text is unchanged since the last committed entry.
    if (lastCommittedTextRef.current === text.trim()) return
    const activeGraph = getGraphForLevel(fingerprint.currentLevel)

    // Concepts the learner got WRONG in this entry — applied as repairs AND used
    // as the double-count guard below.
    const errorConceptIds = new Set(
      result.errors.map((err) => errorTagToConceptId(err.tag)),
    )

    let updated = fingerprint

    // 1. Errors → repair (negative mastery), only when present.
    if (result.errors.length > 0) {
      const inputs = result.errors.map((err) => ({
        surfaceKind: 'journal' as const,
        errorTag: err.tag,
        conceptId: errorTagToConceptId(err.tag),
        wrong: err.wrong,
        correct: err.correct,
      }))
      updated = repairBatchFromSurface(updated, inputs, activeGraph)
    }

    // 2. Correct FREE production → one full mastery brick on the prompt's focus
    //    concept. Guards:
    //    - Only when the prompt resolved a focus concept; otherwise lay NO brick
    //      (honesty over a fabricated brick — never credit a guessed concept).
    //    - Double-count guard: skip if the SAME submission flagged that concept
    //      as wrong (don't both penalize and reward one concept in one entry).
    //    Journal is free production → guided:false (full step, advances SRS).
    //    (recordProductionFromSurface also lays today's production brick internally.)
    const creditConceptId = journalPrompt.focusConceptId
    if (creditConceptId && !errorConceptIds.has(creditConceptId)) {
      updated = recordProductionFromSurface(
        updated,
        { conceptId: creditConceptId, guided: false },
        activeGraph,
      )
    }

    if (updated === fingerprint) return // nothing changed — no write
    lastCommittedTextRef.current = text.trim()
    setFingerprint(updated)
    saveFingerprint(updated).catch(console.warn)
  }

  async function handleAnalyze() {
    setIsAnalyzing(true)
    setFeedback(null)
    setShowCorrected(false)
    try {
      const result = await aiService.reviewWriting({ userText: text, prompt, level: fingerprint?.currentLevel ?? 'A1' })
      setFeedback(result)
      void persistSubmission(result)
      commitJournalToFingerprint(result)
      markLaneDone('journal')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const correctionResult = feedback ? buildCorrectedText(text, feedback.errors) : null
  const correctedText = correctionResult?.text ?? ''
  const unappliedCount = correctionResult?.unapplied ?? 0

  return (
    <div className="flex flex-col gap-[6px]">

      {/* ── Prompt — cream panel ── */}
      <div className="rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)] px-3 py-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">
            {focusLabel ? 'Ukens fokus' : 'Dagens prompt'}
          </span>
          {focusLabel ? (
            <span
              className="rounded-full border border-[rgba(200,255,32,0.28)] bg-[rgba(200,255,32,0.12)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5A8A00]"
              aria-label={`Ukens fokus: ${focusLabel}`}
            >
              {focusLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-[0.82rem] text-pretty leading-[1.5] text-[var(--nc-cream-muted)]">{prompt}</p>
      </div>

      {/* ── Input mode toggle (voice / text) — dark card ── */}
      {hasSpeechAPI ? (
        <div className="grid grid-cols-2 overflow-hidden rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)]">
          {(['voice', 'text'] as const).map((mode, i) => {
            const isActive = inputMode === mode
            return (
              <button
                key={mode}
                onClick={() => { if (isListening) toggleListening(); setInputMode(mode) }}
                aria-pressed={isActive}
                className={`relative py-2.5 text-[10px] font-bold uppercase tracking-[0.10em] transition-colors${i === 0 ? '' : ' border-l border-[var(--nc-border)]'}`}
                style={{
                  color: isActive ? 'var(--nc-signal)' : 'var(--nc-text-dim)',
                  background: isActive ? 'rgba(200,255,32,0.06)' : 'transparent',
                }}
              >
                {mode === 'voice' ? 'Snakk' : 'Skriv'}
                {isActive ? (
                  <span className="absolute bottom-0 left-0 h-[2px] w-full bg-[var(--nc-signal)]" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}

      {/* ── Voice input mode — dark card with mic orb ── */}
      {inputMode === 'voice' && hasSpeechAPI ? (
        <div className="flex flex-col gap-[6px]">
          <button
            onClick={toggleListening}
            aria-label={isListening ? 'Stopp opptak' : 'Start opptak'}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border py-8 transition-all active:scale-[0.98]"
            style={{
              background: 'var(--nc-card)',
              borderColor: isListening ? 'var(--nc-signal-border)' : 'var(--nc-border)',
            }}
          >
            <motion.div
              animate={isListening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 0.15, repeat: isListening ? Infinity : 0 }}
              className="flex size-14 items-center justify-center rounded-full"
              style={{
                background: isListening ? 'var(--nc-signal-tint)' : 'rgba(255,255,255,0.06)',
              }}
            >
              {isListening
                ? <MicOff size={22} color="var(--nc-signal)" aria-hidden="true" />
                : <Mic size={22} color="var(--nc-text-muted)" aria-hidden="true" />}
            </motion.div>
            <span className="text-[11px] font-bold uppercase tracking-[0.10em]"
              style={{ color: isListening ? 'var(--nc-signal)' : 'var(--nc-text-dim)' }}
            >
              {isListening ? 'Trykk for å stoppe' : 'Trykk for å snakke'}
            </span>
          </button>

          {text ? (
            <div className="rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)] px-3 py-3 text-[14px] leading-relaxed text-[var(--nc-cream-text)]">
              {text}
              <div className="mt-2 text-right text-[10px] tabular-nums text-[var(--nc-cream-dim)]">{wordCount} ord</div>
            </div>
          ) : null}
        </div>
      ) : (
        /* ── Text input mode — cream writing surface ── */
        <div className="flex flex-col gap-1">
          <div className="rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)] overflow-hidden">
            <textarea
              className="w-full min-h-[180px] resize-none bg-transparent px-3 py-3 text-[14px] leading-relaxed text-[var(--nc-cream-text)] placeholder:text-[var(--nc-cream-dim)] focus:outline-none"
              placeholder="Skriv på norsk her..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Skriv norsk tekst"
            />
            <div className="flex items-center justify-end border-t border-[rgba(17,21,24,0.06)] px-3 py-1.5">
              <span className="text-[10px] tabular-nums text-[var(--nc-cream-dim)]">{wordCount} ord</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Analyze button — lime CTA ── */}
      {canAnalyze ? (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          aria-label="Analyser tekst"
          className="nc-button-primary w-full rounded-lg py-3 text-[0.82rem] font-extrabold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyserer...
            </>
          ) : (
            'Analyser tekst'
          )}
        </button>
      ) : null}

      {/* ── Feedback block ── */}
      <AnimatePresence>
        {feedback ? (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-[6px]"
          >
            {/* Praise — cream panel */}
            <div className="rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)] px-3 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Tilbakemelding</div>
              <p className="mt-1 text-[0.82rem] leading-[1.5] text-[var(--nc-cream-text)]">{feedback.praise}</p>
            </div>

            {/* Errors — dark cards with red left accent */}
            {orderedErrors.length > 0 ? (
              <div className="flex flex-col gap-[6px]">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)] px-1">
                  {orderedErrors.length} {orderedErrors.length === 1 ? 'rettelse' : 'rettelser'}
                </div>
                {orderedErrors.map((err, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] border-l-2 pl-3 pr-3 py-2.5"
                    style={{ borderLeftColor: 'rgba(255,106,85,0.55)' }}
                  >
                    <p className="text-[0.82rem] text-[var(--nc-text)]">
                      <span className="line-through text-[var(--nc-text-dim)]">{err.wrong}</span>
                      {' → '}
                      <span className="font-semibold text-[var(--nc-signal)]">{err.correct}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--nc-text-muted)]">{err.briefWhy}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Suggestion — dark card */}
            <div className="rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-3 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Forslag</div>
              <p className="mt-1 text-[0.82rem] leading-[1.5] text-[var(--nc-text-muted)]">{feedback.suggestion}</p>
            </div>

            {/* Show corrected toggle */}
            {feedback.errors.length > 0 ? (
              <button
                onClick={() => setShowCorrected((v) => !v)}
                className="text-[11px] font-semibold text-left px-1"
                style={{ color: 'var(--nc-signal)' }}
                aria-expanded={showCorrected}
              >
                {showCorrected ? 'Skjul rettet versjon' : 'Se rettet versjon'}
              </button>
            ) : null}

            {/* Corrected version — cream panel */}
            <AnimatePresence>
              {showCorrected ? (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-lg bg-[var(--nc-cream)] border border-[rgba(200,255,32,0.22)] px-3 py-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#5A8A00]">Rettet versjon</div>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--nc-cream-text)]">{correctedText}</p>
                    {unappliedCount > 0 ? (
                      <p className="mt-2 text-[10px] text-[var(--nc-cream-dim)]">
                        Noen rettelser kunne ikke brukes automatisk — se tilbakemeldingen over.
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
