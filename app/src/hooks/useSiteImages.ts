import { useState, useEffect, useCallback } from 'react'
import { fetchSiteImages } from '@/lib/siteImages'

// Resolve a public-folder asset to a URL that includes Vite's base path.
// Works under both root (`/`) and subdir (`/basketball-manager/`) deployments.
export function asset(p: string): string {
  if (!p) return p
  // pass through data URIs / absolute URLs / blob URLs unchanged
  if (/^(data:|blob:|https?:)/i.test(p)) return p
  const base = import.meta.env.BASE_URL || '/'
  // Already base-prefixed — don't double up (e.g. "/basketball-manager/hero.jpg").
  if (p.startsWith(base)) return p
  const clean = p.startsWith('/') ? p.slice(1) : p
  return base.endsWith('/') ? base + clean : base + '/' + clean
}

// Default image paths (bundled in public/)
export const defaultImageMap: Record<string, { path: string; title: string; usedOn: string }> = {
  hero: { path: asset('hero-team-celebration.jpg'), title: 'Homepage Hero Background', usedOn: 'Landing page hero section' },
  about: { path: asset('about-team-huddle.jpg'), title: 'About the Club', usedOn: 'About section on homepage' },
  match1: { path: asset('match-action-1.jpg'), title: 'Gallery Photo 1', usedOn: 'Homepage gallery grid, position 1' },
  match2: { path: asset('match-action-2.jpg'), title: 'Gallery Photo 2', usedOn: 'Homepage gallery grid, position 2' },
  match3: { path: asset('match-action-3.jpg'), title: 'Gallery Photo 3', usedOn: 'Homepage gallery grid, position 3' },
  match4: { path: asset('match-action-4.jpg'), title: 'Gallery Photo 4', usedOn: 'Homepage gallery grid, position 4' },
  match5: { path: asset('match-action-5.jpg'), title: 'Gallery Photo 5', usedOn: 'Homepage gallery grid, position 5' },
  match6: { path: asset('match-action-6.jpg'), title: 'Gallery Photo 6', usedOn: 'Homepage gallery grid, position 6' },
  match7: { path: asset('match-action-7.jpg'), title: 'Gallery Photo 7', usedOn: 'Homepage gallery grid, position 7' },
  match8: { path: asset('match-action-8.jpg'), title: 'Gallery Photo 8', usedOn: 'Homepage gallery grid, position 8' },
  playerKevin: { path: asset('player-kevin-anyanwu.jpg'), title: "Men's Team: Kevin Anyanwu", usedOn: 'Teams page / Homepage men\'s squad' },
  playerTiago: { path: asset('player-tiago-pereira.jpg'), title: "Men's Team: Tiago Pereira", usedOn: 'Teams page / Homepage men\'s squad' },
  playerTara: { path: asset('player-tara-nevin.jpg'), title: "Women's Team: Tara Nevin", usedOn: 'Teams page / Homepage women\'s squad' },
  playerEmily: { path: asset('player-emily-smyth.jpg'), title: "Women's Team: Emily Smyth", usedOn: 'Teams page / Homepage women\'s squad' },
  coachRob: { path: asset('coach-rob-white.jpg'), title: "Head Coach: Rob White", usedOn: 'Teams page coach profile' },
  venue: { path: asset('venue-colaiste-bride.jpg'), title: 'Venue: Coláiste Bríde', usedOn: 'Contact page venue section' },
  logo: { path: asset('logo-lions-emblem.png'), title: 'Club Logo', usedOn: 'Navbar, Footer, Login pages, Dashboard sidebar' },
  sponsorJoels: { path: asset('sponsor-joels.png'), title: "Sponsor: Joel's", usedOn: "Men's team header, Teams page, Footer sponsors bar" },
  sponsorAbbey: { path: asset('sponsor-abbey-seals.png'), title: 'Sponsor: Abbey Seals', usedOn: "Women's team header, Teams page, Footer sponsors bar" },
}

// Helper: get current image URL for a key
export function getImageUrl(key: string): string {
  try {
    const saved = localStorage.getItem('dlbc_images')
    if (saved) {
      const map = JSON.parse(saved)
      if (map[key]) return asset(map[key])
    }
  } catch { /* ignore */ }
  return defaultImageMap[key]?.path || ''
}

// Hook: reactive image URLs
export function useSiteImages() {
  const [images, setImagesState] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('dlbc_images')
      if (saved) return JSON.parse(saved)
    } catch { /* ignore */ }
    return Object.fromEntries(Object.entries(defaultImageMap).map(([k, v]) => [k, v.path]))
  })

  // Listen for changes from other tabs or components
  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem('dlbc_images')
        if (saved) setImagesState(JSON.parse(saved))
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', handler)
    // Also listen for custom update event from same-tab changes
    window.addEventListener('dlbc-images-updated', handler)
    // Hydrate the shared image map from Supabase (deduped across hook instances).
    // fetchSiteImages writes to localStorage + dispatches the update event on success,
    // so the handler above applies the result — no extra setState needed here.
    fetchSiteImages().catch(() => { /* offline / not configured — cache stands */ })
    return () => {
      window.removeEventListener('storage', handler)
      window.removeEventListener('dlbc-images-updated', handler)
    }
  }, [])

  const setImages = useCallback((updater: (prev: Record<string, string>) => Record<string, string>) => {
    setImagesState(prev => {
      const next = updater(prev)
      localStorage.setItem('dlbc_images', JSON.stringify(next))
      // Notify other components in the same tab
      window.dispatchEvent(new Event('dlbc-images-updated'))
      return next
    })
  }, [])

  const setImage = useCallback((key: string, url: string) => {
    setImagesState(prev => {
      const next = { ...prev, [key]: url }
      localStorage.setItem('dlbc_images', JSON.stringify(next))
      window.dispatchEvent(new Event('dlbc-images-updated'))
      return next
    })
  }, [])

  return { images, setImages, setImage, getUrl: (key: string) => asset(images[key] || defaultImageMap[key]?.path || '') }
}

// Hook: single image URL
export function useSiteImage(key: string): string {
  const { getUrl } = useSiteImages()
  return getUrl(key)
}

// Editable text labels (e.g. player / coach names) are stored in the same
// shared map under a "label:" prefix, so they sync to every visitor exactly
// like images do. `key` here is the image key the label belongs to.
export const LABEL_PREFIX = 'label:'

// Hook: a manager-editable text label with a bundled fallback.
export function useSiteText(key: string, fallback: string): string {
  const { images } = useSiteImages()
  const v = images[`${LABEL_PREFIX}${key}`]
  return typeof v === 'string' && v.trim() ? v : fallback
}
