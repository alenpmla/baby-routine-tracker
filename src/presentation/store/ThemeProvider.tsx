import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemePreference = 'system' | 'light' | 'dark'

const KEY = 'theme'

interface ThemeContextValue {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStored(): ThemePreference {
  try {
    const v = window.localStorage.getItem(`bt.${KEY}`)
    if (v === 'light' || v === 'dark' || v === 'system') {
      return v
    }
  } catch {
    /* ignore */
  }
  return 'system'
}

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreference>(readStored)

  useEffect(() => {
    applyThemeAttributes(theme)
    try {
      window.localStorage.setItem(`bt.${KEY}`, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const value = useMemo(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}
