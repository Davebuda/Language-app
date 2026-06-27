# Speaking exercises listen continuously and let the learner finish, instead of cutting off on the first pause

**Date:** 2026-06-27
**Status:** active

## Decision
The Web Speech recognizer in the speaking exercises no longer ends on the first
natural pause, and the fixed 5-second listening window is gone. `useSpeechRecognition`
(`src/hooks/useSpeechRecognition.ts`) gained an opt-in `continuous` flag (default
`false` — every existing consumer is unchanged). The three surfaces the learner speaks
a free answer into opt in:

- **Lytt og svar** (`ListenRespondExercise.tsx`) and **Rollespill** (`RoleplayScreen.tsx`):
  `continuous: true`, the listen window raised `LISTEN_SECONDS` 5 → 20, a **"Ferdig"**
  button to finish early, trailing interim words folded into the captured transcript,
  and `stop()` called on timer expiry. The old "auto-advance on first final result"
  effect is demoted to a safety fallback for an unexpected browser-side end.
- **Shadowing** (`ShadowingExercise.tsx`): `continuous: true` only — it already had a
  manual tap-the-orb-to-stop model, so the pause-cutoff was the only defect.

## Context
The shared hook ran `rec.continuous = false`, so the browser's endpointing finalized
the result on the first silence and the exercise advanced. `ListenRespondExercise` and
`RoleplayScreen` additionally capped listening at a hard `LISTEN_SECONDS = 5`. A learner
who paused mid-answer to find a word was cut off; a learner who spent those 5 seconds
*thinking before speaking* often ran out the clock with nothing captured ("Ingen lyd
registrert"). Reported by Dave: the listening window was too short for learners, who
struggle and need time to give their answer.

## Why
The north star is to make the learner *produce* Norwegian and build speaking confidence
in low-stakes contexts. An input mechanism that punishes hesitation works directly
against that — it rewards fast, confident speakers and silences the strugglers the
product exists to help. Continuous listening + a learner-controlled "Ferdig" button
moves the end-of-turn decision from the browser's endpointing heuristic to the learner,
which is the correct authority for a tool built around giving people room to speak.

## Rejected alternatives
- **Just raise `LISTEN_SECONDS` to 15–20, keep `continuous = false`** — rejected: with
  one-shot recognition the mic still finalizes (or no-speech-times-out) on a pause, so a
  longer cap does nothing for a learner who pauses to think. The timer was never the only
  cutoff.
- **Change the shared hook's default to `continuous: true`** — rejected: Recite and Drill
  are single-word / short-phrase pronunciation checks where a quick auto-finalize is
  correct. An opt-in flag keeps those one-shot and limits blast radius.
- **Add the "Ferdig" / continuous behavior to Recite and Drill too** — deferred: not
  free-answer surfaces; left on the one-shot default until there's a reason.

## Consequences
- **Honesty (Operating Rule 8):** Rollespill reused `LISTEN_SECONDS` to credit
  speaking-minutes and `timeTakenSeconds`. Bumping the window to 20 would have
  over-credited minutes a learner who tapped "Ferdig" early never spoke. The metric is
  now a separate `ESTIMATED_TURN_SECONDS = 5`, so the credited time is unchanged while the
  window grew. Lytt og svar credits real elapsed mic time as before.
- In continuous mode the mic stays open until the learner taps Ferdig or the 20s cap
  fires; the safety-fallback effect still resolves if the recognizer dies unexpectedly so
  the UI never sits on a dead "Lytter…".
- Not runtime-verified on-device: the Web Speech `continuous` behavior (especially Android
  Chrome) is browser-only and can't be exercised in CI. Verified by `tsc` + `audit:gate`
  (AUDIT-CLEAN, 970 tests) + a live HTTP smoke; the real proof is an on-device pause-and-
  finish pass. Shipped + deployed to pandoai.no (`105eea5`).
