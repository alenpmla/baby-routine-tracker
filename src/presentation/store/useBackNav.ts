import { useCallback, useEffect, useRef, useState } from 'react'
import type { Tab } from '../navigation'

export type SettingsView = 'main' | 'profile' | 'suggestions' | 'units' | 'data' | 'notifications' | 'whatsnew'

export type HealthView = 'weight' | 'headcircumference' | 'teethmenu' | 'teeth' | 'teething' | 'medication' | 'milestones'

export interface NavState {
  tab: Tab
  settings: boolean
  settingsView?: Exclude<SettingsView, 'main'>
  healthView?: HealthView
}

const HOME: NavState = { tab: 'home', settings: false }

function isNavState(v: unknown): v is NavState {
  return !!v && typeof v === 'object' && typeof (v as NavState).tab === 'string'
}

/**
 * Optional handler registered by an open overlay/modal: when set, the browser
 * back button calls it (to close the modal) instead of popping the nav stack.
 */
let activeOverlay: (() => void) | null = null

export function registerBackOverlay(fn: (() => void) | null): void {
  activeOverlay = fn
}

// sessionStorage key for the nav stack. Survives a reload (pull-to-refresh /
// refresh) so you land back where you were, but is per-browser — never synced
// to the server, so another device's tabs cannot affect this one.
const STORAGE_KEY = 'bt-nav'

function readSavedStack(): NavState[] | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }
    const arr = JSON.parse(raw) as unknown
    if (Array.isArray(arr) && arr.length >= 1 && arr.every(isNavState)) {
      return arr as NavState[]
    }
    return null
  } catch {
    return null
  }
}

/**
 * App navigation + back-button handling.
 *
 * Every in-app forward navigation pushes one browser-history entry and one
 * in-memory stack entry, so the two always mirror each other. The browser back
 * button pops one stack level; at the root (Home) it exits the app natively.
 * The stack is persisted to sessionStorage so a reload restores the current
 * page (and its back depth).
 *
 * Back semantics:
 *  - an open overlay/modal → closes it (does not navigate),
 *  - deeper sub-screens (settings/health views) → previous screen,
 *  - any tab → Home tab,
 *  - Home → exit the app.
 */
export function useBackNav() {
  const stackRef = useRef<NavState[]>([])
  if (stackRef.current.length === 0) {
    stackRef.current = [HOME]
  }
  const [current, setCurrent] = useState<NavState>(HOME)
  // Counter of back() calls we initiated ourselves so the popstate handler
  // does not double-pop when an on-screen back arrow calls history.back().
  const pendingBacks = useRef(0)

  // Restore a persisted stack once (after a reload).
  const restoredRef = useRef(false)

  useEffect(() => {
    if (restoredRef.current) {
      return
    }
    restoredRef.current = true
    const saved = readSavedStack()
    if (saved && saved.length > 0) {
      stackRef.current = saved
      setCurrent(saved[saved.length - 1])
      // Mirror the restored depth in browser history so back works after reload.
      const depth = saved.length - 1
      for (let i = 0; i < depth; i += 1) {
        window.history.pushState({ bt: 'app' }, '')
      }
    }

    const onPop = () => {
      if (pendingBacks.current > 0) {
        pendingBacks.current -= 1
        return
      }
      if (activeOverlay) {
        activeOverlay()
        window.history.pushState({ bt: 'app' }, '')
        return
      }
      const s = stackRef.current
      if (s.length <= 1) {
        // At the root: let the browser exit on the next back press.
        return
      }
      stackRef.current = s.slice(0, -1)
      setCurrent(stackRef.current[stackRef.current.length - 1])
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Persist the stack so a reload restores the current page + depth.
  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stackRef.current))
    } catch {
      /* ignore quota/private-mode errors */
    }
  }, [current])

  const navigate = useCallback((next: NavState, replace = false) => {
    if (replace) {
      stackRef.current = [...stackRef.current.slice(0, -1), next]
      window.history.replaceState({ bt: 'app' }, '')
    } else {
      stackRef.current = [...stackRef.current, next]
      window.history.pushState({ bt: 'app' }, '')
    }
    setCurrent(next)
  }, [])

  const goToTab = useCallback((tab: Tab) => {
    if (tab === 'home') {
      const depth = stackRef.current.length - 1
      stackRef.current = [HOME]
      setCurrent(HOME)
      if (depth > 0) {
        window.history.go(-depth)
      }
      return
    }
    const next: NavState = { tab, settings: false }
    const s = stackRef.current
    if (s.length === 1) {
      stackRef.current = [...s, next]
      window.history.pushState({ bt: 'app' }, '')
    } else {
      stackRef.current = [...s.slice(0, -1), next]
      window.history.replaceState({ bt: 'app' }, '')
    }
    setCurrent(next)
  }, [])

  const goBack = useCallback(() => {
    const s = stackRef.current
    if (s.length <= 1) {
      stackRef.current = [HOME]
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
