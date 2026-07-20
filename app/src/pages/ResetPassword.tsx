import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useSiteImage } from '@/hooks/useSiteImages'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { PortalLoginLayout } from '@/components/dashboard/PortalLoginLayout'

export default function ResetPassword() {
  const navigate = useNavigate()
  const logoUrl = useSiteImage('logo')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setPhase('error')
      setMessage('Authentication is not configured.')
      return
    }

    const client = supabase
    let recovered = false

    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        recovered = true
        setPhase('ready')
      }
    })

    const boot = async () => {
      await new Promise((resolve) => setTimeout(resolve, 150))
      const hash = window.location.hash
      const isRecoveryLink = hash.includes('type=recovery') || hash.includes('access_token')

      const { data, error } = await client.auth.getSession()
      if (error) {
        setPhase('error')
        setMessage(error.message)
        return
      }

      if (data.session && (recovered || isRecoveryLink)) {
        setPhase('ready')
        return
      }

      if (isRecoveryLink) {
        await new Promise((resolve) => setTimeout(resolve, 400))
        const retry = await client.auth.getSession()
        if (retry.data.session) {
          setPhase('ready')
          return
        }
      }

      setPhase('error')
      setMessage('This password reset link is invalid or has expired. Request a new one from the login page.')
    }

    void boot()
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    if (!supabase) return
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage(error.message)
      setSubmitting(false)
      return
    }

    await supabase.auth.signOut()
    setPhase('success')
    setSubmitting(false)
    setTimeout(() => navigate('/player/login', { replace: true }), 1800)
  }

  return (
    <PortalLoginLayout
      portal="player"
      logoUrl={logoUrl}
      formTitle="Reset your password"
      formSubtitle="Choose a new password for your Dublin Lions account."
      alternateLink={{ href: '/player/login', label: '← Back to sign in' }}
    >
      {phase === 'loading' && (
        <div className="mt-8 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin" size={28} />
          <p className="font-inter text-sm">Verifying your reset link…</p>
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-6 space-y-4">
          <div className="portal-banner-error">{message}</div>
          <Link to="/player/login" className="portal-submit portal-submit-primary block text-center">
            Back to sign in
          </Link>
        </div>
      )}

      {phase === 'success' && (
        <div className="portal-banner-notice mt-6 flex items-center justify-center gap-2">
          <CheckCircle size={16} />
          Password updated. Redirecting to sign in…
        </div>
      )}

      {phase === 'ready' && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="portal-field-label">New password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                className="portal-field pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="portal-field-label">Confirm new password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              minLength={6}
              className="portal-field"
            />
          </div>

          {message && <div className="portal-banner-error">{message}</div>}

          <button
            type="submit"
            disabled={submitting}
            className="portal-submit portal-submit-primary flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Updating password…
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      )}
    </PortalLoginLayout>
  )
}
