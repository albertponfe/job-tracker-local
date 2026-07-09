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
    { key: 'company',        label: 'Company',       type: 'text',     enabled: true,  table: true, core: true },
    { key: 'position',       label: 'Position',      type: 'text',     enabled: true,  table: true },
    { key: 'location',       label: 'Location',      type: 'text',     enabled: true,  table: true },
    { key: 'salary',         label: 'Salary',        type: 'text',     enabled: true,  table: true },
    { key: 'status',         label: 'Status',        type: 'select',   enabled: true,  table: true,
      options: ['Applied', 'Interview', 'Offer', 'Rejected', 'Ghosted', 'Withdrawn'] },
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

app.post('/api/import/gsheet', async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'Paste your Google Sheet link.' })

  const idMatch = String(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) return res.status(400).json({ error: "That doesn't look like a Google Sheets link." })
  const id = idMatch[1]
  const gidMatch = String(url).match(/[#&?]gid=([0-9]+)/)
  const gid = gidMatch ? gidMatch[1] : '0'
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`

  let csv = ''
  try {
    const r = await fetch(csvUrl, { redirect: 'follow', signal: AbortSignal.timeout(15000) })
    csv = await r.text()
    if (!r.ok || /<html|accounts\.google\.com|sign in/i.test(csv.slice(0, 500))) {
      return res.status(422).json({
        error: "Couldn't read the sheet. In Google Sheets, click Share → General access → 'Anyone with the link' → Viewer, then try again.",
      })
    }
  } catch (e) {
    return res.status(422).json({ error: 'Could not reach the sheet.', detail: String(e.message || e) })
  }

  const rows = parseCSV(csv)
  if (rows.length < 2) return res.status(422).json({ error: 'The sheet appears to be empty.' })

  const headers = rows[0]
  const cfg = await readConfig()

  // Map each sheet column to a known field key by matching header text to labels/keys.
  const fieldByNorm = {}
  for (const f of cfg.fields) { fieldByNorm[norm(f.label)] = f.key; fieldByNorm[norm(f.key)] = f.key }
  const aliases = { jobtitle: 'position', role: 'position', title: 'position', link: 'url', joblink: 'url', joburl: 'url', pay: 'salary', compensation: 'salary', type: 'employmentType', jobtype: 'employmentType', stage: 'status', contact: 'contactName', email: 'contactEmail', appliedon: 'date', dateapplied: 'date' }
  const colKey = headers.map(h => fieldByNorm[norm(h)] || aliases[norm(h)] || null)

  const now = new Date()
  const imported = rows.slice(1).map(r => {
    const rec = { id: randomUUID(), createdAt: now.toISOString(), archived: false }
    let any = false
    colKey.forEach((k, i) => { if (k && r[i] != null && String(r[i]).trim() !== '') { rec[k] = String(r[i]).trim(); any = true } })
    if (!rec.date) rec.date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    if (!rec.status) rec.status = 'Applied'
    return any ? rec : null
  }).filter(Boolean)

  if (imported.length === 0) {
    return res.status(422).json({ error: 'No rows matched. Make sure the first row has column headers like Company, Position, Status, etc.' })
  }

  const apps = await readApps()
  await writeApps([...apps, ...imported])
  res.json({ imported: imported.length, unmatchedColumns: headers.filter((_, i) => !colKey[i]) })
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
