import { useState } from 'react'
import { useNotificationPrefs } from '../store/NotificationPrefsProvider'
import { useSnackbar } from '../store/SnackbarProvider'
import DurationPicker from '../components/DurationPicker'
import { BackIcon, BellIcon, ScheduleIcon } from '../components/icons'

type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported' | 'insecure'

function currentPermission(): PermissionState {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported'
  }
  if (window.isSecureContext === false) {
    return 'insecure'
  }
  return Notification.permission
}

export function describeDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) {
    return `${h}h ${m}m`
  }
  if (h > 0) {
    return `${h}h`
  }
  return `${m}m`
}

export default function NotificationsScreen({ onBack }: { onBack: () => void }) {
  const { wakeWindowEnabled, setWakeWindowEnabled, wakeWindowMinutes, setWakeWindowMinutes } = useNotificationPrefs()
  const { showSnackbar } = useSnackbar()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [permission, setPermission] = useState<PermissionState>(currentPermission)

  async function requestPermission() {
    if (typeof Notification === 'undefined' || window.isSecureContext === false) {
      return
    }
    try {
      setPermission(await Notification.requestPermission())
    } catch {
      setPermission('default')
    }
  }

  async function sendTest() {
    let p = currentPermission()
    if (p === 'default' && typeof Notification !== 'undefined' && window.isSecureContext !== false) {
      await requestPermission()
      p = currentPermission()
    }
    if (p === 'granted' && typeof Notification !== 'undefined') {
      try {
        new Notification('Baby Tracker', {
          body: 'This is a test notification from Baby Tracker.',
          icon: '/icon-192.png',
        })
        showSnackbar('Test notification sent')
      } catch {
        showSnackbar('Could not send the test notification', 'error')
      }
      return
    }
    if (p === 'insecure') {
      showSnackbar('Notifications need HTTPS — open via https://your-server:3443', 'error')
    } else if (p === 'denied') {
      showSnackbar('Notifications are blocked for this site', 'error')
    } else {
      showSnackbar('Notification permission is not granted', 'error')
    }
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <div className="header-row">
          <div className="header-leading">
            <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onBack}>
              <BackIcon />
            </button>
            <h1>Notifications</h1>
          </div>
        </div>
        <p className="sub">Wake window reminders</p>
      </header>

      <div className="card event">
        <span className="event-icon event-sleep">
          <BellIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Wake window reminder</span>
          <span className="event-meta">Remind when the baby has been awake too long.</span>
        </span>
        <label className="switch">
          <input
            type="checkbox"
            role="switch"
            checked={wakeWindowEnabled}
            onChange={(e) => setWakeWindowEnabled(e.target.checked)}
          />
          <span className="switch-track" aria-hidden="true" />
        </label>
      </div>

      {wakeWindowEnabled && (
        <button type="button" className="card event settings-nav" onClick={() => setPickerOpen(true)}>
          <span className="event-icon event-sleep">
            <ScheduleIcon size={18} />
          </span>
          <span className="event-body">
            <span className="event-title">Wake window</span>
            <span className="event-meta">Remind after this much awake time (up to 12h)</span>
          </span>
          <span className="settings-trailing">
            <span className="duration-value">{describeDuration(wakeWindowMinutes)}</span>
            <span className="settings-chevron">›</span>
          </span>
        </button>
      )}

      {pickerOpen && (
        <DurationPicker value={wakeWindowMinutes} onChange={setWakeWindowMinutes} onClose={() => setPickerOpen(false)} />
      )}

      <div className="card event">
        <span className="event-icon event-diaper">
          <BellIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Browser notifications</span>
          <span className="event-meta">
            {permission === 'granted' && 'Enabled — reminders appear like a native app'}
            {permission === 'default' && 'Show reminders as system notifications'}
            {permission === 'denied' && 'Blocked — allow notifications for this site in your browser'}
            {permission === 'unsupported' && 'Not supported in this browser'}
            {permission === 'insecure' && 'Requires HTTPS — open via https://your-server:3443'}
          </span>
        </span>
        {(permission === 'default' || permission === 'denied') && (
          <button
            type="button"
            className="btn btn-secondary notification-enable"
            onClick={() => void requestPermission()}
          >
            {permission === 'denied' ? 'Try again' : 'Enable'}
          </button>
        )}
      </div>

      <div className="card">
        <p className="settings-hint">Not sure notifications work? Send one now.</p>
        <button type="button" className="btn btn-secondary btn-block" onClick={() => void sendTest()}>
          Send test notification
        </button>
      </div>
    </div>
  )
}
