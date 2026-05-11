'use client'

import dynamic from 'next/dynamic'

const AILoader = dynamic(
  () => import('./AILoader').then(m => ({ default: m.AILoader })),
  { ssr: false }
)

export function ClientAILoader() {
  return <AILoader />
}
