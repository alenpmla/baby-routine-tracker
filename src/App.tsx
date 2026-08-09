import { useEffect } from 'react'
import { TrackerProvider, useTracker } from './presentation/store/TrackerProvider'
import { ThemeProvider } from './presentation/store/ThemeProvider'
import { SnapshotPrefsProvider } from './presentation/store/SnapshotPrefsProvider'
import { SnackbarProvider } from './presentation/store/SnackbarProvider'
import { NotificationPrefsProvider } from './presentation/store/NotificationPrefsProvider'
import { useWakeWindowReminder } from './presentation/store/useWakeWindowReminder'
import { useBackNav, type SettingsView } from './presentation/store/useBackNav'
import ProfileScreen from './presentation/screens/ProfileScreen'
import DashboardScreen from './presentation/screens/DashboardScreen'
import SleepScreen from './presentation/screens/SleepScreen'
import FeedingScreen from './presentation/screens/FeedingScreen'
import DiaperScreen from './presentation/screens/DiaperScreen'
import WeightScreen from './presentation/screens/WeightScreen'
import SettingsScreen from './presentation/screens/SettingsScreen'
import TabBar from './presentation/components/TabBar'
import OfflineBanner from './presentation/components/OfflineBanner'

function Shell() {
  const { ready, offline, syncNow, baby, saveProfile } = useTracker()
  const { current, navigate, goToTab, goBack } = useBackNav()
  const { tab, settings, settingsView } = current
  useWakeWindowReminder()

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

  if (settings) {
    return (
      <div className="shell">
        {banner}
        <main className="screen">
          <SettingsScreen
            view={settingsView ?? 'main'}
            onOpenView={(v: SettingsView) =>
              navigate({ tab, settings: true, settingsView: v === 'main' ? undefined : v })
            }
            onGoBack={goBack}
          />
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
            onOpenSettings={() => navigate({ tab, settings: true })}
            onNavigate={goToTab}
          />
        )}
        {tab === 'sleep' && <SleepScreen />}
        {tab === 'feeding' && <FeedingScreen />}
        {tab === 'diaper' && <DiaperScreen />}
        {tab === 'weight' && <WeightScreen />}
      </main>
      <TabBar active={tab} onChange={goToTab} />
    </div>
  )
}

export default function App() {
  return (
    <TrackerProvider>
      <NotificationPrefsProvider>
        <SnapshotPrefsProvider>
          <ThemeProvider>
            <SnackbarProvider>
              <Shell />
            </SnackbarProvider>
          </ThemeProvider>
        </SnapshotPrefsProvider>
      </NotificationPrefsProvider>
    </TrackerProvider>
  )
}
