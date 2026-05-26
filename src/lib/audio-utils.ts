// Maps sentence IDs to audio file URLs.
// In v1, audio files are static assets in public/audio/sentences/
// Generated offline via edge-tts batch pipeline.

// AUDIO_BASE_PATH is unused until batch generation runs.
// TODO: uncomment and use when audio files exist:
// const AUDIO_BASE_PATH = '/audio/sentences'

export function getAudioUrl(_sentenceId: string): string | undefined {
  // Returns undefined until audio files are generated via scripts/generate-audio.mjs.
  // AudioPlayer falls back to browser TTS when src is undefined.
  // TODO: return `${AUDIO_BASE_PATH}/${_sentenceId}.webm` once batch generation runs
  return undefined
}

export function hasAudio(sentenceId: string): boolean {
  return getAudioUrl(sentenceId) !== undefined
}
