import { useState } from 'react'
import { api, EXTRACTABLE } from '../lib/api'
import AnimatedHeight from './AnimatedHeight'
import Select from './Select'

export default function AddForm({ fields, aiEnabled, initialData = null, onClose, onSaved, onError }) {
  const editMode = initialData !== null
  const enabled = fields.filter(f => f.enabled)
  const urlField = enabled.find(f => f.type === 'url')
  const gridFields = enabled.filter(f => f.type !== 'url' && f.type !== 'textarea')
  const textAreas = enabled.filter(f => f.type === 'textarea')

  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  const init = {}
  for (const f of enabled) {
    const existing = initialData?.[f.key]
    if (existing != null && existing !== '') init[f.key] = existing
    else if (f.type === 'select') {
      const opts = f.options || []
      // new entries default to "Applied" (the common case); other selects use their first option
      init[f.key] = (f.key === 'status' && opts.includes('Applied')) ? 'Applied' : (opts[0] || '')
    }
    else if (f.key === 'date') init[f.key] = today // sensible default for new entries
    else init[f.key] = ''
  }
  if (urlField) init[urlField.key] = initialData?.[urlField.key] ?? ''
  const [values, setValues] = useState(init)

  const [extracting, setExtracting] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'ok'|'err', text }
  const [saving, setSaving] = useState(false)

  const set = (key) => (e) => setValues(v => ({ ...v, [key]: e.target.value }))
  const urlKey = urlField?.key
  const urlVal = urlKey ? values[urlKey] : ''

  const handleExtract = async () => {
    if (!urlVal?.trim()) return
    setExtracting(true); setMsg(null)
    try {
      const data = await api.extract(urlVal.trim())
      const filled = {}
      for (const key of EXTRACTABLE) {
        if (enabled.some(f => f.key === key) && data[key]) filled[key] = data[key]
      }
      if (Object.keys(filled).length === 0) {
        setMsg({ type: 'err', text: 'Could not find details on that page — fill in manually.' })
      } else {
        setValues(v => ({ ...v, ...filled }))
        setMsg({ type: 'ok', text: 'Info extracted — review and edit below.' })
      }
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally {
      setExtracting(false)
    }
  }

  const companyMissing = enabled.some(f => f.key === 'company') && !values.company?.trim()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (companyMissing) return
    setSaving(true)
    try {
      if (editMode) await api.updateApplication(initialData.id, values)
      else await api.addApplication(values)
      onSaved()
    } catch (err) {
      onError?.('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="application-dialog-title">
        <div className="modal-header">
          <h2 id="application-dialog-title">{editMode ? 'Edit Application' : 'Add Application'}</h2>
          <button className="modal-close" aria-label="Close dialog" onClick={onClose}>✕</button>
        </div>

        {urlField && (
          <>
            <div className="url-row">
              <input
                autoFocus className="input" type="url" placeholder={`Paste ${urlField.label.toLowerCase()}…`}
                value={urlVal} onChange={set(urlKey)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleExtract() } }}
              />
              <button
                className="btn-extract"
                onClick={handleExtract}
                disabled={!urlVal?.trim() || extracting}
                title={aiEnabled ? 'Auto-fill from the URL using built-in extraction or AI' : 'Auto-fill supported job sites without AI'}
              >
                {extracting ? <span className="spinner-sm" /> : '✦ Extract'}
              </button>
            </div>
            <AnimatedHeight className="extract-notes">
              {!aiEnabled && (
                <p className="hint-line">
                  Links from <b>Greenhouse, Lever, Ashby, SmartRecruiters, Workable, and Workday</b> auto-fill
                  without any AI setup — just paste and hit Extract. For other sites, enable AI in <b>Settings → AI</b>, or type below.
                </p>
              )}
              {msg && <p className={msg.type === 'ok' ? 'extract-success' : 'extract-error'}>{msg.type === 'ok' ? '✓ ' : '⚠ '}{msg.text}</p>}
            </AnimatedHeight>
          </>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          {gridFields.map(f => (
            <div className="field" key={f.key}>
              <label htmlFor={`field-${f.key}`}>{f.label}{f.key === 'company' ? ' *' : ''}</label>
              {f.type === 'select'
                ? <Select id={`field-${f.key}`} value={values[f.key]} options={f.options || []} onChange={value => setValues(v => ({ ...v, [f.key]: value }))} ariaLabel={f.label} />
                : <input
                    id={`field-${f.key}`}
                    className="input"
                    type={f.type === 'email' ? 'email' : 'text'}
                    value={values[f.key]}
                    onChange={set(f.key)}
                    required={f.key === 'company'}
                  />}
            </div>
          ))}

          {textAreas.map(f => (
            <div className="field field--full" key={f.key}>
              <label htmlFor={`field-${f.key}`}>{f.label}</label>
              <textarea id={`field-${f.key}`} className="input textarea" rows={3} value={values[f.key]} onChange={set(f.key)} />
            </div>
          ))}

          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving || companyMissing}>
              {saving ? 'Saving…' : editMode ? 'Save Changes' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
