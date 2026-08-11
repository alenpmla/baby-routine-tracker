import type { AmountUnit } from '../../domain/model/FeedingSession'
import type { FeedingDetails, SolidsFieldErrors } from '../../domain/usecase/feeding'
import FoodMultiSelect from './FoodMultiSelect'

interface SolidsFieldsProps {
  value: FeedingDetails
  errors?: SolidsFieldErrors
  suggestions?: string[]
  mostUsed?: string[]
  onChange: (details: FeedingDetails) => void
}

function FieldError({ id, children }: { id?: string; children: string }) {
  if (!children) {
    return null
  }
  return (
    <p id={id} className="field-error" role="alert">
      {children}
    </p>
  )
}

export default function SolidsFields({
  value,
  errors = {},
  suggestions = [],
  mostUsed,
  onChange,
}: SolidsFieldsProps) {
  return (
    <div className="solids-fields">
      <label className="field">
        <span className="field-label">Food</span>
        <FoodMultiSelect
          value={value.foods ?? []}
          suggestions={suggestions}
          mostUsed={mostUsed}
          onChange={(foods) => onChange({ ...value, foods })}
          ariaInvalid={Boolean(errors.foods)}
          ariaDescribedby={errors.foods ? 'solids-food-error' : undefined}
        />
        <FieldError id="solids-food-error">{errors.foods ?? ''}</FieldError>
      </label>
      <div className="backfill-datetime">
        <label className="field">
          <span className="field-label">Amount</span>
          <input
            type="number"
            min="0.01"
            step="any"
            inputMode="decimal"
            value={value.amount ?? ''}
            onChange={(e) =>
              onChange({
                ...value,
                amount: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            aria-invalid={Boolean(errors.amount)}
            aria-describedby={errors.amount ? 'solids-amount-error' : undefined}
          />
          <FieldError id="solids-amount-error">{errors.amount ?? ''}</FieldError>
        </label>
        <label className="field">
          <span className="field-label">Unit</span>
          <select
            value={value.unit ?? ''}
            onChange={(e) =>
              onChange({ ...value, unit: (e.target.value || undefined) as AmountUnit | undefined })
            }
            aria-invalid={Boolean(errors.unit)}
            aria-describedby={errors.unit ? 'solids-unit-error' : undefined}
          >
            <option value="">—</option>
            <option value="oz">oz</option>
            <option value="gram">gram</option>
          </select>
          <FieldError id="solids-unit-error">{errors.unit ?? ''}</FieldError>
        </label>
      </div>
    </div>
  )
}
