'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, X } from 'lucide-react'
import { aiService } from '@/ai'
import type { ConversationMessage, ConversationTurnResult } from '@/ai/types'
import { BottomNav } from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { logError, aggregateErrorPatterns, updateConceptMastery } from '@/engine'
import { saveFingerprint } from '@/storage/indexeddb'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { emitEvent } from '@/lib/events'
import { selectConstraint, buildConstraintEvalPrompt } from '@/lib/constraints'
import type { ResponseConstraint } from '@/lib/constraints'
import type { ErrorTag } from '@/types/taxonomy'
import type { ConceptGraph } from '@/types/concepts'
import a1GraphJson from '@content/concepts/a1-graph.json'
import a2GraphJson from '@content/concepts/a2-graph.json'

const a1Graph = a1GraphJson as ConceptGraph
const a2Graph = a2GraphJson as ConceptGraph

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

// Best-effort mapping: error tag → most relevant concept ID for fingerprint logging
const ERROR_TAG_TO_CONCEPT: Partial<Record<string, string>> = {
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
}

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
  const [phase, setPhase] = useState<'setup' | 'chat'>('setup')
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)
  const [level, setLevel] = useState<CEFRLevel>('A1')
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
  const micStartRef = useRef<number>(0)
  const [activeConstraint, setActiveConstraint] = useState<ResponseConstraint | null>(null)
  const [constraintResult, setConstraintResult] = useState<{ met: boolean; feedback?: string } | null>(null)

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
        concept_ids: correction ? [ERROR_TAG_TO_CONCEPT[correction.errorTag] ?? ''].filter(Boolean) : [],
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
    if (!fingerprint) return
    const conceptId = ERROR_TAG_TO_CONCEPT[correction.errorTag]
    if (!conceptId) return
    const updated = logError(fingerprint, {
      conceptId,
      errorTag: correction.errorTag as ErrorTag,
      exerciseType: 'translation-to-norwegian',
      wrong: correction.original,
      correct: correction.corrected,
    })
    const withPatterns = { ...updated, errorPatterns: aggregateErrorPatterns(updated) }
    setFingerprint(withPatterns)
    saveFingerprint(withPatterns).catch(console.warn)
    errorCountRef.current++
  }

  function recordConstraintResult(constraintConceptId: string, met: boolean): void {
    const fp = useFingerprintStore.getState().fingerprint
    if (!fp) return
    const activeGraph = fp.currentLevel === 'A2' ? a2Graph : a1Graph
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

  const addTutorMessage = useCallback(async (history: ConversationMessage[], isUserTurn = true) => {
    setIsThinking(true)
    try {
      // Only evaluate the constraint on user turns (not the opening tutor greeting)
      const constraintSuffix = (isUserTurn && activeConstraint && !constraintResult)
        ? buildConstraintEvalPrompt(activeConstraint)
        : undefined

      const result = await aiService.conversationTurn(history, level, selectedTopic ?? 'daily-routine', constraintSuffix)
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
      const graph = fingerprint.currentLevel === 'A2' ? a2Graph : a1Graph
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
    <div className="flex min-h-dvh flex-col bg-nc-bg">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-5 pb-4 overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === 'setup' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4 flex-1"
            >
              <div>
                <h1 className="text-[22px] font-extrabold text-nc-text">Samtale</h1>
                <p className="text-[13px] text-nc-text-muted">Snakk norsk med din AI-tutor</p>
              </div>

              {/* Topic grid */}
              <div className="grid grid-cols-2 gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t.id)}
                    className={`flex flex-col gap-2 rounded-[16px] border p-4 text-left transition-all active:scale-[0.98] ${
                      selectedTopic === t.id
                        ? 'border-nc-dark bg-nc-dark/5'
                        : 'border-nc-border bg-nc-card hover:border-nc-dark/20'
                    }`}
                    style={{ boxShadow: '0 2px 10px rgba(17,17,24,0.05)' }}
                  >
                    <span className="text-2xl">{t.emoji}</span>
                    <div>
                      <div className="text-[13px] font-bold text-nc-text">{t.label}</div>
                      <div className="text-[11px] text-nc-text-muted mt-0.5">{t.desc}</div>
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
                      onClick={() => setLevel(l)}
                      className={`flex-1 rounded-full py-2.5 text-[13px] font-bold border transition-colors ${
                        level === l
                          ? 'bg-nc-dark text-nc-green border-nc-dark'
                          : 'bg-nc-card border-nc-border text-nc-text-muted hover:border-nc-dark/20'
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
                className="w-full rounded-full py-4 text-sm font-extrabold transition-transform active:scale-[0.98] disabled:opacity-40"
                style={{ background: '#111118', color: '#C8FF00', boxShadow: '0 6px 20px rgba(17,17,24,0.18)' }}
              >
                Start samtale →
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col gap-3 overflow-hidden"
            >
              {/* Chat header */}
              <div className="flex items-center justify-between shrink-0">
                <div className="text-[15px] font-bold text-nc-text">
                  {TOPICS.find((t) => t.id === selectedTopic)?.emoji}{' '}
                  {TOPICS.find((t) => t.id === selectedTopic)?.label}
                </div>
                <button
                  onClick={() => { void persistSessionEnd(); setPhase('setup'); window.speechSynthesis?.cancel() }}
                  className="flex items-center gap-1 rounded-full bg-nc-card border border-nc-border px-3 py-1 text-[11px] text-nc-text-muted hover:text-nc-text transition-colors"
                >
                  <X size={12} /> Avslutt
                </button>
              </div>

              {/* Message list */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'tutor' && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm">🇳🇴</span>
                        <span className="text-[10px] font-semibold text-nc-text-dim">Kari</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'rounded-br-sm text-nc-text'
                          : 'bg-nc-card border border-nc-border text-nc-text rounded-bl-sm'
                      }`}
                      style={msg.role === 'user' ? {
                        background: 'rgba(17,17,24,0.07)',
                        border: '1px solid rgba(17,17,24,0.10)',
                      } : {
                        boxShadow: '0 2px 8px rgba(17,17,24,0.05)',
                      }}
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
                        <p className="text-[12px] text-nc-text-muted">
                          <span className="line-through text-nc-text-dim">{msg.correction.original}</span>
                          {' → '}
                          <span className="text-nc-coral font-semibold">{msg.correction.corrected}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-nc-text-dim">{msg.correction.explanation}</p>
                      </motion.div>
                    )}
                  </div>
                ))}

                {isThinking && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🇳🇴</span>
                    <div className="rounded-2xl rounded-bl-sm bg-nc-card border border-nc-border px-4 py-3 flex gap-1"
                      style={{ boxShadow: '0 2px 8px rgba(17,17,24,0.05)' }}>
                      {[0, 0.2, 0.4].map((delay) => (
                        <motion.div
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-nc-text/25"
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
                        ? <span style={{ color: '#4caf50' }}>✓ Challenge met: {activeConstraint.instruction}</span>
                        : <span style={{ color: '#e57373' }}>Challenge: {constraintResult.feedback ?? activeConstraint.instruction}</span>
                    ) : (
                      <span style={{ color: 'rgba(185,176,255,0.85)' }}>
                        🎯 Challenge: {activeConstraint.instruction}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input area */}
              <div className="shrink-0 flex gap-2 pt-2 border-t border-nc-border">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void handleSend(inputText) }}
                  placeholder="Skriv eller snakk..."
                  className="flex-1 rounded-full bg-nc-card border border-nc-border px-4 py-2.5 text-[14px] text-nc-text placeholder-nc-text-dim focus:outline-none focus:border-nc-dark/25 transition-colors"
                  style={{ boxShadow: '0 1px 4px rgba(17,17,24,0.04)' }}
                />
                {hasSpeechAPI && (
                  <button
                    onClick={toggleListening}
                    className={`rounded-full border px-3 py-2.5 transition-colors ${
                      isListening
                        ? 'bg-red-500/10 border-red-500/30 text-red-500'
                        : 'bg-nc-card border-nc-border text-nc-text-muted hover:text-nc-text'
                    }`}
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
                  className="rounded-full bg-nc-dark px-3 py-2.5 text-nc-green disabled:opacity-40 transition-colors"
                >
                  <Send size={18} />
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
