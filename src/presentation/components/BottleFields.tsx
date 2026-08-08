import type { AmountUnit } from '../../domain/model/FeedingSession'
import type { BottleFieldErrors, FeedingDetails } from '../../domain/usecase/feeding'

interface BottleFieldsProps {
  value: FeedingDetails
  errors?: BottleFieldErrors
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

export default function BottleFields({ value, errors = {}, onChange }: BottleFieldsProps) {
  return (
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
          aria-describedby={errors.amount ? 'bottle-amount-error' : undefined}
        />
        <FieldError id="bottle-amount-error">{errors.amount ?? ''}</FieldError>
      </label>
      <label className="field">
        <span className="field-label">Unit</span>
        <select
          value={value.unit ?? ''}
          onChange={(e) =>
            onChange({ ...value, unit: (e.target.value || undefined) as AmountUnit | undefined })
          }
          aria-invalid={Boolean(errors.unit)}
          aria-describedby={errors.unit ? 'bottle-unit-error' : undefined}
        >
          <option value="">—</option>
          <option value="ml">ml</option>
          <option value="oz">oz</option>
        </select>
        <FieldError id="bottle-unit-error">{errors.unit ?? ''}</FieldError>
      </label>
    </div>
  )
}
