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
})
