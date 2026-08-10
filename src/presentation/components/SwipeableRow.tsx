import { useEffect, useRef, useState, type ReactNode } from 'react'
import { TrashIcon } from './icons'
import { closeSwipeRows, openSwipeRow, useSwipeOpenId } from './swipeRows'
import ConfirmDialog from './ConfirmDialog'

interface SwipeableRowProps {
  /** Unique id for this row (used for single-open coordination). */
  id: string
  deleteLabel: string
  onDelete: () => void
  children: ReactNode
}

const REVEAL = 72
const OPEN_THRESHOLD = 32
const CLOSE_THRESHOLD = 24

/**
 * Wraps a record row so a horizontal swipe reveals a delete action on the right.
 * Only one row is open at a time; tapping elsewhere closes it. The delete button
 * stays in the DOM and is keyboard-focusable (it becomes visible on focus).
 */
export default function SwipeableRow({ id, deleteLabel, onDelete, children }: SwipeableRowProps) {
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
      if (target instanceof Element && target.closest('.swipeable-row-delete')) {
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
    <li className={`card event swipeable-row${open ? ' swipeable-row-open' : ''}`}>
      <button
        type="button"
        className="swipeable-row-delete"
        aria-label={deleteLabel}
        onFocus={() => openSwipeRow(id)}
        onClick={(e) => {
          e.stopPropagation()
          closeSwipeRows()
          setOffset(0)
          setConfirming(true)
        }}
      >
        <TrashIcon />
      </button>
      {confirming && (
        <ConfirmDialog
          title="Delete this record?"
          message="This will permanently remove the record. This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={onDelete}
          onClose={() => setConfirming(false)}
        />
      )}
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
    </li>
  )
}
