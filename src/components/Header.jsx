export default function Header({ onAdd, onSettings }) {
  return (
    <header className="header">
      <div className="header-logo">
        <span className="logo-mark">📋</span>
        <span className="logo-text">Job Tracker</span>
      </div>
      <div className="header-right">
        <button className="btn-icon" onClick={onSettings} title="Settings">⚙</button>
        <button className="btn-add" onClick={onAdd}>+ Add Application</button>
      </div>
    </header>
  )
}
