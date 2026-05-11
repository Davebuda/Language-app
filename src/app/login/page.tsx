'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    const { error } = await signIn(email)

    if (error) {
      setErrorMsg(error)
      setLoading(false)
      return
    }

    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-transparent px-5 py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex h-10 w-10 items-center justify-center rounded-[0.9rem] border border-nc-border bg-white text-nc-text-dim transition-colors hover:text-nc-text"
            aria-label="Tilbake"
          >
            <ArrowLeft size={14} />
          </Link>
          <div className="nc-label">Account</div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-4"
        >
          <div className="nc-panel-dark p-6">
            <div className="pointer-events-none absolute inset-0 opacity-45">
              <div className="nc-pattern-orbits absolute inset-0" />
              <div className="nc-topography absolute inset-x-0 bottom-0 h-32 opacity-70" />
            </div>
            <div className="relative z-[1] flex items-center justify-between gap-4">
              <div>
                <div className="nc-label-light">NorskCoach account</div>
                <h1 className="mt-3 max-w-[14rem] text-[2.35rem] leading-[0.96] text-white">
                  Fremgangen din,
                  <br />
                  overalt.
                </h1>
                <p className="mt-4 max-w-[17rem] text-[15px] leading-7 text-white/62">
                  Koble læringsprofilen din til e-post og fortsett sømløst på tvers av enheter.
                </p>
              </div>
              <div className="hidden h-20 w-20 rounded-[1rem] border border-white/10 bg-white/5 md:block">
                <div className="nc-pattern-orbits h-full w-full opacity-60" />
              </div>
            </div>
          </div>

          <div className="nc-panel p-6">
            <div className="nc-label">Sign in</div>
            <div className="mt-2 text-[1.45rem] font-display font-semibold text-nc-text">
              Synkroniser profilen din
            </div>
            <p className="mt-2 text-sm leading-7 text-nc-text-muted">
              Vi sender deg en innloggingslenke. Ingen passord, bare rask tilgang til samme
              læringshistorikk overalt.
            </p>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="nc-panel-soft mt-6 px-5 py-5"
                >
                  <div className="nc-label">Sjekk innboksen</div>
                  <p className="mt-2 text-sm leading-7 text-nc-text-muted">
                    Vi sendte en lenke til <span className="font-medium text-nc-text">{email}</span>.
                  </p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="mt-6 flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="email"
                      className="text-[13px] font-medium text-nc-text-muted"
                    >
                      E-postadresse
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="deg@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="nc-input"
                    />
                  </div>

                  {errorMsg ? (
                    <p className="rounded-[0.9rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                      {errorMsg}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="nc-button-dark inline-flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <span>{loading ? 'Sender…' : 'Send innloggingslenke'}</span>
                    {!loading ? <ArrowRight size={15} /> : null}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="mt-7 text-center text-sm leading-7 text-nc-text-dim">
              Vil du bare utforske først?{' '}
              <Link
                href="/dashboard"
                className="font-medium text-nc-violet transition-colors hover:text-nc-text"
              >
                Fortsett uten innlogging
              </Link>
              .
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
