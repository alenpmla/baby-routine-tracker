import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type SnackbarVariant = 'success' | 'error'

interface SnackbarOptions {
  message: string
  variant?: SnackbarVariant
}

interface SnackbarState extends SnackbarOptions {
  key: number
}

interface SnackbarContextValue {
  showSnackbar: (message: string, variant?: SnackbarVariant) => void
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null)

const AUTO_DISMISS_MS = 4000

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const showSnackbar = useCallback(
    (message: string, variant: SnackbarVariant = 'success') => {
      clearTimer()
      setSnackbar({ message, variant, key: Date.now() })
      timerRef.current = window.setTimeout(() => {
        setSnackbar(null)
        timerRef.current = null
      }, AUTO_DISMISS_MS)
    },
    [clearTimer],
  )

  useEffect(() => clearTimer, [clearTimer])

  const value = useMemo(() => ({ showSnackbar }), [showSnackbar])

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {snackbar ? (
        <div
          key={snackbar.key}
          data-testid="snackbar"
          className={`snackbar${snackbar.variant === 'error' ? ' snackbar-error' : ''}`}
          role={snackbar.variant === 'error' ? 'alert' : 'status'}
        >
          <span className="snackbar-text">{snackbar.message}</span>
        </div>
      ) : null}
    </SnackbarContext.Provider>
  )
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext)
  if (!ctx) {
    throw new Error('useSnackbar must be used within SnackbarProvider')
  }
  return ctx
}
