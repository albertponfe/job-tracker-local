import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

function optionOf(option, group) {
  return typeof option === 'string'
    ? { value: option, label: option, group }
    : { ...option, group: option.group || group }
}

function flatten(options) {
  return options.flatMap(option => option.options
    ? option.options.map(item => optionOf(item, option.label))
    : optionOf(option))
}

export default function Select({ id, value, options, onChange, ariaLabel, disabled = false, variant = 'field', style, optionStyle }) {
  const items = useMemo(() => flatten(options), [options])
  const selectedIndex = items.findIndex(item => item.value === value)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeIndex, setActiveIndex] = useState(Math.max(0, selectedIndex))
  const [menuStyle, setMenuStyle] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const optionRefs = useRef([])
  const closeTimer = useRef(null)
  const listboxId = useId()

  const positionMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const statusMenu = variant === 'status'
    const estimatedHeight = statusMenu ? Math.min(288, items.length * 40 + 8) : Math.min(280, items.length * 40 + 16)
    const above = innerHeight - rect.bottom < estimatedHeight + 12 && rect.top > estimatedHeight
    const width = Math.min(Math.max(rect.width, statusMenu ? 196 : 180), innerWidth - 16)
    const left = Math.min(Math.max(8, rect.left), innerWidth - width - 8)
    setMenuStyle({
      left,
      top: above ? Math.max(8, rect.top - estimatedHeight - 6) : rect.bottom + 6,
      width,
      transformOrigin: above ? 'bottom center' : 'top center',
      '--menu-offset': above ? '4px' : '-4px',
    })
  }

  const closeMenu = immediate => {
    if (!open || closing) return
    if (immediate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOpen(false)
      return
    }
    setClosing(true)
    closeTimer.current = setTimeout(() => { setOpen(false); setClosing(false) }, 120)
  }

  useLayoutEffect(() => {
    if (!open) return
    setActiveIndex(Math.max(0, selectedIndex))
    positionMenu()
  }, [open, selectedIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const closeOutside = event => {
      if (!triggerRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) closeMenu()
    }
    addEventListener('resize', positionMenu)
    addEventListener('scroll', positionMenu, true)
    document.addEventListener('pointerdown', closeOutside)
    return () => {
      removeEventListener('resize', positionMenu)
      removeEventListener('scroll', positionMenu, true)
      document.removeEventListener('pointerdown', closeOutside)
    }
  }, [open, closing]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open])

  const choose = index => {
    const item = items[index]
    if (!item || item.disabled) return
    onChange(item.value)
    closeMenu()
    triggerRef.current?.focus()
  }

  const move = direction => {
    let next = activeIndex
    do next = (next + direction + items.length) % items.length
    while (items[next]?.disabled && next !== activeIndex)
    setActiveIndex(next)
  }

  const onKeyDown = event => {
    if (disabled) return
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (!open) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      move(event.key === 'ArrowDown' ? 1 : -1)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : items.length - 1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(activeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu(true)
    } else if (event.key === 'Tab') {
      closeMenu(true)
    } else if (event.key.length === 1) {
      const match = items.findIndex(item => item.label.toLowerCase().startsWith(event.key.toLowerCase()))
      if (match >= 0) setActiveIndex(match)
    }
  }

  const selected = selectedIndex >= 0 ? items[selectedIndex] : null
  let previousGroup

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        className={`select-trigger select-trigger--${variant}`}
        style={style}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => open ? closeMenu() : setOpen(true)}
        onKeyDown={onKeyDown}
      >
        <span className="select-value">{selected?.label || value}</span>
        <svg className="select-chevron" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
      </button>

      {open && menuStyle && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          className={`select-menu${variant === 'status' ? ' select-menu--status' : ''}`}
          data-closing={closing || undefined}
          role="listbox"
          aria-label={ariaLabel}
          style={menuStyle}
        >
          {items.map((item, index) => {
            const showGroup = item.group && item.group !== previousGroup
            previousGroup = item.group
            return (
              <div key={`${item.group || ''}-${item.value}`} role="presentation">
                {showGroup && <div className="select-group">{item.group}</div>}
                <button
                  ref={node => { optionRefs.current[index] = node }}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={item.value === value}
                  className={`select-option${index === activeIndex ? ' select-option--active' : ''}`}
                  disabled={item.disabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => choose(index)}
                >
                  <span className={variant === 'status' ? 'select-option-badge' : ''} style={optionStyle?.(item.value)}>{item.label}</span>
                  <span className="select-check" aria-hidden="true">{item.value === value ? '✓' : ''}</span>
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </>
  )
}
