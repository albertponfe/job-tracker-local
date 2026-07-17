export default function Header({ onAdd, onOpenSettings }) {
  return (
    <header className="header">
      <div className="header-logo">
        <img src="/queue_logo.jpeg" alt="Queue" className="logo-img" onError={event => { event.currentTarget.hidden = true }} />
        <span className="logo-fallback">Queue</span>
        <span className="logo-tagline">Your job search, sorted.</span>
      </div>
      <div className="header-right">
        <button className="btn-tool" onClick={() => onOpenSettings('fields')} title="Choose which fields show in the table">
          Fields
        </button>
        <button className="btn-tool" onClick={() => onOpenSettings('data')} title="Import from a Google Sheet · Export">
          Import
        </button>
        <button className="btn-tool" onClick={() => onOpenSettings('ai')} title="Set up AI auto-fill for the Extract button">
          <span className="btn-tool-icon" aria-hidden="true">✦</span> AI
        </button>
        <button className="btn-add" onClick={onAdd}><span className="btn-add-icon" aria-hidden="true">+</span> Add application</button>
      </div>
    </header>
  )
}
