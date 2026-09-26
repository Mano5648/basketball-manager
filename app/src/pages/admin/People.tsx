import { useMemo, useState } from 'react'
import { Baby, Search, ShieldCheck, ShieldOff } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { listAll, sb, type Child, type Membership, type Profile, type Team, type TeamMember } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { fmtDate } from '@/lib/format'
import { AdminCrud, type FieldDef } from '@/components/AdminCrud'
import { Alert, Badge, Button, Card, Empty, Input, PageHeader, Select, Sheet, Spinner } from '@/components/ui'

const TYPE_LABEL = { adult: 'Adult player', parent: 'Parent', supporter: 'Supporter' }

export function AdminMembers() {
  const { teams } = useClub()
  const { profile: me } = useAuth()
  const [search, setSearch] = useState('')
  const [sel, setSel] = useState<Profile | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const q = useLiveQuery(async () => {
    const [profiles, children, tm, managers, memberships] = await Promise.all([
      listAll<Profile>('profiles', 'created_at', false),
      listAll<Child>('children', 'full_name', true),
      listAll<TeamMember>('team_members', 'created_at', true),
      sb().from('managers').select('email').then((r) => (r.data ?? []).map((m) => m.email as string)),
      listAll<Membership>('memberships', 'expires_at', false, (x) => x.eq('status', 'active')),
    ])
    return { profiles, children, tm, managers, memberships }
  }, ['profiles', 'children', 'team_members', 'managers', 'memberships'])

  const teamName = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t.name])), [teams])
  const rows = (q.data?.profiles ?? []).filter((p) => {
    const s = search.toLowerCase()
    return !s || p.full_name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || (q.data?.children ?? []).some((c) => c.parent_id === p.id && c.full_name.toLowerCase().includes(s))
  })
  const today = new Date().toISOString().slice(0, 10)
  const hasMembership = (pid: string) => (q.data?.memberships ?? []).some((m) => m.profile_id === pid && m.expires_at >= today)
  const kidsOf = (pid: string) => (q.data?.children ?? []).filter((c) => c.parent_id === pid)
  const teamsOf = (p: Profile) => (q.data?.tm ?? []).filter((t) => t.profile_id === p.id).map((t) => t.team_id)

  const setProfileTeam = async (teamId: string, on: boolean) => {
    if (!sel) return
    setErr(null)
    const r = on ? await sb().from('team_members').insert({ team_id: teamId, profile_id: sel.id, role: sel.member_type === 'adult' ? 'player' : 'parent' })
      : await sb().from('team_members').delete().eq('team_id', teamId).eq('profile_id', sel.id)
    if (r.error) setErr(r.error.message)
    void q.refresh()
  }
  const setChildTeam = async (child: Child, teamId: string) => {
    setErr(null)
    const r = await sb().from('children').update({ team_id: teamId || null }).eq('id', child.id)
    if (r.error) setErr(r.error.message)
    void q.refresh()
  }
  const toggleAdmin = async (p: Profile) => {
    const isAdmin = q.data?.managers.includes(p.email)
    if (isAdmin && p.email === me?.email) { setErr("You can't remove your own admin access."); return }
    if (!confirm(isAdmin ? `Remove admin access from ${p.email}?` : `Make ${p.email} a club admin? They will be able to manage everything.`)) return
    const r = isAdmin ? await sb().from('managers').delete().eq('email', p.email) : await sb().from('managers').insert({ email: p.email, added_by: me?.email })
    if (r.error) setErr(r.error.message)
    void q.refresh()
  }
  const removeMember = async (p: Profile) => {
    if (!confirm(`Remove ${p.full_name || p.email} from the club? Their account will be deleted.`)) return
    const r = await sb().functions.invoke('delete-account', { body: { userId: p.id } })
    if (r.error) { setErr(r.error.message); return }
    setSel(null); void q.refresh()
  }

  return (
    <div>
      <PageHeader title="Members" subtitle={`${q.data?.profiles.length ?? 0} accounts · ${q.data?.children.length ?? 0} children`} />
      <div className="relative mb-4"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" /><Input data-testid="members-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email or child…" className="pl-10" /></div>
      {q.loading && !q.data ? <Spinner /> : rows.length === 0 ? <Empty title="No members found" /> : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Card key={p.id} testId={`member-${p.id}`} onClick={() => { setErr(null); setSel(p) }} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">{p.full_name || '(no name)'}{q.data?.managers.includes(p.email) && <ShieldCheck size={14} className="text-lions-300" />}</p>
                <p className="truncate text-xs text-muted">{p.email} · {TYPE_LABEL[p.member_type]}{kidsOf(p.id).length ? ` · ${kidsOf(p.id).length} child${kidsOf(p.id).length > 1 ? 'ren' : ''}` : ''}</p>
                <p className="truncate text-xs text-subtle">{[...teamsOf(p).map((t) => teamName[t]), ...kidsOf(p.id).filter((c) => c.team_id).map((c) => `${c.full_name} → ${teamName[c.team_id!]}`)].join(' · ') || 'No team'}</p>
              </div>
              {hasMembership(p.id) ? <Badge tone="green">Member</Badge> : <Badge tone="slate">No membership</Badge>}
            </Card>
          ))}
        </div>
      )}
      <Sheet open={!!sel} onClose={() => setSel(null)} title={sel?.full_name || sel?.email || ''} testId="member-sheet">
        {sel && (
          <div className="space-y-5">
            <div className="text-sm text-muted"><p>{sel.email}</p>{sel.phone && <p>{sel.phone}</p>}<p className="text-xs text-subtle">{TYPE_LABEL[sel.member_type]} · joined {fmtDate(sel.created_at)}</p></div>
            {err && <Alert testId="member-error">{err}</Alert>}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Teams ({sel.member_type === 'adult' ? 'plays for' : 'follows'})</p>
              <div className="flex flex-wrap gap-2">
                {teams.map((t) => { const on = teamsOf(sel).includes(t.id); return <button key={t.id} data-testid={`member-team-${t.id}`} onClick={() => setProfileTeam(t.id, !on)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${on ? 'border-lions-400 bg-lions-500/20 text-lions-100' : 'border-line/10 text-muted'}`}>{t.name}</button> })}
                {teams.length === 0 && <p className="text-xs text-subtle">Create teams first.</p>}
              </div>
            </div>
            {kidsOf(sel.id).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Children</p>
                {kidsOf(sel.id).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl bg-line/[0.04] p-3">
                    <Baby size={16} className="text-lions-300" />
                    <div className="flex-1 text-sm"><p className="font-semibold">{c.full_name}</p>{c.dob && <p className="text-xs text-subtle">born {c.dob}</p>}</div>
                    <Select data-testid={`child-team-${c.id}`} value={c.team_id ?? ''} onChange={(e) => setChildTeam(c, e.target.value)} className="w-40 py-1.5 text-sm"><option value="">No team</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Memberships</p>
              {(q.data?.memberships ?? []).filter((m) => m.profile_id === sel.id).map((m) => <p key={m.id} className="text-sm text-muted">{m.package_name} · until {fmtDate(m.expires_at)}</p>)}
              {!hasMembership(sel.id) && <p className="text-sm text-subtle">None active.</p>}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-line/10 pt-4">
              <Button data-testid="member-toggle-admin" size="sm" variant="secondary" onClick={() => toggleAdmin(sel)}>{q.data?.managers.includes(sel.email) ? <><ShieldOff size={14} /> Remove admin</> : <><ShieldCheck size={14} /> Make admin</>}</Button>
              <Button data-testid="member-remove" size="sm" variant="danger" onClick={() => removeMember(sel)}>Remove from club</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  )
}

function TeamRoster({ team, members }: { team: Team; members: Profile[] }) {
  const q = useLiveQuery(async () => {
    const [tm, kids] = await Promise.all([
      listAll<TeamMember>('team_members', 'created_at', true, (x) => x.eq('team_id', team.id)),
      listAll<Child>('children', 'full_name', true, (x) => x.eq('team_id', team.id)),
    ])
    return { tm, kids }
  }, ['team_members', 'children'], [team.id])
  const who = (id: string | null) => members.find((p) => p.id === id)
  const adults = (q.data?.tm ?? []).filter((t) => t.profile_id).map((t) => ({ t, p: who(t.profile_id) }))
  const kids = q.data?.kids ?? []
  const total = adults.length + kids.length
  return (
    <div className="space-y-2 rounded-xl border border-line/10 p-3" data-testid="team-roster">
      <p className="text-xs font-bold uppercase tracking-wider text-muted">Roster · {total} {total === 1 ? 'member' : 'members'}</p>
      {team.coach_email && <p className="text-sm text-muted">Coach: <b>{team.coach_name || team.coach_email}</b></p>}
      {total === 0 && <p className="text-sm text-subtle">Nobody assigned yet. Go to Members → open a person → tap this team (adults) or pick it for their child.</p>}
      {adults.map(({ t, p }) => <p key={t.id} className="text-sm" data-testid={`roster-adult-${t.id}`}>{p?.full_name || p?.email || 'Member'} <span className="text-xs text-subtle">· {t.role}{p?.phone ? ` · ${p.phone}` : ''}</span></p>)}
      {kids.map((c) => { const parent = who(c.parent_id); return <p key={c.id} className="text-sm" data-testid={`roster-child-${c.id}`}>{c.full_name} <span className="text-xs text-subtle">· player{c.dob ? ` · born ${c.dob}` : ''} · parent {parent?.full_name || parent?.email}{parent?.phone ? ` · ${parent.phone}` : ''}</span></p> })}
    </div>
  )
}

export function AdminTeams() {
  const members = useLiveQuery(() => listAll<Profile>('profiles', 'full_name', true), ['profiles'])
  const fields: FieldDef[] = useMemo(() => [
    { key: 'name', label: 'Team name', type: 'text', required: true },
    { key: 'age_group', label: 'Age group', type: 'text', hint: 'e.g. U12, U16, Senior Men' },
    { key: 'coach_email', label: 'Coach (from members)', type: 'select', hint: 'Coach can run Match Day Live for this team', options: (members.data ?? []).map((p) => ({ value: p.email, label: `${p.full_name || '(no name)'} · ${p.email}` })) },
    { key: 'description', label: 'Description', type: 'textarea' },
  ], [members.data])
  const coachName = (email: string | null) => (members.data ?? []).find((p) => p.email === email)?.full_name || null
  return (
    <div>
      <PageHeader title="Teams" subtitle="Squads for fixtures and rosters. Assign players in the Members page." />
      <AdminCrud<Team> table="teams" fields={fields} orderBy="sort_order" ascending newLabel="New team" transformOut={(f) => ({ ...f, coach_name: coachName((f.coach_email as string | null) ?? null) })} extraActions={(row) => row && <TeamRoster team={row} members={members.data ?? []} />} itemTitle={(r) => r.name} itemSubtitle={(r) => [r.age_group, r.coach_email && `Coach ${coachName(r.coach_email) || r.coach_email}`].filter(Boolean).join(' · ')} testPrefix="teams" />
    </div>
  )
}
