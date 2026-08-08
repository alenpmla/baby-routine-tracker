interface StatTileProps {
  label: string
  value: string
  Icon?: (p: { size?: number }) => JSX.Element
  accent?: 'sleep' | 'feed' | 'diaper' | 'weight'
}

export default function StatTile({ label, value, Icon, accent = 'sleep' }: StatTileProps) {
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
      </span>
    </div>
  )
}
