import { useEffect, useState } from 'react'
import { TrackerProvider, useTracker } from './presentation/store/TrackerProvider'
import { ThemeProvider } from './presentation/store/ThemeProvider'
import { SnapshotPrefsProvider } from './presentation/store/SnapshotPrefsProvider'
import { SnackbarProvider } from './presentation/store/SnackbarProvider'
import ProfileScreen from './presentation/screens/ProfileScreen'
import DashboardScreen from './presentation/screens/DashboardScreen'
import SleepScreen from './presentation/screens/SleepScreen'
import FeedingScreen from './presentation/screens/FeedingScreen'
import DiaperScreen from './presentation/screens/DiaperScreen'
import WeightScreen from './presentation/screens/WeightScreen'
import SettingsScreen from './presentation/screens/SettingsScreen'
import TabBar from './presentation/components/TabBar'
import OfflineBanner from './presentation/components/OfflineBanner'
import type { Tab } from './presentation/navigation'

function Shell() {
  const { ready, offline, syncNow, baby, saveProfile } = useTracker()
  const [tab, setTab] = useState<Tab>('home')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    function onScroll() {
      document.body.classList.toggle('appbar-scrolled', window.scrollY > 4)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!ready) {
    return (
      <div className="shell">
        <main className="screen">
          <div className="empty">Loading…</div>
        </main>
      </div>
    )
  }

  const banner = offline ? <OfflineBanner onRetry={syncNow} /> : null

  if (!baby) {
    return (
      <div className="shell">
        {banner}
        <main className="screen">
          <ProfileScreen onSubmit={(input) => saveProfile(input)} />
        </main>
      </div>
    )
  }

  if (showSettings) {
    return (
      <div className="shell">
        {banner}
        <main className="screen">
          <SettingsScreen onClose={() => setShowSettings(false)} />
        </main>
      </div>
    )
  }

  return (
    <div className="shell">
      {banner}
      <main className="screen">
        {tab === 'home' && (
          <DashboardScreen
            onOpenSettings={() => setShowSettings(true)}
            onNavigate={setTab}
          />
        )}
        {tab === 'sleep' && <SleepScreen />}
        {tab === 'feeding' && <FeedingScreen />}
        {tab === 'diaper' && <DiaperScreen />}
        {tab === 'weight' && <WeightScreen />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}

export default function App() {
  return (
    <TrackerProvider>
      <ThemeProvider>
        <SnapshotPrefsProvider>
          <SnackbarProvider>
            <Shell />
          </SnackbarProvider>
        </SnapshotPrefsProvider>
      </ThemeProvider>
    </TrackerProvider>
  )
}
