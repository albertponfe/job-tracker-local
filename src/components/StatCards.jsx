const CARD_ACCENT = {
  Total:     '#818cf8',
  'To Apply': '#22d3ee',
  Applied:   '#818cf8',
  Interview: '#fbbf24',
  Offer:     '#34d399',
  Rejected:  '#f87171',
  Ghosted:   '#9ca3af',
  Withdrawn: '#9ca3af',
}

export default function StatCards({ applications, statusOptions, filter, onSelect }) {
  const counts = {}
  for (const s of statusOptions) counts[s] = 0
  for (const a of applications) if (a.status in counts) counts[a.status]++

  const cards = [
    { label: 'Total', value: applications.length, key: null },
    ...statusOptions.map(s => ({ label: s, value: counts[s], key: s })),
  ]

  return (
    <div className="stat-cards">
      {cards.map(c => {
        const accent = CARD_ACCENT[c.label] || '#818cf8'
        const active = filter === c.key || (c.key === null && filter === null)
        return (
          <button
            key={c.label}
            className={`stat-card${active ? ' stat-card--active' : ''}`}
            style={{ '--card-accent': accent }}
            onClick={() => onSelect(c.key)}
          >
            <span className="stat-bar" />
            <span className="stat-num">{c.value}</span>
            <span className="stat-label">{c.label}</span>
          </button>
        )
      })}
    </div>
  )
}
