import type { RoleplayScenario } from '@/lib/roleplayContent'

/**
 * Count unique targetConceptId values in a scenario's turns that appear in weeklyFocus.
 */
export function scoreFocusOverlap(scenario: RoleplayScenario, weeklyFocus: string[]): number {
  if (!weeklyFocus.length) return 0
  const focusSet = new Set(weeklyFocus)
  const uniqueConcepts = new Set(scenario.turns.map(t => t.targetConceptId))
  let count = 0
  for (const c of uniqueConcepts) {
    if (focusSet.has(c)) count++
  }
  return count
}

/**
 * Sort scenarios descending by focus overlap. Ties preserve original order (stable sort).
 */
export function rankScenariosByFocusOverlap(
  scenarios: RoleplayScenario[],
  weeklyFocus: string[],
): RoleplayScenario[] {
  if (!weeklyFocus.length) return scenarios
  return [...scenarios].sort((a, b) =>
    scoreFocusOverlap(b, weeklyFocus) - scoreFocusOverlap(a, weeklyFocus)
  )
}
