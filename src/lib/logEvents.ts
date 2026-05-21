import { createClient } from '@/lib/supabase/client'
import type { ExerciseResult } from '@/types/session'

/**
 * Produce a stable, one-way anonymous ID for a Supabase user.
 * SHA-256 of the user ID, hex-encoded, first 16 chars.
 * Gives per-learner longitudinal continuity without exposing real user IDs.
 */
async function hashUserId(userId: string): Promise<string> {
  const encoded = new TextEncoder().encode(userId)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return hex.slice(0, 16)
}

/**
 * Fire-and-forget: write one row per ExerciseResult to learning_events_log.
 * Auth users only — guests are silently skipped.
 * Never throws; never blocks the caller.
 */
export function logSessionResults(userId: string, results: ExerciseResult[]): void {
  void _write(userId, results)
}

async function _write(userId: string, results: ExerciseResult[]): Promise<void> {
  try {
    if (!results.length) return

    const anonymousSessionId = await hashUserId(userId)
    const supabase = createClient()

    const rows = results.map((r) => ({
      event_type: 'exercise_result' as const,
      concept_id: r.conceptId,
      correct_bool: r.correct,
      anonymous_session_id: anonymousSessionId,
    }))

    const { error } = await supabase.from('learning_events_log').insert(rows)
    if (error) {
      console.warn('[logEvents] insert failed:', error.message)
    }
  } catch (err) {
    // Telemetry must never break the learning flow
    console.warn('[logEvents] unexpected error:', err)
  }
}
