# Research Notes

_Exa research findings from council sessions are recorded here._

## Research — Listen-and-respond — 2026-05-21
**Question:** Web Speech API continuous mode + 5-second countdown timer — failure modes and race conditions
**Finding:**
- Chrome enforces a ~7-second silence timeout even in continuous mode — `onend` fires automatically. Fine for a 5-second timer since we stop before Chrome does.
- Race condition: timer expires while `onresult` batch is in-flight → both handlers race to settle. Must use a `hasResolved` ref (set true on first settlement, guard subsequent triggers).
- `onstart` fires ~200-500ms after `start()` — start the countdown timer ONLY after `onstart` fires, not at `handleStartListening`. Avoids mic warm-up consuming timer budget.
- `interimResults: true` — show partial transcript live as confidence signal while listener speaks.
- Do NOT rely on `onend` for restarting — it doesn't fire consistently across browsers.
**Impact on approach:** Architecture doc guidance is validated. Addition: timer starts inside `onstart` callback. `hasResolved` ref guards double-processing.
