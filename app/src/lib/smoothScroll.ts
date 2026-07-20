import Lenis from 'lenis'

let lenis: Lenis | null = null

export function getLenis() {
  return lenis
}

export function initSmoothScroll() {
  if (typeof window === 'undefined') return () => {}
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  const instance = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.05,
  })

  lenis = instance

  let rafId = 0
  const raf = (time: number) => {
    instance.raf(time)
    rafId = requestAnimationFrame(raf)
  }
  rafId = requestAnimationFrame(raf)

  return () => {
    cancelAnimationFrame(rafId)
    instance.destroy()
    if (lenis === instance) lenis = null
  }
}

export function scrollToAnchor(id: string, offset = 72) {
  const el = document.getElementById(id)
  if (!el) return

  if (lenis) {
    lenis.scrollTo(el, { offset: -offset, duration: 1.1 })
    return
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  if (offset) window.scrollBy({ top: -offset, behavior: 'smooth' })
}
