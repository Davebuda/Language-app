import { ShadowingScreen } from '@/components/muntlig/ShadowingScreen'
import { loadContentSentences } from '@/lib/content-loader'
import type { Sentence } from '@/types/content'

export const metadata = { title: 'Skygging — NorskCoach' }

// Sentences with blanks (fill-in-blank) are not suitable for reading aloud.
function isShadowableSentence(s: Sentence): boolean {
  return (
    !s.norwegian.includes('___') &&
    s.norwegian.trim().length > 0
  )
}

export default function ShadowPage() {
  const { sentences } = loadContentSentences()

  // Pass A1 + A2 shadowable sentences to the client — client picks 5 based on fingerprint level
  const candidateSentences: Sentence[] = Object.values(sentences).filter(
    (s) =>
      (s.cefrLevel === 'A1' || s.cefrLevel === 'A2' || s.cefrLevel === 'B1') &&
      isShadowableSentence(s)
  )

  return (
    <main className="min-h-dvh">
      <ShadowingScreen candidateSentences={candidateSentences} />
    </main>
  )
}
