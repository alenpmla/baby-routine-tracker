import { useRef, useState } from 'react'
import { useTracker } from '../store/TrackerProvider'
import { useSnapshotPrefs } from '../store/SnapshotPrefsProvider'
import { isValidBackup } from '../../data/repositories/RemoteRepositories'
import { BackIcon } from '../components/icons'

export default function DataReportsScreen({ onBack }: { onBack: () => void }) {
  const { baby, exportData, importData, getPeriodRecords } = useTracker()
  const { reportUnits } = useSnapshotPrefs()

  const [dataStatus, setDataStatus] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [reportStatus, setReportStatus] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)

  async function handleExport() {
    setDataError(null)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `baby-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setDataStatus('Backup downloaded')
    } catch {
      setDataError('Could not export data')
    }
  }

  function handleImportFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      let parsed: unknown
      try {
        parsed = JSON.parse(String(reader.result))
      } catch {
        setDataError('That file is not valid JSON')
        return
      }
      if (!isValidBackup(parsed)) {
        setDataError('Not a valid Baby Tracker backup file')
        return
      }
      void importData(parsed)
        .then(() => {
          setDataStatus('Data imported')
          setDataError(null)
        })
        .catch(() => setDataError('Import failed'))
        .finally(() => {
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        })
    }
    reader.readAsText(file)
  }

  async function handleReport() {
    setReportError(null)
    if (!periodStart || !periodEnd) {
      setReportError('Choose a start and end date')
      return
    }
    const start = new Date(`${periodStart}T00:00:00`)
    const end = new Date(`${periodEnd}T23:59:59`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      setReportError('End date must be after start date')
      return
    }
    try {
      const records = getPeriodRecords(start, end)
      const { downloadReportPdf } = await import('../utils/report')
      downloadReportPdf(baby, start, end, records, reportUnits)
      setReportStatus('Report downloaded')
    } catch {
      setReportError('Could not generate the report')
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
            <h1>Data & reports</h1>
          </div>
        </div>
        <p className="sub">Back up, restore, and export PDF reports</p>
      </header>

      <div className="card">
        <p className="settings-hint">Data — back up everything or restore from a backup.</p>
        <div className="settings-row">
          <button type="button" className="btn btn-secondary" onClick={() => void handleExport()}>
            Export data
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            Import data
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) {
                handleImportFile(f)
              }
            }}
          />
        </div>
        {dataStatus && (
          <p className="settings-ok" role="status">
            {dataStatus}
          </p>
        )}
        {dataError && (
          <p className="form-error" role="alert">
            {dataError}
          </p>
        )}
      </div>

      <div className="card">
        <p className="settings-hint">Report — export a professional PDF for a date range.</p>
        <div className="backfill-datetime settings-units">
          <label className="field">
            <span className="field-label">From</span>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">To</span>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-block settings-report-btn"
          onClick={() => void handleReport()}
        >
          Download PDF report
        </button>
        {reportStatus && (
          <p className="settings-ok" role="status">
            {reportStatus}
          </p>
        )}
        {reportError && (
          <p className="form-error" role="alert">
            {reportError}
          </p>
        )}
      </div>
    </div>
  )
}
