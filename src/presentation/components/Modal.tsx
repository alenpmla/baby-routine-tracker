import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ModalProps {
  /** Controls visibility; Modal animates out before unmounting when it goes false. */
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** 'sheet' = bottom sheet (default), 'dialog' = centered M3 dialog */
  variant?: 'sheet' | 'dialog'
}

/** Exit transition duration in ms — keep in sync with the CSS transition length. */
const EXIT_MS = 200

function scrollIntoView(el: HTMLElement | null) {
  try {
    el?.scrollIntoView?.({ block: 'nearest' })
  } catch {
    /* noop */
  }
}

const raf: (cb: () => void) => { cancel: () => void } = (cb) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    const id = window.requestAnimationFrame(cb)
    return { cancel: () => window.cancelAnimationFrame(id) }
  }
  const id = window.setTimeout(cb, 0)
  return { cancel: () => window.clearTimeout(id) }
}

export default function Modal({ open, title, onClose, children, variant = 'sheet' }: ModalProps) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  // Snapshot the last open content so the sheet keeps it visible during exit.
  const snapshot = useRef({ title, children })

  if (open) {
    snapshot.current = { title, children }
  }

  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = raf(() => setEntered(true))
      return t.cancel
    }
    setEntered(false)
    const id = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!mounted) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mounted, onClose])

  // Keep the focused field in view as the browser resizes for the keyboard,
  // without adding any artificial offset (which caused a gap above the keyboard).
  useEffect(() => {
    if (!mounted) {
      return
    }
    const vv = window.visualViewport
    function onViewportChange() {
      scrollIntoView(document.activeElement as HTMLElement | null)
    }
    if (vv) {
      vv.addEventListener('resize', onViewportChange)
      vv.addEventListener('scroll', onViewportChange)
    }
    function onFocusIn(e: FocusEvent) {
      scrollIntoView(e.target as HTMLElement | null)
    }
    document.addEventListener('focusin', onFocusIn)
    return () => {
      if (vv) {
        vv.removeEventListener('resize', onViewportChange)
        vv.removeEventListener('scroll', onViewportChange)
      }
      document.removeEventListener('focusin', onFocusIn)
    }
  }, [mounted])

  if (!mounted) {
    return null
  }

  const shown = open ? { title, children } : snapshot.current

  return (
    <div
      className={`modal-overlay${variant === 'dialog' ? ' modal-overlay-dialog' : ''}${entered ? ' modal-overlay-open' : ''}`}
      onClick={onClose}
    >
      <div
        className={`modal${variant === 'dialog' ? ' modal-dialog' : ''}${entered ? ' modal-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={shown.title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{shown.title}</h2>
          <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{shown.children}</div>
      </div>
    </div>
  )
}
