import { STATUS_STYLES, DEFAULT_STATUS_STYLE, companyHue } from './AppTable'

// Renders one field's value in the detail view — full links, full notes, etc.
function DetailValue({ field, app }) {
  const val = app[field.key]

  if (field.key === 'status' && field.type === 'select') {
    const style = STATUS_STYLES[val] || DEFAULT_STATUS_STYLE
    return (
      <span className="detail-status" style={{ background: style.bg, color: style.color, borderColor: style.border }}>
        {val || '—'}
      </span>
    )
  }

  if (!val) return <span className="detail-empty">— not set</span>

  if (field.type === 'url') {
    return <a className="detail-link" href={val} target="_blank" rel="noopener">{val}</a>
  }
  if (field.type === 'email') {
    return <a className="detail-link" href={`mailto:${val}`}>{val}</a>
  }
  if (field.type === 'textarea') {
    return <p className="detail-notes">{val}</p>
  }
  return <span className="detail-text">{val}</span>
}

export default function DetailModal({ app, fields, onClose, onEdit }) {
  // show every field the user is tracking (enabled), including ones hidden from the table
  const shown = fields.filter(f => f.enabled && f.key !== 'company')
  const hue = companyHue(app.company)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--detail" role="dialog" aria-modal="true" aria-labelledby="detail-dialog-title">
        <div className="modal-header">
          <div className="detail-title">
            {app.company && (
              <span className="company-avatar detail-avatar" style={{ background: `hsl(${hue} 55% 20%)`, color: `hsl(${hue} 90% 78%)` }}>
                {app.company.charAt(0).toUpperCase()}
              </span>
            )}
            <div>
              <h2 id="detail-dialog-title">{app.company || 'Application'}</h2>
              {app.position && <p className="detail-subtitle">{app.position}</p>}
            </div>
          </div>
          <button autoFocus className="modal-close" aria-label="Close details" onClick={onClose}>✕</button>
        </div>

        <div className="detail-list">
          {shown.map(f => (
            <div className="detail-row" key={f.key}>
              <span className="detail-label">{f.label}</span>
              <div className="detail-value"><DetailValue field={f} app={app} /></div>
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={() => onEdit(app)}>✎ Edit</button>
        </div>
      </div>
    </div>
  )
}
