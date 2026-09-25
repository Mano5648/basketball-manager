import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Baby, LogOut, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { sb, type MemberType } from '@/lib/db'
import { initials } from '@/lib/format'
import { Alert, Button, Card, Field, Input, PageHeader, Sheet, ImageUpload } from '@/components/ui'
import { MemberTypeSelect } from '@/pages/auth/AuthPages'

export default function ProfilePage() {
  const { profile, refreshProfile, signOut } = useAuth()
  const { children, teams, refresh } = useClub()
  const nav = useNavigate()
  const [form, setForm] = useState({ full_name: profile?.full_name ?? '', phone: profile?.phone ?? '', member_type: (profile?.member_type ?? 'supporter') as MemberType, avatar_url: profile?.avatar_url ?? null })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [addChild, setAddChild] = useState(false)
  const [child, setChild] = useState({ full_name: '', dob: '' })

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true); setMsg(null)
    const { error } = await sb().from('profiles').update({ ...form, updated_at: new Date().toISOString() }).eq('id', profile.id)
    setSaving(false)
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Profile saved' })
    if (!error) void refreshProfile()
  }
  const saveChild = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    const { error } = await sb().from('children').insert({ parent_id: profile.id, full_name: child.full_name.trim(), dob: child.dob || null })
    if (error) { setMsg({ ok: false, text: error.message }); return }
    setAddChild(false); setChild({ full_name: '', dob: '' }); void refresh()
  }
  const removeChild = async (id: string) => {
    if (!confirm('Remove this child from your account?')) return
    await sb().from('children').delete().eq('id', id)
    void refresh()
  }
  const deleteAccount = async () => {
    if (!profile || !confirm('Delete your account and all your data? This cannot be undone.')) return
    const { error } = await sb().functions.invoke('delete-account')
    if (error) { setMsg({ ok: false, text: error.message }); return }
    await signOut(); nav('/login')
  }

  if (!profile) return null
  return (
    <div className="space-y-6">
      <PageHeader title="My profile" back="/app/more" />
      <div className="flex items-center gap-4">
        {form.avatar_url ? <img src={form.avatar_url} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lions-500/20 font-display text-xl font-bold text-lions-100">{initials(profile.full_name || profile.email)}</div>}
        <div><p className="font-semibold">{profile.full_name || 'Member'}</p><p className="text-sm text-slate-400">{profile.email}</p></div>
      </div>
      <form onSubmit={save} className="space-y-4" data-testid="profile-form">
        <Field label="Full name"><Input data-testid="profile-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></Field>
        <Field label="Phone"><Input data-testid="profile-phone" type="tel" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="I am a"><MemberTypeSelect value={form.member_type} onChange={(v) => setForm({ ...form, member_type: v })} /></Field>
        <ImageUpload label="Photo" value={form.avatar_url} folder="avatars" onChange={(u) => setForm({ ...form, avatar_url: u })} />
        {msg && <Alert tone={msg.ok ? 'green' : 'red'} testId="profile-msg">{msg.text}</Alert>}
        <Button data-testid="profile-save" type="submit" loading={saving}>Save changes</Button>
      </form>

      <section className="space-y-2">
        <div className="flex items-center justify-between"><h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">My children</h2><Button data-testid="add-child-btn" size="sm" variant="secondary" onClick={() => setAddChild(true)}><Plus size={14} /> Add child</Button></div>
        {children.length === 0 ? <p className="text-sm text-slate-500">Add your children to buy their membership and get them assigned to a team.</p> : children.map((c) => (
          <Card key={c.id} testId={`child-${c.id}`} className="flex items-center gap-3 py-3">
            <Baby size={18} className="text-lions-300" />
            <div className="flex-1"><p className="text-sm font-semibold">{c.full_name}</p><p className="text-xs text-slate-400">{c.team_id ? teams.find((t) => t.id === c.team_id)?.name ?? 'Team' : 'Awaiting team assignment'}{c.dob ? ` · born ${c.dob}` : ''}</p></div>
            <button data-testid={`remove-child-${c.id}`} onClick={() => removeChild(c.id)} className="p-2 text-slate-500 hover:text-rose-400"><Trash2 size={16} /></button>
          </Card>
        ))}
      </section>

      <section className="space-y-2 border-t border-white/[0.06] pt-5">
        <Button data-testid="profile-signout" variant="secondary" onClick={() => void signOut().then(() => nav('/login'))}><LogOut size={16} /> Sign out</Button>
        <button data-testid="delete-account-btn" onClick={deleteAccount} className="block text-xs text-slate-500 underline hover:text-rose-400">Delete my account & data</button>
      </section>

      <Sheet open={addChild} onClose={() => setAddChild(false)} title="Add a child" testId="add-child-sheet">
        <form onSubmit={saveChild} className="space-y-4">
          <Field label="Child's full name"><Input data-testid="child-name" value={child.full_name} onChange={(e) => setChild({ ...child, full_name: e.target.value })} required /></Field>
          <Field label="Date of birth"><Input data-testid="child-dob" type="date" value={child.dob} onChange={(e) => setChild({ ...child, dob: e.target.value })} /></Field>
          <Button data-testid="child-save" type="submit" className="w-full">Add child</Button>
        </form>
      </Sheet>
    </div>
  )
}
