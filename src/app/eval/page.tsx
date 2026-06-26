import { notFound } from 'next/navigation'
import { EvalHarness } from './EvalHarness'

// E-01: the AI-quality eval harness drives real Groq spend + forces an on-device
// model download. It is a dev-only tool and must never be reachable in production
// — an unauthenticated visitor could otherwise run 24×3 tasks against the live AI.
// Server-component guard: in a production build this route 404s.
export default function EvalPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return <EvalHarness />
}
