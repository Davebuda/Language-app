'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

interface UseAuthReturn extends AuthState {
  signIn: (email: string) => Promise<{ error: string | null }>
  verifyCode: (email: string, token: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(async (email: string): Promise<{ error: string | null }> => {
    const supabase = createClient()
    // Send a 6-digit OTP code (no emailRedirectTo) rather than a magic link.
    // The magic-link ?code= path is PKCE: its code_verifier is stored locally in
    // the browser that requested the link, so the exchange can only complete on
    // that same device — which silently breaks cross-device login (request on
    // desktop, open on phone). verifyOtp below is stateless (email + typed code,
    // no verifier cookie), so the code works on any device. The email contains a
    // code instead of a link only when the Magic Link template emits {{ .Token }}.
    const { error } = await supabase.auth.signInWithOtp({ email })
    return { error: error?.message ?? null }
  }, [])

  const verifyCode = useCallback(
    async (email: string, token: string): Promise<{ error: string | null }> => {
      const supabase = createClient()
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
      return { error: error?.message ?? null }
    },
    [],
  )

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }, [router])

  return { ...state, signIn, verifyCode, signOut }
}
