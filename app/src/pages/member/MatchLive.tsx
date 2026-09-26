import { useState } from 'react'
import { Flag, Play, Radio, Send } from 'lucide-react'
import { listAll, sb, type Fixture, type FixtureUpdate } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { fmtTime } from '@/lib/format'
import { Alert, Button, Card, Input, Select, cx } from '@/components/ui'

export function useCanControlMatch(fx: Fixture | null): boolean {
  const { role, profile } = useAuth()
  const { teams } = useClub()
  if (!fx) return false
  if (role === 'manager') return true
  const team = teams.find((t) => t.id === fx.team_id)
  return Boolean(team?.coach_email && profile?.email && team.coach_email.toLowerCase() === profile.email.toLowerCase())
}

const PERIODS = ['Q1', 'Q2', 'HT', 'Q3', 'Q4', 'OT']

export function LiveUpdates({ fixtureId }: { fixtureId: string }) {
  const q = useLiveQuery(() => listAll<FixtureUpdate>('fixture_updates', 'created_at', false, (x) => x.eq('fixture_id', fixtureId).limit(50)), ['fixture_updates'], [fixtureId])
  if (!q.data?.length) return null
  return (
    <Card className="space-y-2" testId="live-updates">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted"><Radio size={13} className="text-accent-400" /> Match updates</p>
      {q.data.map((u) => (
        <div key={u.id} data-testid={`live-update-${u.id}`} className="flex gap-3 border-l-2 border-line/10 pl-3">
          <span className="w-12 shrink-0 text-xs tabular-nums text-subtle">{fmtTime(u.created_at)}</span>
          <p className="flex-1 text-sm text-fg">{u.text}{u.home_score != null && <span className="ml-2 text-xs font-bold text-muted">{u.home_score}–{u.away_score}</span>}</p>
        </div>
      ))}
    </Card>
  )
}

export function MatchControl({ fx, onChanged }: { fx: Fixture; onChanged: () => void }) {
  const { profile } = useAuth()
  const { teams } = useClub()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const teamName = teams.find((t) => t.id === fx.team_id)?.name ?? 'Lions'
  const home = fx.home_score ?? 0
  const away = fx.away_score ?? 0

  const patch = async (changes: Partial<Fixture>, note?: string, push?: { title: string; body: string }) => {
    setBusy(true); setErr(null)
    try {
      const { error } = await sb().from('fixtures').update(changes).eq('id', fx.id)
      if (error) throw error
      if (note) await sb().from('fixture_updates').insert({ fixture_id: fx.id, text: note, home_score: changes.home_score ?? home, away_score: changes.away_score ?? away, author_id: profile?.id })
      if (push) void sb().functions.invoke('send-push', { body: { ...push, target: 'team', team_id: fx.team_id, link: `/app/fixtures/${fx.id}` } })
      onChanged()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Update failed') } finally { setBusy(false) }
  }
  const score = (side: 'home' | 'away', delta: number) => {
    const h = Math.max(0, side === 'home' ? home + delta : home)
    const a = Math.max(0, side === 'away' ? away + delta : away)
    void patch({ home_score: h, away_score: a })
  }
  const label = `${fx.is_home ? teamName : fx.opponent} vs ${fx.is_home ? fx.opponent : teamName}`
  const ours = fx.is_home ? home : away
  const theirs = fx.is_home ? away : home

  return (
    <Card className="space-y-4 border-accent-500/30" testId="match-control">
      <div className="flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-bold"><Radio size={16} className="text-accent-400" /> Match control</p><span className="text-[11px] uppercase tracking-wider text-muted">{fx.status}</span></div>
      {fx.status === 'scheduled' && <Button data-testid="match-start" className="w-full" loading={busy} onClick={() => patch({ status: 'live', period: 'Q1', home_score: home, away_score: away }, 'Tip-off!', { title: `Tip-off: ${label}`, body: 'Follow the live score in the app.' })}><Play size={16} /> Start match</Button>}
      {fx.status === 'live' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {(['home', 'away'] as const).map((side) => (
              <div key={side} className="rounded-xl bg-line/[0.04] p-3 text-center">
                <p className="truncate text-xs text-muted">{side === 'home' ? (fx.is_home ? teamName : fx.opponent) : (fx.is_home ? fx.opponent : teamName)}</p>
                <p data-testid={`score-${side}`} className="font-display my-1 text-4xl font-bold tabular-nums">{side === 'home' ? home : away}</p>
                <div className="flex justify-center gap-1.5">
                  {[1, 2, 3].map((n) => <button key={n} data-testid={`score-${side}-plus${n}`} disabled={busy} onClick={() => score(side, n)} className="h-9 w-9 rounded-full bg-lions-500 text-sm font-bold text-white active:scale-95">+{n}</button>)}
                  <button data-testid={`score-${side}-minus1`} disabled={busy} onClick={() => score(side, -1)} className="h-9 w-9 rounded-full bg-line/10 text-sm font-bold">−1</button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Select data-testid="match-period" value={fx.period ?? ''} onChange={(e) => patch({ period: e.target.value }, `${e.target.value === 'HT' ? 'Half time' : e.target.value} — ${ours}–${theirs}`)} className="w-28 py-2">{PERIODS.map((p) => <option key={p}>{p}</option>)}</Select>
            <form className="flex flex-1 gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { void patch({}, text.trim()); setText('') } }}>
              <Input data-testid="match-update-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Post an update…" maxLength={300} className="py-2" />
              <Button data-testid="match-update-send" type="submit" size="sm" variant="secondary" disabled={!text.trim() || busy}><Send size={14} /></Button>
            </form>
          </div>
          <Button data-testid="match-finish" variant="danger" className={cx('w-full')} loading={busy} onClick={() => confirm('Finish the match and publish the final score?') && patch({ status: 'completed', period: 'FT' }, `Final score ${ours}–${theirs}`, { title: `Final: ${label} ${ours}–${theirs}`, body: ours > theirs ? `${teamName} win!` : ours === theirs ? 'Draw.' : 'Tough loss — well played.' })}><Flag size={16} /> Finish match</Button>
        </>
      )}
      {fx.status === 'completed' && <Button data-testid="match-reopen" variant="secondary" size="sm" loading={busy} onClick={() => patch({ status: 'live', period: 'Q4' })}>Re-open match</Button>}
      {err && <Alert testId="match-error">{err}</Alert>}
    </Card>
  )
}
