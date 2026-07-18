import Modal from './Modal'

// Shown when the user clicks the trash icon. Deleting is permanent, so we make
// them pause and nudge toward archiving (recoverable) instead.
export default function ConfirmDialog({ app, onArchive, onDelete, onCancel }) {
  const name = app.company || app.position || 'this application'
  return (
    <Modal className="modal--confirm" role="alertdialog" onClose={onCancel} labelledBy="confirm-dialog-title" describedBy="confirm-dialog-description">
      {close => <>
        <div className="confirm-icon">🗑</div>
        <h2 className="confirm-title" id="confirm-dialog-title">Remove {name}?</h2>
        <p className="confirm-sub" id="confirm-dialog-description">
          {app.archived
            ? 'Deleting is permanent and cannot be undone.'
            : 'You can archive it (hidden but kept, and restorable later) or delete it permanently. Deleting cannot be undone.'}
        </p>

        <div className="confirm-actions">
          {!app.archived && (
            <button autoFocus className="btn-confirm btn-confirm--archive" onClick={() => close(onArchive)}>
              📦 Archive instead
            </button>
          )}
          <button autoFocus={app.archived} className="btn-confirm btn-confirm--delete" onClick={() => close(onDelete)}>
            Delete permanently
          </button>
          <button className="btn-confirm btn-confirm--cancel" onClick={() => close()}>
            Cancel
          </button>
        </div>
      </>}
    </Modal>
  )
}
