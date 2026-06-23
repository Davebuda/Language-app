'use client'

import { useEffect, useState } from 'react'

/**
 * SSR-safe media-query hook. Returns false on the server and on the first client
 * render (so markup matches the server), then syncs to the real match after mount.
 * Used by WordPopup to switch between the desktop Popover and the mobile bottom-sheet.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}
