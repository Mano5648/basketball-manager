import { useEffect } from 'react'
import { initSmoothScroll } from '@/lib/smoothScroll'

/** Lenis smooth scroll for public marketing pages. Respects prefers-reduced-motion. */
export function useSmoothScroll(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    return initSmoothScroll()
  }, [enabled])
}
