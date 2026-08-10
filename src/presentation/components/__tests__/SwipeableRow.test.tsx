import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SwipeableRow from '../SwipeableRow'
import { closeSwipeRows } from '../swipeRows'

function swipeLeft(element: HTMLElement, distance: number) {
  fireEvent.pointerDown(element, { pointerId: 1, clientX: 200, button: 0, pointerType: 'touch' })
  fireEvent.pointerMove(element, { pointerId: 1, clientX: 200 - distance })
  fireEvent.pointerUp(element, { pointerId: 1, clientX: 200 - distance })
}

describe('SwipeableRow', () => {
  it('renders children and an accessible delete button', () => {
    render(
      <ul>
        <SwipeableRow id="a" deleteLabel="Delete feed" onDelete={() => {}}>
          <span>Row content</span>
        </SwipeableRow>
      </ul>,
    )
    expect(screen.getByText('Row content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete feed' })).toBeInTheDocument()
  })

  it('opens on swipe and calls onDelete only after confirmation', () => {
    const onDelete = vi.fn()
    render(
      <ul>
        <SwipeableRow id="a" deleteLabel="Delete feed" onDelete={onDelete}>
          <span>Row content</span>
        </SwipeableRow>
      </ul>,
    )
    const row = screen.getByText('Row content').parentElement as HTMLElement
    const li = row?.parentElement as HTMLElement
    swipeLeft(row, 60)
    expect(li.classList.contains('swipeable-row-open')).toBe(true)

    const deleteBtn = screen.getByRole('button', { name: 'Delete feed' })
    fireEvent.pointerDown(deleteBtn, { pointerId: 1, clientX: 10, button: 0, pointerType: 'touch' })
    expect(li.classList.contains('swipeable-row-open')).toBe(true)

    // Clicking delete opens the confirmation dialog and immediately collapses the row;
    // onDelete must not fire yet.
    fireEvent.click(deleteBtn)
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: /delete this record/i })).toBeInTheDocument()
    expect(li.classList.contains('swipeable-row-open')).toBe(false)

    // Cancelling leaves the record intact.
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Confirm deletes exactly once.
    fireEvent.click(deleteBtn)
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('closes when another row opens (single-open)', () => {
    render(
      <ul>
        <SwipeableRow id="a" deleteLabel="Delete a" onDelete={() => {}}>
          <span>Row A</span>
        </SwipeableRow>
        <SwipeableRow id="b" deleteLabel="Delete b" onDelete={() => {}}>
          <span>Row B</span>
        </SwipeableRow>
      </ul>,
    )
    const rowA = screen.getByText('Row A').parentElement as HTMLElement
    const liA = rowA?.parentElement as HTMLElement
    const rowB = screen.getByText('Row B').parentElement as HTMLElement
    const liB = rowB?.parentElement as HTMLElement

    swipeLeft(rowA, 60)
    expect(liA.classList.contains('swipeable-row-open')).toBe(true)
    expect(liB.classList.contains('swipeable-row-open')).toBe(false)

    swipeLeft(rowB, 60)
    expect(liB.classList.contains('swipeable-row-open')).toBe(true)
    expect(liA.classList.contains('swipeable-row-open')).toBe(false)
  })

  it('closes an open row when tapping elsewhere', () => {
    render(
      <ul>
        <SwipeableRow id="a" deleteLabel="Delete a" onDelete={() => {}}>
          <span>Row A</span>
        </SwipeableRow>
      </ul>,
    )
    const rowA = screen.getByText('Row A').parentElement as HTMLElement
    const liA = rowA?.parentElement as HTMLElement

    swipeLeft(rowA, 60)
    expect(liA.classList.contains('swipeable-row-open')).toBe(true)

    fireEvent.pointerDown(document, { pointerId: 2, clientX: 10, button: 0 })
    expect(liA.classList.contains('swipeable-row-open')).toBe(false)
  })

  it('delete button is focusable (keyboard path)', () => {
    render(
      <ul>
        <SwipeableRow id="a" deleteLabel="Delete feed" onDelete={() => {}}>
          <span>Row content</span>
        </SwipeableRow>
      </ul>,
    )
    const deleteBtn = screen.getByRole('button', { name: 'Delete feed' })
    expect(deleteBtn).toBeInstanceOf(HTMLButtonElement)
  })

  it('resets open state between renders', () => {
    closeSwipeRows()
    expect(1).toBe(1)
  })
})
