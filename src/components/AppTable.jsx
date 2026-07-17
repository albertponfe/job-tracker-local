import { useState } from 'react'
import Select from './Select'
import { useScrollFades } from '../lib/useScrollFades'

export const STATUS_STYLES = {
  'To Apply': { bg: 'rgba(6,182,212,0.14)', color: '#22d3ee', lightBg: 'rgba(8,127,140,0.1)', lightColor: '#087f8c' },
  Applied: { bg: 'rgba(99,102,241,0.14)', color: '#818cf8', lightBg: 'rgba(79,70,229,0.09)', lightColor: '#4f46a8' },
  Interview: { bg: 'rgba(245,158,11,0.14)', color: '#fbbf24', lightBg: 'rgba(180,112,0,0.1)', lightColor: '#9a5b00' },
  Offer: { bg: 'rgba(16,185,129,0.14)', color: '#34d399', lightBg: 'rgba(17,126,87,0.1)', lightColor: '#117e57' },
  Rejected: { bg: 'rgba(239,68,68,0.14)', color: '#f87171', lightBg: 'rgba(190,55,55,0.09)', lightColor: '#b43b3b' },
  Ghosted: { bg: 'rgba(107,114,128,0.14)', color: '#9ca3af', lightBg: 'rgba(75,85,99,0.08)', lightColor: '#626772' },
  Withdrawn: { bg: 'rgba(107,114,128,0.14)', color: '#9ca3af', lightBg: 'rgba(75,85,99,0.08)', lightColor: '#626772' },
}

export const DEFAULT_STATUS_STYLE = STATUS_STYLES.Applied

function statusVariables(style) {
  return {
    '--select-tone': style.color,
    '--select-tint': style.bg,
    '--select-tone-light': style.lightColor,
    '--select-tint-light': style.lightBg,
  }
}

export function companyHue(name) {
  let h = 0
  for (const ch of name || '?') h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

// Each column has a useful working width; the table expands only when the
// viewport needs a horizontal scroll, rather than distributing empty space.
const COL_WIDTH = {
  date: '116px', company: '240px', position: '240px', location: '220px',
  salary: '160px', status: '160px', employmentType: '132px', user: '96px',
  contactName: '180px', contactEmail: '200px', notes: '240px',
}
function colWidth(field) {
  if (field.type === 'url') return '104px'
  return COL_WIDTH[field.key] || '160px'
}

function sortValue(app, key) {
  const raw = app[key]
  if (raw == null || raw === '') return { empty: true, value: '' }
  if (key === 'date') {
    const time = Date.parse(raw)
    if (!Number.isNaN(time)) return { empty: false, value: time }
  }
  if (key === 'salary') {
    const firstNumber = String(raw).match(/[0-9][0-9,.]*/)?.[0]
    if (firstNumber) return { empty: false, value: Number(firstNumber.replace(/,/g, '')) }
  }
  return { empty: false, value: String(raw).toLocaleLowerCase() }
}

function sortApplications(apps, sort) {
  if (!sort) return apps
  return apps
    .map((app, index) => ({ app, index, ...sortValue(app, sort.key) }))
    .sort((a, b) => {
      if (a.empty !== b.empty) return a.empty ? 1 : -1
      const result = typeof a.value === 'number' && typeof b.value === 'number'
        ? a.value - b.value
        : String(a.value).localeCompare(String(b.value), undefined, { numeric: true, sensitivity: 'base' })
      return result === 0 ? a.index - b.index : (sort.dir === 'asc' ? result : -result)
    })
    .map(({ app }) => app)
}

function Icon({ name, className = 'table-icon' }) {
  const paths = {
    open: <><path d="M14 5h5v5"/><path d="m19 5-8 8"/><path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></>,
    edit: <><path d="m14.5 5.5 4 4"/><path d="m4 20 4.1-1 10.4-10.4a2.1 2.1 0 0 0-3-3L5.1 15.9 4 20Z"/></>,
    archive: <><path d="M4 8h16"/><path d="M6 8v11h12V8"/><path d="M3 5h18v3H3z"/><path d="M9 12h6"/></>,
    restore: <><path d="M4 8h16"/><path d="M6 8v11h12V8"/><path d="M3 5h18v3H3z"/><path d="m9 15 3-3 3 3"/><path d="M12 12v5"/></>,
    delete: <><path d="M5 7h14"/><path d="M9 7V4h6v3"/><path d="M7 7l1 13h8l1-13"/><path d="M10 11v5M14 11v5"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
  }
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function faviconFor(url) {
  try {
    const link = new URL(url)
    return /^https?:$/.test(link.protocol) ? new URL('/favicon.ico', link.origin).href : null
  } catch { return null }
}

function CompanyCell({ name, url }) {
  if (!name) return <span className="td-muted">—</span>
  const hue = companyHue(name)
  const favicon = faviconFor(url)
  return (
    <div className="company-cell">
      <span className="company-avatar" style={{ '--avatar-bg': `hsl(${hue} 55% 20%)`, '--avatar-fg': `hsl(${hue} 90% 78%)` }}>
        {favicon && <img src={favicon} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} />}
        <span>{name.charAt(0).toUpperCase()}</span>
      </span>
      <span className="td-bold company-name">{name}</span>
    </div>
  )
}

function StatusSelect({ value, options, onChange }) {
  const v = value || options[0]
  const style = STATUS_STYLES[v] || DEFAULT_STATUS_STYLE
  return (
    <Select
      value={v}
      options={options}
      onChange={onChange}
      ariaLabel="Application status"
      variant="status"
      style={statusVariables(style)}
      optionStyle={status => {
        const optionStyle = STATUS_STYLES[status] || DEFAULT_STATUS_STYLE
        return statusVariables(optionStyle)
      }}
    />
  )
}

function Cell({ field, app, onStatusChange }) {
  const val = app[field.key]

  if (field.key === 'company') return <CompanyCell name={val} url={app.url} />

  if (field.key === 'status' && field.type === 'select') {
    return <StatusSelect value={val} options={field.options || []} onChange={s => onStatusChange(app.id, s)} />
  }

  if (field.type === 'url') {
    return val
      ? <a href={val} target="_blank" rel="noopener" className="btn-row btn-row--link" title="Open job listing" aria-label="Open job listing" onClick={e => e.stopPropagation()}><Icon name="open" /></a>
      : <span className="td-muted">—</span>
  }

  if (field.type === 'email') {
    return val
      ? <a href={`mailto:${val}`} className="contact-email cell-clamp" title={val} onClick={e => e.stopPropagation()}>{val}</a>
      : <span className="td-muted">—</span>
  }

  if (field.key === 'date') return <span className="td-muted cell-nowrap cell-tabular">{val || '—'}</span>

  if (!val) return <span className="td-muted">—</span>
  if (field.key === 'salary') return <span className="td-muted cell-clamp cell-tabular" title={val}>{val}</span>
  return <span className={`cell-clamp ${field.type === 'text' && field.key === 'position' ? '' : 'td-muted'}`} title={val}>{val}</span>
}

function Row({ app, tableFields, onStatusChange, onEdit, onArchive, onDelete, isArchived }) {
  const stop = (e) => e.stopPropagation()
  return (
    <tr
      className={`row-click${isArchived ? ' tr-archived' : ''}`}
      onClick={() => onEdit(app)}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault()
          onEdit(app)
        }
      }}
      tabIndex={0}
      aria-label={`Edit ${app.company || 'application'}`}
      title="Click to edit"
    >
      {tableFields.map(f => (
        <td key={f.key} onClick={f.key === 'status' ? stop : undefined}>
          <Cell field={f} app={app} onStatusChange={onStatusChange} />
        </td>
      ))}
      <td className="actions-cell" onClick={stop}>
        <div className="table-actions">
          <button className="btn-row btn-row--edit" title="Edit application" aria-label={`Edit ${app.company || 'application'}`} onClick={() => onEdit(app)}><Icon name="edit" /></button>
          <button
            className={`btn-row ${isArchived ? 'btn-row--restore' : 'btn-row--archive'}`}
            title={isArchived ? 'Restore application' : 'Archive application'}
            aria-label={`${isArchived ? 'Restore' : 'Archive'} ${app.company || 'application'}`}
            onClick={() => onArchive(app.id, !isArchived)}
          ><Icon name={isArchived ? 'restore' : 'archive'} /></button>
          <button className="btn-row btn-row--delete" title="Remove application" aria-label={`Remove ${app.company || 'application'}`} onClick={() => onDelete(app)}><Icon name="delete" /></button>
        </div>
      </td>
    </tr>
  )
}

export default function AppTable({ fields, applications, archivedApps = [], archivedCount = 0, showArchived = false, onToggleArchived, filter, onStatusChange, onEdit, onArchive, onDelete, onAdd, onClearFilter }) {
  const [tableRef, fades] = useScrollFades()
  const [sort, setSort] = useState(null)
  const tableFields = fields.filter(f => f.enabled && f.table)
  const colCount = tableFields.length + 1
  const hasActive = applications.length > 0
  const filterStyle = STATUS_STYLES[filter] || DEFAULT_STATUS_STYLE
  const sortedApplications = sortApplications(applications, sort)
  const sortedArchivedApps = sortApplications(archivedApps, sort)

  const toggleSort = key => setSort(current => {
    if (!current || current.key !== key) return { key, dir: 'asc' }
    return current.dir === 'asc' ? { key, dir: 'desc' } : null
  })

  if (!hasActive && archivedCount === 0) {
    const emptyTitle = filter === 'To Apply' ? 'No applications to apply' : filter ? `No ${filter.toLowerCase()} applications` : 'No applications yet'
    return (
      <div className="empty-state">
        <p className="empty-icon">{filter ? '🔍' : '📭'}</p>
        <h2>{emptyTitle}</h2>
        <p className="empty-sub">{filter ? 'Try another status or return to the full list.' : 'Add your first role to start building your pipeline.'}</p>
        <button className="empty-action" onClick={filter ? onClearFilter : onAdd}>
          {filter ? 'Show all applications' : 'Add application'}
        </button>
      </div>
    )
  }

  const rowProps = { tableFields, onStatusChange, onEdit, onArchive, onDelete }

  return (
    <div className="table-shell" data-fade-left={fades.left || undefined} data-fade-right={fades.right || undefined}>
      <div ref={tableRef} className="table-wrap">
        {filter && (
          <div className="table-heading" style={{ '--filter-tone': filterStyle.color, '--filter-tone-light': filterStyle.lightColor }}>
            <div className="table-filter-summary">
              <strong>{filter}</strong>
              <span>{applications.length} application{applications.length === 1 ? '' : 's'}</span>
            </div>
            <div className="table-heading-actions">
              <button className="filter-clear" onClick={onClearFilter}>Clear filter</button>
            </div>
          </div>
        )}
        <table className="app-table">
        <thead>
          <tr>
            {tableFields.map(f => {
              const active = sort?.key === f.key
              return (
                <th key={f.key} style={{ width: colWidth(f) }} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="table-sort" onClick={() => toggleSort(f.key)} aria-label={`Sort by ${f.label}`}>
                    <span>{f.label}</span><span className="table-sort-indicator" aria-hidden="true">{active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
              )
            })}
            <th style={{ width: '160px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedApplications.map(app => (
            <Row key={app.id} app={app} {...rowProps} />
          ))}

          {archivedCount > 0 && (
            <tr className="archived-section-row">
              <td colSpan={colCount}>
                <button className="archived-section-toggle" onClick={onToggleArchived} aria-expanded={showArchived}>
                  <span>Archived <span className="archived-section-count">{archivedCount}</span></span>
                  <Icon name="chevron" className={`archived-section-chevron${showArchived ? ' archived-section-chevron--open' : ''}`} />
                </button>
              </td>
            </tr>
          )}

          {sortedArchivedApps.map(app => (
            <Row key={app.id} app={app} isArchived {...rowProps} />
          ))}
        </tbody>
        </table>
      </div>
    </div>
  )
}
