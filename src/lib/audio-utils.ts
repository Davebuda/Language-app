const AUDIO_BASE_PATH = '/audio/sentences'

export function getAudioUrl(sentenceId: string): string | undefined {
  if (!sentenceId) return undefined
  return `${AUDIO_BASE_PATH}/${sentenceId}.mp3`
}

export function hasAudio(sentenceId: string): boolean {
  return !!sentenceId
}

// Resolve the MP3 URL a listening surface should attempt for a resolved
// sentence. Seed sentences have 100% pre-generated audio coverage (one
// `{id}.mp3` per sentence), so when no explicit audioUrl is set we derive the
// deterministic path from the id. Generated content (source === 'generated')
// has no MP3 file, so it returns undefined and the caller falls back to TTS
// (Operating Rule 6 — no dead "Spill av" button for content with no audio).
export function resolveSeedAudioUrl(
  audioUrl: string | undefined,
  sentenceId: string,
  source?: 'seed' | 'generated',
): string | undefined {
  if (audioUrl) return audioUrl
  if (source === 'generated') return undefined
  return getAudioUrl(sentenceId)
}
