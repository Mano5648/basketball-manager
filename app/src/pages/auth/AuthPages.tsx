import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { Alert, Button, Field, Input, Select, cx } from '@/components/ui'
import type { MemberType } from '@/lib/db'
import { supabase } from '@/lib/supabase'

function AuthFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const { settings } = useClub()
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0A0A0C] text-white">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[140%] -translate-x-1/2 rounded-[100%] bg-lions-500/25 blur-3xl" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-[calc(env(safe-area-inset-top)+3.5rem)]">
        <div className="mb-8 flex flex-col items-start gap-4">
          <img src={settings?.logo_url || './logo-lions-emblem.png'} alt="" className="h-20 w-20 rounded-2xl bg-white object-contain shadow-lg" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lions-300">{settings?.club_name ?? 'Club app'}</p>
            <h1 className="font-display mt-1 text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function PasswordInput({ value, onChange, testId, placeholder = 'Password', autoComplete = 'current-password' }: { value: string; onChange: (v: string) => void; testId: string; placeholder?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input data-testid={testId} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required minLength={6} autoComplete={autoComplete} className="pr-11" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Toggle password">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
    </div>
  )
}

export function LoginPage() {
  const { signIn, user, role, loading } = useAuth()
  const { settings } = useClub()
  const nav = useNavigate()
  const [email, setEmail] = useState(() => localStorage.getItem('club_last_email') ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { if (!loading && user && role) nav(role === 'manager' ? '/admin' : '/app', { replace: true }) }, [user, role, loading, nav])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    const res = await signIn(email, password)
    setBusy(false)
    if (res.error) { setErr(res.error); return }
    localStorage.setItem('club_last_email', email.trim().toLowerCase())
  }

  return (
    <AuthFrame title={settings?.welcome_title || 'Welcome back'} subtitle="Sign in to your club account">
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <Field label="Email"><Input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" /></Field>
        <Field label="Password"><PasswordInput testId="login-password" value={password} onChange={setPassword} /></Field>
        {err && <Alert testId="login-error">{err}</Alert>}
        <Button data-testid="login-submit" type="submit" loading={busy} size="lg" className="w-full">Sign in</Button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/forgot" data-testid="login-forgot-link" className="text-slate-400 hover:text-white">Forgot password?</Link>
          <Link to="/register" data-testid="login-register-link" className="font-semibold text-lions-300 hover:text-lions-200">Create account</Link>
        </div>
      </form>
    </AuthFrame>
  )
}

const MEMBER_TYPES: { value: MemberType; label: string; hint: string }[] = [
  { value: 'adult', label: 'Adult player', hint: 'I play for the club' },
  { value: 'parent', label: 'Parent / guardian', hint: 'My child plays for the club' },
  { value: 'supporter', label: 'Supporter', hint: 'I follow the club' },
]

export function RegisterPage() {
  const { signUp } = useAuth()
  const { settings } = useClub()
  const nav = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', memberType: 'parent' as MemberType, agree: false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState<'confirm' | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.agree) { setErr('Please accept the privacy policy to continue.'); return }
    setBusy(true); setErr(null)
    const res = await signUp({ email: form.email, password: form.password, fullName: form.fullName, phone: form.phone, memberType: form.memberType })
    setBusy(false)
    if (res.error) { setErr(res.error); return }
    if (res.needsConfirmation) setDone('confirm')
    else nav('/app', { replace: true })
  }

  if (done) {
    return (
      <AuthFrame title="Check your inbox">
        <div data-testid="register-confirm" className="space-y-4">
          <CheckCircle2 className="text-emerald-400" size={40} />
          <p className="text-sm text-slate-300">We sent a confirmation link to <b className="text-white">{form.email}</b>. Tap it, then come back and sign in.</p>
          <Button onClick={() => nav('/login')} className="w-full">Back to sign in</Button>
        </div>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame title={settings?.register_title || 'Join the club'} subtitle="Create your member account">
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <div className="grid grid-cols-3 gap-2">
          {MEMBER_TYPES.map((t) => (
            <button type="button" key={t.value} data-testid={`register-type-${t.value}`} onClick={() => setForm({ ...form, memberType: t.value })}
              className={cx('rounded-2xl border p-3 text-left transition-colors', form.memberType === t.value ? 'border-lions-400 bg-lions-500/15' : 'border-white/10 bg-white/[0.03] hover:border-white/25')}>
              <p className="text-[13px] font-semibold leading-tight">{t.label}</p>
              <p className="mt-1 text-[11px] leading-tight text-slate-400">{t.hint}</p>
            </button>
          ))}
        </div>
        <Field label="Full name"><Input data-testid="register-name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required autoComplete="name" /></Field>
        <Field label="Email"><Input data-testid="register-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="email" /></Field>
        <Field label="Phone (optional)"><Input data-testid="register-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel" /></Field>
        <Field label="Password" hint="At least 6 characters"><PasswordInput testId="register-password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" /></Field>
        <label className="flex items-start gap-3 text-sm text-slate-300">
          <input data-testid="register-agree" type="checkbox" checked={form.agree} onChange={(e) => setForm({ ...form, agree: e.target.checked })} className="mt-1 h-4 w-4 accent-lions-500" />
          <span>I agree to the <Link to="/privacy" className="text-lions-300 underline">privacy policy</Link> and consent to the club storing my details.</span>
        </label>
        {err && <Alert testId="register-error">{err}</Alert>}
        <Button data-testid="register-submit" type="submit" loading={busy} size="lg" className="w-full">Create account</Button>
        <p className="text-center text-sm text-slate-400">Already a member? <Link to="/login" data-testid="register-login-link" className="font-semibold text-lions-300">Sign in</Link></p>
      </form>
    </AuthFrame>
  )
}

export function ForgotPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true)
    const r = await resetPassword(email)
    setBusy(false)
    setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: 'If that email exists, a reset link is on its way.' })
  }
  return (
    <AuthFrame title="Reset password" subtitle="We'll email you a link">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input data-testid="forgot-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
        {msg && <Alert tone={msg.ok ? 'green' : 'red'} testId="forgot-msg">{msg.text}</Alert>}
        <Button data-testid="forgot-submit" type="submit" loading={busy} className="w-full">Send reset link</Button>
        <p className="text-center text-sm"><Link to="/login" className="text-slate-400 hover:text-white">Back to sign in</Link></p>
      </form>
    </AuthFrame>
  )
}

export function ResetPasswordPage() {
  const nav = useNavigate()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null)
    const { error } = await supabase!.auth.updateUser({ password })
    setBusy(false)
    if (error) { setErr(error.message); return }
    nav('/app', { replace: true })
  }
  return (
    <AuthFrame title="Choose a new password">
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password"><PasswordInput testId="reset-password" value={password} onChange={setPassword} autoComplete="new-password" /></Field>
        {err && <Alert>{err}</Alert>}
        <Button data-testid="reset-submit" type="submit" loading={busy} className="w-full">Update password</Button>
      </form>
    </AuthFrame>
  )
}

export function MemberTypeSelect({ value, onChange }: { value: MemberType; onChange: (v: MemberType) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as MemberType)} data-testid="member-type-select">
      {MEMBER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
    </Select>
  )
}
