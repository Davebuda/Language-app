// The "breaker story" (T1.3, VC §2 + §3.7): the learner's core promise is that the
// app "steadily removes the specific things that break your sentences." The
// fingerprint computes that data (per-concept error log + mastery) but the Progress
// surface never told it as a story. This derives, from real data only:
//   - ACTIVE breakers — concepts the learner is still getting wrong, with an honest
//     week-over-week trend (down = improving, never claimed without prior data).
//   - RETIRED ("fikset") breakers — concepts that WERE a real breaker and are now
//     mastered and quiet. Never claims "fixed" without past struggle + present mastery.
import { isMastered } from '@/engine'
import type { MistakeFingerprint } from '@/types/fingerprint'
import type { ConceptNode } from '@/types/concepts'

export type BreakerTrend = 'down' | 'up' | 'flat' | 'new'

export interface BreakerRow {
  conceptId: string
  label: string
  thisWeek: number
  priorWeek: number
  total: number // errors for this concept within the recent (200-cap) log
  trend: BreakerTrend
}

export interface BreakerStory {
  active: BreakerRow[] // still breaking — most-active first
  retired: BreakerRow[] // was a breaker, now mastered + quiet this week
}

const DAY = 24 * 60 * 60 * 1000

export function deriveBreakerStory(
  fingerprint: MistakeFingerprint,
  concepts: ConceptNode[],
  now: number = Date.now(),
): BreakerStory {
  const nodeById = new Map(concepts.map((c) => [c.id, c]))
  const groups = new Map<string, { total: number; thisWeek: number; priorWeek: number }>()

  for (const e of fingerprint.recentErrors ?? []) {
    const t = new Date(e.timestamp).getTime()
    if (Number.isNaN(t)) continue
    const g = groups.get(e.conceptId) ?? { total: 0, thisWeek: 0, priorWeek: 0 }
    g.total += 1
    const age = now - t
    if (age <= 7 * DAY) g.thisWeek += 1
    else if (age <= 14 * DAY) g.priorWeek += 1
    groups.set(e.conceptId, g)
  }

  const active: BreakerRow[] = []
  const retired: BreakerRow[] = []

  for (const [conceptId, g] of groups) {
    const node = nodeById.get(conceptId)
    const label = node?.label ?? conceptId.replace(/-/g, ' ')
    const mastery = fingerprint.conceptMastery[conceptId]
    const mastered = node
      ? isMastered(mastery, node.masteryThreshold, node.minAttempts, node.minDays)
      : false

    // Trend is honest: only call it "down" (improving) when there IS prior-week data
    // to compare against; a first-week breaker is "new", not "improved".
    let trend: BreakerTrend
    if (g.priorWeek === 0 && g.thisWeek > 0) trend = 'new'
    else if (g.thisWeek < g.priorWeek) trend = 'down'
    else if (g.thisWeek > g.priorWeek) trend = 'up'
    else trend = 'flat'

    const row: BreakerRow = {
      conceptId,
      label,
      thisWeek: g.thisWeek,
      priorWeek: g.priorWeek,
      total: g.total,
      trend,
    }

    // RETIRED ("fikset"): was a real breaker (>= 2 logged errors), now mastered, and
    // quiet this week. We never claim "fixed" without both past struggle and present mastery.
    if (mastered && g.total >= 2 && g.thisWeek === 0) retired.push(row)
    else active.push(row)
  }

  active.sort((a, b) => b.thisWeek - a.thisWeek || b.total - a.total)
  retired.sort((a, b) => b.total - a.total)
  return { active, retired }
}
