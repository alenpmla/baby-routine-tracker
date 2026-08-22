import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useTracker } from './TrackerProvider'
import type { ThemePreference, ThemeAccent } from '../../domain/model/AppSettings'

export type { ThemePreference, ThemeAccent } from '../../domain/model/AppSettings'

const THEME_KEY = 'theme'
const ACCENT_KEY = 'themeAccent'

interface ThemeContextValue {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
  accent: ThemeAccent
  setAccent: (accent: ThemeAccent) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function applyThemeAttributes(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', pref)
  }

  const light = document.getElementById('theme-color-light')
  const dark = document.getElementById('theme-color-dark')
  if (light && dark) {
    if (pref === 'light') {
      light.setAttribute('media', 'all')
      dark.setAttribute('media', 'not all')
    } else if (pref === 'dark') {
      light.setAttribute('media', 'not all')
      dark.setAttribute('media', 'all')
    } else {
      light.setAttribute('media', '(prefers-color-scheme: light)')
      dark.setAttribute('media', '(prefers-color-scheme: dark)')
    }
  }
}

function applyAccentAttribute(accent: ThemeAccent) {
  const root = document.documentElement
  if (accent === 'violet') {
    root.removeAttribute('data-accent')
  } else {
    root.setAttribute('data-accent', accent)
  }
}

function readLegacyTheme(): ThemePreference | null {
  try {
    const v = window.localStorage.getItem(`bt.${THEME_KEY}`)
    if (v === 'light' || v === 'dark') {
      return v
    }
  } catch {
    /* ignore */
  }
  return null
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { ready, settings, updateSettings } = useTracker()
  const theme: ThemePreference = settings.theme ?? 'system'
  const accent: ThemeAccent = settings.themeAccent ?? 'violet'
  const setTheme = useCallback((t: ThemePreference) => updateSettings({ theme: t }), [updateSettings])
  const setAccent = useCallback((a: ThemeAccent) => updateSettings({ themeAccent: a }), [updateSettings])

  // Keep a localStorage cache so the pre-paint script avoids a theme flash.
  useEffect(() => {
    try {
      window.localStorage.setItem(`bt.${THEME_KEY}`, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    try {
      window.localStorage.setItem(`bt.${ACCENT_KEY}`, accent)
    } catch {
      /* ignore */
    }
  }, [accent])

  useEffect(() => {
    applyThemeAttributes(theme)
  }, [theme])

  useEffect(() => {
    applyAccentAttribute(accent)
  }, [accent])

  // One-time migration from the legacy per-device key into the synced settings.
  // Waits for the initial load so it never clobbers the freshly loaded settings.
  useEffect(() => {
    if (!ready || settings.theme) {
      return
    }
    const legacy = readLegacyTheme()
    if (legacy) {
      updateSettings({ theme: legacy })
    }
  }, [ready, settings.theme, updateSettings])

  const value = useMemo(() => ({ theme, setTheme, accent, setAccent }), [theme, setTheme, accent, setAccent])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
