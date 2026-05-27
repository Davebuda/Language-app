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
  { id: 'food',         label: 'Mat og drikke', emoji: '🍕', desc: 'Lage mat, restaurant, favoritter' },
  { id: 'family',       label: 'Familie',       emoji: '👨‍👩‍👧', desc: 'Familiemedlemmer, hjemmeliv' },
  { id: 'norway',       label: 'Norge',         emoji: '🏔️', desc: 'Natur, byer, kultur' },
  { id: 'hobbies',      label: 'Fritid',        emoji: '🎯', desc: 'Sport, musikk, interesser' },
  { id: 'work',         label: 'Jobb',          emoji: '💼', desc: 'Arbeid, kolleger, drømmejobb' },
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
    } catch { /* silent */ }
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
    } catch { /* silent */ }
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
    } catch { /* silent */ }
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
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isThinking])

  // Mic activation is explicit — user taps the mic button.
  // No auto-activation: recording without consent is a violation in any context.

  const addTutorMessage = useCallback(async (history: ConversationMessage[], isUserTurn = true) => {
    setIsThinking(true)
    try {
      // Only evaluate the constraint on user turns (not the opening tutor greeting)
      const constraintSuffix = (isUserTurn && activeConstraint && !constraintResult)
        ? buildConstraintEvalPrompt(activeConstraint)
        : undefined

      // P0.5-05 (F028): pass the Norwegian topic label, not the English slug, so
      // the template fallback opener reads "La oss snakke om daglig rutine" not
      // "La oss snakke om daily-routine".
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

      // Record constraint result and update mastery if evaluated
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
    turnIndexRef.current = 0
    errorCountRef.current = 0
    sessionStartRef.current = Date.now()

    // Select a constraint based on the user's current in-practice concepts
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
    if (minutes < 0.05) return // ignore accidental taps under 3 seconds
    const updated = { ...fp, speakingMinutesTotal: (fp.speakingMinutesTotal ?? 0) + minutes, updatedAt: new Date().toISOString() }
    setFingerprint(updated)
    saveFingerprint(updated).catch(console.warn)
  }

  function toggleListening() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
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

  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-5 pb-4 overflow-hidden relative z-10">
        <AnimatePresence mode="wait">
          {phase === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4 flex-1"
            >
              <div>
                <div className="nc-label mb-1">SAMTALE MED KARI</div>
                <h1 className="text-balance font-display text-[1.5rem] font-bold text-[var(--nc-text)]">Snakk norsk</h1>
                <p className="text-pretty mt-1 text-[0.8125rem] text-[var(--nc-text-muted)]">Velg et tema og begynn å øve</p>
              </div>

              {/* Topic grid */}
              <div className="grid grid-cols-2 gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t.id)}
                    className={`flex flex-col gap-2 rounded-[16px] p-4 text-left transition-all active:scale-[0.98] ${
                      selectedTopic === t.id
                        ? 'nc-glass-elevated'
                        : 'nc-glass'
                    }`}
                    style={selectedTopic === t.id ? {
                      borderColor: 'rgba(220,38,38,0.40)',
                      boxShadow: '0 0 0 1px rgba(220,38,38,0.20)',
                    } : {}}
                  >
                    <span className="text-2xl">{t.emoji}</span>
                    <div>
                      <div className="text-[13px] font-bold text-[var(--nc-text)]">{t.label}</div>
                      <div className="text-[11px] text-[var(--nc-text-muted)] mt-0.5">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Level selector */}
              <div>
                <div className="mb-2 nc-label">Nivå</div>
                <div className="flex gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => { setLevel(l); setUserOverrodeLevel(true) }}
                      className={`flex-1 rounded-full py-2.5 text-[13px] font-bold border transition-colors ${
                        level === l
                          ? 'bg-[var(--nc-red)] text-white border-[var(--nc-red)]'
                          : 'nc-glass text-[var(--nc-text-muted)] hover:text-[var(--nc-text)]'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!selectedTopic}
                onClick={() => void startConversation()}
                className="nc-button-primary w-full rounded-full py-4 text-sm font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40"
              >
                Start samtale →
              </button>
            </motion.div>
          )}

          {phase === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col gap-3 overflow-hidden"
            >
              {/* Chat header */}
              <div className="flex items-center justify-between shrink-0 nc-glass px-4 py-2.5 rounded-[var(--radius)]">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{TOPICS.find((t) => t.id === selectedTopic)?.emoji}</span>
                  <div>
                    <div className="text-[13px] font-bold text-[var(--nc-text)]">
                      {TOPICS.find((t) => t.id === selectedTopic)?.label}
                    </div>
                    <div className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[var(--nc-text-dim)]">med Kari · {level}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                    className="nc-glass flex items-center gap-1 px-3 py-1 text-[11px] text-[var(--nc-text-muted)] hover:text-[var(--nc-text)] transition-colors"
                  >
                    <X size={12} /> Avslutt
                  </button>
                </div>
              </div>

              {/* Message list */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'tutor' && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">🇳🇴</span>
                        <span className="text-[10px] font-semibold text-[var(--nc-text-dim)]">Kari</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'nc-gradient-red rounded-br-sm text-white'
                          : 'nc-glass-cream rounded-bl-sm text-[var(--nc-cream-text)]'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {msg.role === 'tutor' && msg.correction && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-[80%] rounded-xl px-3 py-2"
                        style={{ background: 'rgba(244,132,95,0.07)', border: '1px solid rgba(244,132,95,0.18)' }}
                      >
                        <p className="text-[12px] text-[var(--nc-text-muted)]">
                          <span className="line-through text-[var(--nc-text-dim)]">{msg.correction.original}</span>
                          {' → '}
                          <span className="font-semibold" style={{ color: 'var(--nc-red)' }}>{msg.correction.corrected}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-[var(--nc-text-dim)]">{msg.correction.explanation}</p>
                      </motion.div>
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🇳🇴</span>
                    <div className="nc-glass rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 text-[var(--nc-text-muted)]">
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
                )}
              </div>

              {/* Constraint challenge banner */}
              <AnimatePresence>
                {activeConstraint && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="shrink-0 rounded-xl px-3 py-2.5 text-[12px]"
                    style={{
                      background: constraintResult
                        ? constraintResult.met
                          ? 'rgba(159,230,127,0.10)'
                          : 'rgba(239,118,100,0.08)'
                        : 'rgba(185,176,255,0.10)',
                      border: constraintResult
                        ? constraintResult.met
                          ? '1px solid rgba(159,230,127,0.30)'
                          : '1px solid rgba(239,118,100,0.20)'
                        : '1px solid rgba(185,176,255,0.22)',
                    }}
                  >
                    {constraintResult ? (
                      constraintResult.met
                        ? <span style={{ color: '#4caf50' }}>✓ Utfordring klart: {activeConstraint.instruction}</span>
                        : <span style={{ color: '#e57373' }}>Utfordring: {constraintResult.feedback ?? activeConstraint.instruction}</span>
                    ) : (
                      <span style={{ color: 'rgba(185,176,255,0.85)' }}>
                        🎯 Utfordring: {activeConstraint.instruction}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input area */}
              <div className="shrink-0 nc-glass rounded-[var(--radius)] px-4 py-3 flex items-center gap-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(inputText) }}
                  placeholder="Skriv eller snakk..."
                  className="flex-1 bg-transparent outline-none text-[var(--nc-text)] placeholder:text-[var(--nc-text-dim)] text-[14px]"
                />
                {hasSpeechAPI && (
                  <button
                    onClick={toggleListening}
                    aria-label={isListening ? 'Stopp opptak' : 'Start opptak'}
                    className={`flex size-11 items-center justify-center rounded-full transition-colors ${
                      isListening
                        ? 'text-white'
                        : 'nc-glass text-[var(--nc-text-muted)]'
                    }`}
                    style={isListening ? { background: 'var(--nc-red)' } : {}}
                  >
                    {isListening ? (
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                        <MicOff size={18} />
                      </motion.div>
                    ) : (
                      <Mic size={18} />
                    )}
                  </button>
                )}
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
          )}

          {phase === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-1 flex-col items-center justify-center gap-6 px-2"
            >
              <div className="nc-glass-elevated w-full max-w-sm p-6 text-center">
                <div className="nc-label mb-4">Samtale fullført</div>
                <p className="text-2xl font-bold text-[var(--nc-text)]">
                  {TOPICS.find((t) => t.id === summaryTopicRef.current)?.emoji}{' '}
                  {TOPICS.find((t) => t.id === summaryTopicRef.current)?.label ?? 'Samtale'}
                </p>
                <div className="mt-5 flex justify-center gap-8 text-sm text-[var(--nc-text-muted)]">
                  <div className="text-center">
                    <div className="font-display text-2xl font-bold text-[var(--nc-text)]">{summaryTurnCountRef.current}</div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--nc-text-dim)]">utvekslinger</div>
                  </div>
                  {summaryErrorCountRef.current > 0 && (
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-[var(--nc-red)]">{summaryErrorCountRef.current}</div>
                      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--nc-text-dim)]">rettelser</div>
                    </div>
                  )}
                </div>
                {user && (
                  <p className="mt-4 text-[12px] text-[var(--nc-text-dim)]">Fremgangen din er lagret.</p>
                )}
              </div>

              <div className="flex w-full max-w-sm flex-col gap-3">
                <button
                  onClick={() => setPhase('setup')}
                  className="nc-button-primary w-full rounded-[var(--radius)] py-3 text-sm font-bold"
                >
                  Ny samtale
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="w-full py-3 text-sm font-semibold text-[var(--nc-text-dim)] transition-colors hover:text-[var(--nc-text)]"
                >
                  Til dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav active="conversation" />
    </div>
  )
}
