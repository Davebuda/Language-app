import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Only allow relative paths — no open redirects to external domains
function safeRedirectPath(next: string | null): string {
  if (!next) return '/';
  // Must start with / and must NOT start with // (which browsers treat as protocol-relative)
  return /^\/[^/]/.test(next) ? next : '/';
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeRedirectPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
