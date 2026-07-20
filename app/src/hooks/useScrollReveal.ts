import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-triggered reveal using transitions.dev motion tokens
 * (stagger distance, blur, ease-smooth-out).
 */
export function useScrollReveal(threshold = 0.12, rootMargin = '0px 0px -8% 0px') {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.unobserve(el)
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return { ref, visible }
}
