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
    const today = todayStr()
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
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
    const existing = getStreak()
    const data: StreakData = {
      count: existing + 1,
      lastDate: today,
    }
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // localStorage unavailable — ignore
  }
}
