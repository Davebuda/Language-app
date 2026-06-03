// Strip prompt scaffolding (CORRECTION / CONSTRAINT markers) from a conversation
// model response before it is shown to the learner.
//
// The model does NOT reliably emit the exact `\nCORRECTION:{...}` JSON shape the prompt
// asks for. Groq has produced ` CORRECTION: None` (space-separated, no newline, non-JSON),
// which the old anchored regex `/\nCORRECTION:\{.*?\}/` missed — leaking raw scaffolding
// into Kari's chat bubble (2026-06-03 live audit). Split on the marker instead, so any
// variant (newline or space, JSON or "None", any case) is removed.
//
// The structured CORRECTION JSON, when present, is parsed separately from the raw text by
// the caller — this function only produces the display string.
export function stripTutorScaffolding(raw: string): string {
  return raw
    .split(/\s*\n?\s*CORRECTION:/i)[0]
    .split(/\s*\n?\s*CONSTRAINT_MET/i)[0]
    .split(/\s*\n?\s*CONSTRAINT_MISSED/i)[0]
    .trim();
}
