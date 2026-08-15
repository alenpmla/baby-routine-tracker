import type { HealthView } from '../store/useBackNav'
import WeightScreen from './WeightScreen'
import HeadCircumferenceScreen from './HeadCircumferenceScreen'
import TeethScreen from './TeethScreen'
import TeethingScreen from './TeethingScreen'
import MedicationFeverScreen from './MedicationFeverScreen'
import MilestonesScreen from './MilestonesScreen'
import { BackIcon, PillIcon, RulerIcon, ScaleIcon, SmileIcon, StarIcon } from '../components/icons'

const MENU: { id: HealthView; label: string; meta: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { id: 'weight', label: 'Weight', meta: 'Weight entries and growth', Icon: ScaleIcon },
  { id: 'headcircumference', label: 'Head circumference', meta: 'Head growth tracking', Icon: RulerIcon },
  { id: 'teethmenu', label: 'Teeth & teething', meta: 'Tooth log and teething notes', Icon: SmileIcon },
  { id: 'milestones', label: 'Milestones', meta: 'Firsts and developmental milestones', Icon: StarIcon },
  { id: 'medication', label: 'Medication & fever', meta: 'Doses and temperature readings', Icon: PillIcon },
]

export default function HealthScreen({
  view,
  onOpenView,
  onGoBack,
}: {
  view: HealthView | 'main'
  onOpenView: (view: HealthView) => void
  onGoBack: () => void
}) {
  if (view === 'weight') {
    return <WeightScreen onBack={onGoBack} />
  }

  if (view === 'headcircumference') {
    return <HeadCircumferenceScreen onBack={onGoBack} />
  }

  if (view === 'teeth') {
    return <TeethScreen onBack={onGoBack} />
  }

  if (view === 'teething') {
    return <TeethingScreen onBack={onGoBack} />
  }

  if (view === 'teethmenu') {
    return (
      <div className="screen-content">
        <header className="screen-header">
          <div className="header-row">
            <div className="header-leading">
              <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onGoBack}>
                <BackIcon />
              </button>
              <h1>Teeth &amp; teething</h1>
            </div>
          </div>
          <p className="sub">Tooth log and teething notes</p>
        </header>

        <button type="button" className="card event settings-nav" onClick={() => onOpenView('teeth')}>
          <span className="event-icon event-weight">
            <SmileIcon size={18} />
          </span>
          <span className="event-body">
            <span className="event-title">Teeth</span>
            <span className="event-meta">Erupted teeth and tooth entries</span>
          </span>
          <span className="settings-chevron">›</span>
        </button>
        <button type="button" className="card event settings-nav" onClick={() => onOpenView('teething')}>
          <span className="event-icon event-weight">
            <SmileIcon size={18} />
          </span>
          <span className="event-body">
            <span className="event-title">Teething</span>
            <span className="event-meta">Day-by-day symptom log</span>
          </span>
          <span className="settings-chevron">›</span>
        </button>
      </div>
    )
  }

  if (view === 'milestones') {
    return <MilestonesScreen onBack={onGoBack} />
  }

  if (view === 'medication') {
    return <MedicationFeverScreen onBack={onGoBack} />
  }

  return (
    <div className="screen-content">
      <header className="screen-header">
        <div className="header-row">
          <div className="header-leading">
            <h1>Health</h1>
          </div>
        </div>
        <p className="sub">Weight, growth and wellbeing</p>
      </header>

      {MENU.map(({ id, label, meta, Icon }) => (
        <button key={id} type="button" className="card event settings-nav" onClick={() => onOpenView(id)}>
          <span className="event-icon event-weight">
            <Icon size={18} />
          </span>
          <span className="event-body">
            <span className="event-title">{label}</span>
            <span className="event-meta">{meta}</span>
          </span>
          <span className="settings-chevron">›</span>
        </button>
      ))}
    </div>
  )
}
