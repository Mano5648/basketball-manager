import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react'
import { useSiteImage } from '@/hooks/useSiteImages'

export default function ManagerLogin() {
  const navigate = useNavigate()
  const logoUrl = useSiteImage('logo')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const savedEmail = localStorage.getItem('dlbc_remember_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    await new Promise((resolve) => setTimeout(resolve, 800))

    if (email === 'manager@dublinlions.ie' && password === 'lions2025') {
      setSuccess(true)
      const user = { role: 'manager', email: 'manager@dublinlions.ie', name: 'Club Manager' }
      localStorage.setItem('dlbc_user', JSON.stringify(user))
      if (rememberMe) {
        localStorage.setItem('dlbc_remember_email', email)
      } else {
        localStorage.removeItem('dlbc_remember_email')
      }
      setTimeout(() => {
        navigate('/manager/dashboard')
      }, 500)
    } else {
      setIsLoading(false)
      setPassword('')
      setError('Invalid email or password. Please try again.')
      setShake(true)
      setTimeout(() => setShake(false), 300)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#0A1628] flex items-center justify-center px-4 relative">
      {/* Back link */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 font-inter font-medium text-sm text-slate-400 hover:text-white transition-colors duration-200 group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-200" />
        Back to Dublin Lions
      </Link>

      {/* Login Card */}
      <div
        className={`w-full max-w-md bg-[#1E293B] border border-white/[0.08] rounded-2xl p-8 md:p-10 shadow-2xl transition-all duration-300 ${shake ? 'animate-[shake_0.3s_ease-in-out]' : ''}`}
        style={{
          boxShadow: '0 25px 50px -12px rgba(59,130,246,0.15)',
          animation: 'fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center">
          <img
            src={logoUrl}
            alt="Dublin Lions"
            className="h-14 w-auto brightness-0 invert"
            style={{ animation: 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards' }}
          />
          <h1 className="font-oswald font-bold text-2xl text-white mt-6 text-center">
            Manager Portal
          </h1>
          <p className="font-inter text-sm text-slate-400 mt-2 text-center">
            Sign in to manage memberships, payments, and team operations.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            className="mt-6 bg-red-500/10 border-l-4 border-red-500 text-white px-4 py-3 rounded text-sm font-inter"
            style={{ animation: 'fade-in-up 0.3s ease-out forwards' }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* Email Field */}
          <div style={{ animation: 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both' }}>
            <label htmlFor="email" className="block font-inter font-medium text-sm text-slate-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="manager@dublinlions.ie"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={`w-full bg-white/[0.05] border ${error ? 'border-red-500' : 'border-[#334155]'} rounded px-4 py-3 font-inter text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-200`}
            />
          </div>

          {/* Password Field */}
          <div style={{ animation: 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.38s both' }}>
            <label htmlFor="password" className="block font-inter font-medium text-sm text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className={`w-full bg-white/[0.05] border ${error ? 'border-red-500' : 'border-[#334155]'} rounded px-4 py-3 pr-12 font-inter text-base text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-200`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors duration-150"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Password */}
          <div className="flex items-center justify-between mt-2" style={{ animation: 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.46s both' }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="w-4 h-4 rounded border-white/20 bg-transparent checked:bg-blue-500 checked:border-blue-500 accent-blue-500"
              />
              <span className="font-inter text-sm text-slate-400">Remember me</span>
            </label>
            <button
              type="button"
              className="font-inter font-medium text-sm text-blue-500 hover:underline transition-all duration-200"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-inter font-semibold text-sm uppercase tracking-widest px-8 py-4 rounded transition-all duration-150 ${
              success
                ? 'bg-green-500 text-white'
                : 'bg-blue-500 text-white hover:bg-blue-400 hover:scale-[1.02] hover:shadow-lg'
            } disabled:opacity-70 disabled:cursor-not-allowed`}
            style={{ animation: 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.54s both' }}
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

        {/* Divider */}
        <div className="relative mt-8" style={{ animation: 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.62s both' }}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#1E293B] px-3 font-inter text-sm text-slate-500">or</span>
          </div>
        </div>

        {/* Player Login Link */}
        <div className="mt-6 text-center" style={{ animation: 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.86s both' }}>
          <Link
            to="/player/login"
            className="font-inter font-medium text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200"
          >
            Player Login →
          </Link>
        </div>

        {/* Security Note */}
        <div className="mt-8 flex items-center justify-center gap-2 text-center" style={{ animation: 'fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.94s both' }}>
          <ShieldCheck size={14} className="text-slate-500 shrink-0" />
          <p className="font-inter text-xs text-slate-500">
            This portal is restricted to authorised club personnel. All access is logged.
          </p>
        </div>
      </div>
    </div>
  )
}
