const KEY = 'norskcoach_streak'

interface StreakData {
  count: number
  lastDate: string // YYYY-MM-DD
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getStreak(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return 0
    const data: StreakData = JSON.parse(raw)
    if (typeof data.count !== 'number' || typeof data.lastDate !== 'string') return 0
    const today = todayStr()
    // DST-safe yesterday: subtract 1 day in local date parts
    const d = new Date()
    d.setDate(d.getDate() - 1)
    const yesterday = d.toISOString().slice(0, 10)
    if (data.lastDate === today || data.lastDate === yesterday) return data.count
    return 0
  } catch {
    return 0
  }
}

export function incrementStreak(): void {
  if (typeof window === 'undefined') return
  try {
    const today = todayStr()
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const existing: Partial<StreakData> = JSON.parse(raw)
      // Already incremented today — do not double-count
      if (existing.lastDate === today) return
    }
    const currentCount = getStreak()
    const data: StreakData = {
      count: currentCount + 1,
      lastDate: today,
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable — ignore
  }
}
