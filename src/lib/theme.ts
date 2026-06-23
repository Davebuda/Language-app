// Theme registry + device-local apply/get.
//
// localStorage is the INSTANT source of truth: it's read by a tiny pre-paint
// script in app/layout.tsx so the right theme is on <html data-theme> before
// first paint (no FOUC). Cross-device sync rides on the fingerprint blob
// (useFingerprint.setTheme writes fp.theme; ThemeSync adopts it on a fresh
// device). This module is PURE — no fingerprint/persistence imports — so
// types/fingerprint.ts can import ThemeName without a cycle.

export type ThemeName = 'honning' | 'leirskole'

export const DEFAULT_THEME: ThemeName = 'honning'

export const THEME_STORAGE_KEY = 'norskcoach-theme'

export interface ThemeMeta {
  id: ThemeName
  label: string
  tagline: string
  /** preview swatches: base · primary signal · focus surface · mastery */
  swatch: { bg: string; signal: string; surface: string; honey: string }
  dark: boolean
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'honning',
    label: 'Honning',
    tagline: 'Mørk base, lime signal og honninggult for mestring.',
    swatch: { bg: '#0A1206', signal: '#C8FF20', surface: '#F0F1EC', honey: '#E8B04B' },
    dark: true,
  },
  {
    id: 'leirskole',
    label: 'Leirskole',
    tagline: 'Varm espresso, terrakotta og havre — rolig og jordnær.',
    swatch: { bg: '#1A140F', signal: '#C8632F', surface: '#EFE7D7', honey: '#E8B04B' },
    dark: true,
  },
]

export function isThemeName(v: unknown): v is ThemeName {
  return v === 'honning' || v === 'leirskole'
}

/** The explicit device-local choice, or null if none was ever made here. */
export function getStoredTheme(): ThemeName | null {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeName(v) ? v : null
  } catch {
    return null
  }
}

/** Apply a theme to <html> AND record it as this device's explicit choice. */
export function applyTheme(theme: ThemeName): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    /* storage unavailable — the in-DOM attribute still applies for this session */
  }
}

/** Apply to <html> WITHOUT recording a device-local choice. Used to mirror a
 *  synced fingerprint theme on a fresh device, where the user hasn't chosen
 *  locally yet (see ThemeSync). */
export function applyThemeTransient(theme: ThemeName): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme
  }
}
