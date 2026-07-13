export default function Header({ onAdd, onOpenSettings }) {
  return (
    <header className="header">
      <div className="header-logo">
        <img src="/queue_logo.jpeg" alt="Queue" className="logo-img" />
        <span className="logo-tagline">Your job search, sorted.</span>
      </div>
      <div className="header-right">
        <button className="btn-tool" onClick={() => onOpenSettings('fields')} title="Choose which fields show in the table">
          <span className="btn-tool-icon">▦</span><span className="btn-tool-label">Fields</span>
        </button>
        <button className="btn-tool" onClick={() => onOpenSettings('data')} title="Import from a Google Sheet · Export">
          <span className="btn-tool-icon">⬆</span><span className="btn-tool-label">Import</span>
        </button>
        <button className="btn-tool" onClick={() => onOpenSettings('ai')} title="Set up AI auto-fill for the Extract button">
          <span className="btn-tool-icon">✦</span><span className="btn-tool-label">AI</span>
        </button>
        <button className="btn-add" onClick={onAdd}>+ Add Application</button>
      </div>
    </header>
  )
}
