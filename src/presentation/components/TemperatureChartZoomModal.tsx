import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { registerBackOverlay } from '../store/useBackNav'
import TemperatureChart from './TemperatureChart'
import type { TemperatureEntry } from '../../domain/model/TemperatureEntry'

const EXIT_MS = 220
const TEMP_ZOOM_OVERLAY_ID = 'temp-zoom'

const raf: (cb: () => void) => { cancel: () => void } = (cb) => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    const id = window.requestAnimationFrame(cb)
    return { cancel: () => window.cancelAnimationFrame(id) }
  }
  const id = window.setTimeout(cb, 0)
  return { cancel: () => window.clearTimeout(id) }
}

interface TemperatureChartZoomModalProps {
  open: boolean
  entries: TemperatureEntry[]
  windowStart: Date
  windowEnd: Date
  onClose: () => void
}

/** Fullscreen zoom view of the Home temperature chart. */
export default function TemperatureChartZoomModal({
  open,
  entries,
  windowStart,
  windowEnd,
  onClose,
}: TemperatureChartZoomModalProps) {
  const [mounted, setMounted] = useState(open)
  const [entered, setEntered] = useState(false)
  const snapshot = useRef({ windowStart, windowEnd })
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  if (open) {
    snapshot.current = { windowStart, windowEnd }
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
    if (!open) {
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
      }
    }
    const handleBack = () => onCloseRef.current()
    registerBackOverlay(handleBack, TEMP_ZOOM_OVERLAY_ID)
    document.addEventListener('keydown', onKey)
    return () => {
      registerBackOverlay(null)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleClose = () => {
    registerBackOverlay(null)
    onClose()
  }

  if (!mounted) {
    return null
  }

  const shown = open ? { windowStart, windowEnd } : snapshot.current

  return createPortal(
    <div
      className={`modal-overlay modal-overlay-fullscreen zoom-modal${entered ? ' modal-overlay-open' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`modal modal-fullscreen zoom-modal-panel${entered ? ' modal-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Temperature (last 7 days)"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Temperature (last 7 days)</h2>
          <button type="button" className="icon-btn modal-close" aria-label="Close" onClick={handleClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <TemperatureChart entries={entries} windowStart={shown.windowStart} windowEnd={shown.windowEnd} />
          <p className="zoom-hint" role="status">
            Typical range 36–37.5 °C · readings at or above 37.5 °C are flagged as fever
          </p>
        </div>
      </div>
    </div>,
    document.body,
  )
}