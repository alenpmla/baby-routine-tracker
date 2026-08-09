import { useState } from 'react'
import Modal from './Modal'

interface DurationPickerProps {
  value: number
  onChange: (minutes: number) => void
  onClose: () => void
}

export const MAX_MINUTES = 12 * 60

const PRESETS: { label: string; minutes: number }[] = [
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
  { label: '6h', minutes: 360 },
]

function clamp(v: number): number {
  return Math.min(MAX_MINUTES, Math.max(0, v))
}

export default function DurationPicker({ value, onChange, onClose }: DurationPickerProps) {
  const [hours, setHours] = useState(Math.min(12, Math.floor(value / 60)))
  const [minutes, setMinutes] = useState(value % 60)

  function commit() {
    onChange(clamp(hours * 60 + minutes))
    onClose()
  }

  function decMinutes() {
    if (minutes === 0) {
      if (hours === 0) {
        return
      }
      setHours((h) => h - 1)
      setMinutes(59)
    } else {
      setMinutes((m) => m - 1)
    }
  }

  function incMinutes() {
    if (minutes === 59) {
      setHours((h) => Math.min(12, h + 1))
      setMinutes(0)
    } else {
      setMinutes((m) => m + 1)
    }
  }

  function applyPreset(p: number) {
    setHours(Math.min(12, Math.floor(p / 60)))
    setMinutes(p % 60)
  }

  return (
    <Modal title="Set wake window" onClose={onClose} variant="dialog">
      <div className="duration-picker">
        <div className="duration-display" aria-live="polite">
          {hours}h {String(minutes).padStart(2, '0')}m
        </div>

        <div className="duration-presets">
          {PRESETS.map((p) => (
            <button key={p.label} type="button" className="chip" onClick={() => applyPreset(p.minutes)}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="duration-fields">
          <div className="stepper">
            <span className="field-label">Hours</span>
            <div className="stepper-row">
              <button
                type="button"
                className="icon-btn stepper-btn"
                aria-label="Decrease hours"
                onClick={() => setHours((h) => Math.max(0, h - 1))}
              >
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={12}
                aria-label="Hours"
                value={hours}
                onChange={(e) => setHours(Math.max(0, Math.min(12, Number(e.target.value) || 0)))}
              />
              <button
                type="button"
                className="icon-btn stepper-btn"
                aria-label="Increase hours"
                onClick={() => setHours((h) => Math.min(12, h + 1))}
              >
                +
              </button>
            </div>
          </div>

          <div className="stepper">
            <span className="field-label">Minutes</span>
            <div className="stepper-row">
              <button type="button" className="icon-btn stepper-btn" aria-label="Decrease minutes" onClick={decMinutes}>
                −
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={59}
                aria-label="Minutes"
                value={minutes}
                onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
              />
              <button type="button" className="icon-btn stepper-btn" aria-label="Increase minutes" onClick={incMinutes}>
                +
              </button>
            </div>
          </div>
        </div>

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn" onClick={commit}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  )
}
