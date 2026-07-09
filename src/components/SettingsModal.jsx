import { useState } from 'react'
import { api } from '../lib/api'

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const PROVIDERS = [
  { value: 'none', label: 'None (manual entry only)' },
  { value: 'ollama', label: 'Ollama — free, runs locally' },
  { value: 'openai-compatible', label: 'OpenAI / OpenRouter / LM Studio (your key)' },
  { value: 'anthropic', label: 'Anthropic Claude (your key)' },
]

function download(name, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

export default function SettingsModal({ config, onClose, onSaved, onError }) {
  const [tab, setTab] = useState('fields')
  const [fields, setFields] = useState(config.fields.map(f => ({ ...f })))
  const [ai, setAi] = useState({ ...config.ai })
  const [newField, setNewField] = useState('')
  const [saving, setSaving] = useState(false)

  const [sheetUrl, setSheetUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState(null)

  const setField = (key, patch) => setFields(fs => fs.map(f => (f.key === key ? { ...f, ...patch } : f)))

  const addField = () => {
    const label = newField.trim()
    if (!label) return
    let key = slug(label) || `field_${Date.now()}`
    if (fields.some(f => f.key === key)) key = `${key}_${Date.now()}`
    setFields(fs => [...fs, { key, label, type: 'text', enabled: true, table: true, custom: true }])
    setNewField('')
  }

  const removeField = (key) => setFields(fs => fs.filter(f => f.key !== key))

  const save = async () => {
    setSaving(true)
    try {
      const next = await api.saveConfig({ fields, ai })
      onSaved(next)
      onClose()
    } catch (e) {
      onError?.('Could not save settings: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const runImport = async () => {
    if (!sheetUrl.trim()) return
    setImporting(true); setImportMsg(null)
    try {
      const r = await api.importGSheet(sheetUrl.trim())
      setImportMsg({ type: 'ok', text: `Imported ${r.imported} application${r.imported !== 1 ? 's' : ''}.` +
        (r.unmatchedColumns?.length ? ` (Ignored unknown columns: ${r.unmatchedColumns.join(', ')})` : '') })
      onSaved(config) // triggers a data reload in the app
    } catch (e) {
      setImportMsg({ type: 'err', text: e.message })
    } finally {
      setImporting(false)
    }
  }

  const exportData = async (kind) => {
    try {
      const { applications } = await api.getApplications()
      if (kind === 'json') {
        download('applications.json', JSON.stringify(applications, null, 2), 'application/json')
      } else {
        const cols = fields.map(f => f.key)
        const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
        const rows = [fields.map(f => f.label).join(',')]
        for (const a of applications) rows.push(cols.map(c => esc(a[c])).join(','))
        download('applications.csv', rows.join('\n'), 'text/csv')
      }
    } catch (e) { onError?.('Export failed: ' + e.message) }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tabs">
          <button className={tab === 'fields' ? 'tab tab--active' : 'tab'} onClick={() => setTab('fields')}>Fields</button>
          <button className={tab === 'ai' ? 'tab tab--active' : 'tab'} onClick={() => setTab('ai')}>AI Extraction</button>
          <button className={tab === 'data' ? 'tab tab--active' : 'tab'} onClick={() => setTab('data')}>Import / Export</button>
        </div>

        {/* ── FIELDS ── */}
        {tab === 'fields' && (
          <div className="tab-body">
            <p className="tab-intro">Choose which fields you want to track. Nothing is required except a company name.</p>
            <div className="field-list">
              <div className="field-row field-row--head">
                <span>Field</span><span className="fr-toggle">Track</span><span className="fr-toggle">In table</span><span></span>
              </div>
              {fields.map(f => (
                <div className="field-row" key={f.key}>
                  <span className="fr-name">{f.label}{f.core ? <em className="fr-core"> (required)</em> : ''}</span>
                  <span className="fr-toggle">
                    <input type="checkbox" checked={f.enabled} disabled={f.core}
                      onChange={e => setField(f.key, { enabled: e.target.checked })} />
                  </span>
                  <span className="fr-toggle">
                    <input type="checkbox" checked={!!f.table} disabled={!f.enabled}
                      onChange={e => setField(f.key, { table: e.target.checked })} />
                  </span>
                  <span className="fr-rm">
                    {f.custom && <button className="link-btn link-btn--danger" onClick={() => removeField(f.key)}>remove</button>}
                  </span>
                </div>
              ))}
            </div>
            <div className="add-field-row">
              <input className="input" placeholder="Add a custom field (e.g. Referral, Deadline)…"
                value={newField} onChange={e => setNewField(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addField() } }} />
              <button className="btn-ghost" onClick={addField}>+ Add field</button>
            </div>
          </div>
        )}

        {/* ── AI ── */}
        {tab === 'ai' && (
          <div className="tab-body">
            <p className="tab-intro">
              AI is optional. It only powers the <b>Extract</b> button that auto-fills a job's details from its link.
              For a free option that never leaves your computer, install <a href="https://ollama.com" target="_blank" rel="noopener">Ollama</a> and choose it below.
            </p>
            <div className="field">
              <label>Provider</label>
              <select className="input" value={ai.provider} onChange={e => setAi(a => ({ ...a, provider: e.target.value }))}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {ai.provider === 'ollama' && (
              <>
                <div className="field"><label>Model</label>
                  <input className="input" value={ai.model} placeholder="llama3.2"
                    onChange={e => setAi(a => ({ ...a, model: e.target.value }))} /></div>
                <div className="field"><label>Ollama URL</label>
                  <input className="input" value={ai.baseUrl} placeholder="http://localhost:11434"
                    onChange={e => setAi(a => ({ ...a, baseUrl: e.target.value }))} /></div>
                <p className="hint-line">Install Ollama, then in a terminal run <code>ollama pull llama3.2</code>. No account, no cost, nothing leaves your machine.</p>
              </>
            )}

            {ai.provider === 'openai-compatible' && (
              <>
                <div className="field"><label>Base URL</label>
                  <input className="input" value={ai.baseUrl} placeholder="https://api.openai.com/v1"
                    onChange={e => setAi(a => ({ ...a, baseUrl: e.target.value }))} /></div>
                <div className="field"><label>Model</label>
                  <input className="input" value={ai.model} placeholder="gpt-4o-mini"
                    onChange={e => setAi(a => ({ ...a, model: e.target.value }))} /></div>
                <div className="field"><label>API key</label>
                  <input className="input" type="password" value={ai.apiKey} placeholder="sk-…"
                    onChange={e => setAi(a => ({ ...a, apiKey: e.target.value }))} /></div>
                <p className="hint-line">Tip: <a href="https://openrouter.ai" target="_blank" rel="noopener">OpenRouter</a> offers free models — use base URL <code>https://openrouter.ai/api/v1</code> and a model ending in <code>:free</code>.</p>
              </>
            )}

            {ai.provider === 'anthropic' && (
              <>
                <div className="field"><label>Model</label>
                  <input className="input" value={ai.model} placeholder="claude-haiku-4-5-20251001"
                    onChange={e => setAi(a => ({ ...a, model: e.target.value }))} /></div>
                <div className="field"><label>API key</label>
                  <input className="input" type="password" value={ai.apiKey} placeholder="sk-ant-…"
                    onChange={e => setAi(a => ({ ...a, apiKey: e.target.value }))} /></div>
              </>
            )}

            <p className="hint-line">Your key is stored only in <code>data/config.json</code> on your computer, which is git-ignored. It is never sent anywhere except to the provider you choose.</p>
          </div>
        )}

        {/* ── DATA ── */}
        {tab === 'data' && (
          <div className="tab-body">
            <p className="tab-intro">Already have a Google Sheet of applications? Import it once — the data is then yours, locally.</p>
            <div className="field">
              <label>Google Sheet link</label>
              <input className="input" placeholder="https://docs.google.com/spreadsheets/d/…"
                value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} />
            </div>
            <p className="hint-line">First, in Google Sheets: <b>Share → General access → “Anyone with the link” → Viewer</b>. Give your columns clear headers (Company, Position, Status, Salary, Location, Job Link…). Then paste the link and import.</p>
            <button className="btn-primary" onClick={runImport} disabled={importing || !sheetUrl.trim()}>
              {importing ? 'Importing…' : 'Import from Google Sheet'}
            </button>
            {importMsg && <p className={importMsg.type === 'ok' ? 'extract-success' : 'extract-error'} style={{ marginTop: '.8rem' }}>{importMsg.text}</p>}

            <hr className="divider" />
            <p className="tab-intro">Export a backup of everything (your data never leaves your machine unless you share these files).</p>
            <div className="export-row">
              <button className="btn-ghost" onClick={() => exportData('csv')}>⬇ Export CSV</button>
              <button className="btn-ghost" onClick={() => exportData('json')}>⬇ Export JSON</button>
            </div>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: '1.5rem' }}>
          <button className="btn-ghost" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </div>
    </div>
  )
}
