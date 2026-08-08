import type { Tab } from '../navigation'
import { BottleIcon, DiaperIcon, HomeIcon, MoonIcon, ScaleIcon } from './icons'

const TABS: { id: Tab; label: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'sleep', label: 'Sleep', Icon: MoonIcon },
  { id: 'feeding', label: 'Feeding', Icon: BottleIcon },
  { id: 'diaper', label: 'Diaper', Icon: DiaperIcon },
  { id: 'weight', label: 'Weight', Icon: ScaleIcon },
]

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="tabbar" aria-label="Primary">
      <div className="tabbar-inner">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`tabbar-item${active === id ? ' active' : ''}`}
            aria-current={active === id ? 'page' : undefined}
            onClick={() => onChange(id)}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
