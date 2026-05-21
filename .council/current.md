# Task Brief
**Task:** P1-11 — Wire waitlist form to Supabase + fix mobile success overflow
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

Two files to change, one new file:

1. **NEW** `src/app/actions/waitlist.ts` — server action that inserts email into `waitlist` table
2. **EDIT** `src/components/landing/waitlist-form.tsx` — call the action, add loading state, fix mobile overflow in success state

The `waitlist` table exists in Supabase (`id`, `email`, `created_at`). The form currently has a `// Phase 1A — UI only, no backend yet` comment and silently discards emails. Per no-silent-substitution principle, showing "You're on the list" with no data stored is dishonest.

---

## How

### 1. Create `src/app/actions/waitlist.ts`

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const emailSchema = z.string().email()

export async function submitWaitlist(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const result = emailSchema.safeParse(email)
  if (!result.success) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: result.data })

    if (error) {
      // Duplicate email — treat as success (already on the list)
      if (error.code === '23505') return { success: true }
      return { success: false, error: 'Something went wrong. Please try again.' }
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
```

**Note on `createClient`:** Check `src/lib/supabase/server.ts` — the function may or may not be async. If it's `async`, use `await createClient()`. If it's synchronous, just call `createClient()`. Read the file first.

### 2. Edit `src/components/landing/waitlist-form.tsx`

**Read the file first.**

Add `submitWaitlist` import:
```ts
import { submitWaitlist } from '@/app/actions/waitlist'
```

Add a `loading` state:
```ts
const [loading, setLoading] = useState(false)
```

Replace the `handleSubmit` function:
```ts
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
```

Fix the mobile overflow in the success state. The `<span>` inside the success div needs `min-w-0` and `text-wrap` to prevent overflow on 375px. Change the success div's `<span>`:
```tsx
<span className="min-w-0 text-foreground">
  You&apos;re on the list. We&apos;ll reach out when early access opens.
</span>
```

Update the submit button to show loading state:
```tsx
<button
  type="submit"
  disabled={loading}
  className="group flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
  style={{ background: 'var(--nc-red)' }}
>
  {loading ? 'Joining…' : 'Join waitlist'}
  {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
</button>
```

Remove the `// Phase 1A — UI only, no backend yet` comment.

Also mark the `handleSubmit` function as async: `async function handleSubmit(...)`.

---

## Model
sonnet

## Acceptance Criteria

1. Submitting a valid email makes a Supabase insert call (no longer silently discards)
2. Success state appears after successful submission
3. Duplicate email submissions show success (not an error)
4. Invalid email shows the validation error message
5. Submit button shows "Joining…" and is disabled while the request is in-flight
6. Success state text does not overflow on 375px mobile (min-w-0 fix)
7. No TypeScript errors introduced

## Blocking Flags

Stop and write `BLOCKED: [reason]` to this file if:
- `createClient` from `@/lib/supabase/server` has a different signature than expected — note the actual signature and adjust
- The `waitlist` table insert fails with an RLS error during local testing — note the error code
- Any TypeScript error is introduced

## Playwright Checkpoint
yes

What to test:
- Navigate to `/` (landing page)
- Scroll to / find the waitlist form
- Submit a valid email — confirm the success state appears
- Check no console errors after submit
