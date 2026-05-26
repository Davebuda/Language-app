const AUDIO_BASE_PATH = '/audio/sentences'

export function getAudioUrl(sentenceId: string): string | undefined {
  if (!sentenceId) return undefined
  return `${AUDIO_BASE_PATH}/${sentenceId}.mp3`
}

export function hasAudio(sentenceId: string): boolean {
  return !!sentenceId
}
