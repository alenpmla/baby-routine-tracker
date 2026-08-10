import Modal from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}

/** M3 confirmation dialog: centered dialog with right-aligned text actions. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} variant="dialog" onClose={onClose}>
      <p className="dialog-message">{message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger-text" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
