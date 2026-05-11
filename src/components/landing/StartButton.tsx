'use client'

import { useRouter } from 'next/navigation'

export function StartButton() {
  const router = useRouter()

  function handleStart() {
    const onboarded =
      typeof window !== 'undefined'
        ? localStorage.getItem('norskcoach_onboarded')
        : null
    router.push(onboarded ? '/dashboard' : '/onboarding')
  }

  return (
    <button
      onClick={handleStart}
      className="nc-button-primary inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-[15px] font-semibold transition-transform active:scale-[0.98] sm:w-auto sm:px-8"
    >
      <span>Start gratis</span>
      <span aria-hidden>{'->'}</span>
    </button>
  )
}
