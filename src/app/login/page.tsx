'use client'

import { Suspense, useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

function LoginForm() {
  const { signIn } = useAuth()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
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

  return (
    <div className="nc-gradient-page flex flex-col min-h-dvh px-5 py-5">
      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="nc-glass inline-flex h-10 w-10 items-center justify-center text-[var(--nc-text-muted)] transition-colors hover:text-[var(--nc-text)]"
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
          <div className="nc-glass-elevated p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="nc-label">NorskCoach account</div>
                <h1 className="mt-3 max-w-[14rem] text-[2.35rem] leading-[0.96] text-[var(--nc-text)]">
                  Fremgangen din,
                  <br />
                  overalt.
                </h1>
                <p className="mt-4 max-w-[17rem] text-[15px] leading-7 text-[var(--nc-text-muted)]">
                  Koble læringsprofilen din til e-post og fortsett sømløst på tvers av enheter.
                </p>
              </div>
            </div>
          </div>

          <div className="nc-surface p-6">
            <div className="nc-label" style={{ color: 'rgba(17,17,16,0.55)' }}>Sign in</div>
            <div className="mt-2 text-[1.45rem] font-display font-semibold" style={{ color: '#111110' }}>
              Synkroniser profilen din
            </div>
            <p className="mt-2 text-sm leading-7" style={{ color: 'rgba(17,17,16,0.55)' }}>
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
                  className="mt-6 rounded-[var(--radius)] border border-[rgba(17,17,16,0.10)] bg-[rgba(17,17,16,0.04)] px-5 py-5"
                >
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'rgba(17,17,16,0.45)' }}>
                    Sjekk innboksen
                  </div>
                  <p className="mt-2 text-sm leading-7" style={{ color: 'rgba(17,17,16,0.55)' }}>
                    Vi sendte en lenke til{' '}
                    <span className="font-medium" style={{ color: '#111110' }}>{email}</span>.
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
                      className="text-[13px] font-medium"
                      style={{ color: 'rgba(17,17,16,0.55)' }}
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
                      className="w-full min-h-[3rem] rounded-[var(--radius)] border-[1.5px] border-[rgba(17,17,16,0.15)] bg-[rgba(17,17,16,0.04)] px-4 py-3 text-[0.9375rem] outline-none transition-colors focus:border-[#DC2626] focus:ring-2 focus:ring-[rgba(220,38,38,0.12)]"
                      style={{ color: '#111110' }}
                    />
                  </div>

                  {errorMsg ? (
                    <p className="rounded-[0.9rem] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                      {errorMsg}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="nc-button-primary inline-flex min-h-[48px] w-full items-center justify-center gap-2 px-4 py-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <span>{loading ? 'Sender…' : 'Send innloggingslenke'}</span>
                    {!loading ? <ArrowRight size={15} /> : null}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            <p className="mt-7 text-center text-sm leading-7" style={{ color: 'rgba(17,17,16,0.45)' }}>
              Vil du bare utforske først?{' '}
              <Link
                href="/dashboard"
                className="font-medium transition-colors hover:opacity-80"
                style={{ color: '#DC2626' }}
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

export default function LoginPage() {
  // Suspense boundary required by Next.js 15 because useSearchParams() inside
  // LoginForm causes a CSR bailout during static prerender otherwise.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
