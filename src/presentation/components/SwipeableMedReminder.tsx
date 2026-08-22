import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CloseIcon } from './icons'
import { closeSwipeRows, openSwipeRow, useSwipeOpenId } from './swipeRows'
import ConfirmDialog from './ConfirmDialog'

const REVEAL = 72
const OPEN_THRESHOLD = 32
const CLOSE_THRESHOLD = 24

/**
 * Swipeable medication-reminder card. A horizontal swipe reveals a "Hide reminders"
 * action on the right (same pattern as record delete rows). Tapping it asks for
 * confirmation before permanently hiding reminders for the medication.
 */
export default function SwipeableMedReminder({
  id,
  name,
  onDismiss,
  children,
}: {
  id: string
  name: string
  onDismiss: () => void
  children: ReactNode
}) {
  const openId = useSwipeOpenId()
  const open = openId === id

  const dragStart = useRef<number | null>(null)
  const dragDelta = useRef(0)
  const [offset, setOffset] = useState(0)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    const closeOnPointerDown = (e: PointerEvent) => {
      const target = e.target
      if (target instanceof Element && target.closest('.swipeable-row-actions')) {
        return
      }
      closeSwipeRows()
    }
    document.addEventListener('pointerdown', closeOnPointerDown)
    return () => document.removeEventListener('pointerdown', closeOnPointerDown)
  }, [open])

  function handlePointerDown(e: React.PointerEvent) {
    if (e.button !== 0 && e.pointerType === 'mouse') {
      return
    }
    dragStart.current = e.clientX
    dragDelta.current = 0
    try {
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    } catch {
      // jsdom and some browsers do not implement pointer capture; ignore.
    }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (dragStart.current === null) {
      return
    }
    dragDelta.current = dragStart.current - e.clientX
    if (dragDelta.current > 0) {
      setOffset(Math.min(dragDelta.current, REVEAL))
    } else if (open) {
      setOffset(Math.max(0, REVEAL + dragDelta.current))
    }
  }

  function handlePointerEnd() {
    if (dragStart.current === null) {
      return
    }
    dragStart.current = null
    if (dragDelta.current >= OPEN_THRESHOLD) {
      openSwipeRow(id)
      setOffset(REVEAL)
    } else if (open && dragDelta.current < -CLOSE_THRESHOLD) {
      closeSwipeRows()
      setOffset(0)
    } else {
      setOffset(open ? REVEAL : 0)
    }
  }

  return (
    <div className={`card med-reminder swipeable-row${open ? ' swipeable-row-open' : ''}`}>
      <div className="swipeable-row-actions">
        <button
          type="button"
          className="swipeable-row-secondary med-reminder-hide"
          aria-label={`Hide reminders for ${name}`}
          onFocus={() => openSwipeRow(id)}
          onClick={(e) => {
            e.stopPropagation()
            closeSwipeRows()
            setOffset(0)
            setConfirming(true)
          }}
        >
          <CloseIcon size={20} />
        </button>
      </div>
      <ConfirmDialog
        open={confirming}
        title="Hide reminders?"
        message={`You won't be asked about ${name} again until you log it manually — reminders resume the next day.`}
        confirmLabel="Hide reminders"
        onConfirm={() => {
          setConfirming(false)
          onDismiss()
        }}
        onClose={() => setConfirming(false)}
      />
      <div
        className="swipeable-row-content"
        style={{ transform: `translateX(-${open ? REVEAL : offset}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        {children}
      </div>
    </div>
  )
}