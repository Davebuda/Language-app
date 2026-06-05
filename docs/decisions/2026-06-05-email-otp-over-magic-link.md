# Use 6-digit email OTP for login, not PKCE magic link

**Date:** 2026-06-05
**Status:** active

## Decision
Email login sends a one-time code (`signInWithOtp` → `verifyOtp({ email, token, type: 'email' })`) instead of a clickable magic link. The login UI is a two-step form (email → code entry). Commits `d4ecdef` (OTP migration) + `4e018ec` (accept 6–8 digit codes).

## Context
Users reported the magic link landing on `localhost` on mobile and on the site root (`/?code=…`) on desktop. Investigation traced it past the long-suspected Site-URL/allowlist config: the app was on Supabase's **PKCE flow** (`?code=` + `exchangeCodeForSession`). Supabase docs confirm the PKCE `code_verifier` is stored locally in the browser that *requested* the link, so the exchange can only complete on that same device/browser. Requesting on desktop and opening on a phone could therefore **never** complete — a structural failure, not a config bug.

## Why
`verifyOtp` with an email + typed code is **stateless** — no `code_verifier`, no redirect, no Site-URL, no allowlist. It works on any device, which is the exact failure mode that was breaking mobile login. It also removes the entire class of redirect/host/allowlist bugs that had been chased repeatedly. Verified end-to-end: code requested on one device, entered on another, reaches `/dashboard` (user-confirmed live on pandoai.no).

## Rejected alternatives
- **token_hash magic link** (`{{ .TokenHash }}` + `verifyOtp({ type, token_hash })`) — also device-independent and keeps a clickable link, but still carries a redirect/Site-URL surface and the in-app-browser / link-prefetch failure modes that hurt mobile. OTP removes the link entirely. Kept as the fallback if a clickable-link UX is ever wanted.
- **Keep PKCE, fix the email template + allowlist** — fixes desktop only; mobile cross-device stays structurally broken. Rejected as a sole fix.

## Consequences
- `/auth/callback` + `exchangeCodeForSession` are **intentionally retained** for a future Google OAuth one-tap path (PKCE is correct there). Do not delete them.
- The Supabase **Magic Link email template** must emit `{{ .Token }}` (the code), not `{{ .ConfirmationURL }}`. This is dashboard config, not code — flipping it back to a link breaks login.
- Login UI tolerates **6–8 digit** codes because Supabase's *Email OTP Length* is configurable (this project's is 8). Don't hard-code an exact length.
- Production email delivery requires **custom SMTP** (Resend, `no-reply@pandoai.no`, rate limit 100/hr) — the built-in Supabase mailer only delivers to team addresses and 429s after ~2/hr.
- Full operational record (DNS, template, SMTP creds, verification log) lives in memory `project_auth_redirect_config`.
