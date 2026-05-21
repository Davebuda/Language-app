'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal browser typings for the Web Speech API
// (not in @types/react — browser vendor types only)
interface SpeechRecognitionResult {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: { readonly transcript: string }
}

interface SpeechRecognitionEvent {
  readonly results: {
    readonly length: number
    readonly [index: number]: SpeechRecognitionResult
  }
}

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
  abort(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export interface UseSpeechRecognitionReturn {
  transcript: string
  interimTranscript: string
  isListening: boolean
  isSupported: boolean
  start: () => void
  stop: () => void
  reset: () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionCtor() !== null

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    // Abort any active session before starting a fresh one
    recognitionRef.current?.abort()

    const rec = new Ctor()
    recognitionRef.current = rec
    rec.lang = 'nb-NO'
    rec.continuous = false
    rec.interimResults = true

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''

      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          finalText += text
        } else {
          interimText += text
        }
      }

      if (finalText) {
        setTranscript(finalText)
        setInterimTranscript('')
        setIsListening(false)
      } else {
        setInterimTranscript(interimText)
      }
    }

    rec.onend = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    rec.onerror = () => {
      setIsListening(false)
      setInterimTranscript('')
    }

    rec.start()
    setIsListening(true)
    setTranscript('')
    setInterimTranscript('')
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
    setInterimTranscript('')
  }, [])

  const reset = useCallback(() => {
    recognitionRef.current?.abort()
    setIsListening(false)
    setTranscript('')
    setInterimTranscript('')
  }, [])

  return { transcript, interimTranscript, isListening, isSupported, start, stop, reset }
}
