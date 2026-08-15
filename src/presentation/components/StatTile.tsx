interface StatTileProps {
  label: string
  value: string
  detail?: string
  Icon?: (p: { size?: number }) => JSX.Element
  accent?: 'sleep' | 'feed' | 'diaper' | 'weight' | 'health'
}

export default function StatTile({ label, value, detail, Icon, accent = 'sleep' }: StatTileProps) {
  return (
    <div className={`stat-tile stat-${accent}`} role="group" aria-label={label}>
      {Icon && (
        <span className="stat-icon">
          <Icon size={20} />
        </span>
      )}
      <span className="stat-body">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {detail && <span className="stat-detail">{detail}</span>}
      </span>
    </div>
  )
}
