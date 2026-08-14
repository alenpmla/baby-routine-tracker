import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FoodMultiSelect from '../FoodMultiSelect'
import Modal from '../Modal'

describe('FoodMultiSelect', () => {
  it('renders selected foods as chips and an + Add foods chip, with no editable text input', () => {
    render(<FoodMultiSelect value={['salmon']} suggestions={['salmon', 'beef']} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: /remove salmon/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add foods' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('renders a plain emoji (no container) inside each selected-food chip', () => {
    render(<FoodMultiSelect value={['salmon', 'Carrot']} suggestions={['salmon', 'Carrot']} onChange={() => {}} />)
    const chips = Array.from(document.querySelectorAll<HTMLElement>('.food-tag'))
    expect(chips.length).toBe(2)
    const salmonChip = chips.find((c) => c.textContent?.includes('salmon'))
    const carrotChip = chips.find((c) => c.textContent?.includes('Carrot'))
    expect(salmonChip?.querySelector('.food-item-icon-sm')).toBeNull()
    expect(carrotChip?.querySelector('.food-item-icon-sm')).toBeNull()
    const salmonEmoji = salmonChip?.querySelector<HTMLElement>('[aria-hidden="true"]')
    expect(salmonEmoji?.textContent).toBe('🐟')
    expect(carrotChip?.querySelector<HTMLElement>('[aria-hidden="true"]')?.textContent).toBe('🥕')
  })

  it('opens the Add foods sheet with a search field and the full suggestion list', () => {
    render(<FoodMultiSelect value={[]} suggestions={['avocado', 'salmon', 'beef']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    const dialog = screen.getByRole('dialog', { name: 'Add foods' })
    expect(dialog).toBeInTheDocument()
    expect(dialog.classList.contains('modal-fullscreen')).toBe(true)
    expect(screen.getByRole('textbox', { name: /search foods/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'salmon' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'avocado' })).toBeInTheDocument()
  })

  it('filters the list as you type and restores it when cleared', () => {
    render(<FoodMultiSelect value={[]} suggestions={['avocado', 'salmon']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    const search = screen.getByRole('textbox', { name: /search foods/i })
    fireEvent.change(search, { target: { value: 'sa' } })
    expect(screen.getByRole('checkbox', { name: 'salmon' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'avocado' })).not.toBeInTheDocument()
    fireEvent.change(search, { target: { value: '' } })
    expect(screen.getByRole('checkbox', { name: 'avocado' })).toBeInTheDocument()
  })

  it('shows a no-match message when the query matches nothing', () => {
    render(<FoodMultiSelect value={[]} suggestions={['salmon']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    fireEvent.change(screen.getByRole('textbox', { name: /search foods/i }), {
      target: { value: 'zzz' },
    })
    expect(screen.getByText(/no foods match/i)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('ticks a suggestion and reports the selection', () => {
    const onChange = vi.fn()
    render(<FoodMultiSelect value={[]} suggestions={['avocado', 'salmon', 'beef']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'salmon' }))
    expect(onChange).toHaveBeenCalledWith(['salmon'])
  })

  it('pre-checks already-selected foods when the sheet opens', () => {
    render(<FoodMultiSelect value={['salmon']} suggestions={['salmon', 'beef']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    expect(screen.getByRole('checkbox', { name: 'salmon' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'beef' })).not.toBeChecked()
  })

  it('closes the sheet on Done without adding free text', async () => {
    const onChange = vi.fn()
    render(<FoodMultiSelect value={[]} suggestions={['salmon', 'beef']} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    fireEvent.click(screen.getByRole('button', { name: 'Done' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add foods' })).not.toBeInTheDocument())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('shows selected foods as removable chips', () => {
    const onChange = vi.fn()
    render(
      <FoodMultiSelect
        value={['avocado', 'salmon']}
        suggestions={['avocado', 'salmon', 'beef']}
        onChange={onChange}
      />,
    )
    expect(screen.getByRole('button', { name: /remove avocado/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /remove salmon/i }))
    expect(onChange).toHaveBeenCalledWith(['avocado'])
  })

  it('Escape inside the picker closes only the picker sheet, not a parent sheet', async () => {
    const parentClose = vi.fn()
    render(
      <Modal open={true} title="Add solid food" onClose={parentClose}>
        <FoodMultiSelect value={[]} suggestions={['salmon']} onChange={() => {}} />
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Add solid food' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    expect(screen.getByRole('dialog', { name: 'Add foods' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add foods' })).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'Add solid food' })).toBeInTheDocument()
    expect(parentClose).not.toHaveBeenCalled()
  })

  it('shows a clear search suffix only when the query is non-empty and it clears the query', () => {
    render(<FoodMultiSelect value={[]} suggestions={['salmon', 'beef']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: /search foods/i }), {
      target: { value: 'sa' },
    })
    const clear = screen.getByRole('button', { name: 'Clear search' })
    expect(clear).toBeInTheDocument()

    fireEvent.click(clear)
    const search = screen.getByRole('textbox', { name: /search foods/i })
    expect(search).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'salmon' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'beef' })).toBeInTheDocument()
  })

  it('shows a single list with Most used items first, a divider, then the rest (no duplicates)', () => {
    render(
      <FoodMultiSelect
        value={[]}
        suggestions={['avocado', 'salmon', 'beef']}
        mostUsed={['salmon', 'avocado']}
        onChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    expect(screen.getByText('Most used')).toBeInTheDocument()
    expect(screen.getByRole('separator')).toBeInTheDocument()
    // single list, no duplicated items
    expect(screen.getAllByRole('checkbox', { name: 'salmon' })).toHaveLength(1)
    expect(screen.getAllByRole('checkbox', { name: 'avocado' })).toHaveLength(1)
    expect(screen.getAllByRole('checkbox', { name: 'beef' })).toHaveLength(1)
    // order: most-used first, then remaining
    const salmon = screen.getByRole('checkbox', { name: 'salmon' })
    const avocado = screen.getByRole('checkbox', { name: 'avocado' })
    const beef = screen.getByRole('checkbox', { name: 'beef' })
    const before = (a: Element, b: Element) =>
      (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
    expect(before(salmon, avocado)).toBe(true)
    expect(before(avocado, beef)).toBe(true)

    // while searching: single filtered list, no Most used grouping or divider
    fireEvent.change(screen.getByRole('textbox', { name: /search foods/i }), {
      target: { value: 'be' },
    })
    expect(screen.queryByText('Most used')).not.toBeInTheDocument()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox', { name: 'beef' })).toHaveLength(1)
  })

  it('does not render a divider when most-used covers all suggestions', () => {
    render(
      <FoodMultiSelect
        value={[]}
        suggestions={['salmon', 'avocado']}
        mostUsed={['salmon', 'avocado']}
        onChange={() => {}}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    expect(screen.getByText('Most used')).toBeInTheDocument()
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })

  it('does not render a Most used section when mostUsed is empty', () => {
    render(<FoodMultiSelect value={[]} suggestions={['salmon']} mostUsed={[]} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    expect(screen.queryByText('Most used')).not.toBeInTheDocument()
  })

  it('renders a leading aria-hidden emoji per row without changing the accessible name', () => {
    render(<FoodMultiSelect value={[]} suggestions={['salmon', 'apple']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    // accessible name stays the plain food name
    expect(screen.getByRole('checkbox', { name: 'salmon' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'apple' })).toBeInTheDocument()
    // a leading emoji glyph inside an aria-hidden box (no svg)
    const boxes = Array.from(document.querySelectorAll<HTMLElement>('.food-item-icon'))
    expect(boxes.length).toBe(2)
    expect(boxes[0].getAttribute('aria-hidden')).toBe('true')
    expect(boxes[0].textContent).toBe('🐟')
    expect(boxes[1].textContent).toBe('🍎')
    expect(document.querySelector('.food-item-icon svg')).toBeNull()
  })

  it('renders each emoji inside a tinted box carrying the food category accent color', () => {
    render(<FoodMultiSelect value={[]} suggestions={['salmon', 'apple']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    const boxes = Array.from(document.querySelectorAll<HTMLElement>('.food-item-icon'))
    expect(boxes.length).toBe(2)
    const salmonBox = boxes.find((b) => b.textContent === '🐟')
    const appleBox = boxes.find((b) => b.textContent === '🍎')
    // salmon -> fish accent (blue); apple -> apple accent (red)
    expect(salmonBox?.style.getPropertyValue('--food-icon-accent')).toBe('#1E88E5')
    expect(appleBox?.style.getPropertyValue('--food-icon-accent')).toBe('#E53935')
  })

  it('shows the per-food emoji for root vegetables (carrot -> 🥕, not potato)', () => {
    render(<FoodMultiSelect value={[]} suggestions={['Carrot', 'Potato', 'Parsnip']} onChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    const boxes = Array.from(document.querySelectorAll<HTMLElement>('.food-item-icon'))
    expect(boxes.find((b) => b.textContent === '🥕')).toBeTruthy()
    expect(boxes.find((b) => b.textContent === '🥔')).toBeTruthy()
    // carrot box keeps the root-veg accent
    const carrotBox = boxes.find((b) => b.textContent === '🥕')
    expect(carrotBox?.style.getPropertyValue('--food-icon-accent')).toBe('#E07B39')
  })

  it('toggles a Most used item and reports the canonical name', () => {
    const onChange = vi.fn()
    render(
      <FoodMultiSelect
        value={[]}
        suggestions={['salmon', 'beef']}
        mostUsed={['salmon']}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add foods' }))
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'salmon' })[0])
    expect(onChange).toHaveBeenCalledWith(['salmon'])
  })
})
