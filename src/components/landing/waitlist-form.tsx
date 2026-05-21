'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { z } from 'zod'
import { submitWaitlist } from '@/app/actions/waitlist'

const emailSchema = z.string().email()

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const result = emailSchema.safeParse(email)
    if (!result.success) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const response = await submitWaitlist(email)
      if (response.success) {
        setSubmitted(true)
      } else {
        setError(response.error ?? 'Something went wrong.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.45, ease: 'easeOut' }}
      className="mt-10"
    >
      {submitted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-3 rounded-xl px-5 py-4 text-sm font-medium"
          style={{
            background: 'rgba(220,38,38,0.14)',
            border: '1px solid rgba(220,38,38,0.28)',
          }}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 text-nc-red" />
          <span className="min-w-0 text-foreground">
            You&apos;re on the list. We&apos;ll reach out when early access opens.
          </span>
        </motion.div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex-1">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="your@email.com"
                aria-label="Email address"
                className="w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle outline-none transition-all duration-200 focus:ring-2 focus:ring-brand-500/50"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: error
                    ? '1px solid rgba(239,68,68,0.5)'
                    : '1px solid rgba(255,255,255,0.08)',
                  caretColor: 'var(--nc-red)',
                }}
              />
              {error && (
                <p className="mt-1.5 text-xs text-red-400">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'var(--nc-red)',
              }}
            >
              {loading ? 'Joining…' : 'Join waitlist'}
              {!loading && (
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              )}
            </button>
          </div>

          <p className="mt-3 text-xs text-foreground-subtle">
            Early access. No spam. Unsubscribe any time.
          </p>
        </form>
      )}
    </motion.div>
  )
}
