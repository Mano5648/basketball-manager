import { createContext, useContext, useEffect, useMemo, useCallback, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, isManagerEmail } from './supabase'
import { upsertPlayerFromAuth, getRosterDisplayForEmail, isMembershipPaidForCurrentMonth, isMemberAccessRevoked, isPlayerAccountActive } from './clubData'
import { getPasswordResetRedirectUrl } from './imageUrl'

export type Role = 'manager' | 'player'

export interface PlayerProfile {
  name: string
}

// Compact shape mirrored into localStorage['dlbc_user'] so the rest of the app
// (Navbar, dashboards) keeps reading auth state exactly as before.
interface MirroredUser {
  role: Role
  email: string
  name: string
  id?: number
  team?: string
  position?: string
  jersey?: number
  membershipStatus?: 'paid' | 'pending' | 'overdue'
  paymentPlan?: 'monthly' | 'full' | 'per-session' | null
  phone?: string
  emergencyContact?: string
  jerseySize?: string
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  role: Role | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: Role | null }>
  signUp: (
    email: string,
    password: string,
    profile: PlayerProfile,
  ) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function roleForUser(user: User | null): Role | null {
  if (!user) return null
  if (isManagerEmail(user.email)) return 'manager'
  return 'player'
}

// Derive a stable numeric id from the Supabase user id so the player dashboard
// (which keys records by a numeric id) has something consistent to match on.
function stableNumericId(uuid: string): number {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash * 31 + uuid.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function clearLocalAuth() {
  localStorage.removeItem('dlbc_user')
  window.dispatchEvent(new Event('dlbc-auth-change'))
  window.dispatchEvent(new Event('dlbc-cart-change'))
}

function mirrorUser(user: User | null, role: Role | null) {
  if (!user || !role) {
    localStorage.removeItem('dlbc_user')
    window.dispatchEvent(new Event('dlbc-auth-change'))
    return
  }
  const meta = user.user_metadata ?? {}
  let mirrored: MirroredUser
  if (role === 'manager') {
    mirrored = { role: 'manager', email: user.email ?? '', name: (meta.name as string) || 'Club Manager' }
  } else {
    const id = typeof meta.playerId === 'number' ? meta.playerId : stableNumericId(user.id)
    const email = user.email ?? ''
    const roster = getRosterDisplayForEmail(email)
    const monthlyPaid = isMembershipPaidForCurrentMonth(email)
    mirrored = {
      role: 'player',
      id,
      email,
      name: (meta.name as string) || email || 'Player',
      team: roster.teamName,
      position: roster.position,
      jersey: roster.jersey,
      membershipStatus: monthlyPaid ? 'paid' : 'pending',
      paymentPlan: (meta.paymentPlan as MirroredUser['paymentPlan']) ?? null,
      phone: meta.phone as string | undefined,
      emergencyContact: meta.emergencyContact as string | undefined,
      jerseySize: meta.jerseySize as string | undefined,
    }
  }
  localStorage.setItem('dlbc_user', JSON.stringify(mirrored))
  window.dispatchEvent(new Event('dlbc-auth-change'))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const forceSignOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    clearLocalAuth()
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      mirrorUser(data.session?.user ?? null, roleForUser(data.session?.user ?? null))
      window.dispatchEvent(new Event('dlbc-cart-change'))
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setUser(newSession?.user ?? null)
      mirrorUser(newSession?.user ?? null, roleForUser(newSession?.user ?? null))
      window.dispatchEvent(new Event('dlbc-cart-change'))
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  // Log out players removed from the roster (or deleted from Supabase Auth).
  useEffect(() => {
    if (!supabase || !user) return
    const role = roleForUser(user)

    // Only sign out on definitive auth failures. Transient network errors
    // (offline, DNS blip, CORS preflight failure, 5xx) previously caused
    // random logouts while the user was executing a task.
    const isDefinitiveAuthError = (err: unknown): boolean => {
      if (!err || typeof err !== 'object') return false
      const anyErr = err as { name?: string; status?: number; message?: string }
      if (anyErr.name === 'AuthSessionMissingError') return true
      if (anyErr.status === 401 || anyErr.status === 403) return true
      const msg = (anyErr.message ?? '').toLowerCase()
      if (msg.includes('session') && msg.includes('missing')) return true
      if (msg.includes('invalid') && (msg.includes('jwt') || msg.includes('token'))) return true
      if (msg.includes('user not found')) return true
      return false
    }

    const validate = async () => {
      try {
        const { error } = await supabase!.auth.getUser()
        if (error && isDefinitiveAuthError(error)) {
          await forceSignOut()
          return
        }
        // Network/transient error: keep the session, try again later.
        if (error) return
      } catch {
        // Fetch threw (offline etc.) — do NOT log the user out.
        return
      }
      if (role === 'player' && !isPlayerAccountActive(user.email)) {
        await forceSignOut()
      }
    }

    void validate()
    // Debounce so a burst of storage events from a single task doesn't
    // fire multiple network validations (which also caused stutter).
    let debounceTimer: number | null = null
    const scheduleValidate = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null
        void validate()
      }, 1500)
    }
    const onDataChange = (e: StorageEvent) => {
      // Only react to the roster/revocation lists — other dlbc_* writes
      // (players' UI state, chat, images…) must not trigger auth checks.
      if (e.key === 'dlbc_players' || e.key === 'dlbc_revoked_member_emails') {
        scheduleValidate()
      }
    }
    window.addEventListener('storage', onDataChange)
    // Periodic revalidation kept, but at a calmer cadence.
    const interval = window.setInterval(() => void validate(), 60_000)
    return () => {
      window.removeEventListener('storage', onDataChange)
      window.clearInterval(interval)
      if (debounceTimer !== null) window.clearTimeout(debounceTimer)
    }
  }, [user?.id, user?.email, forceSignOut])

  const value = useMemo<AuthContextValue>(() => {
    const role = roleForUser(user)
    return {
      user,
      session,
      role,
      loading,
      configured: isSupabaseConfigured,
      async signIn(email, password) {
        if (!supabase) return { error: 'Authentication is not configured.', role: null }
        if (isMemberAccessRevoked(email)) {
          return { error: 'Your account was removed from the club. Please contact your manager.', role: null }
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { error: error.message, role: null }
        const signedInUser = data.user
        if (signedInUser?.email) {
          const signedInRole = roleForUser(signedInUser)
          if (signedInRole !== 'manager') {
            const meta = signedInUser.user_metadata ?? {}
            const linked = upsertPlayerFromAuth({
              email: signedInUser.email,
              name: (meta.name as string) || signedInUser.email,
            })
            if (!linked) {
              await forceSignOut()
              return { error: 'Your account was removed from the club. Please contact your manager.', role: null }
            }
          }
        }
        return { error: null, role: roleForUser(signedInUser) }
      },
      async signUp(email, password, profile) {
        if (!supabase) return { error: 'Authentication is not configured.', needsConfirmation: false }
        if (isMemberAccessRevoked(email)) {
          return { error: 'This email was removed from the club. Please contact your manager to re-register.', needsConfirmation: false }
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: 'player',
              name: profile.name,
              playerId: Date.now(),
              paymentPlan: null,
            },
          },
        })
        if (error) return { error: error.message, needsConfirmation: false }
        if (isManagerEmail(email)) {
          return {
            error: 'Manager accounts are created by the club. Use the manager sign-in page instead.',
            needsConfirmation: false,
          }
        }
        const linked = upsertPlayerFromAuth({
          email,
          name: profile.name,
        })
        if (!linked) {
          await forceSignOut()
          return { error: 'This email was removed from the club. Please contact your manager to re-register.', needsConfirmation: false }
        }
        // When email confirmation is enabled, Supabase returns a user with no session.
        const needsConfirmation = !data.session
        return { error: null, needsConfirmation }
      },
      async signOut() {
        await forceSignOut()
        localStorage.removeItem('dlbc_remember_email')
      },
      async resetPassword(email) {
        if (!supabase) return { error: 'Authentication is not configured.' }
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: getPasswordResetRedirectUrl(),
        })
        return { error: error?.message ?? null }
      },
    }
  }, [user, session, loading, forceSignOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
