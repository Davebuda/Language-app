# Task Brief
**Task:** P1-4 — Journal feedback: Norwegian-only praise/suggestion + Norwegian template fallback
**Date:** 2026-05-21
**Status:** APPROVED — 2026-05-21

---

## What

Fix journal feedback quality issues in two files:
1. `src/ai/prompts.ts` — `buildWritingFeedbackPrompt`: add Norwegian constraint for praise/suggestion fields
2. `src/ai/webllm.ts` — `reviewWriting`: change both template fallbacks from English to Norwegian

## How

**In `src/ai/prompts.ts` — `buildWritingFeedbackPrompt`:**

Append to the system prompt string (after "Never suggest English words as corrections."):
```
Write the "praise" and "suggestion" fields in Norwegian Bokmål. Do NOT write them in English. The "why" field for each error may be in English — the learner needs to understand the rule clearly.
```

In the user prompt JSON structure description, change:
```
"praise": "one specific positive observation about the writing",
"suggestion": "the single most important thing to work on next"
```
to:
```
"praise": "en spesifikk positiv kommentar om noe i denne teksten (skriv på norsk)",
"suggestion": "det viktigste å øve på videre (skriv på norsk)"
```

**In `src/ai/webllm.ts` — `reviewWriting`:**

Change the `!isReady()` template fallback (line ~265) from:
```ts
return { errors: [], praise: 'Good attempt! Keep writing in Norwegian.', suggestion: 'Focus on verb placement — V2 rule in main clauses.', source: 'template' }
```
to:
```ts
return { errors: [], praise: 'Bra innsats! Fortsett å skrive på norsk.', suggestion: 'Fokuser på verbalplasseringen — V2-regelen gjelder i helsetninger.', source: 'template' }
```

Change the `catch` fallback (line ~288) from:
```ts
return { errors: [], praise: 'Good attempt!', suggestion: 'Focus on verb placement.', source: 'template' }
```
to:
```ts
return { errors: [], praise: 'Bra forsøk!', suggestion: 'Fokuser på verbplasseringen.', source: 'template' }
```

## Model
sonnet

## Acceptance Criteria
1. When the AI model is unavailable (template path), praise and suggestion are in Norwegian
2. The prompt now instructs the model to write praise/suggestion in Norwegian Bokmål
3. The `why` field in errors is still English (intentional — learner understanding)
4. No TypeScript errors introduced

## Blocking Flags
Stop immediately and write `BLOCKED: [reason]` to this file if:
- Any TypeScript error is introduced
- You cannot locate the exact lines described (ask me to re-read the file)

## Playwright Checkpoint
yes

What to test:
- Navigate to `/journal`
- Type at least 5 Norwegian words in the text area
- Check that the Analyser tekst button appears
- If the model is unavailable: click Analyser tekst → feedback panel appears with Norwegian praise/suggestion text
- Check that no visible English appears in praise or suggestion (other than the `why` explanations in error cards)
- Console: no errors
