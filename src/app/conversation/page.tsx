'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Send, X } from 'lucide-react'
import { aiService } from '@/ai'
import type { ConversationMessage, ConversationTurnResult } from '@/ai/types'
import { BottomNav } from '@/components/layout/BottomNav'

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isThinking])

  const addTutorMessage = useCallback(async (history: ConversationMessage[]) => {
    setIsThinking(true)
    try {
      const result = await aiService.conversationTurn(history, level, selectedTopic ?? 'daily-routine')
      setMessages((prev) => [...prev, {
        role: 'tutor',
        content: result.tutorResponse,
        correction: result.correction,
      }])
      speakNorwegian(result.tutorResponse)
    } finally {
      setIsThinking(false)
    }
  }, [level, selectedTopic])

  async function startConversation() {
    setPhase('chat')
    setMessages([])
    await addTutorMessage([])
  }

  async function handleSend(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setInputText('')
    const nextMessages = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(nextMessages)
    await addTutorMessage(nextMessages.map((m) => ({ role: m.role, content: m.content })))
  }

  function toggleListening() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
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
      if (e.results[e.results.length - 1].isFinal) { setIsListening(false); void handleSend(transcript) }
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
                  onClick={() => { setPhase('setup'); window.speechSynthesis?.cancel() }}
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
