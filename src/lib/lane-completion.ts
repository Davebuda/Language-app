export type LaneId = 'session' | 'journal' | 'conversation' | 'roleplay' | 'reading'

const STORAGE_KEY = 'norskcoach_lane_completion'

interface LaneState {
  date: string
  lanes: Record<LaneId, boolean>
}

function todayKey(): string {
  return new Date().toLocaleDateString('sv-SE')
}

function emptyLanes(): Record<LaneId, boolean> {
  return { session: false, journal: false, conversation: false, roleplay: false, reading: false }
}

function readState(): LaneState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { date: todayKey(), lanes: emptyLanes() }
    const parsed = JSON.parse(raw) as LaneState
    if (parsed.date !== todayKey()) return { date: todayKey(), lanes: emptyLanes() }
    return parsed
  } catch {
    return { date: todayKey(), lanes: emptyLanes() }
  }
}

function writeState(state: LaneState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota exceeded — non-critical */ }
}

export function isLaneDone(laneId: LaneId): boolean {
  return readState().lanes[laneId] ?? false
}

export function markLaneDone(laneId: LaneId): void {
  const state = readState()
  state.lanes[laneId] = true
  writeState(state)
}

export function getCompletedLanes(): Set<LaneId> {
  const state = readState()
  return new Set(
    (Object.entries(state.lanes) as [LaneId, boolean][]).filter(([, v]) => v).map(([k]) => k),
  )
}

export function allLanesDone(): boolean {
  const state = readState()
  return Object.values(state.lanes).every(Boolean)
}

export const ALL_LANES: LaneId[] = ['session', 'journal', 'conversation', 'roleplay', 'reading']
