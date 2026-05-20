# Plan: P0 Item 4 — AI Status Transparency

**Status: AWAITING APPROVAL — do not implement until approved**  
**Date:** 2026-05-20  
**Source:** `docs/recovery-backlog.md` item 4  
**Finding:** C2 in `test-reports/system-walkthrough-2026-05-20.md`

---

## What this plan addresses

The `AIStatusBadge` component shows "AI ready" when the model is non-functional — violating the no-silent-substitution rule. Two distinct bugs:

**Bug 1 — Component renders nothing for `unavailable` state.**  
`AIStatusBadge.tsx:9` returns `null` for both `idle` and `unavailable`. When the state is `unavailable` (e.g., no WebGPU), the chip silently disappears instead of showing "AI unavailable." The existing `idle → null` behaviour is correct (don't show a chip before we've tried). The `unavailable → null` behaviour is wrong — this is the silent substitution.

**Bug 2 — Generation failures don't set `unavailable`.**  
`WebLLMService` sets `unavailable` only during `_load()` (no WebGPU, or load exception). If the model "loads" but every `complete()` call returns an empty string, `generateContent` throws `SyntaxError` from `JSON.parse('')`, catches it, and returns null — but `this.state` stays `'ready'`. The badge continues to show "AI ready." This is the walkthrough's exact failure mode: 90+ `[WebLLM] generateContent attempt N: SyntaxError` warnings while the badge says "AI ready."

**The root cause of the empty-response pattern:** `complete()` returns `res.choices[0]?.message?.content ?? ''`. When content is null, it returns `''`. Callers that `JSON.parse('')` throw SyntaxError inside their own body — the error is never seen by `complete()`, which considers itself successful. The health signal never fires.

---

## Files touched

| File | Change |
|---|---|
| `src/components/ai/AIStatusBadge.tsx` | Render "AI unavailable" chip for `unavailable` state |
| `src/ai/webllm.ts` | (a) Make `complete()` throw on empty response; (b) add consecutive-failure counter |
| `docs/ui-1/aesthetic-direction.md` | One-line addition documenting the two chip states |

---

## The change

### Step 1 — `src/ai/webllm.ts`: make `complete()` throw on empty content

Currently:
```typescript
return res.choices[0]?.message?.content ?? ''
```

Replace with:
```typescript
const content = res.choices[0]?.message?.content
if (!content) throw new Error('[WebLLM] empty response from engine')
return content
```

Same change in `completeChat()`. This makes every completion call that returns null/empty content throw explicitly inside `complete()` — the SyntaxError from `JSON.parse('')` in callers becomes unreachable for this case. Callers already have try/catch, so the throw is handled cleanly.

### Step 2 — `src/ai/webllm.ts`: add consecutive-failure counter

Add a private field:
```typescript
private consecutiveGenerationFailures = 0
private static readonly GENERATION_FAILURE_THRESHOLD = 2
```

In `complete()` and `completeChat()`, wrap the engine call:
- On throw: `this.consecutiveGenerationFailures++`; if at threshold, call `this._updateStore('unavailable')` and set `this.state = 'unavailable'`
- On success: `this.consecutiveGenerationFailures = 0`

The counter is shared across both `complete()` and `completeChat()` — they use the same engine and the same failure mode.

**Threshold — 3.** The walkthrough showed 90+ failures. 3 consecutive failures means the model is broken (not a transient network glitch — there is no network involved, this is local WASM). 3 also means the detection fires on the 3rd unique method call that fails, not the 3rd attempt within one call — `generateContent` has its own MAX_RETRIES (2) loop, but each `complete()` invocation counts independently.

**Design decision — re-init allowed at the service layer, no UI affordance yet.** Remove `|| this.state === 'unavailable'` from `init()`'s early-return guard. The correct service-layer behaviour is: a degraded service should be re-attemptable; whether anything in the UI calls `init()` again is a separate UI-scope decision. Adding a "retry" button is out of scope for this item, but hard-blocking re-init at the service level would require a service change to add one later. The cost of allowing re-init is effectively zero; the upside is the architecture stays open. Also reset `consecutiveGenerationFailures = 0` at the start of `_load()` so a successful re-init clears the health state.

### Step 3 — `src/components/ai/AIStatusBadge.tsx`: render the unavailable state

Remove `|| state === 'unavailable'` from the early return and add the third render case:

```typescript
if (state === 'idle') return null

// Unavailable: honest badge, distinct styling
if (state === 'unavailable') {
  return (
    <div className="rounded-[0.75rem] border border-nc-border bg-nc-card px-2.5 py-1.5 text-[10px] font-medium text-nc-text-dim">
      AI unavailable
    </div>
  )
}

// Loading and ready: existing animated badge
return (
  <AnimatePresence>
    <motion.div ...>
      {state === 'loading' ? `AI ${loadingPct}%` : 'AI ready'}
    </motion.div>
  </AnimatePresence>
)
```

**Styling decision:** The unavailable chip uses `bg-nc-card` (no background fill, same as a surface card) and `text-nc-text-dim` (lowest contrast text) — visually distinct from the "AI ready" white chip (`bg-white text-nc-text-muted`). No animation on the unavailable state — it's a static fact, not a transient status. No `AnimatePresence` wrapper needed.

**Why no motion on unavailable?** The loading and ready states benefit from entrance animation because they're moments of change (model is arriving). Unavailable is a discovered state, not a progress event. A static badge is more appropriate.

### Step 4 — `docs/ui-1/aesthetic-direction.md`: document the two chip states

One sentence added to the relevant section — confirms the "AI ready" / "AI unavailable" pair, their token use, and that no design pass is needed.

---

## What this does NOT change

- `AILoader` in `layout.tsx` — still eagerly loads on every page. This is correct behaviour; eager loading means the model is ready (if it loads) by the time the learner reaches a session. Out of scope.
- Conversation, journal, reading pages — no AI status chips on those surfaces. Not added here.
- The template fallback paths in `explainMistake`, `reviewWriting`, etc. — they already return templates when AI is unavailable. Those paths are correct.
- The `isAvailable()` / `isReady()` guard at the top of each method — still correct. Once state is `unavailable`, all generation paths immediately return their template/null fallback.

---

## Edge cases

| Scenario | Behavior |
|---|---|
| Model load throws (existing path) | `_load()` catch → `this.state = 'unavailable'` → `_updateStore('unavailable')` → badge shows "AI unavailable". No change to this path. |
| No WebGPU (existing path) | Same as above. No change. |
| Model loads, first 2 calls succeed, 3rd fails | Counter: 0, 0, 1 → not at threshold; badge stays "AI ready"; 4th and 5th consecutive failures → 2, 3 → `unavailable` set. Correct — 3 consecutive failures, not 3 total failures. |
| Model loads, calls succeed, then start failing | Counter resets to 0 on each success. Needs 3 *consecutive* failures to trigger. Correct — transient failure doesn't falsely set unavailable. |
| Learner opens session, unavailable fires mid-session | Badge switches from "AI ready" to "AI unavailable" without page reload. `AnimatePresence` handles the exit animation on the ready chip. The unavailable chip appears statically. Template explanations continue — no session interruption. |
| `explainMistake` template fallback when unavailable | `if (!this.isReady()) return template` — fires immediately, `complete()` never called. No change. |

---

## Acceptance criteria

1. Navigate to `/session` on a device without WebGPU (or simulate by blocking GPU in DevTools). Badge shows "AI unavailable" — not "AI ready," not blank.
2. Navigate to `/session` on a device where WebGPU is available but the model's completions return empty. After 3 generation failures, badge switches from "AI ready" to "AI unavailable."
3. Template explanations continue to appear in the repair loop regardless of badge state — session is not blocked.
4. `eval/page.tsx` badge renders consistently with the session badge (same component, same behavior).
5. TypeScript strict mode passes. No new errors in changed files.

---

## Tests to write

`tests/ai/webllm.test.ts` (new) — test the service's state machine, not the WebGPU engine itself. Use a mock engine.

| Test | Verifies |
|---|---|
| `isReady()` after state set to `unavailable` returns `false` | Guard paths work |
| `consecutive failure counter increments on complete() throw` | Step 2 |
| `counter resets on success` | Counter is per-streak, not cumulative |
| `state set to unavailable after threshold` | Step 2 threshold |
| `init() no-ops when state is unavailable` | No re-init |

`AIStatusBadge` is pure rendering based on store state — verify via snapshot test or existing Playwright verification rather than a separate unit test.
