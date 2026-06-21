import { ReadReciteWriteScreen } from '@/components/skriv/ReadReciteWriteScreen'
import { SEED_READING_PASSAGES } from '@/lib/reading-loader'
import type { ReadingPassage } from '@/types/content'

export const metadata = { title: 'Skriv — NorskCoach' }

// Standalone read→recite→write lane. B1+B2 content; the client screen applies the
// honest level gate (a learner below B1 sees a "kommer for ditt nivå" message).
export default function SkrivPage() {
  const passages: ReadingPassage[] = Object.values(SEED_READING_PASSAGES)

  return (
    <main className="min-h-dvh bg-[var(--nc-bg)]">
      <ReadReciteWriteScreen passages={passages} />
    </main>
  )
}
