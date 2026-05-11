'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    // Auth deferred to Phase 3 — simulate submission for now
    await new Promise((r) => setTimeout(r, 600))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-nc-bg">
      {/* Back arrow */}
      <div className="absolute top-5 left-5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-white/30 hover:text-white/60 transition-colors"
        >
          <ArrowLeft size={16} />
          Tilbake
        </Link>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="mb-10 flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full bg-nc-green"
            style={{ boxShadow: '0 0 12px rgba(168,239,106,0.6)' }}
          />
          <span className="text-[12px] font-bold uppercase tracking-[0.15em] text-white/30">
            NorskCoach
          </span>
        </div>

        <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-tight text-white mb-2">
          Fremgangen din,<br />overalt.
        </h1>
        <p className="text-[15px] mb-8 text-white/40 leading-relaxed">
          Logg inn for å synkronisere fremgangen din på tvers av enheter.
        </p>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-nc-green/20 bg-nc-green/6 px-6 py-5"
            >
              <p className="font-bold text-sm mb-1 text-nc-green">
                Sjekk e-posten din
              </p>
              <p className="text-sm text-white/50">
                Vi sendte en innloggingslenke til{' '}
                <span className="font-semibold text-white/80">{email}</span>.
              </p>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-semibold text-white/50">
                  E-postadresse
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="deg@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-nc-border bg-[rgba(255,255,255,0.04)] px-4 text-sm text-white placeholder:text-white/20 outline-none transition-all focus:border-nc-green/50 focus:ring-1 focus:ring-nc-green/30"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="h-12 w-full rounded-xl bg-nc-green font-bold text-[#0d0d14] transition-all hover:bg-nc-green/90 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {loading ? 'Sender…' : 'Send innloggingslenke'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-8 text-sm text-center text-white/25">
          Ikke behov for konto —{' '}
          <Link href="/dashboard" className="font-semibold text-nc-green/70 hover:text-nc-green transition-colors">
            fortsett uten innlogging
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
