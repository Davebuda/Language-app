'use client'

import { useEffect } from 'react'

// Catches the cross-deploy error classes (Server Action hash mismatch + chunk
// load 404s) and forces a one-shot hard reload onto the fresh build. sessionStorage
// sentinel prevents a broken new build from trapping the user in a reload loop.
export function DeployReloadGuard() {
  useEffect(() => {
    const SENTINEL_KEY = 'deploy-reload-guard'

    function shouldReload(message: string): boolean {
      return (
        message.includes('Failed to find Server Action') ||
        message.includes('Loading chunk') ||
        message.includes('ChunkLoadError')
      )
    }

    function handler(event: ErrorEvent | PromiseRejectionEvent) {
      const message = String(
        (event as ErrorEvent).message ??
          (event as PromiseRejectionEvent).reason ??
          '',
      )
      if (!shouldReload(message)) return
      if (sessionStorage.getItem(SENTINEL_KEY) === '1') return
      sessionStorage.setItem(SENTINEL_KEY, '1')
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
