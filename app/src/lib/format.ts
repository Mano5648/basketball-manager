import { sb } from './db'

export function money(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format((cents ?? 0) / 100)
}

export function fmtDate(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IE', opts)
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}`
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`
  return fmtDate(iso)
}

/** datetime-local input value (local time) from ISO */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

/** Uploads an image to the public `club-media` bucket and returns its URL. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await sb().storage.from('club-media').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw error
  return sb().storage.from('club-media').getPublicUrl(path).data.publicUrl
}
