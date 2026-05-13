import { createClient } from '@/lib/supabase/client'

export type EventType =
  | 'session_started'
  | 'session_completed'
  | 'exercise_result'
  | 'repair_triggered'
  | 'level_changed'

interface EmitParams {
  eventType: EventType
  mode: string
  payload?: Record<string, unknown>
  conceptIds?: string[]
  errorTags?: string[]
  sessionId?: string
  vocabItemIds?: string[]
}

export function emitEvent(params: EmitParams): void {
  // Fire-and-forget — never blocks the caller, never throws
  void _emit(params)
}

async function _emit(params: EmitParams): Promise<void> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return // guests: no ledger writes

    await supabase.from('learning_events').insert({
      event_type: params.eventType,
      mode: params.mode,
      payload: params.payload ?? {},
      concept_ids: params.conceptIds ?? [],
      error_tags: params.errorTags ?? [],
      session_id: params.sessionId ?? null,
      user_id: session.user.id,
      vocab_item_ids: params.vocabItemIds ?? [],
    })
  } catch {
    // Silent — telemetry must never break the learning flow
  }
}
