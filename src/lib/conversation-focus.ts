import { runDiagnosis } from '@/engine'
import type { MistakeFingerprint } from '@/types/fingerprint'

// Tier-2 Slice A — diagnosis-aware Kari. The weak spot the AI tutor should gently
// steer the conversation toward. Derived from the SAME diagnosis engine that drives
// the moat and gated at the SAME >=0.7 confidence the dashboard uses to NAME a root
// cause — so Kari only ever steers toward a weakness the engine actually has evidence
// for. Below that (cold start, fallback 0.45, or the 0.6 mid-band) it returns null and
// Kari stays in her general, level-only mode — she never fabricates a weak spot
// (Rule 6/8). This is DISPLAY-ONLY: it shapes the conversation, it never moves mastery
// (corrections still pass the confirmedRepair gate, unchanged).
const STEER_MIN_CONFIDENCE = 0.7

export function buildConversationFocus(
  fingerprint: MistakeFingerprint | null | undefined,
): string | null {
  if (!fingerprint) return null
  const top = runDiagnosis(fingerprint)[0]
  if (!top || top.confidence < STEER_MIN_CONFIDENCE) return null
  return top.rootCauseConceptId ?? null
}
