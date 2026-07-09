// Thin wrapper around the local server API. Everything is same-origin (localhost),
// so there are no keys or auth here — the app only talks to your own machine.

async function req(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  getConfig: () => req('/api/config'),
  saveConfig: (cfg) => req('/api/config', { method: 'POST', body: JSON.stringify(cfg) }),

  getApplications: () => req('/api/applications'),
  addApplication: (app) => req('/api/applications', { method: 'POST', body: JSON.stringify(app) }),
  updateApplication: (id, patch) => req(`/api/applications/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteApplication: (id) => req(`/api/applications/${id}`, { method: 'DELETE' }),

  extract: (url) => req('/api/extract', { method: 'POST', body: JSON.stringify({ url }) }),
  importGSheet: (url) => req('/api/import/gsheet', { method: 'POST', body: JSON.stringify({ url }) }),
}

// Fields the extractor knows how to fill (used to decide which of the user's
// enabled fields get auto-populated from the AI response).
export const EXTRACTABLE = ['company', 'position', 'location', 'salary', 'employmentType', 'contactName', 'contactEmail']
