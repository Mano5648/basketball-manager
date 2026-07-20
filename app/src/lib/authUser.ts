export interface LoggedInContact {
  name: string
  email: string
  id?: string | number
  role?: 'manager' | 'player'
}

/** Reads the mirrored auth user from localStorage (set by AuthContext on login). */
export function getLoggedInContact(): LoggedInContact | null {
  try {
    const raw = localStorage.getItem('dlbc_user')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { name?: string; email?: string; id?: string | number; role?: string }
    if (!parsed.email?.trim() && !parsed.name?.trim()) return null
    return {
      name: parsed.name?.trim() || parsed.email?.trim() || '',
      email: parsed.email?.trim() || '',
      id: parsed.id,
      role: parsed.role === 'manager' || parsed.role === 'player' ? parsed.role : undefined,
    }
  } catch {
    return null
  }
}
