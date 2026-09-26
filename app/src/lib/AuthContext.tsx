import { createContext, useContext, useEffect, useMemo, useCallback, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured, isManagerEmail } from './supabase'
import type { MemberType, Profile } from './db'
import { registerPushForUser } from './native'
import { externalAppUrl } from './routing'

export type Role = 'manager' | 'member'

export interface SignUpInput {
  email: string
  password: string
  fullName: string
  phone?: string
  memberType: MemberType
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: Profile | null
  role: Role | null
  loading: boolean
  configured: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (input: SignUpInput) => Promise<{ error: string | null; needsConfirmation: boolean }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
}

const EMAIL_TAKEN = 'An account with this email already exists. Sign in instead, or use "Forgot password?" if you can\'t remember it.'

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfileAndRole(user: User): Promise<{ profile: Profile | null; role: Role }> {
  const [{ data: profile }, { data: mgr }] = await Promise.all([
    supabase!.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase!.from('managers').select('email').eq('email', (user.email ?? '').toLowerCase()).maybeSingle(),
  ])
  const role: Role = mgr || isManagerEmail(user.email) ? 'manager' : 'member'
  return { profile: (profile as Profile | null) ?? null, role }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  const hydrate = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null)
      setRole(null)
      return
    }
    try {
      const { profile: p, role: r } = await loadProfileAndRole(u)
      setProfile(p)
      setRole(r)
      void registerPushForUser(u.id)
    } catch {
      setRole(isManagerEmail(u.email) ? 'manager' : 'member')
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      await hydrate(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      const nextUser = newSession?.user ?? null
      setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser))
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        void hydrate(nextUser)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [hydrate])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    session,
    profile,
    role,
    loading,
    configured: isSupabaseConfigured,
    async signIn(email, password) {
      if (!supabase) return { error: 'Authentication is not configured.' }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      return { error: error?.message ?? null }
    },
    async signUp(input) {
      if (!supabase) return { error: 'Authentication is not configured.', needsConfirmation: false }
      const { data, error } = await supabase.auth.signUp({
        email: input.email.trim().toLowerCase(),
        password: input.password,
        options: {
          emailRedirectTo: externalAppUrl('/login'),
          data: { full_name: input.fullName.trim(), phone: input.phone?.trim() || null, member_type: input.memberType },
        },
      })
      if (error) {
        if (/already.*(registered|exists)/i.test(error.message)) return { error: EMAIL_TAKEN, needsConfirmation: false }
        return { error: /invalid/i.test(error.message) && /email/i.test(error.message) ? 'Please use a real, working email address.' : error.message, needsConfirmation: false }
      }
      // With email confirmation on, Supabase hides duplicate signups rather than
      // erroring: it returns a user with no identities instead.
      if (data.user && (data.user.identities?.length ?? 0) === 0) return { error: EMAIL_TAKEN, needsConfirmation: false }
      return { error: null, needsConfirmation: !data.session }
    },
    async signOut() {
      if (supabase) await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setProfile(null)
      setRole(null)
    },
    async resetPassword(email) {
      if (!supabase) return { error: 'Authentication is not configured.' }
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: externalAppUrl('/reset-password') })
      return { error: error?.message ?? null }
    },
    async refreshProfile() {
      if (user) await hydrate(user)
    },
  }), [user, session, profile, role, loading, hydrate])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
