'use client'

import { useRouter } from 'next/navigation'

export function StartButton() {
  const router = useRouter()

  function handleStart() {
    const onboarded =
      typeof window !== 'undefined' ? localStorage.getItem('norskcoach_onboarded') : null
    router.push(onboarded ? '/dashboard' : '/onboarding')
  }

  return (
    <button
      onClick={handleStart}
      className="w-full rounded-xl bg-nc-green px-6 py-4 text-[15px] font-extrabold text-[#0d0d14] transition-transform active:scale-[0.98] sm:w-auto sm:px-10"
    >
      Start gratis →
    </button>
  )
}
