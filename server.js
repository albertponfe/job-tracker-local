// ─────────────────────────────────────────────────────────────────────────
//  Job Tracker — local server
//
//  Runs entirely on your machine. Serves the app, stores your data in a local
//  JSON file (data/applications.json), and proxies the optional AI extraction
//  and one-time Google Sheet import (so the browser doesn't hit CORS walls).
//
//  There is NO connection to any external service unless YOU configure one
//  (an AI provider in Settings, or importing your own Google Sheet).
// ─────────────────────────────────────────────────────────────────────────

import express from 'express'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { exec } from 'node:child_process'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const APPS_FILE = join(DATA_DIR, 'applications.json')
const CONFIG_FILE = join(DATA_DIR, 'config.json')
const DIST_DIR = join(__dirname, 'dist')

const PORT = process.env.PORT || 3000

// ── Default configuration (fields the user can toggle, + AI settings) ──
const DEFAULT_CONFIG = {
  fields: [
    { key: 'date',           label: 'Date',          type: 'text',     enabled: true,  table: true },
    { key: 'company',        label: 'Company',       type: 'text',     enabled: true,  table: true, core: true },
    { key: 'position',       label: 'Position',      type: 'text',     enabled: true,  table: true },
    { key: 'location',       label: 'Location',      type: 'text',     enabled: true,  table: true },
    { key: 'salary',         label: 'Salary',        type: 'text',     enabled: true,  table: true },
    { key: 'status',         label: 'Status',        type: 'select',   enabled: true,  table: true,
      options: ['To Apply', 'Applied', 'Interview', 'Offer', 'Rejected', 'Ghosted', 'Withdrawn'] },
    { key: 'employmentType', label: 'Type',          type: 'text',     enabled: true,  table: true },
    { key: 'url',            label: 'Job Link',      type: 'url',      enabled: true,  table: true },
    { key: 'contactName',    label: 'Contact',       type: 'text',     enabled: false, table: true },
    { key: 'contactEmail',   label: 'Contact Email', type: 'email',    enabled: false, table: true },
    { key: 'notes',          label: 'Notes',         type: 'textarea', enabled: true,  table: false },
  ],
  ai: {
    provider: process.env.AI_PROVIDER || 'none', // none | ollama | openai-compatible | anthropic
    model: process.env.AI_MODEL || 'llama3.2',
    baseUrl: process.env.AI_BASE_URL || 'http://localhost:11434',
    apiKey: process.env.AI_API_KEY || '',
  },
}

// ── Tiny JSON file helpers ──
async function ensureData() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  if (!existsSync(APPS_FILE)) await writeFile(APPS_FILE, '[]')
  if (!existsSync(CONFIG_FILE)) await writeFile(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2))
}
async function readApps() {
  try { return JSON.parse(await readFile(APPS_FILE, 'utf8')) } catch { return [] }
}
async function writeApps(apps) {
  await writeFile(APPS_FILE, JSON.stringify(apps, null, 2))
}
async function readConfig() {
  try {
    const cfg = JSON.parse(await readFile(CONFIG_FILE, 'utf8'))
    // merge in any newly-added default fields so upgrades don't lose keys
    return { ...DEFAULT_CONFIG, ...cfg, ai: { ...DEFAULT_CONFIG.ai, ...(cfg.ai || {}) } }
  } catch { return DEFAULT_CONFIG }
}
async function writeConfig(cfg) {
  await writeFile(CONFIG_FILE, JSON.stringify(cfg, null, 2))
}

const app = express()
app.use(express.json({ limit: '2mb' }))

// ─────────────────────────── Applications CRUD ───────────────────────────

app.get('/api/applications', async (_req, res) => {
  const apps = await readApps()
  res.json({ applications: apps })
})

app.post('/api/applications', async (req, res) => {
  const apps = await readApps()
  const now = new Date()
  const record = {
    id: randomUUID(),
    date: req.body.date || now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    createdAt: now.toISOString(),
    archived: false,
    ...req.body,
  }
  record.id = record.id || randomUUID() // never let the client blank the id
  apps.push(record)
  await writeApps(apps)
  res.json({ application: record })
})

app.patch('/api/applications/:id', async (req, res) => {
  const apps = await readApps()
  const idx = apps.findIndex(a => a.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  apps[idx] = { ...apps[idx], ...req.body, id: apps[idx].id } // id is immutable
  await writeApps(apps)
  res.json({ application: apps[idx] })
})

app.delete('/api/applications/:id', async (req, res) => {
  const apps = await readApps()
  const next = apps.filter(a => a.id !== req.params.id)
  await writeApps(next)
  res.json({ ok: true, removed: apps.length - next.length })
})

// ─────────────────────────────── Config ──────────────────────────────────

app.get('/api/config', async (_req, res) => {
  res.json(await readConfig())
})

app.post('/api/config', async (req, res) => {
  const current = await readConfig()
  const next = {
    ...current,
    ...req.body,
    ai: { ...current.ai, ...(req.body.ai || {}) },
  }
  await writeConfig(next)
  res.json(next)
})

// ───────────────────────── AI extraction (optional) ──────────────────────

// Ask the configured model for job details. Returns raw text (JSON, ideally).
async function callModel(ai, prompt) {
  if (ai.provider === 'ollama') {
    const r = await fetch(`${(ai.baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ai.model || 'llama3.2',
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json',
      }),
      signal: AbortSignal.timeout(60000),
    })
    if (!r.ok) throw new Error(`Ollama error ${r.status}. Is Ollama running? (ollama serve)`)
    const d = await r.json()
    return d.message?.content || ''
  }

  if (ai.provider === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ai.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ai.model || 'claude-haiku-4-5-20251001',
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(60000),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error?.message || `Anthropic error ${r.status}`)
    return d.content?.[0]?.text || ''
  }

  // openai-compatible: OpenAI, OpenRouter, LM Studio, Groq, LocalAI, vLLM, ...
  if (ai.provider === 'openai-compatible') {
    const base = (ai.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ai.apiKey ? { Authorization: `Bearer ${ai.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60000),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error?.message || `Provider error ${r.status}`)
    return d.choices?.[0]?.message?.content || ''
  }

  throw new Error('No AI provider configured')
}

app.post('/api/extract', async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'A job URL is required.' })

  const { ai } = await readConfig()
  if (!ai.provider || ai.provider === 'none') {
    return res.status(400).json({ error: 'AI is not set up. Open Settings → AI to enable extraction, or fill the fields in manually.' })
  }

  // 1) Fetch and clean the job page
  let pageText = ''
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(10000),
    })
    const html = await r.text()
    pageText = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 12000)

    const lower = pageText.toLowerCase()
    const blocked =
      lower.includes('join linkedin') ||
      lower.includes('authwall') ||
      lower.includes('please enable cookies') ||
      lower.includes('access denied') ||
      lower.includes('verify you are human') ||
      pageText.length < 200
    if (blocked) {
      return res.status(422).json({
        error: 'This site blocks automated access (common for LinkedIn, Indeed, Glassdoor). Please fill in the fields manually. Job-board/ATS links like Greenhouse, Lever, or Ashby usually work.',
        blocked: true,
      })
    }
  } catch (e) {
    return res.status(422).json({ error: 'Could not fetch that URL — fill in manually.', detail: String(e.message || e) })
  }

  // 2) Ask the model to structure it
  try {
    const prompt = `Extract job posting details from the text below. Return ONLY a JSON object with these keys (use null if not found):
{
  "company": string,
  "position": string,
  "location": string,
  "salary": string,
  "employmentType": string,
  "contactName": string,
  "contactEmail": string
}
For "contactName": a recruiter/hiring manager name and role if present (e.g. "Jane Smith, Recruiter"), else null.
For "contactEmail": any contact email found, else null.

Page text:
${pageText}`

    const raw = await callModel(ai, prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('The model did not return JSON. Try a different model.')
    res.json(JSON.parse(match[0]))
  } catch (e) {
    res.status(500).json({ error: 'Extraction failed.', detail: String(e.message || e) })
  }
})

// ───────────────── One-time import from a public Google Sheet ─────────────

// Minimal RFC-4180-ish CSV parser (handles quotes, commas, and newlines in cells)
function parseCSV(text) {
  const rows = []
  let row = [], cell = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else inQuotes = false
      } else cell += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\r') { /* ignore */ }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else cell += c
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row) }
  return rows.filter(r => r.some(v => v && v.trim() !== ''))
}

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const slugKey = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

// Best-guess mapping of a sheet column header to a known field key (Part B:
// exact match → alias table → fuzzy "contains"). Returns a field key or null.
function guessField(header, fields) {
  const h = norm(header)
  if (!h) return null

  // 1) exact match on a field's key or label
  for (const f of fields) if (norm(f.key) === h || norm(f.label) === h) return f.key

  // 2) explicit aliases (exact, normalized)
  const aliases = {
    company: 'company', employer: 'company', organization: 'company', organisation: 'company', companyname: 'company',
    position: 'position', role: 'position', jobtitle: 'position', title: 'position', job: 'position',
    location: 'location', city: 'location', place: 'location', where: 'location',
    salary: 'salary', pay: 'salary', compensation: 'salary', comp: 'salary', wage: 'salary', salaryrange: 'salary',
    status: 'status', stage: 'status', progress: 'status', state: 'status',
    type: 'employmentType', jobtype: 'employmentType', employmenttype: 'employmentType', employment: 'employmentType',
    url: 'url', link: 'url', joblink: 'url', joburl: 'url', posting: 'url', jobposting: 'url', applicationlink: 'url',
    contact: 'contactName', contactname: 'contactName', recruiter: 'contactName', hiringmanager: 'contactName', poc: 'contactName',
    email: 'contactEmail', contactemail: 'contactEmail', emailaddress: 'contactEmail',
    date: 'date', dateapplied: 'date', applieddate: 'date', appliedon: 'date', dateofapplication: 'date', applied: 'date',
    notes: 'notes', note: 'notes', comments: 'notes', comment: 'notes', details: 'notes',
  }
  if (aliases[h] && fields.some(f => f.key === aliases[h])) return aliases[h]

  // 3) fuzzy "contains" — order matters (most specific first)
  const has = (...subs) => subs.some(s => h.includes(s))
  let key = null
  if (has('email')) key = 'contactEmail'
  else if (has('link', 'url', 'posting')) key = 'url'
  else if (has('salary', 'pay', 'wage', 'comp')) key = 'salary'
  else if (has('employer', 'company', 'organiz', 'organis')) key = 'company'
  else if (has('title', 'role', 'position')) key = 'position'
  else if (has('location', 'city', 'remote', 'where')) key = 'location'
  else if (has('status', 'stage', 'progress')) key = 'status'
  else if (has('type', 'employ')) key = 'employmentType'
  else if (has('recruiter', 'contact', 'hiring', 'manager')) key = 'contactName'
  else if (has('date', 'applied', 'when')) key = 'date'
  else if (has('note', 'comment', 'detail')) key = 'notes'
  return (key && fields.some(f => f.key === key)) ? key : null
}

// Fetch + parse a public Google Sheet as CSV. Throws { status, message, detail }.
async function fetchSheetCsv(url) {
  const idMatch = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) throw { status: 400, message: "That doesn't look like a Google Sheets link." }
  const id = idMatch[1]
  const gidMatch = String(url).match(/[#&?]gid=([0-9]+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`

  let csv = ''
  try {
    const r = await fetch(csvUrl, { redirect: 'follow', signal: AbortSignal.timeout(15000) })
    csv = await r.text()
    if (!r.ok || /<html|accounts\.google\.com|sign in/i.test(csv.slice(0, 500))) {
      throw { status: 422, message: "Couldn't read the sheet. In Google Sheets: Share → General access → 'Anyone with the link' → Viewer, then try again." }
    }
  } catch (e) {
    if (e.status) throw e
    throw { status: 422, message: 'Could not reach the sheet.', detail: String(e.message || e) }
  }

  const rows = parseCSV(csv)
  if (rows.length < 2) throw { status: 422, message: 'The sheet has no data rows.' }
  return { headers: rows[0], rows: rows.slice(1) }
}

// Step 1: preview the sheet + a best-guess column mapping (no import yet).
app.post('/api/import/gsheet/preview', async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Paste your Google Sheet link.' })
  try {
    const { headers, rows } = await fetchSheetCsv(url)
    const cfg = await readConfig()
    const autoMap = headers.map(h => guessField(h, cfg.fields) || '')
    res.json({ headers, sampleRows: rows.slice(0, 3), rowCount: rows.length, autoMap })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Preview failed', detail: e.detail })
  }
})

// Step 2: import using a user-confirmed mapping (array aligned to headers).
// Each entry is a field key, '__ignore__', or '__new__' (create a custom field).
app.post('/api/import/gsheet', async (req, res) => {
  const { url, mapping } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Paste your Google Sheet link.' })
  try {
    const { headers, rows } = await fetchSheetCsv(url)
    const cfg = await readConfig()
    const map = Array.isArray(mapping) ? mapping : headers.map(h => guessField(h, cfg.fields) || '__ignore__')

    // Resolve each column to a stored field key (creating custom fields for __new__)
    const targets = []
    let fieldsChanged = false
    headers.forEach((h, i) => {
      const t = map[i]
      if (t === '__new__') {
        const label = String(h || '').trim() || `Field ${i + 1}`
        const reserved = ['id', 'createdat', 'archived'] // system props on every record
        let key = slugKey(label) || `field_${i}`
        if (reserved.includes(key) || cfg.fields.some(f => f.key === key)) key = `${key}_${i}`
        cfg.fields.push({ key, label, type: 'text', enabled: true, table: true, custom: true })
        fieldsChanged = true
        targets[i] = key
      } else if (!t || t === '__ignore__') {
        targets[i] = null
      } else {
        targets[i] = cfg.fields.some(f => f.key === t) ? t : null
      }
    })

    const statusField = cfg.fields.find(f => f.key === 'status')
    const defaultStatus = statusField?.options?.[0] || 'Applied'
    const now = new Date()

    const imported = rows.map(r => {
      const rec = { id: randomUUID(), createdAt: now.toISOString(), archived: false }
      let any = false
      targets.forEach((key, i) => {
        if (key && r[i] != null && String(r[i]).trim() !== '') { rec[key] = String(r[i]).trim(); any = true }
      })
      if (!rec.date) rec.date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      if (cfg.fields.some(f => f.key === 'status') && !rec.status) rec.status = defaultStatus
      return any ? rec : null
    }).filter(Boolean)

    if (imported.length === 0) return res.status(422).json({ error: 'No rows to import — check your column mapping.' })

    if (fieldsChanged) await writeConfig(cfg)
    const apps = await readApps()
    await writeApps([...apps, ...imported])
    res.json({ imported: imported.length, fieldsAdded: fieldsChanged })
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Import failed', detail: e.detail })
  }
})

// ─────────────── Ollama helpers (terminal-free local AI setup) ────────────

// Is Ollama running, and which models are installed?
app.get('/api/ai/ollama-status', async (req, res) => {
  const base = String(req.query.baseUrl || 'http://localhost:11434').replace(/\/$/, '')
  try {
    const r = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!r.ok) throw new Error('bad status')
    const d = await r.json()
    res.json({ running: true, models: (d.models || []).map(m => m.name) })
  } catch {
    res.json({ running: false, models: [] })
  }
})

// Start downloading a model in the background (via Ollama's HTTP API, so we
// don't depend on the CLI being on PATH). Returns immediately; the client polls
// ollama-status to see when the model appears.
app.post('/api/ai/ollama-pull', async (req, res) => {
  const base = String(req.body?.baseUrl || 'http://localhost:11434').replace(/\/$/, '')
  const model = String(req.body?.model || 'llama3.2').trim()
  try {
    // fire-and-forget: don't await the (large) download
    fetch(`${base}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: false }),
    }).catch(() => {})
    res.json({ started: true, model })
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) })
  }
})

// ─────────────────────────── Static app + fallback ───────────────────────

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('*', (_req, res) => res.sendFile(join(DIST_DIR, 'index.html')))
} else {
  app.get('*', (_req, res) =>
    res.status(200).send('<h1>Job Tracker</h1><p>The app has not been built yet. Run <code>npm start</code> (which builds then serves), or <code>npm run dev</code> for development.</p>'))
}

// ─────────────────────────────── Boot ────────────────────────────────────

function openBrowser(url) {
  if (process.env.NO_OPEN === '1') return
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`
  exec(cmd, () => {})
}

await ensureData()
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`
  console.log(`\n  📋  Job Tracker is running at  ${url}`)
  console.log(`      Your data is stored locally in  data/applications.json`)
  console.log(`      Press Ctrl+C to stop.\n`)
  openBrowser(url)
})
