'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

function LoginForm() {
  const { signIn, verifyCode } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // P0.5-13 (F006): surface ?error=auth_failed from /auth/callback so users
  // who clicked an expired/invalid magic link see a real banner rather than
  // landing silently on the default form.
  useEffect(() => {
    const err = searchParams?.get('error')
    if (err === 'auth_failed') {
      setErrorMsg('Innloggingslenken er ugyldig eller utløpt. Be om en ny lenke under.')
    }
  }, [searchParams])

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

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    const { error } = await verifyCode(email, code)

    if (error) {
      setErrorMsg('Koden er ugyldig eller utløpt. Prøv igjen.')
      setLoading(false)
      return
    }

    // onAuthStateChange in useAuth picks up the new session; route into the app.
    router.push('/dashboard')
  }

  return (
    <div className="nc-gradient-page nc-secondary-flow flex min-h-dvh flex-col">
      <div className="nc-mobile-shell relative z-10 flex min-h-dvh flex-col px-1.5 pb-10 pt-4">

        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="nc-glass inline-flex h-11 w-11 items-center justify-center text-[var(--nc-text-muted)] transition-transform hover:-translate-y-0.5"
            aria-label="Tilbake"
          >
            <ArrowLeft size={15} />
          </Link>
          <span className="nc-label">Konto</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 flex flex-1 flex-col gap-[6px]"
        >
          {/* Lime focal panel — headline */}
          <div className="nc-signal-panel p-4">
            <div className="nc-label">NorskCoach</div>
            <h1 className="mt-2 text-balance font-display text-[2rem] font-extrabold leading-[0.94] tracking-[-0.03em] text-[var(--nc-signal-fg)]">
              Fremgangen din,
              <br />overalt.
            </h1>
            <p className="mt-2 text-pretty text-[0.82rem] leading-[1.55] text-[rgba(10,18,6,0.52)]">
              Koble læringsprofilen til e-post og fortsett sømløst på alle enheter.
            </p>
          </div>

          {/* Cream sign-in panel */}
          <div className="nc-glass-cream p-4">
            <div className="nc-label">Logg inn</div>
            <div className="mt-1 font-display text-[1.2rem] font-extrabold leading-tight tracking-[-0.02em] text-[var(--nc-cream-text)]">
              Synkroniser profilen din
            </div>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.form
                  key="code"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleVerify}
                  className="mt-4 flex flex-col gap-3"
                >
                  <div className="rounded-[var(--radius)] border border-[rgba(17,21,24,0.10)] bg-[rgba(17,21,24,0.05)] px-4 py-3">
                    <div className="nc-label">Sjekk innboksen</div>
                    <p className="mt-1.5 text-[0.82rem] leading-[1.55] text-[var(--nc-cream-muted)]">
                      Vi sendte en kode til{' '}
                      <span className="font-semibold text-[var(--nc-cream-text)]">{email}</span>.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="code"
                      className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-cream-muted)]"
                    >
                      Engangskode
                    </label>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="123456"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                      className="nc-input-cream text-center text-lg font-semibold tracking-[0.4em]"
                    />
                  </div>

                  {errorMsg ? (
                    <p className="rounded-[var(--radius)] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-2.5 text-[0.82rem] text-[var(--nc-red)]">
                      {errorMsg}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || code.length < 6}
                    className="nc-button-dark inline-flex min-h-[48px] w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <span>{loading ? 'Logger inn…' : 'Logg inn'}</span>
                    {!loading ? <ArrowRight size={15} aria-hidden="true" /> : null}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSubmitted(false)
                      setCode('')
                      setErrorMsg(null)
                    }}
                    className="text-[0.78rem] font-semibold text-[var(--nc-cream-muted)] transition-opacity hover:opacity-80"
                  >
                    Bruk en annen e-post
                  </button>
                </motion.form>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="mt-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="email"
                      className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--nc-cream-muted)]"
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
                      className="nc-input-cream"
                    />
                  </div>

                  {errorMsg ? (
                    <p className="rounded-[var(--radius)] border border-[var(--nc-red-border)] bg-[var(--nc-red-tint)] px-3 py-2.5 text-[0.82rem] text-[var(--nc-red)]">
                      {errorMsg}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="nc-button-dark inline-flex min-h-[48px] w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <span>{loading ? 'Sender…' : 'Send kode'}</span>
                    {!loading ? <ArrowRight size={15} aria-hidden="true" /> : null}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Dark footer note */}
          <div className="nc-glass px-4 py-3 text-center">
            <p className="text-[0.78rem] text-[var(--nc-text-muted)]">
              Vil du bare utforske?{' '}
              <Link
                href="/dashboard"
                className="font-semibold text-[var(--nc-signal)] transition-opacity hover:opacity-80"
              >
                Fortsett uten innlogging
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  // Suspense boundary required by Next.js 15 because useSearchParams() inside
  // LoginForm causes a CSR bailout during static prerender otherwise.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
