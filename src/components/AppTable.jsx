export const STATUS_STYLES = {
  'To Apply': { bg: 'rgba(6,182,212,0.14)',   color: '#22d3ee', border: 'rgba(6,182,212,0.35)' },
  Applied:   { bg: 'rgba(99,102,241,0.14)',  color: '#818cf8', border: 'rgba(99,102,241,0.35)' },
  Interview: { bg: 'rgba(245,158,11,0.14)',  color: '#fbbf24', border: 'rgba(245,158,11,0.35)' },
  Offer:     { bg: 'rgba(16,185,129,0.14)',  color: '#34d399', border: 'rgba(16,185,129,0.35)' },
  Rejected:  { bg: 'rgba(239,68,68,0.14)',   color: '#f87171', border: 'rgba(239,68,68,0.35)' },
  Ghosted:   { bg: 'rgba(107,114,128,0.14)', color: '#9ca3af', border: 'rgba(107,114,128,0.35)' },
  Withdrawn: { bg: 'rgba(107,114,128,0.14)', color: '#9ca3af', border: 'rgba(107,114,128,0.35)' },
}

export const DEFAULT_STATUS_STYLE = { bg: 'rgba(99,102,241,0.14)', color: '#818cf8', border: 'rgba(99,102,241,0.35)' }

// deterministic pastel hue per company so avatars stay stable between reloads
export function companyHue(name) {
  let h = 0
  for (const ch of name || '?') h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

// Every column gets a width so none balloons and none reflows when rows are added.
// The browser scales these to fill the table; long values wrap onto more lines
// rather than widening the column. Custom fields fall back to a sensible default.
const COL_WIDTH = {
  date: '96px', company: '190px', position: '210px', location: '200px',
  salary: '132px', status: '134px', employmentType: '112px', user: '96px',
  contactName: '180px', contactEmail: '200px', notes: '240px',
}
function colWidth(field) {
  if (field.type === 'url') return '74px'
  return COL_WIDTH[field.key] || '160px'
}

function CompanyCell({ name }) {
  if (!name) return <span className="td-muted">—</span>
  const hue = companyHue(name)
  return (
    <div className="company-cell">
      <span className="company-avatar" style={{ background: `hsl(${hue} 55% 20%)`, color: `hsl(${hue} 90% 78%)` }}>
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="td-bold">{name}</span>
    </div>
  )
}

function StatusSelect({ value, options, onChange }) {
  const v = value || options[0]
  const style = STATUS_STYLES[v] || DEFAULT_STATUS_STYLE
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
      ? <a href={val} target="_blank" rel="noopener" className="btn-row btn-row--link" title="Open listing" onClick={e => e.stopPropagation()}>↗</a>
      : <span className="td-muted">—</span>
  }

  if (field.type === 'email') {
    return val
      ? <a href={`mailto:${val}`} className="contact-email" title={val} onClick={e => e.stopPropagation()}>{val}</a>
      : <span className="td-muted">—</span>
  }

  if (!val) return <span className="td-muted">—</span>
  return <span className={field.type === 'text' && field.key === 'position' ? '' : 'td-muted'}>{val}</span>
}

function Row({ app, tableFields, onOpen, onStatusChange, onEdit, onArchive, onDelete, isArchived, animDelay }) {
  const stop = (e) => e.stopPropagation()
  return (
    <tr
      className={`row-click${isArchived ? ' tr-archived' : ''}`}
      style={{ animationDelay: `${animDelay}ms` }}
      onClick={() => onOpen(app)}
      title="Click to view details"
    >
      {tableFields.map(f => (
        // the status cell holds an interactive dropdown — don't open the detail when it's clicked
        <td key={f.key} onClick={f.key === 'status' ? stop : undefined}>
          <Cell field={f} app={app} onStatusChange={onStatusChange} />
        </td>
      ))}
      <td onClick={stop}>
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

export default function AppTable({ fields, applications, archivedApps = [], filter, onOpen, onStatusChange, onEdit, onArchive, onDelete, onAdd }) {
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

  const rowProps = { tableFields, onOpen, onStatusChange, onEdit, onArchive, onDelete }

  return (
    <div className="table-wrap">
      <table className="app-table">
        <thead>
          <tr>
            {tableFields.map(f => <th key={f.key} style={{ width: colWidth(f) }}>{f.label}</th>)}
            <th style={{ width: '118px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app, i) => (
            <Row key={app.id} app={app} animDelay={Math.min(i * 35, 400)} {...rowProps} />
          ))}

          {hasArchived && (
            <tr className="archived-section-row"><td colSpan={colCount}>Archived ({archivedApps.length})</td></tr>
          )}

          {archivedApps.map((app, i) => (
            <Row key={app.id} app={app} isArchived animDelay={Math.min(i * 35, 300)} {...rowProps} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
