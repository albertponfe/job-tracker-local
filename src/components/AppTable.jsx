const STATUS_STYLES = {
  'To Apply': { bg: 'rgba(6,182,212,0.14)',   color: '#22d3ee', border: 'rgba(6,182,212,0.35)' },
  Applied:   { bg: 'rgba(99,102,241,0.14)',  color: '#818cf8', border: 'rgba(99,102,241,0.35)' },
  Interview: { bg: 'rgba(245,158,11,0.14)',  color: '#fbbf24', border: 'rgba(245,158,11,0.35)' },
  Offer:     { bg: 'rgba(16,185,129,0.14)',  color: '#34d399', border: 'rgba(16,185,129,0.35)' },
  Rejected:  { bg: 'rgba(239,68,68,0.14)',   color: '#f87171', border: 'rgba(239,68,68,0.35)' },
  Ghosted:   { bg: 'rgba(107,114,128,0.14)', color: '#9ca3af', border: 'rgba(107,114,128,0.35)' },
  Withdrawn: { bg: 'rgba(107,114,128,0.14)', color: '#9ca3af', border: 'rgba(107,114,128,0.35)' },
}

function companyHue(name) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

function CompanyCell({ name }) {
  const label = name || '—'
  if (!name) return <span className="td-muted">—</span>
  const hue = companyHue(name)
  return (
    <div className="company-cell">
      <span className="company-avatar" style={{ background: `hsl(${hue} 55% 20%)`, color: `hsl(${hue} 90% 78%)` }}>
        {label.charAt(0).toUpperCase()}
      </span>
      <span className="td-bold">{label}</span>
    </div>
  )
}

function StatusSelect({ value, options, onChange }) {
  const v = value || options[0]
  const style = STATUS_STYLES[v] || { bg: 'rgba(99,102,241,0.14)', color: '#818cf8', border: 'rgba(99,102,241,0.35)' }
  return (
    <span className="status-select-wrap" style={{ color: style.color }}>
      <select
        className="status-select"
        value={v}
        onChange={e => onChange(e.target.value)}
        style={{ background: style.bg, color: style.color, borderColor: style.border }}
      >
        {options.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </span>
  )
}

function Cell({ field, app, onStatusChange }) {
  const val = app[field.key]

  if (field.key === 'company') return <CompanyCell name={val} />

  if (field.key === 'status' && field.type === 'select') {
    return <StatusSelect value={val} options={field.options || []} onChange={s => onStatusChange(app.id, s)} />
  }

  if (field.type === 'url') {
    return val
      ? <a href={val} target="_blank" rel="noopener" className="btn-row btn-row--link" title="Open listing">↗</a>
      : <span className="td-muted">—</span>
  }

  if (field.type === 'email') {
    return val
      ? <a href={`mailto:${val}`} className="contact-email" title={val}>{val}</a>
      : <span className="td-muted">—</span>
  }

  if (!val) return <span className="td-muted">—</span>
  return <span className={field.type === 'text' && field.key === 'position' ? '' : 'td-muted'}>{val}</span>
}

function Row({ app, tableFields, onStatusChange, onEdit, onArchive, onDelete, isArchived, animDelay }) {
  return (
    <tr className={isArchived ? 'tr-archived' : ''} style={{ animationDelay: `${animDelay}ms` }}>
      {tableFields.map(f => <td key={f.key}>{<Cell field={f} app={app} onStatusChange={onStatusChange} />}</td>)}
      <td>
        <div className="table-actions">
          <button className="btn-row btn-row--edit" title="Edit" onClick={() => onEdit(app)}>✎</button>
          <button
            className={`btn-row ${isArchived ? 'btn-row--restore' : 'btn-row--archive'}`}
            title={isArchived ? 'Restore' : 'Archive'}
            onClick={() => onArchive(app.id, !isArchived)}
          >{isArchived ? '↩' : '⊙'}</button>
          <button className="btn-row btn-row--delete" title="Remove…" onClick={() => onDelete(app)}>🗑</button>
        </div>
      </td>
    </tr>
  )
}

export default function AppTable({ fields, applications, archivedApps = [], filter, onStatusChange, onEdit, onArchive, onDelete, onAdd }) {
  const tableFields = fields.filter(f => f.enabled && f.table)
  const colCount = tableFields.length + 1
  const hasActive = applications.length > 0
  const hasArchived = archivedApps.length > 0

  if (!hasActive && !hasArchived) {
    return (
      <div className="empty-state">
        <p className="empty-icon">{filter ? '🔍' : '📭'}</p>
        <p>{filter ? `No ${filter.toLowerCase()} applications.` : 'No applications yet.'}</p>
        <p className="empty-sub">
          {filter
            ? 'Try another status or clear the filter.'
            : <>Click <button className="link-btn" onClick={onAdd}>+ Add Application</button> to track your first one.</>}
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="app-table">
        <thead>
          <tr>
            {tableFields.map(f => <th key={f.key}>{f.label}</th>)}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app, i) => (
            <Row key={app.id} app={app} tableFields={tableFields} animDelay={Math.min(i * 35, 400)}
              onStatusChange={onStatusChange} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />
          ))}

          {hasArchived && (
            <tr className="archived-section-row"><td colSpan={colCount}>Archived ({archivedApps.length})</td></tr>
          )}

          {archivedApps.map((app, i) => (
            <Row key={app.id} app={app} tableFields={tableFields} isArchived animDelay={Math.min(i * 35, 300)}
              onStatusChange={onStatusChange} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
