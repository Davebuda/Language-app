# Code Review — NorskCoach

**Reviewed:** 2026-05-11  
**Depth:** standard (deep cross-file where relevant)  
**Files Reviewed:** 14

---

## Summary

The codebase is well-structured for its current phase and shows deliberate defensive thinking (graceful AI degradation, fallback paths, template explanations). However, there are two genuine security vulnerabilities that must be fixed before any users authenticate: an open-redirect in the auth callback that allows attackers to hijack post-login destinations, and Supabase credentials silently degrading to empty strings when environment variables are absent (fail-open rather than fail-closed). Several race conditions and logic errors will surface under real usage: the fingerprint bootstrap runs with a stale `prevUserRef`, a module-level `scenarioCursor` counter causes divergent state in SSR/React-Strict-Mode, an item-skip timer fires a false `correct: true` result that corrupts learning analytics, and the word-order validator silently passes items with no `words` array. Type safety has a few rough edges (`as never` cast, unchecked array accesses) that can produce runtime crashes.

---

## Findings

---

### CRITICAL

---

**[CRITICAL] Open redirect in auth callback** `src/app/auth/callback/route.ts:7,13`

The `next` query parameter is taken verbatim from the URL and appended directly to `origin` for the post-login redirect. An attacker sends the victim a magic-link URL containing `?next=//evil.com/steal` (or `?next=/login?redirect=https://evil.com`) — after successful authentication the user is silently forwarded off-site. Because `origin` comes from the request URL it cannot be trusted to anchor the redirect.

```ts
// VULNERABLE — attacker-controlled destination
const next = searchParams.get('next') ?? '/';
return NextResponse.redirect(`${origin}${next}`);
```

Fix: validate that `next` is a safe relative path before using it.

```ts
function isSafeRelativePath(value: string): boolean {
  // Must start with exactly one / and not start with // (protocol-relative)
  return /^\/[^/]/.test(value) || value === '/';
}

const rawNext = searchParams.get('next') ?? '/';
const next = isSafeRelativePath(rawNext) ? rawNext : '/';
return NextResponse.redirect(`${origin}${next}`);
```

---

**[CRITICAL] Missing environment variable guard — silent empty-string credentials** `src/middleware.ts:8-9` · `src/lib/supabase/server.ts:7-8` · `src/lib/supabase/client.ts:4-5`

All three client factories use `?? ''` when the env vars are absent. `createServerClient` and `createBrowserClient` accept an empty string without throwing, creating a client that silently makes unauthenticated requests or hits the wrong project. In production this can allow authentication to appear to succeed against a misconfigured Supabase instance, or expose anonymous data incorrectly.

```ts
// Current — fails silently
process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
```

Fix: throw at startup so the failure is visible immediately.

```ts
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
```

Note: for the middleware specifically, throwing inside `middleware()` will turn into a 500 on every request, which is acceptable and far better than silently running with empty credentials.

---

### WARNING

---

**[WARNING] `prevUserRef` update runs after `bootstrap()` is called — stale ref on every render** `src/hooks/useFingerprint.ts:137-138`

Inside the `useEffect`, `prevUserRef.current = user` is assigned *after* the `bootstrap()` call is fired but *before* it awaits. This means on the first effect execution `prevUserRef.current` is `null`, which is correct. But on *subsequent* executions (e.g. if the effect re-fires because `user?.id` changed mid-session), `prevUserRef.current` will hold the previous `user` reference — which could be the same user. The intent is to detect "was previously anon, now signed in", but the assignment is synchronous and sequential only by accident. More concretely: `bootstrap()` is an async function that is **not awaited** in the effect. The ref update happens synchronously on the same tick as the async kick-off, so it always reflects the value from the render that scheduled the effect, not the value at the time the async work completes. This is fine for the ref-as-snapshot pattern, but the ref is also read *inside* `bootstrap()` via `wasAnon` — and because `bootstrap` closes over `prevUserRef.current` at call time (not at read time), the check works correctly only if nobody triggers the effect a second time during an ongoing bootstrap. A user who signs in while a previous bootstrap is still running will get two concurrent bootstraps, both seeing `wasAnon === true`, resulting in a double migration attempt.

```ts
// bootstrap() fires async but is not tracked; a second invocation before
// the first finishes causes a duplicate migration + double Supabase upsert.
bootstrap();
prevUserRef.current = user; // ref updated before bootstrap resolves
```

Fix: use a running-flag ref to prevent concurrent bootstraps.

```ts
const bootstrappingRef = useRef(false);

useEffect(() => {
  if (authLoading) return;
  if (bootstrappingRef.current) return;

  bootstrappingRef.current = true;
  const capturedPrev = prevUserRef.current;
  prevUserRef.current = user;

  bootstrap(capturedPrev).finally(() => {
    bootstrappingRef.current = false;
  });
}, [authLoading, user?.id]);
```

---

**[WARNING] Module-level `scenarioCursor` is mutable shared state** `src/hooks/useSession.ts:23-25`

`scenarioCursor` is declared at module scope and mutated by `nextScenario()`. In Next.js App Router with React Strict Mode, components mount twice in development; in production, multiple component instances (e.g. a session page rendered in a parallel route) will share and race on this counter. `scenarioCursor` will also persist across Hot Module Replacement reloads in development, making the sequence non-deterministic and untestable.

```ts
let scenarioCursor = 0;       // ← module-level mutable state
function nextScenario(): string {
  return SCENARIOS[scenarioCursor++ % SCENARIOS.length] ?? 'daily-routine';
}
```

Fix: move the cursor into a `useRef` inside `useSession` so each hook instance owns its own counter.

```ts
const scenarioCursorRef = useRef(0);
function nextScenario(): string {
  const idx = scenarioCursorRef.current++ % SCENARIOS.length;
  return SCENARIOS[idx] ?? 'daily-routine';
}
```

---

**[WARNING] Auto-skip timer records a false `correct: true` result — corrupts analytics and fingerprint** `src/hooks/useSession.ts:232-241`

When an item's content cannot be resolved within 3 seconds, the code advances past it by calling `sessionStore.recordResult({ correct: true, ... })`. This inserts a fake "correct" result into the results array, which is later processed by `recordFingerprintResult`. The fingerprint engine will treat this as a successful answer and raise the mastery score for that concept, even though the learner never saw the question. On slow networks or when the AI model is busy, this could systematically inflate mastery scores for concepts that happen to be slow to resolve.

```ts
sessionStore.recordResult({
  sessionId: session.id,
  itemId: currentItem.id,
  correct: true,          // ← false data injected into fingerprint
  ...
});
```

Fix: add a `skipped` flag to `ExerciseResult` (or simply advance without recording), and guard the fingerprint update against skipped items.

```ts
// Option A — advance without recording a result at all
sessionStore.advanceItem();

// Option B — record with a skipped flag that the fingerprint engine ignores
sessionStore.recordResult({ ..., correct: false, skipped: true });
// and in recordFingerprintResult: if (result.skipped) return;
```

---

**[WARNING] `word-order` validation silently passes items with no `words` array** `src/ai/validate.ts:52-54`

The word-order case only rejects a `words` field that is *present but invalid*. If the model omits `words` entirely, `raw.words` is `undefined`, the check is skipped, and the item passes validation. The exercise component will then receive a `ResolvedContent` with no `words` field and must handle the missing array at render time — but `ResolvedContent extends Sentence`, which has no `words` field, so this is never caught by the type system either.

```ts
case 'word-order': {
  // words === undefined skips the check entirely — passes invalid content
  if (raw.words !== undefined && !isStringArray(raw.words, 2))
    return 'words array is present but invalid';
  break;
}
```

Fix: require `words` for word-order exercises.

```ts
case 'word-order': {
  if (!isStringArray(raw.words, 2))
    return 'missing or invalid words array for word-order exercise';
  break;
}
```

---

**[WARNING] `isAvailable()` returns `true` while the model is still loading — callers cannot distinguish "ready" from "loading"** `src/ai/webllm.ts:116-119`

`isAvailable()` returns `true` for `state === 'idle'` and `state === 'loading'`, meaning callers that check `isAvailable()` before calling `generateContent` will see `true` even though the model is not usable yet. `generateContent` short-circuits with `if (!this.isReady()) return null` so no crash occurs, but the conceptual contract is broken: "available" suggests the service can be used. If any future caller gates on `isAvailable()` (which is the natural thing to check), it will behave as if the service is ready when it is not.

Fix: rename or clarify the semantics, or change the return value to distinguish states.

```ts
isAvailable(): boolean {
  // True means "could become ready" (not permanently failed).
  // Use isReady() to check if the model is actually usable right now.
  return this.state !== 'unavailable';
}
```

Document this contract in a JSDoc comment so the distinction is clear to future callers.

---

**[WARNING] `loadFingerprintFromSupabase` casts the DB response without validation** `src/hooks/useFingerprint.ts:45`

```ts
return data.data as MistakeFingerprint;
```

`data.data` is typed as `unknown` (Supabase returns `Json` which ultimately degrades to `unknown` at runtime). If the DB schema changes, the stored JSON is corrupted, or a migration introduces a new required field, the application will receive a partial object that the engine treats as a valid fingerprint. Downstream code like `fingerprint.conceptMastery` or `fingerprint.currentLevel` will silently be `undefined` and cause runtime errors in the scheduler.

Fix: add a minimal runtime check before the cast, or use a validation library (e.g. Zod).

```ts
function isMistakeFingerprint(v: unknown): v is MistakeFingerprint {
  return (
    typeof v === 'object' && v !== null &&
    typeof (v as Record<string, unknown>).userId === 'string' &&
    typeof (v as Record<string, unknown>).conceptMastery === 'object'
  );
}

const fp = data.data;
if (!isMistakeFingerprint(fp)) return null;
return fp;
```

---

**[WARNING] `submitResult` reads item from store *after* `recordResult` advances state — item may be stale or mismatched** `src/hooks/useSession.ts:158-160`

```ts
sessionStore.recordResult(result);     // may trigger a state update
recordFingerprintResult(result);

// Then re-reads from the store — currentItemIndex may have already changed
const item = useSessionStore.getState().session?.items[
  useSessionStore.getState().currentItemIndex
];
```

`recordResult` is a Zustand setter that does not advance the index, so in the current code this is safe. However `recordFingerprintResult` calls `setFingerprint` which may trigger a re-render that flushes a queued `advanceItem` from an earlier render cycle. The item read after these two calls is fragile: if `currentItemIndex` ever advances before this line (due to a batched update or a concurrent mode flush), `item` will point to the *next* item, not the one the learner just answered. The repair plan will then be built against the wrong item's `exerciseType`.

Fix: capture the item index and item *before* any store mutations.

```ts
const currentIndex = useSessionStore.getState().currentItemIndex;
const item = useSessionStore.getState().session?.items[currentIndex];

sessionStore.recordResult(result);
recordFingerprintResult(result);

if (!result.correct) {
  // use the already-captured `item`
}
```

---

**[WARNING] Repair items are injected before their content is resolved — `resolveItem` is fire-and-forget** `src/hooks/useSession.ts:215-216`

```ts
repairItems.forEach((item) => { resolveItem(item); }); // async, not awaited
state.injectRepairItems(repairItems, state.currentItemIndex); // immediate
```

`resolveItem` is async. The repair items are injected into the session immediately, before content is resolved. The learner immediately sees the next item in the repair queue (because `advanceItem()` is called on line 220), but `currentContent` for that item will be `undefined`. The 3-second auto-skip timer will then fire, marking the repair item as `correct: true` (the same analytics corruption described above), and the repair loop silently no-ops. Under slow AI generation or large seed maps, this will be reproducible in production.

Fix: either await resolution before injection, or hold off injecting until content is ready.

```ts
await Promise.all(repairItems.map((item) => resolveItem(item)));
state.injectRepairItems(repairItems, state.currentItemIndex);
```

---

### INFO

---

**[INFO] `as never` cast on `exerciseType` field silences a real type mismatch** `src/hooks/useFingerprint.ts:168`

```ts
exerciseType: result.itemId as never,
```

`logError` expects an `ExerciseType` for `exerciseType`, but `result.itemId` is a `string` (the sentence ID, not an exercise type). This is logically incorrect — item ID and exercise type are different values — and the `as never` cast was used to silence the TypeScript error rather than fix the underlying mismatch. The logged error record will have the sentence ID in the `exerciseType` field, which will break any downstream code that groups errors by exercise type.

Fix: pass the actual exercise type. `ExerciseResult` should carry `exerciseType`; if it does not, add it.

```ts
exerciseType: result.exerciseType,  // add exerciseType to ExerciseResult if missing
```

---

**[INFO] `fill-in-blank` validation requires at least 2 distractors but the prompt requests 3** `src/ai/validate.ts:46` vs `src/ai/prompts.ts:67`

The prompt instructs the model to generate 3 distractors, but the validator only requires 2 (`isStringArray(raw.distractors, 2)`). A response with 2 distractors passes validation and reaches exercise components. If exercise UI is built expecting exactly 3 options (which is the standard multiple-choice layout), it will render with a missing fourth option. The mismatch should be made explicit.

Fix: align the minimum to 3, or document that 2 is acceptable and update the UI accordingly.

```ts
if (!isStringArray(raw.distractors, 3)) return 'need at least 3 distractors';
```

---

**[INFO] `distractor` case-sensitivity check is absent** `src/ai/validate.ts:47-49`

The check `(raw.distractors as string[]).includes(raw.targetWord as string)` is case-sensitive. If the model returns `targetWord: "Ikke"` and `distractors: ["ikke", ...]`, the check passes and the learner will see the correct answer listed as a distractor. Norwegian is case-sensitive in title/sentence position, but the model may vary capitalisation.

Fix: normalise to lower-case for the equality check only.

```ts
const target = (raw.targetWord as string).toLowerCase();
if ((raw.distractors as string[]).some((d) => d.toLowerCase() === target))
  return 'distractor contains the correct answer (case-insensitive)';
```

---

**[INFO] `getOrCreateAnonId` accesses `localStorage` without SSR guard** `src/hooks/useFingerprint.ts:25-29`

The hook is marked `'use client'` so this will not crash during SSR. However `localStorage` is accessed inside `getOrCreateAnonId()` which is called unconditionally inside `bootstrap()`. If Next.js ever renders this hook in a hybrid boundary (e.g. a shared layout that runs in both environments), it will throw `ReferenceError: localStorage is not defined`. The guard should be explicit.

```ts
function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return '';
  // ...
}
```

---

**[INFO] `NORWEGIAN_CHARS` regex does not allow the `/` character** `src/ai/validate.ts:36`

The character class excludes `/`. A number of natural Norwegian sentences that the model might generate use the slash in shorthand (`han/hun`, `Bokmål/Nynorsk`) or in date formats (`11.05.2026` uses `.` which is allowed, but `/` is not). Content with a valid slash will fail the character check and be discarded, burning a generation retry unnecessarily. Consider whether `/` should be allowed, or document the exclusion explicitly.

---

**[INFO] `aiService` singleton is exported from `src/ai/index.ts` without the `StubAIService` export** `src/ai/index.ts`

`StubAIService` is implemented in `src/ai/stub.ts` but is never exported from `src/ai/index.ts`. Any consumer who imports from `@/ai` and wants to use the stub (e.g. in tests or to override the singleton) must reach into the internal `stub.ts` path. For Phase 1A where the stub *is* the intended default, it should be the default export, with `WebLLMService` swapped in later — or the factory should accept an override parameter. As written, `aiService` is always `WebLLMService`, which contradicts the Phase 1A intent described in the stub's own header comment.

---

**[INFO] Shuffling with `sort(() => Math.random() - 0.5)` is non-uniform** `src/engine/scheduler.ts:167`

The Fisher-Yates shuffle is replaced by a sort-based shuffle, which is statistically biased (certain permutations appear far more often than others). For a learning app where session variety directly affects pedagogy this matters more than in most contexts. Replace with a proper Fisher-Yates shuffle.

```ts
function fisherYates<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const shuffled = first ? [first, ...fisherYates(rest)] : fisherYates(rest);
```

---

**[INFO] `updateRepairExplanation` in store does not guard against a null `repairPlan`** `src/stores/session-store.ts:35-38`

```ts
updateRepairExplanation: (text) =>
  set((s) =>
    s.repairPlan ? { repairPlan: { ...s.repairPlan, explanation: text } } : {}
  ),
```

If `updateRepairExplanation` is called after `exitRepair()` clears `repairPlan` (which can happen if the learner taps Continue before the async AI explanation resolves), the update is silently discarded. This is the intended behaviour and the code is defensive, but the silent discard should be documented with a comment to prevent a future developer from "fixing" it incorrectly.

---

_Reviewed: 2026-05-11_  
_Reviewer: Claude Code (adversarial review)_  
_Depth: standard + deep cross-file_
