import { BackIcon } from '../components/icons'
import { WHATS_NEW } from '../utils/whatsNew'

export default function WhatsNewScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen-content">
      <header className="screen-header">
        <div className="header-row">
          <div className="header-leading">
            <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onBack}>
              <BackIcon />
            </button>
            <h1>What&apos;s new</h1>
          </div>
        </div>
        <p className="sub">Recent features and improvements</p>
      </header>

      <div className="whatsnew-list">
        {WHATS_NEW.map((entry) => (
          <section key={entry.version} className="card whatsnew-entry">
            <header className="whatsnew-entry-head">
              <h2>v{entry.version}</h2>
              <span className="whatsnew-entry-date">{entry.date}</span>
            </header>
            <ul className="whatsnew-items">
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
