import { useTheme, type ThemePreference, type ThemeAccent } from '../store/ThemeProvider'
import { useTracker } from '../store/TrackerProvider'
import { useSnapshotPrefs, type AveragesDays } from '../store/SnapshotPrefsProvider'
import type { HomeLogView } from '../../domain/model/AppSettings'
import ProfileScreen from './ProfileScreen'
import FoodSuggestionsScreen from './FoodSuggestionsScreen'
import UnitsScreen from './UnitsScreen'
import DataReportsScreen from './DataReportsScreen'
import NotificationsScreen from './NotificationsScreen'
import WhatsNewScreen from './WhatsNewScreen'
import type { SettingsView } from '../store/useBackNav'
import { BackIcon, BellIcon, BowlIcon, DownloadIcon, ProfileIcon, SettingsIcon } from '../components/icons'

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const ACCENT_OPTIONS: { id: ThemeAccent; label: string }[] = [
  { id: 'violet', label: 'Violet' },
  { id: 'ocean', label: 'Ocean' },
  { id: 'forest', label: 'Forest' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'rose', label: 'Rose' },
]

export default function SettingsScreen({
  view,
  onOpenView,
  onGoBack,
}: {
  view: SettingsView
  onOpenView: (view: SettingsView) => void
  onGoBack: () => void
}) {
  const { theme, setTheme, accent, setAccent } = useTheme()
  const { baby, saveProfile, settings, updateSettings } = useTracker()
  const { averagesDays, setAveragesDays } = useSnapshotPrefs()
  const homeLogView: HomeLogView = settings.homeLogView ?? 'list'

  if (view === 'profile') {
    return (
      <ProfileScreen
        existing={baby}
        onBack={onGoBack}
        onSubmit={(input) => {
          saveProfile(input)
          onGoBack()
        }}
      />
    )
  }

  if (view === 'suggestions') {
    return <FoodSuggestionsScreen onBack={onGoBack} />
  }

  if (view === 'units') {
    return <UnitsScreen onBack={onGoBack} />
  }

  if (view === 'data') {
    return <DataReportsScreen onBack={onGoBack} />
  }

  if (view === 'notifications') {
    return <NotificationsScreen onBack={onGoBack} />
  }

  if (view === 'whatsnew') {
    return <WhatsNewScreen onBack={onGoBack} />
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <div className="header-row">
          <div className="header-leading">
            <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onGoBack}>
              <BackIcon />
            </button>
            <h1>Settings</h1>
          </div>
          <button type="button" className="link-btn" onClick={onGoBack}>
            Done
          </button>
        </div>
        <p className="sub">Appearance, units, data and reports</p>
      </header>

      <div className="card">
        <p className="settings-hint">Appearance — System follows your device setting.</p>
        <div className="segmented segmented-3 settings-theme" role="group" aria-label="Theme">
          {THEME_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`seg${theme === id ? ' seg-selected' : ''}`}
              onClick={() => setTheme(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="settings-hint settings-hint-accent">Accent color</p>
        <div className="accent-row" role="group" aria-label="Accent color">
          {ACCENT_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`accent-swatch${accent === id ? ' accent-swatch-selected' : ''}`}
              aria-label={label}
              aria-pressed={accent === id}
              title={label}
              onClick={() => setAccent(id)}
            >
              <span className={`accent-dot accent-${id}`} aria-hidden="true" />
              <span className="accent-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="settings-hint">Daily averages — window used for the Avg/day tiles on Sleep, Feeding and Diaper.</p>
        <div className="segmented segmented-4 settings-theme" role="group" aria-label="Averages window">
          {([7, 15, 30, 60] as AveragesDays[]).map((days) => (
            <button
              key={days}
              type="button"
              className={`seg${averagesDays === days ? ' seg-selected' : ''}`}
              onClick={() => setAveragesDays(days)}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="settings-hint">Home log — how today&apos;s entries are presented on the Home page.</p>
        <div className="segmented settings-theme" role="group" aria-label="Home log">
          {(['list', 'timeline'] as HomeLogView[]).map((view) => (
            <button
              key={view}
              type="button"
              className={`seg${homeLogView === view ? ' seg-selected' : ''}`}
              onClick={() => updateSettings({ homeLogView: view })}
            >
              {view === 'list' ? 'List' : 'Timeline'}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="card event settings-nav" onClick={() => onOpenView('whatsnew')}>
        <span className="event-icon event-feeding">
          <BowlIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">What&apos;s new</span>
          <span className="event-meta">Recent features and improvements</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>

      <button type="button" className="card event settings-nav" onClick={() => onOpenView('profile')}>
        <span className="event-icon event-sleep">
          <ProfileIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Edit profile</span>
          <span className="event-meta">Name, date of birth and notes</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>

      <button type="button" className="card event settings-nav" onClick={() => onOpenView('units')}>
        <span className="event-icon event-sleep">
          <SettingsIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Units</span>
          <span className="event-meta">Snapshot and PDF report units</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>

      <button type="button" className="card event settings-nav" onClick={() => onOpenView('data')}>
        <span className="event-icon event-diaper">
          <DownloadIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Data & reports</span>
          <span className="event-meta">Export/import data and PDF reports</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>

      <button type="button" className="card event settings-nav" onClick={() => onOpenView('notifications')}>
        <span className="event-icon event-diaper">
          <BellIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Notifications</span>
          <span className="event-meta">Wake window reminders and browser alerts</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>

      <button type="button" className="card event settings-nav" onClick={() => onOpenView('suggestions')}>
        <span className="event-icon event-feeding">
          <BowlIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Food suggestions</span>
          <span className="event-meta">Manage foods shown while typing</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>
    </div>
  )
}
