import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { fetchSettings, listAll, sb, type Child, type ClubSettings, type FeatureKey, type Team } from './db'
import { useLiveQuery } from './useLiveQuery'

interface ClubContextValue {
  settings: ClubSettings | null
  teams: Team[]
  myTeamIds: string[]
  children: Child[]
  isFeatureOn: (k: FeatureKey) => boolean
  refresh: () => Promise<void>
}

const ClubContext = createContext<ClubContextValue | null>(null)

const DEFAULT_FEATURES: Record<FeatureKey, boolean> = { news: true, events: true, fixtures: true, shop: true, membership: true, lotto: true, booking: true, sponsors: true }

export function ClubProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const q = useLiveQuery(async () => {
    const [settings, teams, kids, myTeams] = await Promise.all([
      fetchSettings(),
      listAll<Team>('teams', 'sort_order', true),
      user ? listAll<Child>('children', 'created_at', true, (x) => x.eq('parent_id', user.id)) : Promise.resolve([] as Child[]),
      user ? sb().rpc('my_team_ids') : Promise.resolve({ data: [] as unknown }),
    ])
    const ids = ((myTeams as { data: unknown }).data as ({ my_team_ids: string } | string)[] | null) ?? []
    return { settings, teams, kids, myTeamIds: ids.map((r) => (typeof r === 'string' ? r : r.my_team_ids)) }
  }, ['club_settings', 'teams', 'children', 'team_members'], [user?.id])

  const value = useMemo<ClubContextValue>(() => ({
    settings: q.data?.settings ?? null,
    teams: q.data?.teams ?? [],
    myTeamIds: q.data?.myTeamIds ?? [],
    children: q.data?.kids ?? [],
    isFeatureOn: (k) => (q.data?.settings?.features ?? DEFAULT_FEATURES)[k] !== false,
    refresh: q.refresh,
  }), [q.data, q.refresh])

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>
}

export function useClub(): ClubContextValue {
  const ctx = useContext(ClubContext)
  if (!ctx) throw new Error('useClub must be used within ClubProvider')
  return ctx
}
