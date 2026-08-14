import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  /** Controls visibility; Modal animates out before unmounting when it goes false. */
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** 'sheet' = bottom sheet (default), 'dialog' = centered M3 dialog, 'fullscreen' = full-height sheet */
  variant?: 'sheet' | 'dialog' | 'fullscreen'
}

/** Exit transition duration in ms — keep in sync with the CSS transition length. */
const EXIT_MS = 200

/** Track open modals so Escape closes only the topmost sheet (nested pickers). */
const openStack: Array<number> = []
let nextModalId = 0

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
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const modalRef = useRef<HTMLDivElement | null>(null)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const dragStartY = useRef<number | null>(null)
  const dragYRef = useRef(0)
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
    setDragY(0)
    setDragging(false)
    const id = window.setTimeout(() => setMounted(false), EXIT_MS)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!mounted) {
      return
    }
    const id = nextModalId++
    openStack.push(id)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openStack[openStack.length - 1] === id) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      const idx = openStack.indexOf(id)
      if (idx >= 0) {
        openStack.splice(idx, 1)
      }
      document.removeEventListener('keydown', onKey)
    }
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

  const draggable = variant === 'sheet' || variant === 'fullscreen'

  const reducedMotion =
    typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function isDragTarget(target: EventTarget | null): boolean {
    if (!draggable) {
      return false
    }
    if (!(target instanceof Element)) {
      return false
    }
    if (target.closest('button, input, select, textarea, a')) {
      return false
    }
    // Drag from any non-interactive area of the sheet (body, header, handle).
    return Boolean(target.closest('.modal'))
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') {
      return
    }
    if (!isDragTarget(e.target)) {
      return
    }
    // Only engage the drag when the sheet is scrolled to the top, so scrolling
    // the sheet body still works.
    const el = bodyRef.current
    if (!el || el.scrollTop > 0) {
      return
    }
    dragStartY.current = e.clientY
    setDragging(true)
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId)
    } catch {
      // jsdom and some browsers do not implement pointer capture; ignore.
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragStartY.current === null) {
      return
    }
    const dy = e.clientY - dragStartY.current
    dragYRef.current = dy > 0 ? dy : 0
    setDragY(dragYRef.current)
  }

  function handlePointerEnd() {
    if (dragStartY.current === null) {
      return
    }
    dragStartY.current = null
    setDragging(false)
    const height = modalRef.current?.offsetHeight ?? window.innerHeight
    const threshold = Math.min(140, height * 0.3)
    if (dragYRef.current >= threshold) {
      setDragY(window.innerHeight)
      if (reducedMotion) {
        onClose()
      } else {
        window.setTimeout(() => onClose(), EXIT_MS)
      }
    } else {
      setDragY(0)
    }
  }

  return createPortal(
    <div
      className={`modal-overlay${variant === 'dialog' ? ' modal-overlay-dialog' : ''}${variant === 'fullscreen' ? ' modal-overlay-fullscreen' : ''}${entered ? ' modal-overlay-open' : ''}`}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`modal${variant === 'dialog' ? ' modal-dialog' : ''}${variant === 'fullscreen' ? ' modal-fullscreen' : ''}${entered ? ' modal-open' : ''}${dragging ? ' modal-dragging' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={shown.title}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div className="modal-header">
          <h2>{shown.title}</h2>
          <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body" ref={bodyRef}>{shown.children}</div>
      </div>
    </div>,
    document.body,
  )
}
