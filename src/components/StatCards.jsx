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
  const cardsRef = useRef(null)
  const [fadeRight, setFadeRight] = useState(false)
  const counts = {}
  for (const s of statusOptions) counts[s] = 0
  for (const a of applications) if (a.status in counts) counts[a.status]++

  const cards = [
    { label: 'Total', value: applications.length, key: null },
    ...statusOptions.map(s => ({ label: s, value: counts[s], key: s })),
  ]

  useEffect(() => {
    const el = cardsRef.current
    if (!el) return
    const updateFade = () => {
      const overflow = el.scrollWidth > el.clientWidth + 1
      setFadeRight(overflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
    }
    const observer = new ResizeObserver(updateFade)
    observer.observe(el)
    updateFade()
    return () => observer.disconnect()
  }, [cards.length])

  return (
    <div ref={cardsRef} className={`stat-cards${fadeRight ? ' stat-cards--fade' : ''}`} onScroll={() => {
      const el = cardsRef.current
      if (el) setFadeRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
    }}>
      {cards.map(c => {
        const accent = CARD_ACCENT[c.label] || '#818cf8'
        const active = filter === c.key || (c.key === null && filter === null)
        return (
          <button
            key={c.label}
            className={`stat-card${active ? ' stat-card--active' : ''}`}
            style={{ '--card-accent': accent }}
            aria-pressed={active}
            onClick={() => onSelect(c.key)}
          >
            <span className="stat-label">{c.label}</span>
            <span className="stat-num">{c.value}</span>
          </button>
        )
      })}
    </div>
  )
}
import { useEffect, useRef, useState } from 'react'
