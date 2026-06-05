# Scout Brief: magic-link-redirect-localhost (v2 — root-caused)

**Date:** 2026-06-04
**Idea:** Why does the email magic link land on `pandoai.no/?code=…` on desktop but `localhost` on mobile — and what's the fix?
**Run mode:** focused (technical, codebase + Supabase docs) | **Supersedes:** v1 brief (template-hardcode hypothesis)

---

## TL;DR — the verdict
- **You are on the wrong auth flow for email magic links.** The app uses the **PKCE `?code=` + `exchangeCodeForSession`** flow. Supabase's own docs say email magic links should use the **`?token_hash=` + `verifyOtp({type, token_hash})`** flow. [Confirmed — Supabase docs]
- **PKCE is device-locked.** PKCE stores a `code_verifier` cookie in the browser that *requested* the link. The exchange can only complete in that **same browser**. → A link clicked on a **different device (mobile) can never complete.** This is THE mobile failure, independent of any host/allowlist config. [Confirmed — flow mechanics]
- **Desktop "worked" by accident.** Your code landed on `pandoai.no/?code=…` — note: **root `/`, not `/auth/callback`**. The only server exchanger is `/auth/callback/route.ts`; `/` has none. Desktop still logged you in **only because** `createBrowserClient` defaults to `detectSessionInUrl:true`, so the client auto-exchanged the `?code=` on the homepage using the local verifier cookie. Same-device rescue; cross-device has no rescue. [Inferred — strong, from code]
- **Two separate defects, not one:**
  - **(A) redirect_to is being dropped to the Site URL root** (code on `/` not `/auth/callback`) — template/allowlist issue.
  - **(B) PKCE device-lock** — the architectural reason mobile fails. Fixing A alone does NOT fix mobile.
- **The localhost on mobile** is best explained by a **stale earlier email** (you've sent many during testing) generated when the host was localhost, *combined with* the cross-device PKCE failure — NOT a current template hardcode (fresh prod links provably emit `pandoai.no`). The v1 "template hardcodes localhost" prime suspect is **downgraded**. [Inferred]

---

## Decisive evidence (from this session's code read)
| Fact | Source |
|---|---|
| App requests `${NEXT_PUBLIC_APP_URL}/auth/callback` (baked = pandoai.no on prod) | `src/hooks/useAuth.ts:58-62` |
| Only PKCE exchanger is `/auth/callback`; it calls `exchangeCodeForSession(code)` | `src/app/auth/callback/route.ts:10-16` |
| Root `/` has NO code exchanger | no handler; only middleware `getUser()` |
| Browser client created with **no options** → `@supabase/ssr` defaults: `flowType:'pkce'`, `detectSessionInUrl:true` | `src/lib/supabase/client.ts:9` |
| Middleware only refreshes session; never exchanges a `?code=` | `src/middleware.ts:34` |
| Email magic links should carry `?token_hash=` (not `?code=`) + `verifyOtp` | Supabase docs (auth-email-passwordless / nextjs-full example) [Confirmed] |
| Observed desktop link: `pandoai.no/?code=01470ea9-…` (code on ROOT) | user click-test |
| Observed mobile link: localhost | user click-test |

---

## The fix — ranked (pick ONE primary)

### Option 1 — Canonical token_hash magic link (BEST: keeps "click a link" UX, fixes cross-device)
Switch email magic links off PKCE-code onto Supabase's recommended SSR email flow. **Not device-locked** (no code_verifier).
1. Add `src/app/auth/confirm/route.ts`:
   ```ts
   const token_hash = searchParams.get('token_hash')
   const type = searchParams.get('type') as EmailOtpType | null
   if (token_hash && type) {
     const { error } = await supabase.auth.verifyOtp({ type, token_hash })
     if (!error) return NextResponse.redirect(`${origin}${next}`)
   }
   ```
2. Customize the **Magic Link email template** href to:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
3. Keep `/auth/callback` for any future OAuth (PKCE is correct there).
- **Effort:** ~1–2 h. **Fixes:** mobile cross-device + code-on-root. **Cost:** $0. [Confirmed pattern]

### Option 2 — 6-digit OTP code (SIMPLEST, most consumer-robust: no link/redirect at all)
Template uses `{{ .Token }}`; user types the 6-digit code; `verifyOtp({ email, token, type:'email' })`. **Eliminates redirect / Site-URL / allowlist / device-lock entirely.**
- **Effort:** ~half-day (adds a code-entry input to `/login`). **Fixes:** everything in this class. **Cost:** $0, same email volume. [Confirmed]

### Option 3 — Band-aid (NOT recommended alone)
Keep PKCE, just fix the template to `{{ .ConfirmationURL }}` + ensure `https://pandoai.no/auth/callback` (+`/**`) is allowlisted so desktop lands on the exchanger. **Mobile cross-device stays broken.** Only buys a cleaner desktop path. [Confirmed]

### Independent add-ons (unchanged from v1, still recommended)
- **Google OAuth** one-tap — PKCE is correct here; zero auth emails for those users. ~half-day.
- **Resend custom SMTP** + raise `rate_limit_email_sent` 30→~200/hr — the built-in mailer 429s after ~2 sends/hr and is not for production.

---

## Recommended single path for NorskCoach
1. **Ship Option 2 (6-digit OTP)** as the primary email path — it's the most robust on mobile (your actual failure surface) and removes the entire redirect/allowlist/device-lock class in one move. (Option 1 is the fallback if you specifically want to keep a clickable link.)
2. **Add Google OAuth** as the one-tap shortcut.
3. **Resend SMTP** + raise the email rate limit before any real-user launch.
4. Clean the inbox of stale test links; they'll keep producing misleading localhost hits while old PKCE/localhost emails exist.

## What changed vs v1 brief
- **Promoted:** PKCE device-lock from hypothesis → confirmed root cause of the mobile failure (backed by code: pkce default + same-device-only verifier).
- **Added:** the `token_hash`/`verifyOtp` option (v1 missed it) — lets you keep magic-link UX without device-lock.
- **Downgraded:** "email template hardcodes localhost" — fresh prod links emit pandoai.no; mobile localhost is a stale-email + cross-device artifact.
- **Sharpened:** the code-on-root (`/` vs `/auth/callback`) finding — desktop only survives via `detectSessionInUrl`, which won't save cross-device.

## Sources
Supabase docs: auth-email-passwordless.mdx (`verifyOtp` email/token_hash), passwords.mdx (`/auth/confirm` route), examples/auth/nextjs-full (`?token_hash=` not `?code=`); @supabase/ssr defaults (pkce + detectSessionInUrl). Codebase: useAuth.ts, auth/callback/route.ts, lib/supabase/client.ts, middleware.ts.
