import { useRef, useState } from 'react'
import { useTracker } from '../store/TrackerProvider'
import { useSnapshotPrefs } from '../store/SnapshotPrefsProvider'
import { useSnackbar } from '../store/SnackbarProvider'
import { isValidBackup } from '../../data/repositories/RemoteRepositories'
import { BackIcon } from '../components/icons'
import Modal from '../components/Modal'
import {
  DEFAULT_REPORT_SECTIONS,
  REPORT_SECTION_LABELS,
  hasAnySection,
  type ReportSections,
} from '../utils/reportSections'

const REPORT_SECTIONS_KEY = 'bt.reportSections'

function readStoredSections(): ReportSections {
  try {
    const raw = window.localStorage.getItem(REPORT_SECTIONS_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as Partial<ReportSections>
      return { ...DEFAULT_REPORT_SECTIONS, ...parsed }
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_REPORT_SECTIONS
}

function storeSections(sections: ReportSections) {
  try {
    window.localStorage.setItem(REPORT_SECTIONS_KEY, JSON.stringify(sections))
  } catch {
    /* ignore */
  }
}

export default function DataReportsScreen({ onBack }: { onBack: () => void }) {
  const { baby, exportData, importData, getPeriodRecords } = useTracker()
  const { reportUnits } = useSnapshotPrefs()
  const { showSnackbar } = useSnackbar()

  const [dataStatus, setDataStatus] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [reportStatus, setReportStatus] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportSections, setReportSections] = useState<ReportSections>(readStoredSections)
  const [showSectionPicker, setShowSectionPicker] = useState(false)

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
    setDataStatus(null)
    setDataError(null)
    setImporting(true)
    const reader = new FileReader()
    reader.onload = () => {
      const resetInput = () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
      let parsed: unknown
      try {
        parsed = JSON.parse(String(reader.result))
      } catch {
        setImporting(false)
        setDataError('That file is not valid JSON')
        showSnackbar('That file is not valid JSON', 'error')
        resetInput()
        return
      }
      if (!isValidBackup(parsed)) {
        setImporting(false)
        setDataError('Not a valid Baby Tracker backup file')
        showSnackbar('Not a valid Baby Tracker backup file', 'error')
        resetInput()
        return
      }
      void importData(parsed)
        .then(() => {
          setDataStatus('Data imported')
          showSnackbar('Data imported')
        })
        .catch(() => {
          setDataError('Import failed')
          showSnackbar('Import failed', 'error')
        })
        .finally(() => {
          setImporting(false)
          resetInput()
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
    setShowSectionPicker(true)
  }

  async function handleDownload(sections: ReportSections) {
    setReportError(null)
    setShowSectionPicker(false)
    setReportSections(sections)
    storeSections(sections)
    const start = new Date(`${periodStart}T00:00:00`)
    const end = new Date(`${periodEnd}T23:59:59`)
    try {
      const records = getPeriodRecords(start, end)
      const { downloadReportPdf } = await import('../utils/report')
      downloadReportPdf(baby, start, end, records, reportUnits, sections)
      setReportStatus('Report downloaded')
    } catch {
      setReportError('Could not generate the report')
    }
  }

  function toggleSection(key: keyof ReportSections) {
    setReportSections((prev) => ({ ...prev, [key]: !prev[key] }))
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
          <button type="button" className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Import data'}
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
        {importing && (
          <p className="settings-ok" role="status">
            Importing…
          </p>
        )}
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

      <Modal
        open={showSectionPicker}
        title="Report sections"
        variant="dialog"
        onClose={() => setShowSectionPicker(false)}
      >
        <p className="dialog-message">Choose what to include in the PDF.</p>
        <div className="report-sections" role="group" aria-label="Report sections">
          {REPORT_SECTION_LABELS.map(({ key, label }) => (
            <label key={key} className="report-section-option">
              <input
                type="checkbox"
                checked={reportSections[key]}
                onChange={() => toggleSection(key)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={() => setShowSectionPicker(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="btn"
            disabled={!hasAnySection(reportSections)}
            onClick={() => void handleDownload(reportSections)}
          >
            Download
          </button>
        </div>
      </Modal>
    </div>
  )
}
