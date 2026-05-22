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

/**
 * Fire-and-forget: write a single weekly_check_complete row to learning_events_log.
 * Auth users only — guests are silently skipped.
 * `passed` is recorded against a virtual concept_id of "weekly-check" so future
 * analytics can ask "how often do learners pass the weekly retention check?"
 * without conflating it with per-concept exercise results.
 * Never throws; never blocks the caller.
 */
export function logWeeklyCheckComplete(
  userId: string,
  { score, items }: { score: number; items: number },
): void {
  void _writeWeeklyCheck(userId, score, items)
}

async function _writeWeeklyCheck(
  userId: string,
  score: number,
  items: number,
): Promise<void> {
  try {
    if (items <= 0) return

    const anonymousSessionId = await hashUserId(userId)
    const supabase = createClient()

    // Threshold for "passed" matches the graduation rule's demote floor (score >= 50).
    const passed = score >= 50

    const { error } = await supabase.from('learning_events_log').insert({
      event_type: 'weekly_check_complete' as const,
      concept_id: 'weekly-check',
      correct_bool: passed,
      anonymous_session_id: anonymousSessionId,
    })
    if (error) {
      console.warn('[logEvents] weekly check insert failed:', error.message)
    }
  } catch (err) {
    console.warn('[logEvents] weekly check unexpected error:', err)
  }
}

/**
 * Fire-and-forget: write one concept_exposure row per conceptId to learning_events_log.
 * Auth users only — guests are silently skipped.
 * Reading text completion produces these rows so future analytics can ask
 * "are learners getting passive exposure to focus concepts?" alongside the
 * existing per-exercise rows.
 * `correct_bool: true` semantically means "exposure occurred" (the column is
 * NOT NULL per migration 003); it does not imply correctness.
 * Never throws; never blocks the caller.
 */
export function logConceptExposure(userId: string, conceptIds: string[]): void {
  void _writeExposure(userId, conceptIds)
}

async function _writeExposure(userId: string, conceptIds: string[]): Promise<void> {
  try {
    if (!conceptIds.length) return

    const unique = Array.from(new Set(conceptIds))
    const anonymousSessionId = await hashUserId(userId)
    const supabase = createClient()

    const rows = unique.map((conceptId) => ({
      event_type: 'concept_exposure' as const,
      concept_id: conceptId,
      correct_bool: true,
      anonymous_session_id: anonymousSessionId,
    }))

    const { error } = await supabase.from('learning_events_log').insert(rows)
    if (error) {
      console.warn('[logEvents] exposure insert failed:', error.message)
    }
  } catch (err) {
    console.warn('[logEvents] exposure unexpected error:', err)
  }
}
