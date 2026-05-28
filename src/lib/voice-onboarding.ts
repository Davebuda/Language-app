import type { CEFRLevel } from '@/types/fingerprint'

export interface VoiceOnboardingTurn {
  role: 'kari' | 'user'
  text: string
  turnIndex: number
}

export interface VoiceOnboardingResult {
  transcript: VoiceOnboardingTurn[]
  estimatedLevel: CEFRLevel
  completedTurns: number
  timestamp: string
}

export const KARI_GREETING =
  'Hei! Jeg er Kari, din norsktrener. Skal vi prøve å snakke litt norsk?'

export const KARI_CLOSING =
  'Bra! Jeg har en idé om hvor du er. Skal vi finne ut nøyaktig?'

export const KARI_QUESTIONS = [
  'Hva heter du?',
  'Hva liker du å gjøre på fritiden?',
  'Fortell meg om jobben din.',
  'Hva synes du om å lære norsk?',
  'Hvis du kunne bo hvor som helst i Norge, hvor ville du bodd?',
] as const

const A2_VERBS = /\b(liker|jobber|bor|spiser|snakker|leser|skriver|går|kommer|har|er|kan|vil|skal|må|gjør|ser|heter|tenker|trenger)\b/gi
const B1_PATTERNS = /\b(fordi|derfor|selv om|når|hvis|at jeg|som er|ville|kunne|burde|hadde)\b/gi
const B2_PATTERNS = /\b(dersom|i tillegg|på grunn av|til tross for|ville ha|kunne ha|skulle ønske)\b/gi

export function estimateLevelFromTranscript(turns: VoiceOnboardingTurn[]): CEFRLevel {
  const userTurns = turns.filter((t) => t.role === 'user')
  if (userTurns.length === 0) return 'A1'

  let maxLevel: CEFRLevel = 'A1'

  for (const turn of userTurns) {
    const words = turn.text.trim().split(/\s+/)
    const wordCount = words.length
    const text = turn.text

    if (B2_PATTERNS.test(text) && wordCount >= 8) {
      maxLevel = 'B2'
      B2_PATTERNS.lastIndex = 0
      break
    }
    B2_PATTERNS.lastIndex = 0

    if (B1_PATTERNS.test(text) && wordCount >= 6) {
      if (maxLevel === 'A1' || maxLevel === 'A2') maxLevel = 'B1'
      B1_PATTERNS.lastIndex = 0
      continue
    }
    B1_PATTERNS.lastIndex = 0

    const verbMatches = text.match(A2_VERBS)
    if (verbMatches && verbMatches.length >= 2 && wordCount >= 4) {
      if (maxLevel === 'A1') maxLevel = 'A2'
      continue
    }

    if (wordCount >= 3) {
      if (maxLevel === 'A1') maxLevel = 'A1'
    }
  }

  return maxLevel
}

const STORAGE_KEY = 'norskcoach_voice_onboarding'

export function saveVoiceOnboardingResult(result: VoiceOnboardingResult): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result))
  } catch {
    // sessionStorage unavailable
  }
}

export function getVoiceOnboardingResult(): VoiceOnboardingResult | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as VoiceOnboardingResult
  } catch {
    return null
  }
}

export function clearVoiceOnboardingResult(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
