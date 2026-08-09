import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  /** 'sheet' = bottom sheet (default), 'dialog' = centered M3 dialog */
  variant?: 'sheet' | 'dialog'
}

function scrollIntoView(el: HTMLElement | null) {
  try {
    el?.scrollIntoView?.({ block: 'nearest' })
  } catch {
    /* noop */
  }
}

export default function Modal({ title, onClose, children, variant = 'sheet' }: ModalProps) {
  // Keep the focused field in view as the browser resizes for the keyboard,
  // without adding any artificial offset (which caused a gap above the keyboard).
  useEffect(() => {
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
  }, [])

  return (
    <div className={`modal-overlay${variant === 'dialog' ? ' modal-overlay-dialog' : ''}`} onClick={onClose}>
      <div
        className={`modal${variant === 'dialog' ? ' modal-dialog' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
