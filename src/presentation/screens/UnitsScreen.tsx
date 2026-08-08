import { useSnapshotPrefs } from '../store/SnapshotPrefsProvider'
import type { BottleUnit, SolidsUnit } from '../utils/feeding'
import { BackIcon } from '../components/icons'

export default function UnitsScreen({ onBack }: { onBack: () => void }) {
  const { units, setBottleUnit, setSolidsUnit, reportUnits, setReportBottleUnit, setReportSolidsUnit } =
    useSnapshotPrefs()

  return (
    <div className="screen-content">
      <header className="screen-header">
        <div className="header-row">
          <div className="header-leading">
            <button type="button" className="icon-btn back-btn" aria-label="Back" onClick={onBack}>
              <BackIcon />
            </button>
            <h1>Units</h1>
          </div>
        </div>
        <p className="sub">Preferred measurement units</p>
      </header>

      <div className="card">
        <p className="settings-hint">Snapshot units — totals shown on the Feeding screen.</p>
        <div className="backfill-datetime settings-units">
          <label className="field">
            <span className="field-label">Bottle amount</span>
            <select value={units.bottle} onChange={(e) => setBottleUnit(e.target.value as BottleUnit)}>
              <option value="ml">ml</option>
              <option value="oz">oz</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Solids amount</span>
            <select value={units.solids} onChange={(e) => setSolidsUnit(e.target.value as SolidsUnit)}>
              <option value="g">g</option>
              <option value="oz">oz</option>
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <p className="settings-hint">Report units — used in the downloaded PDF report.</p>
        <div className="backfill-datetime settings-units">
          <label className="field">
            <span className="field-label">Bottle amount</span>
            <select
              value={reportUnits.bottle}
              onChange={(e) => setReportBottleUnit(e.target.value as BottleUnit)}
            >
              <option value="ml">ml</option>
              <option value="oz">oz</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Solids amount</span>
            <select
              value={reportUnits.solids}
              onChange={(e) => setReportSolidsUnit(e.target.value as SolidsUnit)}
            >
              <option value="g">g</option>
              <option value="oz">oz</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}
