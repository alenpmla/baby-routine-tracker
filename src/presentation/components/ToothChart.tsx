import type { ToothName } from '../../domain/model/ToothEntry'

const UPPER: ToothName[] = [
  'Upper second molar',
  'Upper first molar',
  'Upper canine',
  'Upper lateral incisor',
  'Upper central incisor',
]

const LOWER: ToothName[] = [
  'Lower second molar',
  'Lower first molar',
  'Lower canine',
  'Lower lateral incisor',
  'Lower central incisor',
]

function ToothGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3.5c2 1 3 1 4 1s2 0 4-1c1.7.3 3 2.2 3 4.9 0 4.1-2.2 9.1-3.5 9.1-1.1 0-1.4-2.5-3.5-2.5s-2.4 2.5-3.5 2.5C7.2 17.5 5 12.5 5 8.4c0-2.7 1.3-4.6 3-4.9Z" />
    </svg>
  )
}

function ToothCell({ name, erupted }: { name: ToothName; erupted: boolean }) {
  return (
    <span
      className={`tooth-cell${erupted ? ' tooth-erupted' : ''}`}
      role="img"
      aria-label={`${name}${erupted ? ' erupted' : ' not erupted'}`}
      title={name}
    >
      <ToothGlyph />
    </span>
  )
}

/** Simple mouth chart: two rows (upper/lower jaw) with each tooth marked erupted or not. */
export default function ToothChart({ erupted }: { erupted: ToothName[] }) {
  const isErupted = (name: ToothName) => erupted.includes(name)
  return (
    <div className="tooth-chart" role="group" aria-label="Tooth chart">
      <div className="tooth-row" aria-label="Upper teeth">
        {UPPER.map((name) => (
          <ToothCell key={name} name={name} erupted={isErupted(name)} />
        ))}
      </div>
      <div className="tooth-row" aria-label="Lower teeth">
        {LOWER.map((name) => (
          <ToothCell key={name} name={name} erupted={isErupted(name)} />
        ))}
      </div>
    </div>
  )
}
