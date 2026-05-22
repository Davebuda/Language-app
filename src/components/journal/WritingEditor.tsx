'use client'

import { useRef, useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { aiService } from '@/ai'
import type { WritingFeedback } from '@/ai/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useFingerprint } from '@/hooks/useFingerprint'
import { logError, aggregateErrorPatterns, updateConceptMastery } from '@/engine'
import { saveFingerprint } from '@/storage/indexeddb'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { errorTagToConceptId } from '@/lib/error-tag-to-concept'
import { getJournalPrompt, getDailyPrompt, sortErrorsByFocus } from '@/lib/journal-prompts'
import type { ErrorTag } from '@/types/taxonomy'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph

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

  function pushErrorsToFingerprint(result: WritingFeedback): void {
    if (!fingerprint || result.errors.length === 0) return
    const activeGraph = fingerprint.currentLevel === 'A2' ? a2Graph : a1Graph
    let updated = fingerprint
    for (const err of result.errors) {
      // P0.5-04: errorTagToConceptId always returns a concept-id (fallback to
      // noun-gender), so unmapped AI tags no longer silently drop the error.
      const conceptId = errorTagToConceptId(err.tag)
      const node = activeGraph.concepts.find((c) => c.id === conceptId)
      // logError first (only touches recentErrors/updatedAt), then mastery
      updated = logError(updated, {
        conceptId,
        errorTag: err.tag as ErrorTag,
        exerciseType: 'free-writing',
        wrong: err.wrong,
        correct: err.correct,
      })
      const updatedMastery = updateConceptMastery(
        updated.conceptMastery[conceptId],
        false,
        node?.minAttempts ?? 15,
        node?.minDays ?? 3,
      )
      updated = {
        ...updated,
        conceptMastery: { ...updated.conceptMastery, [conceptId]: { ...updatedMastery, conceptId } },
        updatedAt: new Date().toISOString(),
      }
    }
    const withPatterns = { ...updated, errorPatterns: aggregateErrorPatterns(updated) }
    setFingerprint(withPatterns)
    saveFingerprint(withPatterns).catch(console.warn)
  }

  async function handleAnalyze() {
    setIsAnalyzing(true)
    setFeedback(null)
    setShowCorrected(false)
    try {
      const result = await aiService.reviewWriting({ userText: text, prompt, level: fingerprint?.currentLevel ?? 'A1' })
      setFeedback(result)
      void persistSubmission(result)
      pushErrorsToFingerprint(result)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const correctionResult = feedback ? buildCorrectedText(text, feedback.errors) : null
  const correctedText = correctionResult?.text ?? ''
  const unappliedCount = correctionResult?.unapplied ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Daily prompt */}
      <div className="rounded-xl bg-nc-card border border-nc-border p-3">
        <div className="mb-1 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-widest text-nc-text-dim">
            {focusLabel ? 'Ukens fokus' : 'Dagens prompt'}
          </span>
          {focusLabel && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
              style={{
                background: 'var(--nc-green-tint)',
                border: '1px solid var(--nc-green-border)',
                color: 'var(--nc-green)',
              }}
              aria-label={`Ukens fokus: ${focusLabel}`}
            >
              {focusLabel}
            </span>
          )}
        </div>
        <p className="text-[13px] text-pretty text-nc-text-muted">{prompt}</p>
      </div>

      {/* Mode switcher — voice is default when available */}
      {hasSpeechAPI && (
        <div className="flex gap-2">
          {(['voice', 'text'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => { if (isListening) toggleListening(); setInputMode(mode) }}
              className="flex-1 rounded-full border py-2 text-[12px] font-bold transition-colors"
              style={{
                background: inputMode === mode ? '#111118' : '#fff',
                borderColor: inputMode === mode ? '#111118' : 'rgba(17,17,24,0.12)',
                color: inputMode === mode ? '#C8FF00' : 'rgba(17,17,24,0.55)',
              }}
            >
              {mode === 'voice' ? '🎙 Snakk' : '⌨️ Skriv'}
            </button>
          ))}
        </div>
      )}

      {/* Voice input mode */}
      {inputMode === 'voice' && hasSpeechAPI ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={toggleListening}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border py-8 transition-all active:scale-[0.98]"
            style={{
              background: isListening ? 'rgba(17,17,24,0.04)' : '#fff',
              borderColor: isListening ? 'rgba(17,17,24,0.20)' : 'rgba(17,17,24,0.10)',
            }}
          >
            <motion.div
              animate={isListening ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: isListening ? '#111118' : 'rgba(17,17,24,0.06)' }}
            >
              {isListening
                ? <MicOff size={22} color="#C8FF00" />
                : <Mic size={22} color="rgba(17,17,24,0.55)" />}
            </motion.div>
            <span className="text-[13px] font-bold" style={{ color: isListening ? '#111118' : 'rgba(17,17,24,0.45)' }}>
              {isListening ? 'Trykk for å stoppe' : 'Trykk for å snakke'}
            </span>
          </button>
          {text && (
            <div className="rounded-xl bg-nc-card border border-nc-border p-4 text-[15px] leading-relaxed text-nc-text">
              {text}
              <div className="mt-2 text-right text-[11px] text-nc-text-dim">{wordCount} ord</div>
            </div>
          )}
        </div>
      ) : (
        /* Text input mode */
        <div className="flex flex-col gap-1">
          <textarea
            className="w-full min-h-[180px] resize-none rounded-xl bg-nc-card border border-nc-border p-4 text-nc-text placeholder-nc-text-dim text-[15px] leading-relaxed focus:outline-none focus:border-nc-green/40 transition-colors"
            placeholder="Skriv på norsk her..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="text-right text-[11px] text-nc-text-dim">{wordCount} ord</div>
        </div>
      )}

      {/* Analyze button */}
      {canAnalyze && (
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="w-full rounded-xl bg-nc-green py-3 text-sm font-extrabold text-[#0d0d14] disabled:opacity-50 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Analyserer...
            </>
          ) : (
            'Analyser tekst'
          )}
        </button>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-3"
          >
            {/* Praise */}
            <div className="rounded-xl bg-nc-green/8 border border-nc-green/20 p-4">
              <p className="text-[13px] text-nc-text">🎉 {feedback.praise}</p>
            </div>

            {/* Errors — focus-tagged errors render first (silent stable sort, D4) */}
            {orderedErrors.length > 0 && (
              <div className="flex flex-col gap-2">
                {orderedErrors.map((err, i) => (
                  <div key={i} className="rounded-xl bg-nc-card border border-nc-border border-l-2 border-l-red-400/60 pl-4 pr-4 py-3">
                    <p className="text-[13px] text-nc-text">
                      <span className="line-through text-nc-text-muted">{err.wrong}</span>
                      {' → '}
                      <span className="text-nc-green font-semibold">{err.correct}</span>
                    </p>
                    <p className="mt-1 text-[12px] text-nc-text-muted">{err.briefWhy}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestion */}
            <div className="rounded-xl bg-nc-card border border-nc-border p-4">
              <p className="text-[13px] text-nc-text-muted">💡 {feedback.suggestion}</p>
            </div>

            {/* Show corrected toggle */}
            {feedback.errors.length > 0 && (
              <button
                onClick={() => setShowCorrected((v) => !v)}
                className="text-[12px] font-semibold text-nc-green underline underline-offset-2 text-left"
              >
                {showCorrected ? 'Skjul rettet versjon' : 'Se rettet versjon'}
              </button>
            )}

            {/* Corrected version */}
            <AnimatePresence>
              {showCorrected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl bg-nc-card border border-nc-green/20 p-4">
                    <div className="mb-1 text-[10px] uppercase tracking-widest text-nc-green/50">Rettet versjon</div>
                    <p className="text-[15px] leading-relaxed text-nc-green/90">{correctedText}</p>
                    {unappliedCount > 0 && (
                      <p className="mt-2 text-[11px] text-nc-text-dim">
                        Noen rettelser kunne ikke brukes automatisk — se tilbakemeldingen over.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

