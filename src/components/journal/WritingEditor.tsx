'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { aiService } from '@/ai'
import type { WritingFeedback } from '@/ai/types'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { logError, aggregateErrorPatterns } from '@/engine'
import { saveFingerprint } from '@/storage/indexeddb'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import type { ErrorTag } from '@/types/taxonomy'

// Best-effort: map writing feedback error tags to concept IDs
const WRITING_TAG_TO_CONCEPT: Partial<Record<string, string>> = {
  'word-order': 'v2-word-order',
  'noun-gender': 'noun-gender',
  'article-use': 'indefinite-articles',
  'verb-conjugation': 'present-tense-verbs',
  'verb-tense': 'past-tense-regular',
  'modal-verb': 'modal-verbs',
  'adjective-agreement': 'adjective-agreement',
  'pronoun-choice': 'personal-pronouns',
  'preposition': 'prepositions-place',
  'negation-placement': 'negation-placement',
  'spelling': 'noun-gender',
}

const PROMPTS = [
  'Beskriv din ideelle norske helg',
  'Hva liker du best med vinteren?',
  'Skriv om et sted du vil besøke i Norge',
  'Beskriv deg selv på norsk',
  'Hva er din favorittmat, og hvorfor?',
]

function getDailyPrompt(): string {
  return PROMPTS[new Date().getDay() % PROMPTS.length]
}

function buildCorrectedText(original: string, errors: WritingFeedback['errors']): string {
  let result = original
  for (const err of errors) {
    result = result.replace(err.wrong, err.correct)
  }
  return result
}

export function WritingEditor() {
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showCorrected, setShowCorrected] = useState(false)

  const { user } = useAuth()
  const { fingerprint, setFingerprint } = useFingerprintStore()

  const prompt = useMemo(() => getDailyPrompt(), [])
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const canAnalyze = wordCount >= 5

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
    let updated = fingerprint
    for (const err of result.errors) {
      const conceptId = WRITING_TAG_TO_CONCEPT[err.tag]
      if (!conceptId) continue
      updated = logError(updated, {
        conceptId,
        errorTag: err.tag as ErrorTag,
        exerciseType: 'free-writing',
        wrong: err.wrong,
        correct: err.correct,
      })
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

  const correctedText = feedback ? buildCorrectedText(text, feedback.errors) : ''

  return (
    <div className="flex flex-col gap-4">
      {/* Daily prompt */}
      <div className="rounded-xl bg-nc-card border border-nc-border p-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-nc-text-dim">
          Dagens prompt
        </div>
        <p className="text-[13px] text-nc-text-muted">{prompt}</p>
      </div>

      {/* Textarea */}
      <div className="flex flex-col gap-1">
        <textarea
          className="w-full min-h-[180px] resize-none rounded-xl bg-nc-card border border-nc-border p-4 text-nc-text placeholder-nc-text-dim text-[15px] leading-relaxed focus:outline-none focus:border-nc-green/40 transition-colors"
          placeholder="Skriv på norsk her..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="text-right text-[11px] text-nc-text-dim">{wordCount} ord</div>
      </div>

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

            {/* Errors */}
            {feedback.errors.length > 0 && (
              <div className="flex flex-col gap-2">
                {feedback.errors.map((err, i) => (
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

