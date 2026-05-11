'use client'

import { useEffect } from 'react'
import { aiService } from '@/ai'

export function AILoader() {
  useEffect(() => {
    // Start loading the local model immediately — non-blocking
    // By the time a user reaches conversation/writing, it may already be ready
    void aiService.init()
  }, [])
  return null
}
