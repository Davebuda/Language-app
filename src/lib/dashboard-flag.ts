'use client'

// Dashboard V3 variant flag — device-local localStorage toggle.
//
// Mirrors the theme.ts pattern: SSR-safe with `typeof window` guards,
// try/catch around every localStorage call, no fingerprint/engine imports.
//
// Default: OFF.  Flip on with setDashV3(true) from the browser console or
// a dev toggle to preview the V3 layout without a rebuild.

import { useState, useEffect } from 'react'

export const DASH_V3_KEY = 'norskcoach-dash-v3'

/** SSR-safe read. Returns true only when the stored value is 'on' or 'true'. */
export function getStoredDashV3(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const v = window.localStorage.getItem(DASH_V3_KEY)
    return v === 'on' || v === 'true'
  } catch {
    return false
  }
}

/** Write 'on' or 'off' to localStorage. No-op if storage is unavailable. */
export function setDashV3(on: boolean): void {
  try {
    window.localStorage.setItem(DASH_V3_KEY, on ? 'on' : 'off')
  } catch {
    /* storage unavailable — the in-memory state still applies for this session */
  }
}

/**
 * React hook for reading the V3 dashboard flag.
 *
 * Returns `false` on the server AND on the first client render to prevent
 * hydration mismatches. After mount a `useEffect` reads the stored value and
 * updates state, so any component that depends on this will re-render once
 * on the client if the flag is on.
 */
export function useDashboardV3(): boolean {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    setEnabled(getStoredDashV3())
  }, [])

  return enabled
}
