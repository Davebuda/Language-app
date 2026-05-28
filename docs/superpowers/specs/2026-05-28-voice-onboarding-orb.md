# Voice Onboarding Orb — Design Spec

## What

The landing page orb button opens an inline voice conversation with Kari (AI tutor) directly on the landing page. No redirect. Kari introduces herself, asks 3-5 diagnostic-appropriate questions via voice, assesses the user's approximate CEFR level, then transitions them to formal onboarding.

## Why

The orb is the "nice chairs in the hotel lobby" — users experience the product before committing. A brief voice conversation with Kari demonstrates the coaching value proposition and collects preliminary diagnostic data, making the subsequent onboarding faster and more personalized.

## User Flow

1. User taps the orb button on the landing page
2. Orb lights up neon green, pulsing animation activates
3. Kari speaks (TTS): "Hei! Jeg er Kari, din norsktrener. Skal vi prøve å snakke litt norsk?"
4. User responds via voice (SpeechRecognition) or text fallback
5. Kari asks 3-5 escalating questions:
   - Turn 1: "Hva heter du?" (A1 — can they produce a basic sentence?)
   - Turn 2: "Hva liker du å gjøre på fritiden?" (A1-A2 — vocabulary, verb forms)
   - Turn 3: "Fortell meg om jobben din." (A2-B1 — can they construct longer sentences?)
   - Turn 4: "Hva synes du om å lære norsk?" (B1 — opinion, subjunctive)
   - Turn 5: "Hvis du kunne bo hvor som helst i Norge, hvor ville du bodd?" (B1-B2 — conditional)
6. After 3-5 exchanges (or 2-minute timeout), Kari says: "Bra! Jeg har en idé om hvor du er. Skal vi finne ut nøyaktig?"
7. A CTA button appears: "Start kartlegging →" linking to `/onboarding`
8. Transcript + preliminary level estimate stored in `sessionStorage`, passed to onboarding

## Diagnostic Logic

Kari's questions escalate in CEFR complexity. The system assesses based on:
- **Did the user respond at all?** (No response at any level = likely below that level)
- **Response length** — single words vs. full sentences
- **Grammar patterns** — V2 word order, verb conjugation, article usage
- **Vocabulary range** — basic vs. intermediate vs. advanced words

Assessment is RULE-BASED, not AI-judged. The AI generates Kari's responses; a separate scoring function analyzes the user's transcripts for grammar/vocabulary signals. This avoids relying on the AI model for assessment accuracy.

### Scoring Rules
- Responded to turn 1-2 with recognizable Norwegian → A1
- Responded to turn 3 with sentences → A2
- Responded to turn 4 with complex sentences → B1
- Responded to turn 5 with conditional/subjunctive → B2
- No Norwegian detected → A1 (cold start)

The preliminary level pre-seeds the diagnostic quiz, making it shorter (skip questions below the estimated level).

## Technical Architecture

### Speech Input
- **Desktop:** `SpeechRecognition` API (Chrome, Edge). Hook: `src/hooks/useSpeechRecognition.ts` (already exists, used by 6 muntlig components)
- **Mobile Safari/iOS:** SpeechRecognition is NOT supported. Fallback: text input field appears automatically when speech API is unavailable
- **Detection:** `typeof window.SpeechRecognition !== 'undefined' || typeof window.webkitSpeechRecognition !== 'undefined'`

### Speech Output (Kari)
- **Primary:** Browser TTS via `speechSynthesis.speak()` with `lang: 'nb-NO'`
- **Fallback:** Pre-generated MP3s for Kari's fixed greeting/closing lines (the diagnostic questions are known in advance)
- Hook: `src/components/audio/AudioPlayer.tsx` (already exists)

### AI Pipeline
- Kari's conversational responses (not the diagnostic questions themselves) go through `POST /api/ai` with `action: "conversation"`
- New prompt builder: `buildOnboardingConversationPrompt` in `src/ai/prompts.ts`
- The prompt instructs Kari to be warm, encouraging, and to naturally escalate question complexity
- Template fallback if AI unavailable: Kari uses the fixed question sequence without dynamic responses

### State Management
- Local `useState` on the landing page — no stores, no auth
- Transcript array: `{ role: 'kari' | 'user', text: string, turnIndex: number }[]`
- Preliminary level estimate: computed after each user response
- On transition to onboarding: save to `sessionStorage` under key `norskcoach_voice_onboarding`
- Onboarding page reads this and pre-seeds the diagnostic quiz

### Orb Visual States
- **Idle:** Subtle breathing animation (current)
- **Active/Listening:** Orb glows bright lime, rings pulse faster, mic icon highlighted
- **Kari Speaking:** Orb pulses with a slower rhythm, teal accent
- **Processing:** Orb dims slightly, loading dots
- **Complete:** Orb settles, CTA fades in below

## Constraints

- Max 5 turns or 2 minutes total (whichever comes first)
- No fingerprint store access on landing page (guest, no auth)
- AI responses must have template fallback
- Mobile text fallback must be seamless (no "speech not supported" error)
- The voice conversation does NOT replace the diagnostic quiz — it PRE-SEEDS it
- Norwegian speech recognition quality varies — the scoring rules must be lenient

## Files to Create/Modify

- `src/app/page.tsx` — add voice interaction state, orb activation, chat logic
- `src/ai/prompts.ts` — add `buildOnboardingConversationPrompt`
- `src/lib/voice-onboarding.ts` — NEW: scoring rules, transcript analysis, level estimation
- `src/app/onboarding/page.tsx` — read `sessionStorage` pre-seed data
- `src/components/onboarding/DiagnosticQuiz.tsx` — accept pre-seeded level to skip lower questions

## Open Questions

- Should Kari's voice be the browser TTS or pre-recorded MP3s? (TTS is dynamic but robotic; MP3s are higher quality but fixed)
- Should the text fallback show a chat-like UI or just an input field?
- How much should the pre-seed shorten the diagnostic? Skip all questions below the estimated level, or just start at that level?
