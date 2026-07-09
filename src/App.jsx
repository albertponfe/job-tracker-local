import { useState, useEffect, useCallback } from 'react'
import { api } from './lib/api'
import Header from './components/Header'
import StatCards from './components/StatCards'
import AppTable from './components/AppTable'
import AddForm from './components/AddForm'
import SettingsModal from './components/SettingsModal'
import ConfirmDialog from './components/ConfirmDialog'

export default function App() {
  const [config, setConfig] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editApp, setEditApp] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [filter, setFilter] = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  const flashError = useCallback((msg) => {
    setError(msg)
    setTimeout(() => setError(null), 4500)
  }, [])

  // silent = refresh data without flashing the full-screen loader (keeps modals mounted)
  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const [cfg, apps] = await Promise.all([api.getConfig(), api.getApplications()])
      setConfig(cfg)
      setApplications(apps.applications || [])
    } catch {
      setError('Could not reach the local server. Make sure it is running (npm start).')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSaved = () => { setShowForm(false); setEditApp(null); load(true) }

  const handleStatusChange = async (id, status) => {
    const prev = applications
    setApplications(a => a.map(x => (x.id === id ? { ...x, status } : x)))
    try { await api.updateApplication(id, { status }) }
    catch { setApplications(prev); flashError('Could not update status.') }
  }

  const handleArchive = async (id, archived) => {
    const prev = applications
    setApplications(a => a.map(x => (x.id === id ? { ...x, archived } : x)))
    try { await api.updateApplication(id, { archived }) }
    catch { setApplications(prev); flashError('Could not archive.') }
  }

  const handleDelete = async (id) => {
    const prev = applications
    setApplications(a => a.filter(x => x.id !== id))
    try { await api.deleteApplication(id) }
    catch { setApplications(prev); flashError('Could not delete.') }
  }

  const handleConfigSaved = (cfg) => { setConfig(cfg); load(true) }

  if (loading || !config) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    )
  }

  const statusField = config.fields.find(f => f.key === 'status' && f.enabled)
  const activeApps = applications.filter(a => !a.archived)
  const archivedApps = applications.filter(a => a.archived)
  const visible = (filter && statusField) ? activeApps.filter(a => a.status === filter) : activeApps

  return (
    <div className="app">
      <Header
        onAdd={() => setShowForm(true)}
        onSettings={() => setShowSettings(true)}
      />
      <main className="main">
        {error && <div className="error-banner">{error}</div>}

        {statusField && (
          <StatCards
            applications={activeApps}
            statusOptions={statusField.options || []}
            filter={filter}
            onSelect={setFilter}
          />
        )}

        <div className="table-toolbar">
          {filter && statusField && (
            <div className="filter-bar" style={{ flex: 1, marginBottom: 0 }}>
              <span>Showing <strong>{visible.length}</strong> {filter.toLowerCase()} application{visible.length !== 1 ? 's' : ''}</span>
              <button className="filter-clear" onClick={() => setFilter(null)}>✕ Clear filter</button>
            </div>
          )}
          {archivedApps.length > 0 && (
            <button
              className={`btn-archived-toggle${showArchived ? ' btn-archived-toggle--active' : ''}`}
              onClick={() => setShowArchived(v => !v)}
            >
              {showArchived ? '✕ Hide archived' : `📦 Archived (${archivedApps.length})`}
            </button>
          )}
        </div>

        <AppTable
          fields={config.fields}
          applications={visible}
          archivedApps={showArchived ? archivedApps : []}
          filter={filter}
          onStatusChange={handleStatusChange}
          onEdit={setEditApp}
          onArchive={handleArchive}
          onDelete={setConfirmTarget}
          onAdd={() => setShowForm(true)}
        />
      </main>

      {(showForm || editApp) && (
        <AddForm
          fields={config.fields}
          aiEnabled={config.ai?.provider && config.ai.provider !== 'none'}
          initialData={editApp}
          onClose={() => { setShowForm(false); setEditApp(null) }}
          onSaved={handleSaved}
          onError={flashError}
        />
      )}

      {showSettings && (
        <SettingsModal
          config={config}
          onClose={() => setShowSettings(false)}
          onSaved={handleConfigSaved}
          onError={flashError}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          app={confirmTarget}
          onArchive={() => { handleArchive(confirmTarget.id, true); setConfirmTarget(null) }}
          onDelete={() => { handleDelete(confirmTarget.id); setConfirmTarget(null) }}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  )
}
