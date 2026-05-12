import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { useSiteImage } from '@/hooks/useSiteImages'

interface Player {
  id: number
  email: string
  password: string
  name: string
  team: string
  position: string
  jersey: number
  membershipStatus: 'paid' | 'pending' | 'overdue'
  paymentPlan: 'monthly' | 'full' | 'per-session' | null
  phone?: string
  emergencyContact?: string
  jerseySize?: string
}

function getPlayers(): Player[] {
  const raw = localStorage.getItem('dlbc_players')
  if (!raw) return []
  try {
    return JSON.parse(raw) as Player[]
  } catch {
    return []
  }
}

export default function PlayerLogin() {
  const navigate = useNavigate()
  const logoUrl = useSiteImage('logo')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [shake, setShake] = useState(false)

  // Registration fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regTeam, setRegTeam] = useState("Men's Senior")
  const [regPosition, setRegPosition] = useState('Guard')
  const [regJersey, setRegJersey] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('dlbc_remember_email')
    if (saved) setEmail(saved)
  }, [])

  const triggerShake = useCallback(() => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    setTimeout(() => {
      const players = getPlayers()
      const player = players.find((p) => p.email === email && p.password === password)

      if (player) {
        const user = { ...player, role: 'player' as const }
        localStorage.setItem('dlbc_user', JSON.stringify(user))
        if (rememberMe) {
          localStorage.setItem('dlbc_remember_email', email)
        } else {
          localStorage.removeItem('dlbc_remember_email')
        }
        setStatus('success')
        setTimeout(() => navigate('/player/dashboard'), 500)
      } else {
        setStatus('error')
        setErrorMsg('Invalid email or password. Please try again.')
        triggerShake()
      }
    }, 800)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    setTimeout(() => {
      const players = getPlayers()
      if (players.some((p) => p.email === regEmail)) {
        setStatus('error')
        setErrorMsg('An account with this email already exists.')
        triggerShake()
        return
      }

      const newPlayer: Player = {
        id: Date.now(),
        email: regEmail,
        password: regPassword,
        name: regName,
        team: regTeam,
        position: regPosition,
        jersey: parseInt(regJersey) || 0,
        membershipStatus: 'pending',
        paymentPlan: null,
      }

      players.push(newPlayer)
      localStorage.setItem('dlbc_players', JSON.stringify(players))

      const user = { ...newPlayer, role: 'player' as const }
      localStorage.setItem('dlbc_user', JSON.stringify(user))
      setStatus('success')
      setTimeout(() => navigate('/player/dashboard'), 500)
    }, 800)
  }

  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1E293B 50%, #0F172A 100%)' }}
    >
      {/* Animated gradient wash */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #1E3A5F 50%, #0A1628 100%)',
          backgroundSize: '200% 200%',
          animation: 'hero-gradient 15s linear infinite',
          opacity: 0.15,
        }}
      />

      {/* Back link */}
      <Link
        to="/"
        className="absolute top-6 left-6 flex items-center gap-2 font-inter font-medium text-sm text-slate-400 hover:text-white transition-colors duration-200 z-10"
      >
        <ArrowLeft size={16} />
        Back to Dublin Lions
      </Link>

      {/* Manager login link */}
      <Link
        to="/manager/login"
        className="absolute top-6 right-6 font-inter font-medium text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 z-10"
      >
        Manager Login →
      </Link>

      {/* Login / Register Card */}
      <div
        className={`relative z-10 w-full max-w-md bg-[#1E293B] border border-white/[0.08] rounded-2xl shadow-2xl p-8 md:p-10 transition-all duration-600 ${
          shake ? 'animate-[shake_0.5s_ease-in-out]' : ''
        }`}
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
          />
          <h1 className="font-oswald font-bold text-[2rem] text-white mt-6 text-center">
            {mode === 'login' ? 'Player Portal' : 'Join the Pride'}
          </h1>
          <p className="font-inter text-sm text-slate-400 mt-2 text-center">
            {mode === 'login'
              ? 'Sign in to manage your membership, payments, and club updates.'
              : 'Register to become a member of Dublin Lions Basketball Club.'}
          </p>
        </div>

        {/* Error banner */}
        {status === 'error' && (
          <div className="mt-6 bg-red-500/10 border border-red-500/20 rounded px-4 py-3 text-red-400 text-sm font-inter text-center">
            {errorMsg}
          </div>
        )}

        {/* Success banner */}
        {status === 'success' && (
          <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded px-4 py-3 text-green-400 text-sm font-inter text-center flex items-center justify-center gap-2">
            <CheckCircle size={16} />
            Success! Redirecting...
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-150"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 pr-12 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-150"
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

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border border-[#334155] bg-white/[0.05] text-blue-500 focus:ring-amber-400/30"
                />
                <span className="font-inter text-sm text-slate-300">Remember me</span>
              </label>
              <button
                type="button"
                className="font-inter text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

            {/* Divider */}
            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="font-inter text-xs text-slate-500 uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

          </form>
        ) : (
          <form onSubmit={handleRegister} className="mt-8 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">
                Full Name
              </label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="John Doe"
                required
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-150"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">
                Email Address
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="your.email@example.com"
                required
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-150"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 pr-12 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-150"
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

            {/* Team */}
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">
                Team
              </label>
              <select
                value={regTeam}
                onChange={(e) => setRegTeam(e.target.value)}
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-150"
              >
                <option value="Men's Senior">Men&apos;s Senior</option>
                <option value="Women's Senior">Women&apos;s Senior</option>
                <option value="Men's U20">Men&apos;s U20</option>
                <option value="Women's U20">Women&apos;s U20</option>
              </select>
            </div>

            {/* Position */}
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">
                Position
              </label>
              <select
                value={regPosition}
                onChange={(e) => setRegPosition(e.target.value)}
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-150"
              >
                <option value="Guard">Guard</option>
                <option value="Forward">Forward</option>
                <option value="Center">Center</option>
                <option value="Point Guard">Point Guard</option>
                <option value="Shooting Guard">Shooting Guard</option>
                <option value="Small Forward">Small Forward</option>
                <option value="Power Forward">Power Forward</option>
              </select>
            </div>

            {/* Jersey Number */}
            <div className="space-y-2">
              <label className="block font-inter font-medium text-sm text-slate-300">
                Jersey Number
              </label>
              <input
                type="number"
                value={regJersey}
                onChange={(e) => setRegJersey(e.target.value)}
                placeholder="0"
                min={0}
                max={99}
                required
                className="w-full bg-white/[0.05] border border-[#334155] rounded px-4 py-3 text-white font-inter text-base placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all duration-150"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'loading' || status === 'success'}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:scale-[1.03] hover:shadow-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

        {/* Toggle mode */}
        <div className="mt-6 text-center">
          <p className="font-inter text-sm text-slate-400">
            {mode === 'login' ? "Not a member yet?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setStatus('idle')
                setErrorMsg('')
              }}
              className="font-inter font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
              {mode === 'login' ? 'Join the Pride →' : '← Sign In'}
            </button>
          </p>
        </div>

        {/* Help note */}
        <p className="mt-4 text-center font-inter text-xs text-slate-500">
          Having trouble? Contact Jack Maguire at{' '}
          <a href="mailto:secretary@dublinlions.ie" className="text-blue-400 hover:text-blue-300">
            secretary@dublinlions.ie
          </a>
        </p>
      </div>

      {/* Shake keyframes injected inline */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}
