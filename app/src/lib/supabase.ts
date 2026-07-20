import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Auth is only usable when both env vars are present. When they are missing
// (e.g. a fresh checkout with no .env.local) we expose `isSupabaseConfigured`
// so the UI can show a clear setup message instead of crashing.
export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

// Comma-separated allowlist of emails that should be treated as club managers.
// Only emails in VITE_MANAGER_EMAILS grant manager access — user_metadata.role
// is not trusted because clients can attempt to set it via updateUser.
const managerEmails = (import.meta.env.VITE_MANAGER_EMAILS as string | undefined ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isManagerEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return managerEmails.includes(email.toLowerCase())
}
