// Shown when the user clicks the trash icon. Deleting is permanent, so we make
// them pause and nudge toward archiving (recoverable) instead.
export default function ConfirmDialog({ app, onArchive, onDelete, onCancel }) {
  const name = app.company || app.position || 'this application'
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal modal--confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
        <div className="confirm-icon">🗑</div>
        <h2 className="confirm-title" id="confirm-dialog-title">Remove {name}?</h2>
        <p className="confirm-sub" id="confirm-dialog-description">
          {app.archived
            ? 'Deleting is permanent and cannot be undone.'
            : 'You can archive it (hidden but kept, and restorable later) or delete it permanently. Deleting cannot be undone.'}
        </p>

        <div className="confirm-actions">
          {!app.archived && (
            <button autoFocus className="btn-confirm btn-confirm--archive" onClick={onArchive}>
              📦 Archive instead
            </button>
          )}
          <button autoFocus={app.archived} className="btn-confirm btn-confirm--delete" onClick={onDelete}>
            Delete permanently
          </button>
          <button className="btn-confirm btn-confirm--cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
