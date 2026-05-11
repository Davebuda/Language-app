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
  { id: 'food', label: 'Mat og drikke', emoji: '🍕', desc: 'Lage mat, restaurant, favoritter' },
  { id: 'family', label: 'Familie', emoji: '👨‍👩‍👧', desc: 'Familiemedlemmer, hjemmeliv' },
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
      const tutorMsg: DisplayMessage = {
        role: 'tutor',
        content: result.tutorResponse,
        correction: result.correction,
      }
      setMessages((prev) => [...prev, tutorMsg])
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

    const userMsg: DisplayMessage = { role: 'user', content: trimmed }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)

    const history: ConversationMessage[] = nextMessages.map((m) => ({ role: m.role, content: m.content }))
    await addTutorMessage(history)
  }

  function toggleListening() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const rec = new Ctor()
    recognitionRef.current = rec
    rec.lang = 'no-NO'
    rec.continuous = false
    rec.interimResults = true

    rec.onresult = (e: SpeechRecEvent) => {
      const parts: string[] = []
      for (let i = 0; i < e.results.length; i++) {
        parts.push(e.results[i][0].transcript)
      }
      const transcript = parts.join('')
      setInputText(transcript)
      if (e.results[e.results.length - 1].isFinal) {
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
                <h1 className="text-[22px] font-extrabold text-white">Samtale</h1>
                <p className="text-[13px] text-white/40">Snakk norsk med din AI-tutor</p>
              </div>

              {/* Topic grid */}
              <div className="grid grid-cols-2 gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopic(t.id)}
                    className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors active:scale-[0.98] ${
                      selectedTopic === t.id
                        ? 'border-nc-green/60 bg-nc-green/5'
                        : 'border-nc-border bg-nc-card hover:border-nc-green/30'
                    }`}
                  >
                    <span className="text-2xl">{t.emoji}</span>
                    <div>
                      <div className="text-[13px] font-bold text-white">{t.label}</div>
                      <div className="text-[11px] text-white/40">{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Level selector */}
              <div>
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/40">Nivå</div>
                <div className="flex gap-2">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`flex-1 rounded-xl py-2 text-[12px] font-bold border transition-colors ${
                        level === l
                          ? 'bg-nc-green text-[#0d0d14] border-nc-green'
                          : 'bg-nc-card border-nc-border text-white/60'
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
                className="w-full rounded-xl bg-nc-green py-4 text-sm font-extrabold text-[#0d0d14] disabled:opacity-40 transition-transform active:scale-[0.98]"
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
                <div className="text-[15px] font-bold text-white">
                  {TOPICS.find((t) => t.id === selectedTopic)?.emoji}{' '}
                  {TOPICS.find((t) => t.id === selectedTopic)?.label}
                </div>
                <button
                  onClick={() => { setPhase('setup'); window.speechSynthesis?.cancel() }}
                  className="flex items-center gap-1 rounded-full bg-nc-card border border-nc-border px-3 py-1 text-[11px] text-white/50 hover:text-white transition-colors"
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
                        <span className="text-[10px] font-semibold text-white/30">Kari</span>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-nc-green/20 border border-nc-green/20 text-white rounded-br-sm'
                          : 'bg-nc-card border border-nc-border text-white rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {/* Correction card */}
                    {msg.role === 'tutor' && msg.correction && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-[80%] rounded-xl bg-amber-500/8 border border-amber-500/20 px-3 py-2"
                      >
                        <p className="text-[12px] text-white/70">
                          <span className="line-through text-white/30">{msg.correction.original}</span>
                          {' → '}
                          <span className="text-amber-400 font-semibold">{msg.correction.corrected}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/40">{msg.correction.explanation}</p>
                      </motion.div>
                    )}
                  </div>
                ))}

                {/* Thinking indicator */}
                {isThinking && (
                  <div className="flex items-start gap-2">
                    <span className="text-sm">🇳🇴</span>
                    <div className="rounded-2xl rounded-bl-sm bg-nc-card border border-nc-border px-4 py-3 flex gap-1">
                      {[0, 0.2, 0.4].map((delay) => (
                        <motion.div
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-white/30"
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
                  className="flex-1 rounded-xl bg-nc-card border border-nc-border px-4 py-2.5 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-nc-green/40 transition-colors"
                />
                {hasSpeechAPI && (
                  <button
                    onClick={toggleListening}
                    className={`rounded-xl border px-3 py-2.5 transition-colors ${
                      isListening
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-nc-card border-nc-border text-white/60 hover:text-white'
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
                  className="rounded-xl bg-nc-green px-3 py-2.5 text-[#0d0d14] disabled:opacity-40 transition-colors"
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
