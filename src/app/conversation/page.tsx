'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, X } from 'lucide-react'
import { aiService } from '@/ai'
import type { ConversationMessage, ConversationTurnResult } from '@/ai/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { AIStatusBadge } from '@/components/ai/AIStatusBadge'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { errorTagToConceptId } from '@/lib/error-tag-to-concept'
import { updateConceptMastery } from '@/engine'
import { repairFromSurface } from '@/engine/repair-from-surface'
import { saveFingerprint } from '@/storage/indexeddb'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { emitEvent } from '@/lib/events'
import { selectConstraint, buildConstraintEvalPrompt } from '@/lib/constraints'
import type { ResponseConstraint } from '@/lib/constraints'
import { getGraphForLevel } from '@/lib/concept-graph-loader'
import { markLaneDone } from '@/lib/lane-completion'
import { logExerciseResult } from '@/lib/logEvents'
import type { ExerciseResult } from '@/types/session'
import type { ErrorTag } from '@/types/taxonomy'

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
  { id: 'daily-routine', label: 'Daglig rutine', emoji: '☀️', desc: 'Morgen, kvelder, vaner' },
  { id: 'food', label: 'Mat og drikke', emoji: '🍜', desc: 'Lage mat, restaurant, favoritter' },
  { id: 'family', label: 'Familie', emoji: '🏠', desc: 'Familiemedlemmer, hjemmeliv' },
  { id: 'norway', label: 'Norge', emoji: '🏔️', desc: 'Natur, byer, kultur' },
  { id: 'hobbies', label: 'Fritid', emoji: '🎯', desc: 'Sport, musikk, interesser' },
  { id: 'work', label: 'Jobb', emoji: '💼', desc: 'Arbeid, kolleger, drømmejobb' },
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
        turn_index: turnIndexRef.current++,
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

  function logConversationError(correction: NonNullable<ConversationTurnResult['correction']>): void {
    const fp = useFingerprintStore.getState().fingerprint
    if (!fp) return
    const activeGraph = getGraphForLevel(fp.currentLevel ?? 'A1')
    const repaired = repairFromSurface(fp, {
      surfaceKind: 'conversation',
      errorTag: correction.errorTag,
      wrong: correction.original,
      correct: correction.corrected,
    }, activeGraph)
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

  function recordConstraintResult(constraintConceptId: string, met: boolean): void {
    const fp = useFingerprintStore.getState().fingerprint
    if (!fp) return
    const activeGraph = getGraphForLevel(fp.currentLevel ?? 'A1')
    const node = activeGraph.concepts.find((c) => c.id === constraintConceptId)
    const existing = fp.conceptMastery[constraintConceptId]
    const updated = updateConceptMastery(existing, met, node?.minAttempts ?? 15, node?.minDays ?? 3)
    const newFp = {
      ...fp,
      conceptMastery: { ...fp.conceptMastery, [constraintConceptId]: { ...updated, conceptId: constraintConceptId } },
      updatedAt: new Date().toISOString(),
    }
    setFingerprint(newFp)
    saveFingerprint(newFp).catch(console.warn)
    if (user?.id) {
      const constraintExResult: ExerciseResult = {
        sessionId: dbSessionIdRef.current ?? 'conversation',
        itemId: `conversation-constraint-${constraintConceptId}-${Date.now()}`,
        correct: met,
        userAnswer: '',
        correctAnswer: '',
        timeTakenSeconds: 0,
        conceptId: constraintConceptId,
      }
      logExerciseResult(user.id, constraintExResult)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isThinking])

  const addTutorMessage = useCallback(async (history: ConversationMessage[], isUserTurn = true) => {
    setIsThinking(true)
    try {
      const constraintSuffix = (isUserTurn && activeConstraint && !constraintResult)
        ? buildConstraintEvalPrompt(activeConstraint)
        : undefined

      const topicLabel = TOPICS.find((t) => t.id === selectedTopic)?.label ?? 'daglig rutine'
      const result = await aiService.conversationTurn(history, level, topicLabel, constraintSuffix)
      setMessages((prev) => [...prev, {
        role: 'tutor',
        content: result.tutorResponse,
        correction: result.correction,
      }])
      speakNorwegian(result.tutorResponse)
      void persistTurn('tutor', result.tutorResponse, result.correction)
      if (result.correction) logConversationError(result.correction)

      if (result.constraintMet !== undefined && activeConstraint && !constraintResult) {
        setConstraintResult({ met: result.constraintMet, feedback: result.constraintFeedback })
        recordConstraintResult(activeConstraint.conceptId, result.constraintMet)
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

  async function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setInputText('')
    const nextMessages = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(nextMessages)
    void persistTurn('user', trimmed)
    await addTutorMessage(nextMessages.map((m) => ({ role: m.role, content: m.content })))
  }

  function addSpeakingMinutes(elapsedMs: number): void {
    const fp = useFingerprintStore.getState().fingerprint
    if (!fp) return
    const minutes = elapsedMs / 60_000
    if (minutes < 0.05) return
    const updated = { ...fp, speakingMinutesTotal: (fp.speakingMinutesTotal ?? 0) + minutes, updatedAt: new Date().toISOString() }
    setFingerprint(updated)
    saveFingerprint(updated).catch(console.warn)
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
        addSpeakingMinutes(Date.now() - micStartRef.current)
        setIsListening(false)
        void handleSend(transcript)
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
    <div className="nc-gradient-page flex min-h-dvh flex-col">
      <main className="nc-mobile-shell relative z-10 flex w-full flex-1 flex-col overflow-hidden px-4 pb-28 pt-4">
        <AnimatePresence mode="wait">
          {phase === 'setup' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-1 flex-col gap-4"
            >
              <div className="nc-glass-cream p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="nc-label text-[var(--nc-cream-dim)]">AI conversation</div>
                    <h1 className="mt-2 text-balance text-[2rem] leading-[0.96] text-[var(--nc-cream-text)]">
                      Snakk norsk i et mer naturlig tempo.
                    </h1>
                    <p className="mt-3 text-sm leading-7 text-[var(--nc-cream-muted)]">
                      Velg et tema, lås riktig nivå, og få løpende korrigering mens du snakker.
                    </p>
                  </div>
                  <div className="rounded-[1rem] bg-[var(--nc-signal)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--nc-signal-fg)]">
                    Voice
                  </div>
                </div>

                <div className="mt-5 rounded-[1.3rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/38">
                        Klar samtale
                      </div>
                      <div className="mt-1 text-sm font-medium text-white">
                        {selectedTopicMeta ? `${selectedTopicMeta.emoji} ${selectedTopicMeta.label}` : 'Velg tema nedenfor'}
                      </div>
                    </div>
                    <div className="rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/58">
                      {level}
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/65">
                    Coachen holder samtalen i gang, plukker opp feil, og presser deg forsiktig mot neste grammatikkmål.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {TOPICS.map((topic) => {
                  const isSelected = selectedTopic === topic.id
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className="rounded-[1.15rem] border p-4 text-left transition-all active:scale-[0.98]"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(215,255,92,0.94) 0%, rgba(199,244,93,0.88) 100%)'
                          : 'rgba(247,251,245,0.96)',
                        borderColor: isSelected ? 'rgba(215,255,92,0.44)' : 'rgba(255,255,255,0.14)',
                        color: isSelected ? 'var(--nc-signal-fg)' : 'var(--nc-cream-text)',
                        boxShadow: isSelected
                          ? '0 18px 36px rgba(183,243,0,0.16)'
                          : '0 14px 30px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.55)',
                      }}
                    >
                      <div className="text-2xl">{topic.emoji}</div>
                      <div className="mt-3 text-[13px] font-bold">{topic.label}</div>
                      <div
                        className="mt-1 text-[11px] leading-snug"
                        style={{ color: isSelected ? 'rgba(8,17,13,0.70)' : 'var(--nc-cream-muted)' }}
                      >
                        {topic.desc}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="nc-glass p-4">
                <div className="nc-label">Nivå</div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {LEVELS.map((currentLevel) => {
                    const isActive = level === currentLevel
                    return (
                      <button
                        key={currentLevel}
                        onClick={() => {
                          setLevel(currentLevel)
                          setUserOverrodeLevel(true)
                        }}
                        className="rounded-full px-3 py-2.5 text-[13px] font-bold transition-colors"
                        style={{
                          background: isActive ? 'var(--nc-signal)' : 'rgba(255,255,255,0.06)',
                          color: isActive ? 'var(--nc-signal-fg)' : 'var(--nc-text-muted)',
                        }}
                      >
                        {currentLevel}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                disabled={!selectedTopic}
                onClick={() => void startConversation()}
                className="nc-button-primary mt-auto w-full rounded-[1rem] py-4 text-sm font-extrabold disabled:opacity-40"
              >
                Start samtale
              </button>
            </motion.div>
          ) : null}

          {phase === 'chat' ? (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col gap-3 overflow-hidden"
            >
              <div className="nc-glass-cream p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[rgba(6,16,23,0.94)] text-lg text-white">
                      {selectedTopicMeta?.emoji ?? '💬'}
                    </div>
                    <div>
                      <div className="nc-label text-[var(--nc-cream-dim)]">Samtale med Kari</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--nc-cream-text)]">
                        {selectedTopicMeta?.label ?? 'Tema'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <AIStatusBadge />
                    <button
                      onClick={() => {
                        summaryTurnCountRef.current = turnIndexRef.current
                        summaryErrorCountRef.current = errorCountRef.current
                        summaryTopicRef.current = selectedTopic ?? ''
                        void persistSessionEnd()
                        window.speechSynthesis?.cancel()
                        markLaneDone('conversation')
                        setPhase('summary')
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-[rgba(6,16,23,0.08)] px-3 py-1.5 text-[11px] font-semibold text-[var(--nc-cream-muted)]"
                    >
                      <X size={12} />
                      Avslutt
                    </button>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto pb-2">
                <div className="flex flex-col gap-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {msg.role === 'tutor' ? (
                        <div className="flex items-center gap-1.5 px-1">
                          <span className="text-sm">{selectedTopicMeta?.emoji ?? '💬'}</span>
                          <span className="text-[10px] font-semibold text-[var(--nc-text-dim)]">Kari</span>
                        </div>
                      ) : null}

                      <div
                        className={`max-w-[82%] rounded-[1.25rem] px-4 py-3 text-[14px] leading-relaxed ${
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
                          className="max-w-[82%] rounded-[1rem] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-2"
                        >
                          <p className="text-[12px] text-[var(--nc-text-muted)]">
                            <span className="line-through text-[var(--nc-text-dim)]">{msg.correction.original}</span>
                            {' → '}
                            <span className="font-semibold text-[var(--nc-red)]">{msg.correction.corrected}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-[var(--nc-text-dim)]">{msg.correction.explanation}</p>
                        </motion.div>
                      ) : null}
                    </div>
                  ))}

                  {isThinking ? (
                    <div className="flex items-start gap-2">
                      <div className="nc-glass rounded-[1.1rem] px-4 py-3 text-[var(--nc-text-muted)]">
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

              <AnimatePresence>
                {activeConstraint ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-[1rem] px-4 py-3 text-[12px]"
                    style={{
                      background: constraintResult
                        ? constraintResult.met
                          ? 'rgba(215,255,92,0.18)'
                          : 'rgba(255,106,85,0.10)'
                        : 'rgba(247,251,245,0.92)',
                      border: constraintResult
                        ? constraintResult.met
                          ? '1px solid rgba(215,255,92,0.34)'
                          : '1px solid rgba(255,106,85,0.22)'
                        : '1px solid rgba(255,255,255,0.12)',
                      color: constraintResult
                        ? constraintResult.met
                          ? 'var(--nc-signal-fg)'
                          : 'var(--nc-red)'
                        : 'var(--nc-cream-text)',
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

              <div className="nc-glass-cream flex items-center gap-3 px-4 py-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSend(inputText)
                  }}
                  placeholder="Skriv eller snakk…"
                  className="flex-1 bg-transparent text-[14px] text-[var(--nc-cream-text)] outline-none placeholder:text-[var(--nc-cream-muted)]"
                />
                {hasSpeechAPI ? (
                  <button
                    onClick={toggleListening}
                    aria-label={isListening ? 'Stopp opptak' : 'Start opptak'}
                    className="flex size-11 items-center justify-center rounded-full transition-colors"
                    style={{
                      background: isListening ? 'var(--nc-red)' : 'rgba(6,16,23,0.08)',
                      color: isListening ? 'white' : 'var(--nc-cream-text)',
                    }}
                  >
                    {isListening ? (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                        <MicOff size={18} />
                      </motion.div>
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>
                ) : null}
                <button
                  onClick={() => void handleSend(inputText)}
                  disabled={!inputText.trim() || isThinking}
                  aria-label="Send melding"
                  className="nc-button-primary flex size-11 items-center justify-center rounded-full disabled:opacity-40"
                >
                  <Send size={18} />
                </button>
              </div>
            </motion.div>
          ) : null}

          {phase === 'summary' ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col justify-center gap-4"
            >
              <div className="nc-glass-cream p-6 text-center">
                <div className="nc-label text-[var(--nc-cream-dim)]">Samtale fullført</div>
                <p className="mt-3 text-[2rem] font-semibold leading-[0.96] text-[var(--nc-cream-text)]">
                  {summaryTopicMeta?.emoji ?? '💬'} {summaryTopicMeta?.label ?? 'Samtale'}
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--nc-cream-muted)]">
                  Oppsummeringen er lagret i læringsprofilen din, slik at neste samtale kan starte smartere.
                </p>

                <div className="mt-5 rounded-[1.3rem] bg-[rgba(6,16,23,0.94)] p-4 text-white">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-4">
                      <div className="text-[2rem] font-display font-bold text-white">
                        {summaryTurnCountRef.current}
                      </div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/42">
                        Utvekslinger
                      </div>
                    </div>
                    <div className="rounded-[1rem] border border-white/8 bg-white/5 px-3 py-4">
                      <div className="text-[2rem] font-display font-bold text-[var(--nc-signal)]">
                        {summaryErrorCountRef.current}
                      </div>
                      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/42">
                        Rettelser
                      </div>
                    </div>
                  </div>
                </div>

                {user ? (
                  <p className="mt-4 text-[12px] text-[var(--nc-cream-muted)]">
                    Fremgangen er synkronisert.
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setPhase('setup')}
                  className="nc-button-primary w-full rounded-[1rem] py-3.5 text-sm font-bold"
                >
                  Ny samtale
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="nc-glass w-full rounded-[1rem] py-3 text-sm font-semibold text-[var(--nc-text)]"
                >
                  Til dashboard
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      <BottomNav active="conversation" />
    </div>
  )
}
