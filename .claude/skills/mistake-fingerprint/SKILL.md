---
name: mistake-fingerprint
description: The MistakeFingerprint data model — mastery scoring, confidence, decay, error patterns, and storage. Use when modifying fingerprint logic, reading/writing learner profiles, debugging engine behavior, or building any feature that reads from or writes to the learner's progress data.
---

# Mistake Fingerprint

## What It Is

The `MistakeFingerprint` is the live model of the learner. It's the most important data structure in the app. Everything the engine does is based on reading this. All exercise results write back to it.

**Key principle:** It lives in IndexedDB (browser local storage) by default. It only goes to Supabase if the user explicitly opts into sync. This is a privacy guarantee and a product advantage.

## Location
- TypeScript type: `src/types/fingerprint.ts`
- Engine logic: `src/engine/fingerprint.ts`
- Storage: `src/storage/indexeddb.ts`

## Key Concepts

### Mastery Score vs Confidence
- `rawScore` (0–100): simple accuracy rate (correct / total attempts × 100)
- `confidenceScore` (0–1): how reliable the score is. Geometric mean of:
  - attempt confidence: `min(1, attemptCount / minAttempts)`
  - day confidence: `min(1, uniqueDaysActive / minDays)`
- A concept with rawScore=90 and confidence=0.3 is NOT mastered (too few attempts)
- A concept with rawScore=75 and confidence=1.0 IS masterable at threshold=75

### Decay
- `decayedScore` decays toward floor of 35 (not zero): `DECAY_FLOOR + (rawScore - DECAY_FLOOR) × e^(-ln(2)/25 × daysSincePractice)`
- Half-life: **25 days** (Stream 1.2 correction)
- `refreshDecay()` is called on app open, not on every attempt
- The decay is a read-time transform — rawScore is always stored intact

### Error Patterns
- `recentErrors`: last 200 errors, newest first
- `errorPatterns`: aggregated patterns from last 30 days — built by `aggregateErrorPatterns()`
- Only errors with frequency ≥ 2 become patterns

### Production Gap
- `productionGap[conceptId]`: positive = struggles more with production (writing/speaking) than recognition
- Computed in `computeProductionGap()` from the error log
- Used by the scheduler to add more production exercises when gap > 40

### Passed Sentence Tracking
- `passedSentenceIds: Record<string, string>` — sentenceId → ISO timestamp when the learner answered correctly
- Recorded on every correct answer in `useFingerprint.ts`
- Used by the scheduler to exclude passed sentences from normal progression (remediation, new-material, interleaving)
- Review and repair items are exempt — they intentionally re-show passed content
- When all sentences for a concept are passed, the scheduler skips the concept for non-review purposes and AI generates fresh content

## Update Flow

```
User answers exercise
  ↓
ExerciseResult created
  ↓
If wrong: logError() → adds to recentErrors → updateConceptMastery(correct=false)
If correct: updateConceptMastery(correct=true) + add to passedSentenceIds
  ↓
saveFingerprint() → IndexedDB
  ↓
On next app open: refreshDecay() updates decayedScores
```

## Mastery Check

`isMastered(mastery, threshold, minAttempts, minDays)` returns true when ALL of:
1. rawScore >= threshold
2. confidenceScore >= 0.7
3. attemptCount >= minAttempts
4. uniqueDaysActive >= minDays

## Privacy Rules
- Never log raw user text to Supabase without explicit opt-in
- `recentErrors` contains wrong/correct answer text — treat as sensitive
- `userId` is Supabase auth UUID — only available if user is logged in; use anonymous UUID as fallback
