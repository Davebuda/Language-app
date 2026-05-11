import { PlacementQuiz } from '@/components/onboarding/PlacementQuiz'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = { title: 'Kom i gang — NorskCoach' }

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-nc-bg">
      <div className="px-5 pt-5">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60">
          <ArrowLeft size={16} />
          Tilbake
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pb-10 pt-8">
        <PlacementQuiz />
      </div>
    </main>
  )
}
