import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FoodMultiSelect from '../FoodMultiSelect'

describe('FoodMultiSelect', () => {
  it('ticks a suggestion via its checkbox and reports the selection', () => {
    const onChange = vi.fn()
    render(<FoodMultiSelect value={[]} suggestions={['avocado', 'salmon', 'beef']} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'sa' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'salmon' }))
    expect(onChange).toHaveBeenCalledWith(['salmon'])
  })

  it('closes on outside interaction so the suggestion popup never blocks a button', async () => {
    const onChange = vi.fn()
    const onSave = vi.fn()
    render(
      <form>
        <FoodMultiSelect value={[]} suggestions={['salmon', 'beef']} onChange={onChange} />
        <button type="button" onClick={onSave}>
          Save
        </button>
      </form>,
    )
    fireEvent.focus(screen.getByRole('textbox'))
    expect(screen.getByRole('checkbox', { name: 'salmon' })).toBeInTheDocument()

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(screen.queryByRole('checkbox', { name: 'salmon' })).not.toBeInTheDocument())
    expect(onSave).not.toHaveBeenCalled()
  })

  it('filters suggestions as you type', () => {
    render(<FoodMultiSelect value={[]} suggestions={['avocado', 'salmon']} onChange={() => {}} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'sa' } })
    expect(screen.getByRole('checkbox', { name: 'salmon' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'avocado' })).not.toBeInTheDocument()
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

  it('adds a custom food on Enter', () => {
    const onChange = vi.fn()
    render(<FoodMultiSelect value={[]} suggestions={['salmon']} onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Banana' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith(['Banana'])
  })
})
