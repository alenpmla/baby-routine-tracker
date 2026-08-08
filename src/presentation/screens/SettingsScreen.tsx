import { useState } from 'react'
import { useTracker } from '../store/TrackerProvider'
import { useTheme, type ThemePreference } from '../store/ThemeProvider'
import ProfileScreen from './ProfileScreen'
import FoodSuggestionsScreen from './FoodSuggestionsScreen'
import UnitsScreen from './UnitsScreen'
import DataReportsScreen from './DataReportsScreen'
import { BackIcon, BowlIcon, DownloadIcon, ProfileIcon, SettingsIcon } from '../components/icons'

const THEME_OPTIONS: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { theme, setTheme } = useTheme()
  const { baby, saveProfile } = useTracker()
  const [view, setView] = useState<'main' | 'profile' | 'suggestions' | 'units' | 'data'>('main')

  if (view === 'profile') {
    return (
      <ProfileScreen
        existing={baby}
        onBack={() => setView('main')}
        onSubmit={(input) => {
          saveProfile(input)
          setView('main')
        }}
      />
    )
  }

  if (view === 'suggestions') {
    return <FoodSuggestionsScreen onBack={() => setView('main')} />
  }

  if (view === 'units') {
    return <UnitsScreen onBack={() => setView('main')} />
  }

  if (view === 'data') {
    return <DataReportsScreen onBack={() => setView('main')} />
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <div className="header-row">
          <div className="header-leading">
            <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onClose}>
              <BackIcon />
            </button>
            <h1>Settings</h1>
          </div>
          <button type="button" className="link-btn" onClick={onClose}>
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
      </div>

      <button type="button" className="card event settings-nav" onClick={() => setView('profile')}>
        <span className="event-icon event-sleep">
          <ProfileIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Edit profile</span>
          <span className="event-meta">Name, date of birth and notes</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>

      <button type="button" className="card event settings-nav" onClick={() => setView('units')}>
        <span className="event-icon event-sleep">
          <SettingsIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Units</span>
          <span className="event-meta">Snapshot and PDF report units</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>

      <button type="button" className="card event settings-nav" onClick={() => setView('data')}>
        <span className="event-icon event-diaper">
          <DownloadIcon size={18} />
        </span>
        <span className="event-body">
          <span className="event-title">Data & reports</span>
          <span className="event-meta">Export/import data and PDF reports</span>
        </span>
        <span className="settings-chevron">›</span>
      </button>

      <button type="button" className="card event settings-nav" onClick={() => setView('suggestions')}>
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
