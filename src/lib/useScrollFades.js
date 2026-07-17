import { useEffect, useRef, useState } from 'react'

export function useScrollFades() {
  const ref = useRef(null)
  const [fades, setFades] = useState({ left: false, right: false })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      const next = { left: el.scrollLeft > 12, right: max - el.scrollLeft > 12 }
      setFades(current => current.left === next.left && current.right === next.right ? current : next)
    }
    const observer = new ResizeObserver(update)
    observer.observe(el)
    for (const child of el.children) observer.observe(child)
    el.addEventListener('scroll', update, { passive: true })
    update()
    return () => { observer.disconnect(); el.removeEventListener('scroll', update) }
  }, [])

  return [ref, fades]
}
