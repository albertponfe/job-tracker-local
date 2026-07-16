import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

const PROVIDERS = [
  { value: 'none', label: 'None (built-in sites still work)' },
  { value: 'ollama', label: 'Ollama — free, runs locally' },
  { value: 'openai', label: 'OpenAI (your key)' },
  { value: 'anthropic', label: 'Anthropic Claude (your key)' },
]

// Anthropic requires an exact, valid model ID — a dropdown prevents typos (and the
// classic bug of a leftover Ollama model name like "llama3.2" being sent to Anthropic).
const ANTHROPIC_MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — fast & low-cost (recommended)' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — balanced' },
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8 — most capable' },
]
const ANTHROPIC_DEFAULT = ANTHROPIC_MODELS[0].id

// OpenAI models, chosen as a dropdown for the same reason as Anthropic: a valid model
// ID is required, and a free-text box invites typos that the API rejects.
const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini — fast & low-cost (recommended)' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini — balanced' },
  { id: 'gpt-4o', label: 'GPT-4o — most capable' },
]
const OPENAI_DEFAULT = OPENAI_MODELS[0].id

// Sensible starting model per provider, applied when the provider changes so a model
// name from one provider is never carried over to a different, incompatible API.
const PROVIDER_DEFAULT_MODEL = {
  none: '',
  ollama: 'llama3.2',
  openai: OPENAI_DEFAULT,
  anthropic: ANTHROPIC_DEFAULT,
}

function download(name, text, type) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
}

// ── In-app Ollama setup: detect → download model → ready, no terminal needed ──
function OllamaSetup({ ai, setAi }) {
  const [state, setState] = useState({ checked: false, running: false, models: [] })
  const [checking, setChecking] = useState(false)
  const [pullStarted, setPullStarted] = useState(false)
  const wantModel = ai.model || 'llama3.2'
  const base = ai.baseUrl || 'http://localhost:11434'

  const check = async () => {
    setChecking(true)
    try {
      const s = await api.ollamaStatus(base)
      setState({ checked: true, running: s.running, models: s.models })
    } catch {
      setState({ checked: true, running: false, models: [] })
    } finally {
      setChecking(false)
    }
  }

  // auto-check when this panel first appears
  useEffect(() => { check() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const modelReady = state.models.some(m => m === wantModel || m.split(':')[0] === wantModel.split(':')[0])

  const pull = async () => {
    setPullStarted(true)
    try { await api.ollamaPull(base, wantModel) } catch { /* ignore */ }
  }

  return (
    <div className="ollama-box">
      {!state.checked ? (
        <p className="hint-line">Checking for Ollama…</p>
      ) : !state.running ? (
        <>
          <p className="ollama-status ollama-status--off">● Ollama isn't running on this computer yet.</p>
          <p className="hint-line">Install it once (free, a few minutes). Everything stays on your machine — nothing is uploaded.</p>
          <div className="export-row">
            <a className="btn-primary" href="https://ollama.com/download" target="_blank" rel="noopener">↗ Download Ollama</a>
            <button className="btn-ghost" onClick={check} disabled={checking}>{checking ? 'Checking…' : '↻ Check again'}</button>
          </div>
        </>
      ) : modelReady ? (
        <>
          <p className="ollama-status ollama-status--on">● Ready — Ollama is running and “{wantModel}” is installed.</p>
          <p className="hint-line">Click <b>Save settings</b> below and the ✦ Extract button will auto-fill jobs from a link.</p>
          <button className="btn-ghost" onClick={check} disabled={checking}>{checking ? 'Refreshing…' : '↻ Refresh'}</button>
        </>
      ) : (
        <>
          <p className="ollama-status ollama-status--on">● Ollama is running. One more step — download the model:</p>
          <div className="export-row">
            <button className="btn-primary" onClick={pull} disabled={pullStarted}>
              {pullStarted ? 'Downloading…' : `⬇ Download “${wantModel}” (~2 GB)`}
            </button>
            <button className="btn-ghost" onClick={check} disabled={checking}>{checking ? 'Checking…' : '↻ Check again'}</button>
          </div>
          {pullStarted && (
            <p className="hint-line">Downloading in the background — this can take a few minutes. Click <b>↻ Check again</b> to see when it's ready.</p>
          )}
        </>
      )}
    </div>
  )
}

export default function SettingsModal({ config, onClose, onSaved, onError, initialTab }) {
  const [tab, setTab] = useState(initialTab || 'fields')
  const [fields, setFields] = useState(config.fields.map(f => ({ ...f })))
  // Legacy configs may still say 'openai-compatible' — treat that as OpenAI.
  const [ai, setAi] = useState(() => {
    const a = { ...config.ai }
    if (a.provider === 'openai-compatible') a.provider = 'openai'
    return a
  })
  const [newField, setNewField] = useState('')
  const [saving, setSaving] = useState(false)

  // Repair an already-saved bad state (e.g. provider=anthropic but model=llama3.2,
  // or a legacy openai-compatible model that isn't in our OpenAI list) so opening
  // this panel and saving can't preserve a model the API will reject.
  useEffect(() => {
    if (ai.provider === 'anthropic' && !ANTHROPIC_MODELS.some(m => m.id === ai.model)) {
      setAi(a => ({ ...a, model: ANTHROPIC_DEFAULT }))
    }
    if (ai.provider === 'openai' && !OPENAI_MODELS.some(m => m.id === ai.model)) {
      setAi(a => ({ ...a, model: OPENAI_DEFAULT }))
    }
  }, [ai.provider]) // eslint-disable-line react-hooks/exhaustive-deps

  // import flow
  const [sheetUrl, setSheetUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [mapping, setMapping] = useState([])
  const [previewing, setPreviewing] = useState(false)
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

  // ── Import: step 1 (preview) ──
  const runPreview = async () => {
    if (!sheetUrl.trim()) return
    setPreviewing(true); setImportMsg(null)
    try {
      const p = await api.previewGSheet(sheetUrl.trim())
      setPreview(p)
      setMapping(p.headers.map((h, i) => p.autoMap[i] || (String(h).trim() ? '__new__' : '__ignore__')))
    } catch (e) {
      setImportMsg({ type: 'err', text: e.message })
    } finally {
      setPreviewing(false)
    }
  }

  // ── Import: step 2 (confirm with mapping) ──
  const runImport = async () => {
    setImporting(true); setImportMsg(null)
    try {
      const r = await api.importGSheet(sheetUrl.trim(), mapping)
      const fresh = await api.getConfig()      // pick up any newly-created fields
      setFields(fresh.fields.map(f => ({ ...f })))
      setImportMsg({ type: 'ok', text: `Imported ${r.imported} application${r.imported !== 1 ? 's' : ''}.${r.fieldsAdded ? ' New columns were added to your table.' : ''}` })
      setPreview(null); setSheetUrl('')
      onSaved(fresh)                            // reload the main list
    } catch (e) {
      setImportMsg({ type: 'err', text: e.message })
    } finally {
      setImporting(false)
    }
  }

  const setMap = (i, val) => setMapping(m => m.map((v, idx) => (idx === i ? val : v)))
  const sampleFor = (i) => {
    const vals = (preview?.sampleRows || []).map(r => r[i]).filter(v => v && String(v).trim())
    return vals.length ? vals.slice(0, 2).join(' · ') : '—'
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
              AI is optional — it lets ✦ <b>Extract</b> auto-fill details from sites that the built-in extractors don't support.
              The easiest free option is <b>Ollama</b>, which runs on your own computer.
            </p>
            <div className="field">
              <label>Provider</label>
              <select className="input" value={ai.provider} onChange={e => {
                const provider = e.target.value
                setAi(a => ({ ...a, provider, model: PROVIDER_DEFAULT_MODEL[provider] ?? a.model }))
              }}>
                {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>

            {ai.provider === 'ollama' && (
              <>
                <OllamaSetup ai={ai} setAi={setAi} />
                <details className="advanced">
                  <summary>Advanced</summary>
                  <div className="field" style={{ marginTop: '.8rem' }}><label>Model</label>
                    <input className="input" value={ai.model} placeholder="llama3.2"
                      onChange={e => setAi(a => ({ ...a, model: e.target.value }))} /></div>
                  <div className="field"><label>Ollama URL</label>
                    <input className="input" value={ai.baseUrl} placeholder="http://localhost:11434"
                      onChange={e => setAi(a => ({ ...a, baseUrl: e.target.value }))} /></div>
                </details>
              </>
            )}

            {ai.provider === 'openai' && (
              <>
                <div className="field"><label>Model</label>
                  <select className="input"
                    value={OPENAI_MODELS.some(m => m.id === ai.model) ? ai.model : OPENAI_DEFAULT}
                    onChange={e => setAi(a => ({ ...a, model: e.target.value }))}>
                    {OPENAI_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select></div>
                <div className="field"><label>API key</label>
                  <input className="input" type="password" value={ai.apiKey} placeholder="sk-…"
                    onChange={e => setAi(a => ({ ...a, apiKey: e.target.value }))} /></div>
                <p className="hint-line">Get a key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com</a>. GPT-4o mini is cheapest and plenty for this.</p>
              </>
            )}

            {ai.provider === 'anthropic' && (
              <>
                <div className="field"><label>Model</label>
                  <select className="input"
                    value={ANTHROPIC_MODELS.some(m => m.id === ai.model) ? ai.model : ANTHROPIC_DEFAULT}
                    onChange={e => setAi(a => ({ ...a, model: e.target.value }))}>
                    {ANTHROPIC_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select></div>
                <div className="field"><label>API key</label>
                  <input className="input" type="password" value={ai.apiKey} placeholder="sk-ant-…"
                    onChange={e => setAi(a => ({ ...a, apiKey: e.target.value }))} /></div>
                <p className="hint-line">Get a key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a>. Haiku is cheapest and plenty for this.</p>
              </>
            )}

            <p className="hint-line">Any key you enter is stored only in <code>data/config.json</code> on your computer (git-ignored) and is sent only to the provider you pick.</p>
          </div>
        )}

        {/* ── DATA (import / export) ── */}
        {tab === 'data' && (
          <div className="tab-body">
            {!preview ? (
              <>
                <p className="tab-intro">Already have a Google Sheet of applications? Bring it in once — the data then lives on your machine.</p>
                <div className="field">
                  <label>Google Sheet link</label>
                  <input className="input" placeholder="https://docs.google.com/spreadsheets/d/…"
                    value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} />
                </div>
                <p className="hint-line">In Google Sheets: <b>Share → General access → “Anyone with the link” → Viewer</b>. Then open the tab with your data and copy the link from your <b>browser's address bar</b> (not the Share button) — it includes the exact tab. Column names don't need to match; you'll map them next.</p>
                <button className="btn-primary" onClick={runPreview} disabled={previewing || !sheetUrl.trim()}>
                  {previewing ? 'Reading sheet…' : 'Preview & map columns →'}
                </button>
                {importMsg && <p className={importMsg.type === 'ok' ? 'extract-success' : 'extract-error'} style={{ marginTop: '.8rem' }}>{importMsg.text}</p>}

                <hr className="divider" />
                <p className="tab-intro">Export a backup of everything (nothing leaves your machine unless you share the file).</p>
                <div className="export-row">
                  <button className="btn-ghost" onClick={() => exportData('csv')}>⬇ Export CSV</button>
                  <button className="btn-ghost" onClick={() => exportData('json')}>⬇ Export JSON</button>
                </div>
              </>
            ) : (
              <>
                <p className="tab-intro">
                  Found <b>{preview.rowCount}</b> row{preview.rowCount !== 1 ? 's' : ''}. We guessed where each column goes — fix anything wrong.
                  Nothing is imported until you click Import.
                </p>
                <div className="map-list">
                  <div className="map-row map-row--head">
                    <span>Your column</span><span></span><span>Goes to</span>
                  </div>
                  {preview.headers.map((h, i) => (
                    <div className="map-row" key={i}>
                      <div className="map-col">
                        <span className="map-col-name">{h || <em className="td-muted">(no header)</em>}</span>
                        <span className="map-col-sample">{sampleFor(i)}</span>
                      </div>
                      <span className="map-arrow">→</span>
                      <select className="input map-select" value={mapping[i]} onChange={e => setMap(i, e.target.value)}>
                        <option value="__new__">➕ Create new field “{h || `Column ${i + 1}`}”</option>
                        <option value="__ignore__">🚫 Ignore this column</option>
                        <optgroup label="Map to existing field">
                          {fields.map(f => <option key={f.key} value={f.key}>{f.label}{f.enabled ? '' : ' (hidden)'}</option>)}
                        </optgroup>
                      </select>
                    </div>
                  ))}
                </div>
                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button className="btn-ghost" onClick={() => { setPreview(null); setImportMsg(null) }}>← Back</button>
                  <button className="btn-primary" onClick={runImport} disabled={importing}>
                    {importing ? 'Importing…' : `Import ${preview.rowCount} row${preview.rowCount !== 1 ? 's' : ''}`}
                  </button>
                </div>
                {importMsg && <p className={importMsg.type === 'ok' ? 'extract-success' : 'extract-error'} style={{ marginTop: '.8rem' }}>{importMsg.text}</p>}
              </>
            )}
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
