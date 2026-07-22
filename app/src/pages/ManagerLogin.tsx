import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { useSiteImage } from '@/hooks/useSiteImages'
import { useAuth } from '@/lib/AuthContext'
import { PortalLoginLayout } from '@/components/dashboard/PortalLoginLayout'
import { checkClientRateLimit } from '@/lib/security'

export default function ManagerLogin() {
  const navigate = useNavigate()
  const logoUrl = useSiteImage('logo')
  const { signIn, signOut, resetPassword, user, role, configured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user && role === 'manager') {
      navigate('/manager/dashboard', { replace: true })
      return
    }
    const savedEmail = localStorage.getItem('dlbc_remember_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [navigate, user, role])

  const triggerError = (msg: string) => {
    setIsLoading(false)
    setPassword('')
    setError(msg)
    setShake(true)
    setTimeout(() => setShake(false), 350)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!configured) {
      setError('Authentication is not configured yet. Add your Supabase keys to .env.local.')
      return
    }
    setIsLoading(true)

    const { error: signInError, role: resolvedRole } = await signIn(email, password)
    if (signInError) {
      triggerError('Invalid email or password. Please try again.')
      return
    }
    if (resolvedRole !== 'manager') {
      await signOut()
      triggerError('This account is not authorised for the Manager Portal.')
      return
    }

    setSuccess(true)
    if (rememberMe) localStorage.setItem('dlbc_remember_email', email)
    else localStorage.removeItem('dlbc_remember_email')
    setTimeout(() => navigate('/manager/dashboard'), 500)
  }

  const handleForgotPassword = async () => {
    setError('')
    setNotice('')
    if (!email) {
      setError('Enter your email address above, then tap "Forgot password?"')
      return
    }
    if (!checkClientRateLimit(`reset:${email.toLowerCase()}`, 3, 60 * 60 * 1000)) {
      setError('Too many reset requests. Please try again later.')
      return
    }
    const { error: resetError } = await resetPassword(email)
    if (resetError) setError(resetError)
    else setNotice(`Password reset link sent to ${email}. Check your inbox.`)
  }

  return (
    <PortalLoginLayout
      portal="manager"
      logoUrl={logoUrl}
      formTitle="Manager Portal"
      formSubtitle="Sign in to manage memberships, payments, and team operations."
      shake={shake}
      alternateLink={{ href: '/player/login', label: 'Player Login →' }}
      footer={
        <div className="mt-8 flex items-center justify-center gap-2 text-center">
          <ShieldCheck size={14} className="text-slate-500 shrink-0" />
          <p className="font-inter text-xs text-slate-500">
            Restricted to authorised club personnel. All access is logged.
          </p>
        </div>
      }
    >
      {error && <div className="portal-banner-error">{error}</div>}
      {notice && <div className="portal-banner-notice">{notice}</div>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label htmlFor="email" className="portal-field-label">Email Address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="manager@dublinlions.ie"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={`portal-field ${error ? 'portal-field-error' : ''}`}
          />
        </div>

        <div>
          <label htmlFor="password" className="portal-field-label">Password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className={`portal-field pr-12 ${error ? 'portal-field-error' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 rounded border-white/20 bg-transparent accent-amber-400"
            />
            <span className="font-inter text-sm text-slate-400">Remember me</span>
          </label>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="font-inter font-medium text-sm text-amber-400/90 hover:text-amber-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`portal-submit ${success ? 'portal-submit-success' : 'portal-submit-primary'}`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={20} className="animate-spin" />
              Signing in...
            </span>
          ) : success ? (
            'Welcome back!'
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 font-inter text-xs uppercase tracking-[0.18em] text-slate-400">or</span>
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link
          to="/player/login"
          className="font-inter font-medium text-sm text-amber-400/90 hover:text-amber-300 transition-colors"
        >
          Player Login →
        </Link>
      </div>
    </PortalLoginLayout>
  )
}
