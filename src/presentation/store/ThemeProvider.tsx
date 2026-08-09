import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useTracker } from './TrackerProvider'
import type { ThemePreference } from '../../domain/model/AppSettings'

export type { ThemePreference } from '../../domain/model/AppSettings'

const THEME_KEY = 'theme'

interface ThemeContextValue {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
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
  const setTheme = useCallback((t: ThemePreference) => updateSettings({ theme: t }), [updateSettings])

  // Keep a localStorage cache so the pre-paint script avoids a theme flash.
  useEffect(() => {
    try {
      window.localStorage.setItem(`bt.${THEME_KEY}`, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    applyThemeAttributes(theme)
  }, [theme])

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

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
