import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { api } from './lib/api'
import Header from './components/Header'
import StatCards from './components/StatCards'
import AppTable from './components/AppTable'
import AddForm from './components/AddForm'
import SettingsModal from './components/SettingsModal'
import ConfirmDialog from './components/ConfirmDialog'

export default function App() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('queue-theme')
    return ['light', 'dark'].includes(saved) ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
  })
  const [config, setConfig] = useState(null)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editApp, setEditApp] = useState(null)
  const [settingsTab, setSettingsTab] = useState(null) // null = closed, else the tab to open
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [filter, setFilter] = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const errorTimer = useRef(null)
  const themeFrame = useRef(null)

  const flashError = useCallback((msg) => {
    setError(msg)
    clearTimeout(errorTimer.current)
    errorTimer.current = setTimeout(() => setError(null), 4500)
  }, [])

  useEffect(() => () => {
    clearTimeout(errorTimer.current)
    cancelAnimationFrame(themeFrame.current)
  }, [])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    localStorage.setItem('queue-theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    const root = document.documentElement
    root.dataset.themeChanging = ''
    setTheme(current => current === 'dark' ? 'light' : 'dark')
    cancelAnimationFrame(themeFrame.current)
    themeFrame.current = requestAnimationFrame(() => {
      themeFrame.current = requestAnimationFrame(() => root.removeAttribute('data-theme-changing'))
    })
  }, [])

  // silent = refresh data without flashing the full-screen loader (keeps modals mounted)
  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const [cfg, apps] = await Promise.all([api.getConfig(), api.getApplications()])
      setConfig(cfg)
      setApplications(apps.applications || [])
    } catch (err) {
      setError(err.message || 'Could not load your local data.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const closeTopmost = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (confirmTarget) setConfirmTarget(null)
      else if (settingsTab) setSettingsTab(null)
      else if (showForm || editApp) { setShowForm(false); setEditApp(null) }
    }
    document.addEventListener('keydown', closeTopmost)
    return () => document.removeEventListener('keydown', closeTopmost)
  }, [confirmTarget, settingsTab, showForm, editApp])

  const handleSaved = () => { setShowForm(false); setEditApp(null); load(true) }

  const handleStatusChange = async (id, status) => {
    setApplications(a => a.map(x => (x.id === id ? { ...x, status } : x)))
    try { await api.updateApplication(id, { status }) }
    catch { load(true); flashError('Could not update status.') }
  }

  const handleArchive = async (id, archived) => {
    setApplications(a => a.map(x => (x.id === id ? { ...x, archived } : x)))
    try { await api.updateApplication(id, { archived }) }
    catch { load(true); flashError('Could not archive.') }
  }

  const handleDelete = async (id) => {
    setApplications(a => a.filter(x => x.id !== id))
    try { await api.deleteApplication(id) }
    catch { load(true); flashError('Could not delete.') }
  }

  const handleConfigSaved = (cfg) => { setConfig(cfg); load(true) }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading…</p>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="loading-screen" role="alert">
        <p>{error || 'Could not load your local data.'}</p>
        <button className="empty-action" onClick={() => load()}>Try again</button>
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
        onOpenSettings={setSettingsTab}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <main className="main">
        {error && <div className="error-banner" role="alert">{error}</div>}

        {statusField && (
          <StatCards
            applications={activeApps}
            statusOptions={statusField.options || []}
            filter={filter}
            onSelect={setFilter}
          />
        )}

        <AppTable
          fields={config.fields}
          applications={visible}
          archivedApps={showArchived ? archivedApps : []}
          archivedCount={archivedApps.length}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived(v => !v)}
          filter={filter}
          onStatusChange={handleStatusChange}
          onEdit={setEditApp}
          onArchive={handleArchive}
          onDelete={setConfirmTarget}
          onAdd={() => setShowForm(true)}
          onClearFilter={() => setFilter(null)}
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

      {settingsTab && (
        <SettingsModal
          config={config}
          initialTab={settingsTab}
          onClose={() => setSettingsTab(null)}
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
