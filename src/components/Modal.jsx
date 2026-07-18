import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
const focusableIn = dialog => [...dialog.querySelectorAll(FOCUSABLE)].filter(element => element.getClientRects().length)

export default function Modal({ children, className = '', role = 'dialog', labelledBy, describedBy, onClose }) {
  const [closing, setClosing] = useState(false)
  const closingRef = useRef(false)
  const overlayRef = useRef(null)
  const dialogRef = useRef(null)
  const timeoutRef = useRef(null)
  const returnFocusRef = useRef(typeof document === 'undefined' ? null : document.activeElement)

  const close = useCallback((afterClose) => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const duration = reduced ? 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--quick')) || 150
    timeoutRef.current = setTimeout(() => {
      afterClose?.()
      onClose()
    }, duration)
  }, [onClose])

  useLayoutEffect(() => {
    const overlay = overlayRef.current
    const dialog = dialogRef.current
    if (!overlay || !dialog) return

    const body = document.body
    const previousOverflow = body.style.overflow
    const previousPadding = body.style.paddingRight
    const scrollbar = innerWidth - document.documentElement.clientWidth
    if (scrollbar > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`
    body.style.overflow = 'hidden'

    const siblings = [...overlay.parentElement.children]
      .filter(element => element !== overlay)
      .map(element => ({ element, inert: element.inert, ariaHidden: element.getAttribute('aria-hidden') }))
    for (const { element } of siblings) {
      element.inert = true
      element.setAttribute('aria-hidden', 'true')
    }

    const focusFirst = () => (dialog.querySelector('[autofocus]') || focusableIn(dialog)[0] || dialog).focus({ preventScroll: true })
    const frame = requestAnimationFrame(() => {
      if (!dialog.contains(document.activeElement)) focusFirst()
    })

    const keepFocusInside = event => {
      if (!closingRef.current && !dialog.contains(event.target)) focusFirst()
    }
    document.addEventListener('focusin', keepFocusInside)

    return () => {
      clearTimeout(timeoutRef.current)
      cancelAnimationFrame(frame)
      document.removeEventListener('focusin', keepFocusInside)
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPadding
      for (const { element, inert, ariaHidden } of siblings) {
        element.inert = inert
        if (ariaHidden === null) element.removeAttribute('aria-hidden')
        else element.setAttribute('aria-hidden', ariaHidden)
      }
      if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus({ preventScroll: true })
    }
  }, [])

  const onKeyDown = event => {
    if (event.defaultPrevented) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key !== 'Tab') return

    const items = focusableIn(dialogRef.current)
    if (!items.length) {
      event.preventDefault()
      dialogRef.current.focus()
    } else if (event.shiftKey && (document.activeElement === items[0] || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault()
      items.at(-1).focus()
    } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
      event.preventDefault()
      items[0].focus()
    }
  }

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      data-closing={closing || undefined}
      onClick={event => event.target === event.currentTarget && close()}
      onKeyDown={onKeyDown}
    >
      <div
        ref={dialogRef}
        className={`modal${className ? ` ${className}` : ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children(close)}
      </div>
    </div>
  )
}
