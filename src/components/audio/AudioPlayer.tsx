'use client'

import { useRef, useState, useCallback } from 'react'
import { motion } from 'framer-motion'

interface AudioPlayerProps {
  src?: string           // URL to static audio file (Opus/WebM or MP3)
  fallbackText?: string  // Norwegian text for browser TTS fallback
  label?: string         // Accessible label
  size?: 'sm' | 'md'
  onPlayEnd?: () => void
}

export function AudioPlayer({ src, fallbackText, label, size = 'md', onPlayEnd }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const play = useCallback(() => {
    if (src) {
      // Static audio file path
      if (!audioRef.current) {
        audioRef.current = new Audio(src)
        audioRef.current.onended = () => { setIsPlaying(false); onPlayEnd?.() }
        audioRef.current.onerror = () => {
          setIsPlaying(false)
          // Fallback to browser TTS if static file fails
          if (fallbackText) speakWithBrowserTTS(fallbackText, onPlayEnd)
        }
      }
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        setIsPlaying(false)
        if (fallbackText) speakWithBrowserTTS(fallbackText, onPlayEnd)
      })
      setIsPlaying(true)
    } else if (fallbackText) {
      // Browser TTS fallback
      speakWithBrowserTTS(fallbackText, () => { setIsPlaying(false); onPlayEnd?.() })
      setIsPlaying(true)
    }
  }, [src, fallbackText, onPlayEnd])

  const iconSize = size === 'sm' ? 14 : 18
  const buttonSize = size === 'sm' ? 'size-8' : 'size-10'

  return (
    <motion.button
      onClick={play}
      disabled={isPlaying}
      whileTap={{ scale: 0.95 }}
      aria-label={label ?? 'Spill av lyd'}
      className={`${buttonSize} inline-flex items-center justify-center rounded-full border border-[var(--nc-border)] text-[var(--nc-text-muted)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--nc-text)] disabled:opacity-50`}
    >
      {isPlaying ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      )}
    </motion.button>
  )
}

function speakWithBrowserTTS(text: string, onEnd?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  const voices = window.speechSynthesis.getVoices()
  const norVoice = voices.find((v) => v.lang.startsWith('nb') || v.lang.startsWith('nn'))
  if (norVoice) utter.voice = norVoice
  utter.lang = 'nb-NO'
  utter.rate = 0.9
  if (onEnd) utter.onend = onEnd
  window.speechSynthesis.speak(utter)
}
