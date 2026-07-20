import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useSiteImage } from '@/hooks/useSiteImages'
import { useAuth } from '@/lib/AuthContext'
import { PortalLoginLayout } from '@/components/dashboard/PortalLoginLayout'
import { HoneypotField, PrivacyConsentField } from '@/components/security/PrivacyConsentField'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'
import { validatePublicFormSecurity, checkClientRateLimit } from '@/lib/security'

export default function PlayerLogin() {
  const navigate = useNavigate()
  const logoUrl = useSiteImage('logo')
  const { signIn, signUp, resetPassword, user, configured } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [notice, setNotice] = useState('')
  const [shake, setShake] = useState(false)

  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regStartedAt] = useState(() => Date.now())
  const [honeypot, setHoneypot] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')

  useEffect(() => {
    if (user) {
      navigate('/player/dashboard', { replace: true })
      return
    }
    const saved = localStorage.getItem('dlbc_remember_email')
    if (saved) setEmail(saved)
  }, [navigate, user])

  const triggerShake = useCallback(() => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }, [])

  const failWith = useCallback((msg: string) => {
    setStatus('error')
    setErrorMsg(msg)
    triggerShake()
  }, [triggerShake])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setNotice('')
    if (!configured) {
      failWith('Authentication is not configured yet. Add your Supabase keys to .env.local.')
      return
    }
    setStatus('loading')

    try {
      const { error, role } = await signIn(email.trim(), password)
      if (error) {
        const msg = /email not confirmed/i.test(error)
          ? 'Please confirm your email before signing in. Check your inbox for the confirmation link.'
          : /invalid login credentials/i.test(error)
            ? 'Invalid email or password. Please try again.'
            : error
        failWith(msg)
        return
      }
      if (role === 'manager') {
        setStatus('success')
        setTimeout(() => navigate('/manager/dashboard'), 500)
        return
      }
    } catch {
      failWith('Could not reach the sign-in service. Check your connection and try again.')
      return
    }
    if (rememberMe) localStorage.setItem('dlbc_remember_email', email)
    else localStorage.removeItem('dlbc_remember_email')
    setStatus('success')
    setTimeout(() => navigate('/player/dashboard'), 500)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setNotice('')
    if (!configured) {
      failWith('Authentication is not configured yet. Add your Supabase keys to .env.local.')
      return
    }
    if (regPassword.length < 6) {
      failWith('Password must be at least 6 characters.')
      return
    }
    if (regPassword !== regConfirmPassword) {
      failWith('Passwords do not match.')
      return
    }
    const security = validatePublicFormSecurity({
      honeypot,
      formStartedAt: regStartedAt,
      rateLimitKey: `signup:${regEmail.toLowerCase()}`,
      privacyAccepted,
      turnstileToken,
      maxAttempts: 5,
    })
    if (!security.ok) {
      failWith(security.error)
      return
    }
    setStatus('loading')

    const { error, needsConfirmation } = await signUp(regEmail, regPassword, {
      name: regName,
    })
    if (error) {
      failWith(error)
      return
    }
    if (needsConfirmation) {
      setStatus('idle')
      setMode('login')
      setNotice(`Account created. Check ${regEmail} to confirm your email, then sign in.`)
      return
    }
    setStatus('success')
    setTimeout(() => navigate('/player/dashboard'), 500)
  }

  const handleForgotPassword = async () => {
    setErrorMsg('')
    setNotice('')
    if (!email) {
      failWith('Enter your email address above, then tap "Forgot password?"')
      return
    }
    if (!checkClientRateLimit(`reset:${email.toLowerCase()}`, 3, 60 * 60 * 1000)) {
      failWith('Too many reset requests. Please try again later.')
      return
    }
    const { error } = await resetPassword(email)
    if (error) failWith(error)
    else setNotice(`Password reset link sent to ${email}. Check your inbox.`)
  }

  const fieldClass = status === 'error' ? 'portal-field portal-field-error' : 'portal-field'

  return (
    <PortalLoginLayout
      portal="player"
      logoUrl={logoUrl}
      formTitle={mode === 'login' ? 'Player Portal' : 'Join the Pride'}
      formSubtitle={
        mode === 'login'
          ? 'Sign in to manage your membership, payments, and club updates.'
          : 'Register to become a member of Dublin Lions Basketball Club.'
      }
      shake={shake}
      alternateLink={{ href: '/manager/login', label: 'Manager Login →' }}
      footer={
        <p className="mt-6 text-center font-inter text-xs text-slate-500">
          Having trouble? Contact Jack Maguire at{' '}
          <a href="mailto:secretary@dublinlions.ie" className="text-lions-600 hover:text-lions-700 font-medium">
            secretary@dublinlions.ie
          </a>
        </p>
      }
    >
      {status === 'error' && <div className="portal-banner-error">{errorMsg}</div>}
      {status === 'success' && (
        <div className="portal-banner-notice flex items-center justify-center gap-2">
          <CheckCircle size={16} />
          Success! Redirecting...
        </div>
      )}
      {notice && status !== 'success' && <div className="portal-banner-info">{notice}</div>}

      {mode === 'login' ? (
        <form onSubmit={handleLogin} className="mt-6 space-y-5">
          <div>
            <label className="portal-field-label">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
              className={fieldClass}
            />
          </div>

          <div>
            <label className="portal-field-label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`${fieldClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-400"
              />
              <span className="font-inter text-sm text-slate-600">Remember me</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="font-inter text-sm text-lions-600 hover:text-lions-700 transition-colors font-medium"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="portal-submit portal-submit-primary flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="mt-6 space-y-4 relative">
          <HoneypotField value={honeypot} onChange={setHoneypot} />
          <div>
            <label className="portal-field-label">Full Name</label>
            <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="John Doe" required className="portal-field" />
          </div>
          <div>
            <label className="portal-field-label">Email Address</label>
            <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="your.email@example.com" required className="portal-field" />
          </div>
          <div>
            <label className="portal-field-label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="portal-field pr-12"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="portal-field-label">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={regConfirmPassword}
              onChange={(e) => setRegConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
              minLength={6}
              className="portal-field"
            />
          </div>
          <PrivacyConsentField checked={privacyAccepted} onChange={setPrivacyAccepted} />
          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} theme="light" />
          <button
            type="submit"
            disabled={status === 'loading' || status === 'success'}
            className="portal-submit portal-submit-primary flex items-center justify-center gap-2"
          >
            {status === 'loading' ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      )}

      <div className="mt-6 text-center">
        <p className="font-inter text-sm text-slate-400">
          {mode === 'login' ? 'Not a member yet?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login')
              setStatus('idle')
              setErrorMsg('')
            }}
            className="font-inter font-semibold text-lions-600 hover:text-lions-700 transition-colors"
          >
            {mode === 'login' ? 'Join the Pride →' : '← Sign In'}
          </button>
        </p>
      </div>
    </PortalLoginLayout>
  )
}
