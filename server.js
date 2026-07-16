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
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises'
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
    provider: process.env.AI_PROVIDER || 'none', // none | ollama | openai | anthropic
    model: process.env.AI_MODEL || 'llama3.2',
    baseUrl: process.env.AI_BASE_URL || 'http://localhost:11434',
    apiKey: process.env.AI_API_KEY || '',
  },
}

// ── Tiny JSON file helpers ──
async function writeJsonAtomic(file, value) {
  const temp = `${file}.tmp`
  await writeFile(temp, JSON.stringify(value, null, 2))
  await rename(temp, file)
}

function mergeFields(savedFields) {
  const saved = Array.isArray(savedFields) ? savedFields : []
  if (saved.some(field => !field || typeof field !== 'object' || Array.isArray(field) || typeof field.key !== 'string')) {
    throw new Error('Config fields must be objects with string keys.')
  }
  const defaults = new Map(DEFAULT_CONFIG.fields.map(field => [field.key, field]))
  const savedKeys = new Set(saved.map(field => field.key))
  return [
    ...saved.map(field => ({ ...(defaults.get(field.key) || {}), ...field })),
    ...DEFAULT_CONFIG.fields.filter(field => !savedKeys.has(field.key)).map(field => ({ ...field })),
  ]
}

async function ensureData() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
  if (!existsSync(APPS_FILE)) await writeJsonAtomic(APPS_FILE, [])
  if (!existsSync(CONFIG_FILE)) await writeJsonAtomic(CONFIG_FILE, DEFAULT_CONFIG)
}
async function readApps() {
  const apps = JSON.parse(await readFile(APPS_FILE, 'utf8'))
  if (!Array.isArray(apps)) throw new Error('Applications data must be a JSON array.')
  return apps
}
async function writeApps(apps) {
  await writeJsonAtomic(APPS_FILE, apps)
}
async function readConfig() {
  const cfg = JSON.parse(await readFile(CONFIG_FILE, 'utf8'))
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error('Config data must be a JSON object.')
  if (cfg.fields != null && !Array.isArray(cfg.fields)) throw new Error('Config fields must be a JSON array.')
  if (cfg.ai != null && (typeof cfg.ai !== 'object' || Array.isArray(cfg.ai))) throw new Error('Config AI settings must be a JSON object.')
  return {
    ...DEFAULT_CONFIG,
    ...cfg,
    fields: mergeFields(cfg.fields),
    ai: { ...DEFAULT_CONFIG.ai, ...(cfg.ai || {}) },
  }
}
async function writeConfig(cfg) {
  await writeJsonAtomic(CONFIG_FILE, cfg)
}

let mutationTail = Promise.resolve()
function serializeMutation(work) {
  const result = mutationTail.then(work)
  mutationTail = result.catch(() => {})
  return result
}

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

const app = express()
app.use(express.json({ limit: '2mb' }))

// ─────────────────────────── Applications CRUD ───────────────────────────

app.get('/api/applications', asyncRoute(async (_req, res) => {
  const apps = await readApps()
  res.json({ applications: apps })
}))

app.post('/api/applications', asyncRoute(async (req, res) => {
  const record = await serializeMutation(async () => {
    const apps = await readApps()
    const now = new Date()
    const next = {
      id: randomUUID(),
      date: req.body.date || now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      createdAt: now.toISOString(),
      archived: false,
      ...req.body,
    }
    next.id = next.id || randomUUID()
    apps.push(next)
    await writeApps(apps)
    return next
  })
  res.json({ application: record })
}))

app.patch('/api/applications/:id', asyncRoute(async (req, res) => {
  const record = await serializeMutation(async () => {
    const apps = await readApps()
    const idx = apps.findIndex(a => a.id === req.params.id)
    if (idx === -1) return null
    apps[idx] = { ...apps[idx], ...req.body, id: apps[idx].id }
    await writeApps(apps)
    return apps[idx]
  })
  if (!record) return res.status(404).json({ error: 'Not found' })
  res.json({ application: record })
}))

app.delete('/api/applications/:id', asyncRoute(async (req, res) => {
  const removed = await serializeMutation(async () => {
    const apps = await readApps()
    const next = apps.filter(a => a.id !== req.params.id)
    await writeApps(next)
    return apps.length - next.length
  })
  res.json({ ok: true, removed })
}))

// ─────────────────────────────── Config ──────────────────────────────────

app.get('/api/config', asyncRoute(async (_req, res) => {
  res.json(await readConfig())
}))

app.post('/api/config', asyncRoute(async (req, res) => {
  const next = await serializeMutation(async () => {
    const current = await readConfig()
    const updated = {
      ...current,
      ...req.body,
      fields: mergeFields(req.body.fields || current.fields),
      ai: { ...current.ai, ...(req.body.ai || {}) },
    }
    await writeConfig(updated)
    return updated
  })
  res.json(next)
}))

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
    return (d.content || []).find(b => b.type === 'text')?.text || ''
  }

  // OpenAI. ('openai-compatible' is the legacy value kept for older saved configs.)
  // The base URL is fixed to OpenAI's API — this is OpenAI-only by design.
  if (ai.provider === 'openai' || ai.provider === 'openai-compatible') {
    if (!ai.apiKey) throw new Error('An OpenAI API key is required. Add it in Settings → AI Extraction.')
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify({
        model: ai.model || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60000),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error?.message || `OpenAI error ${r.status}`)
    return d.choices?.[0]?.message?.content || ''
  }

  throw new Error('No AI provider configured')
}

// ── Structured extractors for ATS whose pages are JS-only (read their JSON API) ──
const titleCase = s => String(s || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const EMPLOYMENT = { FullTime: 'Full-time', PartTime: 'Part-time', Intern: 'Internship', Contract: 'Contract', Temporary: 'Temporary', Volunteer: 'Volunteer' }

// Ashby job pages render entirely client-side; the data lives in their public API.
async function tryAshby(url) {
  const m = String(url).match(/jobs\.ashbyhq\.com\/([^/?#]+)\/([0-9a-f-]{36})/i)
  if (!m) return null
  const [, token, jobId] = m
  try {
    const r = await fetch(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=true`, { signal: AbortSignal.timeout(12000) })
    if (!r.ok) return null
    const job = ((await r.json()).jobs || []).find(j => j.id === jobId)
    if (!job) return null
    const comp = job.compensation || {}
    return {
      company: titleCase(token),
      position: job.title || '',
      location: job.location || (job.isRemote ? 'Remote' : ''),
      salary: comp.scrapeableCompensationSalarySummary || comp.compensationTierSummary || '',
      employmentType: EMPLOYMENT[job.employmentType] || job.employmentType || '',
      contactName: '',
      contactEmail: '',
    }
  } catch { return null }
}

// Find a "$X – $Y" salary range in free text (fallback when structured pay is absent).
function findSalary(text) {
  const m = String(text || '').match(/\$\s?\d[\d,]*(?:\.\d+)?\s?[kK]?\s?(?:-|–|—|to)\s?\$?\s?\d[\d,]*(?:\.\d+)?\s?[kK]?/)
  return m ? m[0].replace(/\s+/g, ' ').trim() : ''
}
function fmtGhPay(ranges) {
  try {
    const r = (ranges || [])[0]
    if (r && typeof r.min_cents === 'number' && typeof r.max_cents === 'number') {
      const k = c => '$' + Math.round(c / 100000) + 'K'
      return `${k(r.min_cents)} – ${k(r.max_cents)}`
    }
  } catch { /* ignore */ }
  return ''
}

// Greenhouse direct board links — read the boards API for clean structured data.
async function tryGreenhouse(url) {
  const m = String(url).match(/(?:job-boards|boards)\.greenhouse\.io\/([^/?#]+)\/jobs\/(\d+)/i)
  if (!m) return null
  const [, token, jobId] = m
  try {
    const r = await fetch(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs/${jobId}?pay_transparency=true`, { signal: AbortSignal.timeout(12000) })
    if (!r.ok) return null
    const job = await r.json()
    const meta = job.metadata || []
    const metaVal = re => { const e = meta.find(x => re.test(String(x.name || ''))); return e && typeof e.value === 'string' ? e.value : '' }
    const empType = metaVal(/employment|job\s*type|work\s*type/i)
    return {
      company: job.company_name || titleCase(token),
      position: job.title || '',
      location: job.location?.name || '',
      salary: fmtGhPay(job.pay_input_ranges) || findSalary(job.content) || metaVal(/salary|compensation|pay/i) || '',
      employmentType: EMPLOYMENT[empType] || empType || '',
      contactName: '',
      contactEmail: '',
    }
  } catch { return null }
}

// Lever (jobs.lever.co/{token}/{id}) — read the postings API.
async function tryLever(url) {
  const m = String(url).match(/jobs\.lever\.co\/([^/?#]+)\/([0-9a-f-]{36})/i)
  if (!m) return null
  const [, token, jobId] = m
  try {
    const r = await fetch(`https://api.lever.co/v0/postings/${encodeURIComponent(token)}/${jobId}`, { signal: AbortSignal.timeout(12000) })
    if (!r.ok) return null
    const job = await r.json()
    const cat = job.categories || {}
    const sr = job.salaryRange
    let salary = ''
    if (sr && (sr.min || sr.max)) {
      const cur = sr.currency === 'USD' ? '$' : (sr.currency ? sr.currency + ' ' : '$')
      salary = `${cur}${Number(sr.min || 0).toLocaleString()} – ${cur}${Number(sr.max || 0).toLocaleString()}`
    }
    if (!salary) salary = findSalary(job.descriptionPlain || job.description)
    return {
      company: titleCase(token),
      position: job.text || '',
      location: cat.location || '',
      salary,
      employmentType: EMPLOYMENT[cat.commitment] || cat.commitment || '',
      contactName: '',
      contactEmail: '',
    }
  } catch { return null }
}

// SmartRecruiters (jobs/careers.smartrecruiters.com/{company}/{postingId}) — public postings API.
async function trySmartRecruiters(url) {
  const m = String(url).match(/smartrecruiters\.com\/([^/?#]+)\/(\d+)/i)
  if (!m) return null
  const [, token, postingId] = m
  try {
    const r = await fetch(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings/${postingId}`, { signal: AbortSignal.timeout(12000) })
    if (!r.ok) return null
    const job = await r.json()
    const loc = job.location || {}
    const locParts = [loc.city, loc.region].filter(Boolean)
    if (loc.remote && !locParts.some(p => /remote/i.test(p))) locParts.push('Remote')
    // SmartRecruiters has no structured pay field — scan the ad text as a fallback.
    const secs = (job.jobAd && job.jobAd.sections) || {}
    const adText = Object.values(secs).map(s => (s && s.text) || '').join(' ').replace(/<[^>]+>/g, ' ')
    return {
      company: (job.company && job.company.name) || titleCase(token),
      position: job.name || '',
      location: locParts.join(', '),
      salary: findSalary(adText),
      employmentType: (job.typeOfEmployment && job.typeOfEmployment.label) || '',
      contactName: '',
      contactEmail: '',
    }
  } catch { return null }
}

// Workable (apply.workable.com/{account}/j/{shortcode}) — public postings API.
// The bare apply.workable.com/j/{code} form carries no account, so it can't hit
// the API and falls through to the AI path instead.
const WORKABLE_TYPE = { full: 'Full-time', part: 'Part-time', contract: 'Contract', temporary: 'Temporary', internship: 'Internship', trainee: 'Trainee' }
async function tryWorkable(url) {
  const m = String(url).match(/apply\.workable\.com\/([^/?#]+)\/j\/([0-9a-f]{6,})/i)
  if (!m) return null
  const [, account, shortcode] = m
  try {
    const r = await fetch(`https://apply.workable.com/api/v2/accounts/${encodeURIComponent(account)}/jobs/${shortcode.toUpperCase()}`, { signal: AbortSignal.timeout(12000) })
    if (!r.ok) return null
    const job = await r.json()
    const loc = job.location || {}
    const locParts = [loc.city, loc.region].filter(Boolean)
    const remote = job.remote || /remote/i.test(job.workplace || '')
    if (remote && !locParts.some(p => /remote/i.test(p))) locParts.push('Remote')
    const text = [job.description, job.requirements, job.benefits].join(' ').replace(/<[^>]+>/g, ' ')
    return {
      company: titleCase(account),
      position: job.title || '',
      location: locParts.join(', '),
      salary: findSalary(text),
      employmentType: WORKABLE_TYPE[String(job.type || '').toLowerCase()] || titleCase(job.type || ''),
      contactName: '',
      contactEmail: '',
    }
  } catch { return null }
}

// Workday ({tenant}.{dc}.myworkdayjobs.com/[lang/]{site}/details/{path}) — the CXS API.
// The host is per-tenant and the tenant name appears twice in the API path, so both
// have to be parsed back out of the incoming URL. The browser's /details/ becomes /job/.
const WORKDAY_TIME = { 'full time': 'Full-time', 'part time': 'Part-time', contract: 'Contract', temporary: 'Temporary' }
async function tryWorkday(url) {
  const m = String(url).match(/(https?:\/\/([^./]+)\.[^/]*\.myworkdayjobs\.com)\/(?:[a-z]{2}-[A-Z]{2}\/)?([^/]+)\/(?:details|job)\/(.+)$/i)
  if (!m) return null
  const [, host, tenant, site, rawPath] = m
  const jobPath = rawPath.split(/[?#]/)[0].replace(/\/+$/, '')
  try {
    const r = await fetch(`${host}/wday/cxs/${tenant}/${encodeURIComponent(site)}/job/${jobPath}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(12000),
    })
    if (!r.ok) return null
    const j = (await r.json()).jobPostingInfo
    if (!j) return null
    const desc = String(j.jobDescription || '').replace(/<[^>]+>/g, ' ')
    return {
      company: titleCase(tenant),
      position: j.title || '',
      location: j.location || '',
      salary: findSalary(desc),
      employmentType: WORKDAY_TIME[String(j.timeType || '').toLowerCase()] || j.timeType || '',
      contactName: '',
      contactEmail: '',
    }
  } catch { return null }
}

app.post('/api/extract', asyncRoute(async (req, res) => {
  const { url } = req.body || {}
  if (!url) return res.status(400).json({ error: 'A job URL is required.' })

  // Structured extractors first — these work even with no AI provider configured.
  const structured =
    (await tryAshby(url)) ||
    (await tryGreenhouse(url)) ||
    (await tryLever(url)) ||
    (await trySmartRecruiters(url)) ||
    (await tryWorkable(url)) ||
    (await tryWorkday(url))
  if (structured) return res.json(structured)

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
    const jsOnly = lower.includes('enable javascript') || lower.includes('you need to enable')
    const blocked =
      jsOnly ||
      lower.includes('join linkedin') ||
      lower.includes('authwall') ||
      lower.includes('please enable cookies') ||
      lower.includes('access denied') ||
      lower.includes('verify you are human') ||
      pageText.length < 200
    if (blocked) {
      return res.status(422).json({
        error: jsOnly
          ? "This page loads its details with JavaScript, so there's nothing for the app to read from the link. Try the direct job-board posting (e.g. a Greenhouse or Lever link), or fill the fields in manually."
          : 'This site blocks automated access (common for LinkedIn, Indeed, Glassdoor). Please fill in the fields manually. Direct Greenhouse or Lever links usually work.',
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
}))

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
  // Only pin a tab if the link carries a gid (the browser address-bar link does;
  // the Share button's link does not). Without one, Google exports the first tab.
  const gidMatch = String(url).match(/[#&?]gid=([0-9]+)/)
  const gid = gidMatch ? gidMatch[1] : null
  const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ''}`

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
  if (rows.length < 2) {
    throw {
      status: 422,
      message: gid
        ? 'That tab has no data rows.'
        : "That tab looks empty. If your applications are on a different tab, open that tab in Google Sheets and copy the link from your browser's address bar (it includes the tab) — the Share button's link only points to the first tab.",
    }
  }
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
    const result = await serializeMutation(async () => {
      const cfg = await readConfig()
      const map = Array.isArray(mapping) ? mapping : headers.map(h => guessField(h, cfg.fields) || '__ignore__')
      const targets = []
      let fieldsChanged = false

      headers.forEach((h, i) => {
        const target = map[i]
        if (target === '__new__') {
          const label = String(h || '').trim() || `Field ${i + 1}`
          const reserved = ['id', 'createdat', 'archived']
          let key = slugKey(label) || `field_${i}`
          if (reserved.includes(key) || cfg.fields.some(f => f.key === key)) key = `${key}_${i}`
          cfg.fields.push({ key, label, type: 'text', enabled: true, table: true, custom: true })
          fieldsChanged = true
          targets[i] = key
        } else if (!target || target === '__ignore__') {
          targets[i] = null
        } else {
          targets[i] = cfg.fields.some(f => f.key === target) ? target : null
        }
      })

      const statusOptions = cfg.fields.find(f => f.key === 'status')?.options || []
      const defaultStatus = statusOptions.includes('Applied') ? 'Applied' : (statusOptions[0] || 'Applied')
      const now = new Date()
      const imported = rows.map(row => {
        const record = { id: randomUUID(), createdAt: now.toISOString(), archived: false }
        let any = false
        targets.forEach((key, i) => {
          if (key && row[i] != null && String(row[i]).trim() !== '') {
            record[key] = String(row[i]).trim()
            any = true
          }
        })
        if (!record.date) record.date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        if (cfg.fields.some(f => f.key === 'status') && !record.status) record.status = defaultStatus
        return any ? record : null
      }).filter(Boolean)

      if (imported.length === 0) throw { status: 422, message: 'No rows to import — check your column mapping.' }
      const apps = await readApps()
      if (fieldsChanged) await writeConfig(cfg)
      await writeApps([...apps, ...imported])
      return { imported: imported.length, fieldsAdded: fieldsChanged }
    })
    res.json(result)
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

app.use('/api', (err, _req, res, next) => {
  if (res.headersSent) return next(err)
  console.error(err)
  res.status(500).json({ error: 'Could not read or save local data.' })
})

// ─────────────────────────── Static app + fallback ───────────────────────

if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR))
  app.get('*', (_req, res) => res.sendFile(join(DIST_DIR, 'index.html')))
} else {
  app.get('*', (_req, res) =>
    res.status(200).send('<h1>Queue</h1><p>The app has not been built yet. Run <code>npm start</code> (which builds then serves), or <code>npm run dev</code> for development.</p>'))
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
  console.log(`\n  🎯  Queue is running at  ${url}`)
  console.log(`      Your data is stored locally in  data/applications.json`)
  console.log(`      Press Ctrl+C to stop.\n`)
  openBrowser(url)
})
