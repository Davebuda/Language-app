'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, X, MessageSquare } from 'lucide-react'
import { aiService } from '@/ai'
import type { ConversationMessage, ConversationTurnResult } from '@/ai/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { errorTagToConceptId } from '@/lib/error-tag-to-concept'
import { repairFromSurface, recordSpeakingProductionToFingerprint, type RepairInput } from '@/engine/repair-from-surface'
import { saveFingerprint } from '@/storage/indexeddb'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { emitEvent } from '@/lib/events'
import { selectConstraint, buildConstraintEvalPrompt } from '@/lib/constraints'
import type { ResponseConstraint } from '@/lib/constraints'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { markLaneDone } from '@/lib/lane-completion'
import { confirmedRepair } from '@/lib/gender-correction-gate'
import { logExerciseResult } from '@/lib/logEvents'
import type { ExerciseResult } from '@/types/session'
import type { ErrorTag } from '@/types/taxonomy'
import { SavableWord } from '@/components/shared/SavableWord'

type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2'

interface SpeechRecResult {
  readonly isFinal: boolean
  readonly length: number
  [index: number]: { transcript: string }
}
interface SpeechRecEvent {
  readonly results: { length: number; [index: number]: SpeechRecResult }
  readonly resultIndex: number
}
interface SpeechRec {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
  start(): void
  stop(): void
}
type SpeechRecCtor = new () => SpeechRec

const TOPICS = [
  { id: 'daily-routine', label: 'Daglig rutine', desc: 'Morgen, kvelder, vaner' },
  { id: 'food', label: 'Mat og drikke', desc: 'Lage mat, restaurant, favoritter' },
  { id: 'family', label: 'Familie', desc: 'Familiemedlemmer, hjemmeliv' },
  { id: 'norway', label: 'Norge', desc: 'Natur, byer, kultur' },
  { id: 'hobbies', label: 'Fritid', desc: 'Sport, musikk, interesser' },
  { id: 'work', label: 'Jobb', desc: 'Arbeid, kolleger, drømmejobb' },
] as const

const LEVELS: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2']

function getSpeechRecognitionCtor(): SpeechRecCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function speakNorwegian(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  const norVoice = voices.find((v) => v.lang.startsWith('nb') || v.lang.startsWith('nn'))
  if (norVoice) utter.voice = norVoice
  utter.lang = 'nb-NO'
  utter.rate = 0.9
  window.speechSynthesis.speak(utter)
}

interface DisplayMessage {
  role: 'user' | 'tutor'
  content: string
  correction?: ConversationTurnResult['correction']
}

export default function ConversationPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<'setup' | 'chat' | 'summary'>('setup')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const fpStore = useFingerprintStore.getState().fingerprint
  const [level, setLevel] = useState<CEFRLevel>(fpStore?.currentLevel ?? 'A1')
  const [userOverrodeLevel, setUserOverrodeLevel] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  // Actual source of Kari's responses. Conversation routes through the server path
  // (Groq when reachable, else template) — NEVER the local 1B — so the badge reflects
  // this per-surface source, not the global webllm mode. 'ai' = Groq (Sky), 'template' = Maler.
  const [convSource, setConvSource] = useState<'ai' | 'template' | null>(null)
  const [inputText, setInputText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<SpeechRec | null>(null)
  const hasSpeechAPI = typeof window !== 'undefined' && !!getSpeechRecognitionCtor()

  const { user } = useAuth()
  const { fingerprint, setFingerprint } = useFingerprintStore()
  const dbSessionIdRef = useRef<string | null>(null)
  const turnIndexRef = useRef(0)
  const errorCountRef = useRef(0)
  const sessionStartRef = useRef<number>(0)
  const summaryTurnCountRef = useRef(0)
  const summaryErrorCountRef = useRef(0)
  const summaryTopicRef = useRef<string>('')
  const micStartRef = useRef<number>(0)
  // Accumulates only the speaking minutes actually written this session (≥0.05 gate),
  // so the end-summary confirmation is gated on the real fingerprint write (Rule 8).
  const speakingMinutesRef = useRef(0)
  const summarySpeakingMinutesRef = useRef(0)
  const [activeConstraint, setActiveConstraint] = useState<ResponseConstraint | null>(null)
  const [constraintResult, setConstraintResult] = useState<{ met: boolean; feedback?: string } | null>(null)

  useEffect(() => {
    if (fingerprint?.currentLevel && !userOverrodeLevel) {
      setLevel(fingerprint.currentLevel)
    }
  }, [fingerprint?.currentLevel, userOverrodeLevel])

  async function persistSessionStart(topic: string, lvl: CEFRLevel): Promise<void> {
    if (!user) return
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('conversation_sessions')
        .insert({ user_id: user.id, topic, cefr_level: lvl, mode: 'free' })
        .select('id')
        .single()
      if (!error && data) {
        dbSessionIdRef.current = data.id
        emitEvent({ eventType: 'session_started', mode: 'conversation', sessionId: data.id, payload: { topic, level: lvl } })
      }
    } catch {
      // silent
    }
  }

  async function persistTurn(role: 'user' | 'tutor', content: string, correction?: ConversationTurnResult['correction']): Promise<void> {
    // Count every turn for the in-session summary regardless of auth. This counter was
    // previously incremented only inside the auth-gated insert below, so guests (the
    // default mode) always saw "0 Utvekslinger" in the end summary. The DB row reuses it.
    const turnIndex = turnIndexRef.current++
    if (!user || !dbSessionIdRef.current) return
    try {
      const supabase = createClient()
      await supabase.from('conversation_turns').insert({
        session_id: dbSessionIdRef.current,
        role,
        content,
        corrected_content: correction ? correction.corrected : null,
        error_tags: correction ? [correction.errorTag] : [],
        concept_ids: correction ? [errorTagToConceptId(correction.errorTag)] : [],
        turn_index: turnIndex,
      })
    } catch {
      // silent
    }
  }

  async function persistSessionEnd(): Promise<void> {
    if (!user || !dbSessionIdRef.current) return
    try {
      const supabase = createClient()
      await supabase.from('conversation_sessions').update({
        ended_at: new Date().toISOString(),
        duration_seconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
        turn_count: turnIndexRef.current,
        error_count: errorCountRef.current,
      }).eq('id', dbSessionIdRef.current)
    } catch {
      // silent
    }
  }

  function logConversationError(correction: NonNullable<ConversationTurnResult['correction']>, input: RepairInput): void {
    const fp = useFingerprintStore.getState().fingerprint
    if (!fp) return
    // `input` is the verdict of the single shared gate (confirmedRepair) computed at the
    // call site — a verifier-confirmed noun-gender or verb-conjugation correction. No
    // second, divergent gate here.
    const activeGraph = getGraphForLevel(fp.currentLevel ?? 'A1')
    const repaired = repairFromSurface(fp, input, activeGraph)
    setFingerprint(repaired)
    saveFingerprint(repaired).catch(console.warn)
    errorCountRef.current++
    if (user?.id) {
      const errResult: ExerciseResult = {
        sessionId: dbSessionIdRef.current ?? 'conversation',
        itemId: `conversation-correction-${Date.now()}`,
        correct: false,
        userAnswer: correction.original,
        correctAnswer: correction.corrected,
        timeTakenSeconds: 0,
        conceptId: errorTagToConceptId(correction.errorTag),
        errorTag: correction.errorTag as ErrorTag,
      }
      logExerciseResult(user.id, errResult)
    }
  }

  // P0 (vision audit 2026-06-26): the conversation "constraint" challenge verdict is the
  // LLM's UNVERIFIED self-report (CONSTRAINT_MET/MISSED, parsed from raw model text). It used
  // to be written straight to conceptMastery here — bypassing the confirmedRepair gate, on
  // exactly the classes (v2-word-order, adjective-agreement, negation, modal, preterite) the
  // correction path deliberately keeps show-don't-grade. That violated the load-bearing rule
  // "no unverified AI output moves mastery", silently injecting phantom weaknesses into the
  // diagnosis moat. The constraint is now SHOW-DON'T-GRADE: its feedback is displayed in the
  // banner (setConstraintResult below) but it never touches the fingerprint. Re-arm a mastery
  // write only behind a deterministic verifier (like confirmedRepair), never the raw verdict.

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isThinking])

  // Conversation grammar corrections are gated through the deterministic gender verifier
  // (Lever 3, 2026-06-08). The Groq 8B produced wrong-but-VALID corrections (live: "en jobb"
  // → "et jobb"; jobb is masculine) that `validateNorwegianOutput` cannot catch; only a
  // lexicon-CONFIRMED noun-gender correction is now shown, persisted, and written to the
  // fingerprint. Every other AI-claimed correction class stays suppressed — we never assert
  // an unverifiable correction as truth. See verifyGenderCorrection.

  const addTutorMessage = useCallback(async (history: ConversationMessage[], isUserTurn = true) => {
    setIsThinking(true)
    try {
      const constraintSuffix = (isUserTurn && activeConstraint && !constraintResult)
        ? buildConstraintEvalPrompt(activeConstraint)
        : undefined

      const topicLabel = TOPICS.find((t) => t.id === selectedTopic)?.label ?? 'daglig rutine'
      const result = await aiService.conversationTurn(history, level, topicLabel, constraintSuffix)
      setConvSource(result.source)
      // Gate corrections through the deterministic verifiers: only a lexicon/paradigm-
      // confirmed correction is shown / persisted / written; everything else is suppressed
      // (we never assert an unverifiable correction as truth). Re-tag to the verified class
      // so the write is honest. noun-gender (Lever 3) and verb-conjugation (p4 Lever 2) are
      // armed; every other AI-claimed class stays show-don't-grade until it has its own check.
      const c = result.correction
      const learnerUtterance = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''
      // ONE gate decides everything: the deterministic verifier confirms the class
      // (noun-gender or verb-conjugation) or returns null. Its verdict drives both the
      // displayed correction tag AND the mastery write below — no second, divergent gate.
      const verifiedRepair = c
        ? confirmedRepair({ original: c.original, corrected: c.corrected, context: learnerUtterance }, 'conversation')
        : null
      const correction = c && verifiedRepair ? { ...c, errorTag: verifiedRepair.errorTag } : undefined
      setMessages((prev) => [...prev, {
        role: 'tutor',
        content: result.tutorResponse,
        correction,
      }])
      speakNorwegian(result.tutorResponse)
      void persistTurn('tutor', result.tutorResponse, correction)
      if (correction && verifiedRepair) logConversationError(correction, verifiedRepair)

      if (result.constraintMet !== undefined && activeConstraint && !constraintResult) {
        // Show-don't-grade: display the challenge feedback, but never move mastery from the
        // LLM's unverified verdict (see the note on recordConstraintResult's removal above).
        setConstraintResult({ met: result.constraintMet, feedback: result.constraintFeedback })
      }
    } finally {
      setIsThinking(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, selectedTopic, user, fingerprint, activeConstraint, constraintResult])

  async function startConversation() {
    setPhase('chat')
    setMessages([])
    setConstraintResult(null)
    setActiveConstraint(null)
    turnIndexRef.current = 0
    errorCountRef.current = 0
    sessionStartRef.current = Date.now()

    if (fingerprint) {
      const graph = getGraphForLevel(fingerprint.currentLevel ?? 'A1')
      const constraint = selectConstraint(fingerprint, graph)
      setActiveConstraint(constraint)
    }

    void persistSessionStart(selectedTopic ?? 'daily-routine', level)
    await addTutorMessage([], false)
  }

  // Typed-turn production estimate (mirrors the in-økt Snakk 0.1 min/utterance convention)
  // when there's no mic-elapsed time to measure.
  const TYPED_MINUTES_PER_TURN = 0.1

  async function handleSend(text: string, fromMic = false) {
    const trimmed = text.trim()
    if (!trimmed) return
    setInputText('')
    const nextMessages = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(nextMessages)
    void persistTurn('user', trimmed)
    // P1 (vision audit 2026-06-26): a completed Kari turn IS production — lay a guided
    // brick so the wall rewards it, and credit minutes. The mic path already credited
    // real elapsed minutes + a brick (creditSpeakingProduction below), so only TYPED
    // turns get the estimate-minutes brick here (no double-count). Completion-gated
    // self-report — never moves mastery or logs an error (Rule 8).
    if (!fromMic) creditSpeakingProduction(TYPED_MINUTES_PER_TURN)
    await addTutorMessage(nextMessages.map((m) => ({ role: m.role, content: m.content })))
  }

  // Credit spoken/typed production: speaking-minutes + a guided production brick.
  function creditSpeakingProduction(minutes: number): void {
    const fp = useFingerprintStore.getState().fingerprint
    if (!fp) return
    const updated = recordSpeakingProductionToFingerprint(fp, { minutes, produced: true })
    setFingerprint(updated)
    saveFingerprint(updated).catch(console.warn)
    speakingMinutesRef.current += minutes
  }

  function toggleListening() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    micStartRef.current = Date.now()
    const rec = new Ctor()
    recognitionRef.current = rec
    rec.lang = 'no-NO'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e: SpeechRecEvent) => {
      const parts: string[] = []
      for (let i = 0; i < e.results.length; i++) parts.push(e.results[i][0].transcript)
      const transcript = parts.join('')
      setInputText(transcript)
      if (e.results[e.results.length - 1].isFinal) {
        const micMinutes = (Date.now() - micStartRef.current) / 60_000
        if (micMinutes >= 0.05) creditSpeakingProduction(micMinutes)
        setIsListening(false)
        void handleSend(transcript, true)
      }
    }
    rec.onend = () => setIsListening(false)
    rec.onerror = () => setIsListening(false)
    rec.start()
    setIsListening(true)
  }

  const selectedTopicMeta = TOPICS.find((t) => t.id === selectedTopic) ?? null
  const summaryTopicMeta = TOPICS.find((t) => t.id === summaryTopicRef.current) ?? null

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <main className="nc-mobile-shell relative z-10 flex w-full flex-1 flex-col overflow-hidden px-1.5 pb-28 pt-3">
        <AnimatePresence mode="wait">

          {/* ── SETUP PHASE ── */}
          {phase === 'setup' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-1 flex-col gap-[6px]"
            >
              {/* Lime hero panel */}
              <div className="nc-signal-panel p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Samtale</div>
                    <h1 className="mt-1 text-balance text-[1.25rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--nc-signal-fg)]">
                      Snakk med Kari
                    </h1>
                    <p className="mt-1 text-[0.75rem] leading-[1.4] text-[rgba(10,18,6,0.60)]">
                      Velg tema · sett nivå · få rettelser
                    </p>
                  </div>
                  <span className="rounded-[0.3rem] bg-[rgba(10,18,6,0.90)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.10em] text-white">
                    Live
                  </span>
                </div>

                {/* Compact feature strip */}
                <div className="mt-2.5 flex items-center gap-1.5">
                  {['Rettelser', 'Fokus-biased', level].map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[rgba(10,18,6,0.14)] bg-[rgba(10,18,6,0.07)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[rgba(10,18,6,0.58)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {/* Selected topic preview — dark inset */}
                <div className="mt-2 rounded-[0.4rem] bg-[rgba(6,16,23,0.94)] px-2.5 py-2 text-white">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      {selectedTopicMeta ? 'Valgt tema' : 'Velg tema nedenfor'}
                    </div>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white/60 tabular-nums">
                      {level}
                    </span>
                  </div>
                  {selectedTopicMeta ? (
                    <div className="mt-1 text-[0.82rem] font-semibold text-white">{selectedTopicMeta.label}</div>
                  ) : (
                    <div className="mt-1 text-[0.78rem] text-white/36">—</div>
                  )}
                </div>
              </div>

              {/* Topic grid — 2-col */}
              <div className="grid grid-cols-2 gap-[6px]">
                {TOPICS.map((topic) => {
                  const isSelected = selectedTopic === topic.id
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      aria-pressed={isSelected}
                      className="rounded-lg border p-2.5 text-left transition-all active:scale-[0.98]"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, var(--nc-signal) 0%, color-mix(in srgb, var(--nc-signal-bright) 88%, transparent) 100%)'
                          : 'var(--nc-card)',
                        borderColor: isSelected ? 'color-mix(in srgb, var(--nc-signal) 44%, transparent)' : 'var(--nc-border)',
                        color: isSelected ? 'var(--nc-signal-fg)' : 'var(--nc-text)',
                        boxShadow: isSelected
                          ? '0 12px 28px var(--nc-glow)'
                          : '0 2px 8px rgba(0,0,0,0.18)',
                      }}
                    >
                      <div className="text-[10px] font-bold uppercase tracking-[0.10em]"
                        style={{ color: isSelected ? 'rgba(10,18,6,0.48)' : 'var(--nc-text-dim)' }}
                      >
                        {topic.label}
                      </div>
                      <div
                        className="mt-1 text-[0.75rem] leading-snug"
                        style={{ color: isSelected ? 'rgba(10,18,6,0.68)' : 'var(--nc-text-muted)' }}
                      >
                        {topic.desc}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Level selector — cream strip */}
              <div className="grid grid-cols-3 overflow-hidden rounded-lg bg-[var(--nc-cream)] border border-[rgba(17,21,24,0.06)]">
                <div className="flex items-center justify-center border-r border-[rgba(17,21,24,0.08)] px-2 py-2.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-cream-dim)]">Nivå</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5 px-2 py-2">
                  {LEVELS.map((currentLevel) => {
                    const isActive = level === currentLevel
                    return (
                      <button
                        key={currentLevel}
                        onClick={() => {
                          setLevel(currentLevel)
                          setUserOverrodeLevel(true)
                        }}
                        aria-pressed={isActive}
                        className="rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors"
                        style={{
                          background: isActive ? 'var(--nc-signal)' : 'rgba(17,21,24,0.08)',
                          color: isActive ? 'var(--nc-signal-fg)' : 'var(--nc-cream-muted)',
                        }}
                      >
                        {currentLevel}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* CTA */}
              <button
                disabled={!selectedTopic}
                onClick={() => void startConversation()}
                className="nc-button-primary mt-auto w-full rounded-lg py-3.5 text-[0.82rem] font-extrabold disabled:opacity-40"
              >
                Start samtale
              </button>
            </motion.div>
          ) : null}

          {/* ── CHAT PHASE ── */}
          {phase === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col gap-1.5 overflow-hidden"
            >
              {/* Chat header — dark card */}
              <div className="rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] px-2.5 py-2">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-[0.35rem] bg-[linear-gradient(135deg,var(--nc-signal)_0%,#A8E010_100%)]">
                      <MessageSquare size={14} aria-hidden="true" color="var(--nc-signal-fg)" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--nc-text-dim)]">Samtale med Kari</div>
                      <div className="mt-0.5 text-[0.78rem] font-semibold text-[var(--nc-text)]">
                        {selectedTopicMeta?.label ?? 'Tema'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {convSource === 'template' ? (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--nc-red-border)] bg-[rgba(255,106,85,0.12)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nc-red)]" title="Maler-svar (AI utilgjengelig)">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--nc-red)]" />
                        Maler
                      </div>
                    ) : (
                      <div className="nc-chip-signal inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]" title="Sky-AI (Kari svarer via server)">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--nc-signal-fg)]" />
                        Sky
                      </div>
                    )}
                    <button
                      onClick={() => {
                        summaryTurnCountRef.current = turnIndexRef.current
                        summaryErrorCountRef.current = errorCountRef.current
                        summarySpeakingMinutesRef.current = speakingMinutesRef.current
                        summaryTopicRef.current = selectedTopic ?? ''
                        void persistSessionEnd()
                        window.speechSynthesis?.cancel()
                        markLaneDone('conversation')
                        setPhase('summary')
                      }}
                      aria-label="Avslutt samtale"
                      className="flex items-center gap-1 rounded-full border border-[var(--nc-border)] bg-[rgba(255,255,255,0.06)] px-2.5 py-1 text-[10px] font-semibold text-[var(--nc-text-muted)]"
                    >
                      <X size={11} aria-hidden="true" />
                      Avslutt
                    </button>
                  </div>
                </div>
              </div>

              {/* Message list */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto pb-2">
                <div className="flex flex-col gap-2.5">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {msg.role === 'tutor' ? (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-[9px] font-bold uppercase tracking-[0.10em] text-[var(--nc-text-dim)]">Kari</span>
                        </div>
                      ) : null}

                      <div
                        className={`max-w-[82%] rounded-lg px-3 py-2.5 text-[14px] leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[rgba(6,16,23,0.94)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                            : 'nc-glass-cream text-[var(--nc-cream-text)]'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {msg.role === 'tutor' && msg.correction ? (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="max-w-[82%] rounded-lg border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-2"
                        >
                          <p className="text-[11px] text-[var(--nc-text-muted)]">
                            <span className="line-through text-[var(--nc-text-dim)]">{msg.correction.original}</span>
                            {' → '}
                            <SavableWord
                              text={msg.correction.corrected}
                              source="conversation"
                              type="phrase"
                              errorTag={msg.correction.errorTag}
                              aiExplanation={msg.correction.explanation}
                              onDark
                            >
                              <span className="font-semibold text-[var(--nc-red)]">{msg.correction.corrected}</span>
                            </SavableWord>
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--nc-text-dim)]">{msg.correction.explanation}</p>
                        </motion.div>
                      ) : null}
                    </div>
                  ))}

                  {isThinking ? (
                    <div className="flex items-start gap-2">
                      <div className="nc-glass rounded-[1.1rem] px-3 py-2.5 text-[var(--nc-text-muted)]">
                        <div className="flex gap-1">
                          {[0, 0.2, 0.4].map((delay) => (
                            <motion.div
                              key={delay}
                              className="size-1.5 rounded-full bg-[var(--nc-text-muted)]"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, delay, repeat: Infinity }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Constraint banner */}
              <AnimatePresence>
                {activeConstraint ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-lg px-3 py-2 text-[11px]"
                    style={{
                      background: constraintResult
                        ? constraintResult.met
                          ? 'color-mix(in srgb, var(--nc-signal) 14%, transparent)'
                          : 'rgba(255,106,85,0.10)'
                        : 'rgba(255,255,255,0.05)',
                      border: constraintResult
                        ? constraintResult.met
                          ? '1px solid var(--nc-signal-border)'
                          : '1px solid rgba(255,106,85,0.22)'
                        : '1px solid var(--nc-border)',
                      color: constraintResult
                        ? constraintResult.met
                          ? 'var(--nc-signal)'
                          : 'var(--nc-red)'
                        : 'var(--nc-text-muted)',
                    }}
                  >
                    {constraintResult ? (
                      constraintResult.met
                        ? `Utfordring fullført: ${activeConstraint.instruction}`
                        : `Utfordring: ${constraintResult.feedback ?? activeConstraint.instruction}`
                    ) : (
                      `Utfordring: ${activeConstraint.instruction}`
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Input bar — dark card */}
              <div className="rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] flex items-center gap-2.5 px-3 py-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSend(inputText)
                  }}
                  placeholder="Skriv eller snakk…"
                  aria-label="Skriv melding"
                  className="flex-1 bg-transparent text-[14px] text-[var(--nc-text)] outline-none placeholder:text-[var(--nc-text-dim)]"
                />
                {hasSpeechAPI ? (
                  <button
                    onClick={toggleListening}
                    aria-label={isListening ? 'Stopp opptak' : 'Start opptak'}
                    className="flex size-9 items-center justify-center rounded-full transition-colors"
                    style={{
                      background: isListening ? 'var(--nc-red)' : 'rgba(255,255,255,0.08)',
                      color: isListening ? 'white' : 'var(--nc-text-muted)',
                    }}
                  >
                    {isListening ? (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                        <MicOff size={15} aria-hidden="true" />
                      </motion.div>
                    ) : (
                      <Mic size={15} aria-hidden="true" />
                    )}
                  </button>
                ) : null}
                <button
                  onClick={() => void handleSend(inputText)}
                  disabled={!inputText.trim() || isThinking}
                  aria-label="Send melding"
                  className="nc-button-primary flex size-9 items-center justify-center rounded-full disabled:opacity-40"
                >
                  <Send size={14} aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* ── SUMMARY PHASE ── */}
          {phase === 'summary' ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col justify-center gap-[6px]"
            >
              {/* Lime summary panel */}
              <div className="nc-signal-panel p-3">
                <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-[rgba(10,18,6,0.48)]">Samtale fullført</div>
                <p className="mt-1.5 text-balance text-[1.35rem] font-extrabold leading-none tracking-[-0.03em] text-[var(--nc-signal-fg)]">
                  {summaryTopicMeta?.label ?? 'Samtale'}
                </p>

                {/* Stats — dark inset on lime */}
                <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-[0.4rem] bg-[rgba(6,16,23,0.94)] p-2">
                  <div className="rounded-[0.35rem] border border-white/8 bg-white/5 px-3 py-3 text-center">
                    <div className="text-[1.6rem] font-extrabold tabular-nums leading-none text-white">
                      {summaryTurnCountRef.current}
                    </div>
                    <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.10em] text-white/40">
                      Utvekslinger
                    </div>
                  </div>
                  <div className="rounded-[0.35rem] border border-white/8 bg-white/5 px-3 py-3 text-center">
                    <div className="text-[1.6rem] font-extrabold tabular-nums leading-none text-[var(--nc-signal)]">
                      {summaryErrorCountRef.current}
                    </div>
                    <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.10em] text-white/40">
                      Rettelser
                    </div>
                  </div>
                </div>

                {summarySpeakingMinutesRef.current > 0 ? (
                  <p className="mt-2 text-[11px] font-semibold text-[rgba(6,16,23,0.7)]">
                    {summarySpeakingMinutesRef.current >= 1
                      ? `+${Math.round(summarySpeakingMinutesRef.current)} min snakk lagt til`
                      : 'Snakketid lagt til'}
                  </p>
                ) : null}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-[6px]">
                <button
                  onClick={() => setPhase('setup')}
                  className="nc-button-primary w-full rounded-lg py-3.5 text-[0.82rem] font-bold"
                >
                  Ny samtale
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full rounded-lg bg-[var(--nc-card)] border border-[var(--nc-border)] py-3 text-[0.82rem] font-semibold text-[var(--nc-text)]"
                >
                  Til dashboard
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <BottomNav active="snakk" />
    </div>
  )
}
