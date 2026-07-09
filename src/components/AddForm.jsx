import { useState } from 'react'
import { api, EXTRACTABLE } from '../lib/api'

export default function AddForm({ fields, aiEnabled, initialData = null, onClose, onSaved, onError }) {
  const editMode = initialData !== null
  const enabled = fields.filter(f => f.enabled)
  const urlField = enabled.find(f => f.type === 'url')
  const gridFields = enabled.filter(f => f.type !== 'url' && f.type !== 'textarea')
  const textAreas = enabled.filter(f => f.type === 'textarea')

  const init = {}
  for (const f of enabled) {
    const existing = initialData?.[f.key]
    if (existing != null && existing !== '') init[f.key] = existing
    else if (f.type === 'select') init[f.key] = (f.options && f.options[0]) || '' // default to first option, not blank
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
      <div className="modal">
        <div className="modal-header">
          <h2>{editMode ? 'Edit Application' : 'Add Application'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {urlField && (
          <>
            <div className="url-row">
              <input
                className="input" type="url" placeholder={`Paste ${urlField.label.toLowerCase()}…`}
                value={urlVal} onChange={set(urlKey)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleExtract() } }}
              />
              <button
                className="btn-extract"
                onClick={handleExtract}
                disabled={!urlVal?.trim() || extracting}
                title={aiEnabled ? 'Auto-fill from the URL using AI' : 'Set up AI in Settings to enable this'}
              >
                {extracting ? <span className="spinner-sm" /> : '✦ Extract'}
              </button>
            </div>
            {!aiEnabled && (
              <p className="hint-line">Tip: enable AI in <b>Settings → AI</b> to auto-fill from a link. Otherwise just type below.</p>
            )}
            {msg && <p className={msg.type === 'ok' ? 'extract-success' : 'extract-error'}>{msg.type === 'ok' ? '✓ ' : '⚠ '}{msg.text}</p>}
          </>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          {gridFields.map(f => (
            <div className="field" key={f.key}>
              <label>{f.label}{f.key === 'company' ? ' *' : ''}</label>
              {f.type === 'select'
                ? <select className="input" value={values[f.key]} onChange={set(f.key)}>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                : <input
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
              <label>{f.label}</label>
              <textarea className="input textarea" rows={3} value={values[f.key]} onChange={set(f.key)} />
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
