'use client'

// Dashboard V3 variant flag — device-local localStorage toggle.
//
// Mirrors the theme.ts pattern: SSR-safe with `typeof window` guards,
// try/catch around every localStorage call, no fingerprint/engine imports.
//
// Default: ON (V3 is the live dashboard as of 2026-06-26). The legacy
// dashboard remains a fallback reachable by explicitly storing 'off'/'false'
// (setDashV3(false)) — kept for quick rollback without a redeploy.

import { useState, useEffect } from 'react'

export const DASH_V3_KEY = 'norskcoach-dash-v3'

/** SSR-safe read. V3 is the default; returns false only when explicitly opted out. */
export function getStoredDashV3(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const v = window.localStorage.getItem(DASH_V3_KEY)
    return !(v === 'off' || v === 'false')
  } catch {
    return true
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
 * Returns `true` on the server AND on the first client render — V3 is the
 * default, so SSR and first paint render V3 and hydration matches (no flash)
 * for the common case. After mount a `useEffect` re-reads localStorage and
 * flips to legacy only for a device that has explicitly opted out
 * ('off'/'false'); that rare case re-renders once.
 */
export function useDashboardV3(): boolean {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(getStoredDashV3())
  }, [])

  return enabled
}
