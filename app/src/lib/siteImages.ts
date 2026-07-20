import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// Shared site-image storage.
//
// Manager uploads go to a PUBLIC Supabase Storage bucket ("site-images") and the
// key -> public-URL mapping is persisted in a "site_images" table. Because both
// live server-side, every visitor on any device sees the same images.
//
// localStorage ("dlbc_images") is kept as a fast, offline cache so pages paint
// instantly before the network fetch resolves, and so the app still works when
// Supabase is not configured.

export const SITE_IMAGES_BUCKET = 'site-images'
const CACHE_KEY = 'dlbc_images'
const UPDATED_EVENT = 'dlbc-images-updated'

export type ImageRecord = Record<string, string>

function readCache(): ImageRecord {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as ImageRecord) : {}
  } catch {
    return {}
  }
}

function writeCache(map: ImageRecord) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map))
  } catch {
    /* quota / privacy mode — ignore */
  }
  window.dispatchEvent(new Event(UPDATED_EVENT))
}

/** Merge a partial update into the cached map and notify listeners. */
export function patchCache(patch: ImageRecord) {
  writeCache({ ...readCache(), ...patch })
}

/** Remove a key from the cached map (falls back to bundled default). */
export function removeFromCache(key: string) {
  const next = readCache()
  delete next[key]
  writeCache(next)
}

let fetchOnce: Promise<ImageRecord> | null = null

/**
 * Load the shared image map from Supabase and refresh the local cache.
 * De-duplicated so many hook instances trigger only a single network call.
 */
export function fetchSiteImages(force = false): Promise<ImageRecord> {
  if (!isSupabaseConfigured || !supabase) return Promise.resolve(readCache())
  if (fetchOnce && !force) return fetchOnce
  fetchOnce = (async () => {
    try {
      const { data, error } = await supabase!.from('site_images').select('key, url')
      if (error || !data) return readCache()
      const map: ImageRecord = {}
      for (const row of data as { key: string; url: string }[]) {
        if (row.key && row.url) map[row.key] = row.url
      }
      // Merge remote over local so a locally-set value never masks the shared one.
      writeCache({ ...readCache(), ...map })
      return map
    } catch {
      return readCache()
    }
  })()
  return fetchOnce
}

function fileExt(file: File): string {
  const fromName = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''
  if (fromName) return fromName
  const fromType = file.type.split('/')[1]
  return fromType || 'jpg'
}

/**
 * Upload an image file to Supabase Storage and persist its public URL.
 * Returns the public URL on success, or an error string.
 */
export async function uploadSiteImage(
  key: string,
  file: File,
): Promise<{ url?: string; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { error: 'not-configured' }
  }
  try {
    const path = `${key}/${Date.now()}.${fileExt(file)}`
    const { error: upErr } = await supabase.storage
      .from(SITE_IMAGES_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
    if (upErr) return { error: upErr.message }

    const { data: pub } = supabase.storage.from(SITE_IMAGES_BUCKET).getPublicUrl(path)
    const url = pub.publicUrl
    if (!url) return { error: 'Could not resolve public URL for the uploaded image.' }

    const { error: dbErr } = await supabase
      .from('site_images')
      .upsert({ key, url, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (dbErr) return { error: dbErr.message }

    patchCache({ [key]: url })
    return { url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Upload failed.' }
  }
}

/** Persist a manually-entered image URL for a key. */
export async function saveSiteImageUrl(key: string, url: string): Promise<{ error?: string }> {
  patchCache({ [key]: url })
  if (!isSupabaseConfigured || !supabase) return {}
  const { error } = await supabase
    .from('site_images')
    .upsert({ key, url, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  return error ? { error: error.message } : {}
}

/** Reset a key back to its bundled default (removes the override everywhere). */
export async function resetSiteImage(key: string): Promise<{ error?: string }> {
  removeFromCache(key)
  if (!isSupabaseConfigured || !supabase) return {}
  const { error } = await supabase.from('site_images').delete().eq('key', key)
  return error ? { error: error.message } : {}
}
