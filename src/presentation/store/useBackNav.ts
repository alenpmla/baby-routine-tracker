import { useCallback, useEffect, useRef, useState } from 'react'
import type { Tab } from '../navigation'

export type SettingsView = 'main' | 'profile' | 'suggestions' | 'units' | 'data' | 'notifications'

export interface NavState {
  tab: Tab
  settings: boolean
  settingsView?: Exclude<SettingsView, 'main'>
}

const HOME: NavState = { tab: 'home', settings: false }

function isNavState(v: unknown): v is NavState {
  return !!v && typeof v === 'object' && typeof (v as NavState).tab === 'string'
}

export function useBackNav() {
  const [current, setCurrent] = useState<NavState>(() => {
    const st = window.history.state as unknown
    return isNavState(st) ? (st as NavState) : HOME
  })
  const stackRef = useRef<NavState[]>([current])
  const pendingBacks = useRef(0)

  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState(HOME, '')
    }
    const onPop = (e: PopStateEvent) => {
      if (pendingBacks.current > 0) {
        pendingBacks.current -= 1
        return
      }
      const raw = e.state as unknown
      const target = isNavState(raw) ? (raw as NavState) : HOME
      const s = stackRef.current
      const idx = s.findIndex(
        (n) => n.tab === target.tab && n.settings === target.settings && n.settingsView === target.settingsView,
      )
      stackRef.current = idx >= 0 ? s.slice(0, idx + 1) : s.length > 1 ? s.slice(0, -1) : [HOME]
      setCurrent(stackRef.current[stackRef.current.length - 1])
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((next: NavState, replace = false) => {
    const s = stackRef.current
    if (replace) {
      stackRef.current = [...s.slice(0, -1), next]
      window.history.replaceState(next, '')
    } else {
      stackRef.current = [...s, next]
      window.history.pushState(next, '')
    }
    setCurrent(next)
  }, [])

  const goToTab = useCallback((tab: Tab) => {
    const next: NavState = { tab, settings: false }
    const s = stackRef.current
    if (s.length === 1) {
      stackRef.current = [...s, next]
      window.history.pushState(next, '')
    } else {
      stackRef.current = [...s.slice(0, -1), next]
      window.history.replaceState(next, '')
    }
    setCurrent(next)
  }, [])

  const goBack = useCallback(() => {
    const s = stackRef.current
    if (s.length <= 1) {
      stackRef.current = [HOME]
      window.history.replaceState(HOME, '')
      setCurrent(HOME)
      return
    }
    stackRef.current = s.slice(0, -1)
    setCurrent(stackRef.current[stackRef.current.length - 1])
    pendingBacks.current += 1
    window.history.back()
  }, [])

  return { current, navigate, goToTab, goBack }
}
