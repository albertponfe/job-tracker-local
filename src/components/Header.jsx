function ThemeIcon({ name }) {
  return name === 'sun'
    ? <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>
    : <svg viewBox="0 0 24 24"><path d="M20 15.2A8.2 8.2 0 0 1 8.8 4a8.2 8.2 0 1 0 11.2 11.2Z"/></svg>
}

export default function Header({ onAdd, onOpenSettings, theme, onToggleTheme }) {
  return (
    <header className="header">
      <div className="header-logo">
        <img src="/queue_logo.jpeg" alt="Queue" className="logo-img" onError={event => { event.currentTarget.hidden = true }} />
        <span className="logo-fallback">Queue</span>
        <span className="logo-tagline">Your job search, sorted.</span>
      </div>
      <div className="header-right">
        <button className="btn-tool" onClick={() => onOpenSettings('fields')} title="Choose which fields show in the table">
          <span className="btn-tool-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z" /></svg></span> Fields
        </button>
        <button className="btn-tool" onClick={() => onOpenSettings('data')} title="Import from a Google Sheet · Export">
          <span className="btn-tool-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M10 13V3m0 0 4 4m-4-4L6 7M4 11v6h12v-6" /></svg></span> Import
        </button>
        <button className="btn-tool" onClick={() => onOpenSettings('ai')} title="Set up AI auto-fill for the Extract button">
          <span className="btn-tool-icon" aria-hidden="true">✦</span> AI
        </button>
        <button className="btn-theme" onClick={onToggleTheme} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          <span className={`theme-icon${theme === 'light' ? ' theme-icon--active' : ''}`} aria-hidden="true"><ThemeIcon name="sun" /></span>
          <span className={`theme-icon${theme === 'dark' ? ' theme-icon--active' : ''}`} aria-hidden="true"><ThemeIcon name="moon" /></span>
        </button>
        <button className="btn-add" onClick={onAdd}>
          <span className="btn-add-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M10 3v14M3 10h14" /></svg></span>
          <span className="btn-add-label">Add application</span>
        </button>
      </div>
    </header>
  )
}
