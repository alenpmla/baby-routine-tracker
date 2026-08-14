import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Modal from '../Modal'

describe('Modal open/close lifecycle', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} title="Sheet" onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mounts the dialog when open and keeps content visible during exit', async () => {
    const { rerender } = render(
      <Modal open={true} title="Sheet" onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Sheet' })
    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()

    // On close the dialog stays mounted during the exit transition...
    rerender(
      <Modal open={false} title="Sheet" onClose={() => {}}>
        <p>Content</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog', { name: 'Sheet' })).toBeInTheDocument()

    // ...then unmounts after the exit completes.
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the last rendered content during the exit (no blank flash)', async () => {
    const { rerender } = render(
      <Modal open={true} title="Sheet" onClose={() => {}}>
        <p>Last content</p>
      </Modal>,
    )
    expect(screen.getByText('Last content')).toBeInTheDocument()

    // Parent stops passing children on close (the common guarded-children pattern).
    rerender(
      <Modal open={false} title="Sheet" onClose={() => {}}>
        {null}
      </Modal>,
    )
    expect(screen.getByText('Last content')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('calls onClose on overlay tap, X, and Escape', async () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <Modal open={true} title="Sheet" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Sheet' })

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)

    fireEvent.click(dialog.parentElement as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(3)

    // Cleanup: unmount fully.
    rerender(
      <Modal open={false} title="Sheet" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('does not bubble overlay clicks from the dialog body', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Sheet" onClose={onClose}>
        <button type="button" onClick={(e) => e.stopPropagation()}>
          Inside
        </button>
      </Modal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Inside' }))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders the overlay into document.body via a portal (not nested in callers)', () => {
    const { container } = render(
      <div id="caller">
        <Modal open={true} title="Sheet" onClose={() => {}}>
          <p>Content</p>
        </Modal>
      </div>,
    )
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement
    expect(overlay.classList.contains('modal-overlay')).toBe(true)
    expect(overlay.parentElement).toBe(document.body)
    expect(container.querySelector('.modal-overlay')).toBeNull()
  })
})

describe('Modal drag-to-dismiss', () => {
  it('closes the sheet when dragged down past the threshold', async () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Sheet" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Sheet' })
    fireEvent.pointerDown(dialog, { pointerId: 1, clientY: 200, button: 0 })
    fireEvent.pointerMove(dialog, { pointerId: 1, clientY: 260, button: 0 })
    fireEvent.pointerUp(dialog, { pointerId: 1, clientY: 260, button: 0 })
    // Dismiss animates the sheet down for EXIT_MS, then calls onClose.
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('does not close the sheet when dragged only slightly', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Sheet" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Sheet' })
    fireEvent.pointerDown(dialog, { pointerId: 1, clientY: 200, button: 0 })
    fireEvent.pointerMove(dialog, { pointerId: 1, clientY: 210, button: 0 })
    fireEvent.pointerUp(dialog, { pointerId: 1, clientY: 210, button: 0 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not start a drag from an interactive element', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Sheet" onClose={onClose}>
        <button type="button" onClick={onClose}>
          Inside
        </button>
      </Modal>,
    )
    const button = screen.getByRole('button', { name: 'Inside' })
    fireEvent.pointerDown(button, { pointerId: 1, clientY: 200, button: 0 })
    fireEvent.pointerMove(button, { pointerId: 1, clientY: 400, button: 0 })
    fireEvent.pointerUp(button, { pointerId: 1, clientY: 400, button: 0 })
    expect(onClose).toHaveBeenCalledTimes(0)
  })

  it('does not apply drag-to-dismiss to the dialog variant', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Dialog" variant="dialog" onClose={onClose}>
        <p>Content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Dialog' })
    fireEvent.pointerDown(dialog, { pointerId: 1, clientY: 200, button: 0 })
    fireEvent.pointerMove(dialog, { pointerId: 1, clientY: 400, button: 0 })
    fireEvent.pointerUp(dialog, { pointerId: 1, clientY: 400, button: 0 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes the sheet when dragged from the body surface, not just the header', async () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Sheet" onClose={onClose}>
        <p>Body content here</p>
      </Modal>,
    )
    const body = screen.getByText('Body content here')
    fireEvent.pointerDown(body, { pointerId: 1, clientY: 200, button: 0 })
    fireEvent.pointerMove(body, { pointerId: 1, clientY: 300, button: 0 })
    fireEvent.pointerUp(body, { pointerId: 1, clientY: 300, button: 0 })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('does not engage the drag when the sheet is scrolled down', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} title="Sheet" onClose={onClose}>
        <p>Body</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Sheet' })
    Object.defineProperty(dialog, 'scrollTop', { value: 50, configurable: true })
    fireEvent.pointerDown(dialog, { pointerId: 1, clientY: 200, button: 0 })
    fireEvent.pointerMove(dialog, { pointerId: 1, clientY: 400, button: 0 })
    fireEvent.pointerUp(dialog, { pointerId: 1, clientY: 400, button: 0 })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('still dismisses under prefers-reduced-motion (no animation delay)', () => {
    const onClose = vi.fn()
    const originalMatchMedia = window.matchMedia
    window.matchMedia = ((query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
    try {
      render(
        <Modal open={true} title="Sheet" onClose={onClose}>
          <p>Body</p>
        </Modal>,
      )
      const dialog = screen.getByRole('dialog', { name: 'Sheet' })
      fireEvent.pointerDown(dialog, { pointerId: 1, clientY: 200, button: 0 })
      fireEvent.pointerMove(dialog, { pointerId: 1, clientY: 400, button: 0 })
      fireEvent.pointerUp(dialog, { pointerId: 1, clientY: 400, button: 0 })
      expect(onClose).toHaveBeenCalled()
    } finally {
      window.matchMedia = originalMatchMedia
    }
  })
})
