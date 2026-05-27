# Wave 5: Structured Daily Session (Lytt / Lær / Snakk)

**Status:** Designed, not started. Depends on Waves 0-4 being committed.

## Concept

One unified session under "Start økt" with 3 distinct blocks instead of a flat list of exercises. Each block targets a different modality. Higher levels shift weight toward production (listening + speaking).

## Block Structure Per Level

| Block | A1 | A2 | B1 | B2 | Modality |
|---|---|---|---|---|---|
| Lytt | 5 | 6 | 7 | 8 | Listen-and-respond, audio comprehension |
| Lær | 15 | 13 | 11 | 9 | Translation, fill-in-blank, word-order |
| Snakk | 5 | 6 | 7 | 8 | Shadow sentences, speak responses |
| Total | 25 | 25 | 25 | 25 | ~19-25 min |

## Data Model

```typescript
interface SessionBlock {
  id: string
  type: 'lytt' | 'lær' | 'snakk'
  label: string
  items: SessionItem[]
}

interface DailyProgress {
  date: string
  blocks: {
    lytt: { completed: number; total: number; correct: number }
    lær: { completed: number; total: number; correct: number }
    snakk: { completed: number; total: number; correct: number }
  }
  sessionId: string
  completedAt: string | null
}
```

## Implementation Phases

1. **5.1 Session Block Types** (1 day) — define types, update scheduler to return blocks
2. **5.2 Listening Block** (1 day) — extract ListeningExercise from ListenRespondScreen
3. **5.3 Speaking Block** (1 day) — extract SpeakingExercise from ShadowingScreen
4. **5.4 Session Screen Blocks** (half day) — render block headers, per-block progress
5. **5.5 Daily Progress Tracking** (half day) — dailyProgress on fingerprint, dashboard dots
6. **5.6 Weekly Modality Rollup** (half day) — modalityBreakdown on WeeklySprintRecord

## Architecture Notes

- Engine unchanged — still processes individual exercise results via recordResult
- Scheduler gets block-awareness: generates items per block type
- Session screen renders blocks linearly with section headers
- Each block's exercises feed the fingerprint through the existing pipeline
- dailyProgress is a rolling 7-day window on the fingerprint
- Weekly rollup aggregates modality data into WeeklySprintRecord
