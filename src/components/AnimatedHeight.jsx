import { useLayoutEffect, useRef, useState } from 'react'

export default function AnimatedHeight({ children, className = '' }) {
  const contentRef = useRef(null)
  const [height, setHeight] = useState(null)

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    let cancelled = false
    const measure = () => { if (!cancelled) setHeight(content.scrollHeight) }
    measure()
    const frame = requestAnimationFrame(measure)
    const observer = new ResizeObserver(measure)
    observer.observe(content)
    document.fonts?.ready.then(measure)
    addEventListener('resize', measure)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      removeEventListener('resize', measure)
    }
  }, [])

  return (
    <div className={`animated-height ${className}`} style={height === null ? undefined : { height }}>
      <div ref={contentRef}>{children}</div>
    </div>
  )
}
