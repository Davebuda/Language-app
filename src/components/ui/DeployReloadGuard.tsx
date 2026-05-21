'use client'

import { useEffect } from 'react'

// Catches the cross-deploy error classes (Server Action hash mismatch + chunk
// load 404s) and forces a one-shot hard reload onto the fresh build.
// Sentinel lives in localStorage with a timestamp so a tab-crash + restore
// loop cannot amplify reloads: never fires more than once per device per 10 min.
export function DeployReloadGuard() {
  useEffect(() => {
    const SENTINEL_KEY = 'deploy-reload-guard-ts'
    const COOLDOWN_MS = 10 * 60 * 1000

    function shouldReload(message: string): boolean {
      return (
        message.includes('Failed to find Server Action') ||
        message.includes('Loading chunk') ||
        message.includes('ChunkLoadError')
      )
    }

    function recentlyReloaded(): boolean {
      try {
        const raw = localStorage.getItem(SENTINEL_KEY)
        if (!raw) return false
        const ts = Number(raw)
        if (!Number.isFinite(ts)) return false
        return Date.now() - ts < COOLDOWN_MS
      } catch {
        return false
      }
    }

    function markReloaded(): void {
      try {
        localStorage.setItem(SENTINEL_KEY, String(Date.now()))
      } catch { /* storage may be blocked — fail open */ }
    }

    function handler(event: ErrorEvent | PromiseRejectionEvent) {
      const message = String(
        (event as ErrorEvent).message ??
          (event as PromiseRejectionEvent).reason ??
          '',
      )
      if (!shouldReload(message)) return
      if (recentlyReloaded()) return
      markReloaded()
      window.location.reload()
    }

    window.addEventListener('error', handler)
    window.addEventListener('unhandledrejection', handler)
    return () => {
      window.removeEventListener('error', handler)
      window.removeEventListener('unhandledrejection', handler)
    }
  }, [])

  return null
}
