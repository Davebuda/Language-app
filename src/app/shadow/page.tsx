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

  // Pass shadowable sentences from ALL levels — the client picks 5 at (or, when a
  // level is empty, honestly below) the learner's level. B2 was previously omitted,
  // so a B2 learner was silently served B1/A2/A1 (Rule 6 violation).
  const candidateSentences: Sentence[] = Object.values(sentences).filter(
    (s) =>
      (s.cefrLevel === 'A1' || s.cefrLevel === 'A2' || s.cefrLevel === 'B1' || s.cefrLevel === 'B2') &&
      isShadowableSentence(s)
  )

  return (
    <main className="min-h-dvh bg-[var(--nc-bg)]">
      <ShadowingScreen candidateSentences={candidateSentences} />
    </main>
  )
}
