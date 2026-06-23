'use client'

import { useEffect, useRef } from 'react'
import { useFingerprintStore } from '@/stores/fingerprint-store'
import { applyThemeTransient, getStoredTheme, isThemeName } from '@/lib/theme'

/**
 * Cross-device theme adoption.
 *
 * The pre-paint script in layout.tsx already applied this device's local choice
 * from localStorage (no FOUC). If this device has NO local choice yet (fresh
 * device / new login), mirror the theme carried on the synced fingerprint once
 * it loads. A device-local choice always wins, so this only fires when the user
 * never picked a theme on this device.
 */
export function ThemeSync() {
  const theme = useFingerprintStore((s) => s.fingerprint?.theme)
  const settled = useRef(false)

  useEffect(() => {
    // An explicit local choice (set by applyTheme) always wins. Enforce it on
    // mount too — belt-and-suspenders if the pre-paint script was bypassed, so
    // the applied theme always matches the stored choice after hydration.
    const stored = getStoredTheme()
    if (stored) {
      if (document.documentElement.dataset.theme !== stored) {
        applyThemeTransient(stored)
      }
      settled.current = true
      return
    }
    // No local choice yet: adopt the theme carried on the synced fingerprint
    // (fresh device / new login) once it loads.
    if (settled.current) return
    if (isThemeName(theme)) {
      applyThemeTransient(theme)
      settled.current = true
    }
  }, [theme])

  return null
}
