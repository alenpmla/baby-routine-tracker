import { useState } from 'react'
import { useTracker } from '../store/TrackerProvider'
import type { FoodGroupId } from '../../domain/model/FoodGroup'
import {
  BowlIcon,
  CheckIcon,
  ChevronDownIcon,
  DairyIcon,
  FruitIcon,
  GrainIcon,
  IronIcon,
  LegumeIcon,
  ProteinIcon,
  VegIcon,
} from './icons'

const GROUP_ICON: Record<FoodGroupId, (props: { size?: number }) => JSX.Element> = {
  iron: IronIcon,
  protein: ProteinIcon,
  vegetables: VegIcon,
  fruit: FruitIcon,
  grains: GrainIcon,
  dairy: DairyIcon,
  legumes: LegumeIcon,
}

const GROUP_ACCENT: Record<FoodGroupId, string> = {
  iron: 'iron',
  protein: 'protein',
  vegetables: 'veg',
  fruit: 'fruit',
  grains: 'grain',
  dairy: 'dairy',
  legumes: 'legume',
}

/** Uppercases the first letter of a food name for display. */
export function capitalizeFood(name: string): string {
  return name.length > 0 ? name[0].toUpperCase() + name.slice(1) : name
}

export function headline(covered: number, total: number): string {
  if (covered === total) {
    return `Excellent — all ${total} food groups covered this week`
  }
  if (covered >= total - 2) {
    return `Great mix — ${covered} of ${total} food groups covered`
  }
  if (covered >= Math.ceil(total / 2)) {
    return `Good start — ${covered} of ${total} food groups covered`
  }
  return `A few groups yet — ${covered} of ${total} food groups covered`
}

export default function FoodVarietyCard() {
  const { foodVariety } = useTracker()
  const [open, setOpen] = useState(false)
  if (!foodVariety) {
    return null
  }
  const covered = foodVariety.groups.filter((g) => g.covered)
  return (
    <section className="card food-variety" aria-label="Food variety this week">
      <button
        type="button"
        className="food-variety-toggle"
        aria-expanded={open}
        aria-controls="food-variety-details"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="food-variety-head">
          <span className="food-variety-head-icon" aria-hidden="true">
            <BowlIcon size={18} />
          </span>
          <span className="food-variety-head-text">
            <span className="food-variety-title">Food variety · last 7 days</span>
            <span className="food-variety-summary">
              <span className="food-variety-score">{covered.length} of {foodVariety.totalGroups}</span>
              <span className="food-variety-chips" aria-hidden="true">
                {foodVariety.groups.map((group) => {
                  const Icon = GROUP_ICON[group.id]
                  const accent = GROUP_ACCENT[group.id]
                  return (
                    <span
                      key={group.id}
                      className={`food-variety-chip food-${accent}${group.covered ? '' : ' food-variety-chip-missing'}`}
                    >
                      <Icon size={14} />
                    </span>
                  )
                })}
              </span>
            </span>
            <span className="food-variety-headline">{headline(covered.length, foodVariety.totalGroups)}</span>
          </span>
        </span>
        <span className={`food-variety-chevron${open ? ' food-variety-chevron-open' : ''}`} aria-hidden="true">
          <ChevronDownIcon size={20} />
        </span>
      </button>

      <div
        id="food-variety-details"
        className={`food-variety-details${open ? ' food-variety-details-open' : ''}`}
        hidden={!open}
        aria-hidden={open ? undefined : true}
      >
        <div className="food-variety-details-inner">
          <ul className="food-variety-list">
            {foodVariety.groups.map((group) => {
              const Icon = GROUP_ICON[group.id]
              const accent = GROUP_ACCENT[group.id]
              return (
                <li
                  key={group.id}
                  className={`food-variety-row food-${accent}${group.covered ? '' : ' food-variety-missing'}`}
                >
                  <span className="food-variety-icon" aria-hidden="true">
                    <Icon size={20} />
                  </span>
                  <span className="food-variety-body">
                    <span className="food-variety-name">{group.label}</span>
                    <span className="food-variety-foods">
                      {group.covered
                        ? group.foods.map(capitalizeFood).join(' · ')
                        : `none yet — try ${group.trySuggestion.split(' · ').map(capitalizeFood).join(' · ')}`}
                    </span>
                  </span>
                  {group.covered ? (
                    <span className="food-variety-status" aria-label="covered">
                      <CheckIcon size={13} />
                    </span>
                  ) : (
                    <span className="food-variety-status food-variety-status-missing" aria-hidden="true" />
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
