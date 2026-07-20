import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, LogOut, LayoutDashboard, ChevronDown, User } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useSiteImage } from '@/hooks/useSiteImages'
import { useAuth } from '@/lib/AuthContext'
import { scrollToAnchor } from '@/lib/smoothScroll'

type AuthUser = { role: 'manager' | 'player'; name?: string; email?: string } | null

function readUser(): AuthUser {
  try {
    const raw = localStorage.getItem('dlbc_user')
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

const navLinks = [
  { label: 'About', href: '/#about' },
  { label: 'Teams', href: '/teams' },
  { label: 'Schedule', href: '/#schedule' },
  { label: 'Gallery', href: '/#gallery' },
  { label: 'Contact', href: '/contact' },
  { label: 'Store', href: '/store' },
]

function userInitials(name?: string, email?: string) {
  const source = name || email || 'DL'
  return source
    .split(/[\s@]+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [user, setUser] = useState<AuthUser>(() => readUser())
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const logoUrl = useSiteImage('logo')
  const { signOut } = useAuth()

  useEffect(() => {
    const sync = () => setUser(readUser())
    window.addEventListener('storage', sync)
    window.addEventListener('dlbc-auth-change', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('dlbc-auth-change', sync)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    if (!userMenuOpen) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [userMenuOpen])

  const handleLogout = async () => {
    await signOut()
    setUser(null)
    setMobileOpen(false)
    setUserMenuOpen(false)
    navigate('/')
  }

  const dashboardPath = user?.role === 'manager' ? '/manager/dashboard' : '/player/dashboard'
  const roleLabel = user?.role === 'manager' ? 'Manager' : 'Member'
  const isHomePage = location.pathname === '/'
  const onHero = isHomePage && !scrolled

  const handleNavClick = (href: string) => {
    setMobileOpen(false)
    if (href.startsWith('/#') && isHomePage) {
      const id = href.replace('/#', '')
      scrollToAnchor(id, 80)
    }
  }

  const linkClass = onHero
    ? 'club-nav-link club-nav-link--hero'
    : 'club-nav-link'

  return (
    <>
      <header
        className={`club-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'club-nav--scrolled' : 'club-nav--top'
        }`}
      >
        <div className="mx-auto flex h-[4.25rem] items-center justify-between px-4 md:px-8 lg:px-12 max-w-7xl">
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <span className={`club-nav-logo-wrap ${onHero ? 'club-nav-logo-wrap--hero' : ''}`}>
              <img src={logoUrl} alt="Dublin Lions" className="h-8 w-auto" />
            </span>
            <span className={`font-oswald font-semibold text-base tracking-tight hidden sm:block ${onHero ? 'text-white' : 'text-slate-900'}`}>
              Dublin Lions
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) =>
              link.href.startsWith('/#') ? (
                <a
                  key={link.label}
                  href={isHomePage ? link.href : `/${link.href.replace('/#', '')}`}
                  onClick={(e) => {
                    if (isHomePage) {
                      e.preventDefault()
                      handleNavClick(link.href)
                    }
                  }}
                  className={linkClass}
                >
                  {link.label}
                </a>
              ) : (
                <Link key={link.label} to={link.href} className={linkClass}>
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((o) => !o)}
                  className={`club-user-pill ${onHero ? 'club-user-pill--hero' : ''}`}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="club-user-avatar">{userInitials(user.name, user.email)}</span>
                  <span className="hidden sm:flex flex-col items-start leading-tight min-w-0">
                    <span className="font-inter text-sm font-semibold truncate max-w-[120px]">
                      {user.name?.split(' ')[0] || 'Member'}
                    </span>
                    <span className="font-inter text-[10px] uppercase tracking-wider opacity-70">{roleLabel}</span>
                  </span>
                  <ChevronDown size={14} className={`shrink-0 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      className="club-user-menu"
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.2 }}
                      role="menu"
                    >
                      <p className="px-3 py-2 font-inter text-xs text-slate-500 border-b border-slate-100 mb-1 truncate">
                        {user.email}
                      </p>
                      <Link
                        to={dashboardPath}
                        onClick={() => setUserMenuOpen(false)}
                        className="club-user-menu-item"
                        role="menuitem"
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </Link>
                      <Link
                        to={user.role === 'manager' ? '/manager/dashboard' : '/player/dashboard?tab=profile'}
                        onClick={() => setUserMenuOpen(false)}
                        className="club-user-menu-item"
                        role="menuitem"
                      >
                        <User size={16} />
                        My account
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="club-user-menu-item club-user-menu-item--danger w-full"
                        role="menuitem"
                      >
                        <LogOut size={16} />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/player/login" className={onHero ? 'club-nav-link club-nav-link--hero' : 'club-nav-link'}>
                  Sign in
                </Link>
                <Link to="/player/login" className="ldf-btn-primary text-sm px-5 py-2.5 shadow-lg">
                  Join the Pride
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className={`md:hidden p-2 rounded-lg ${onHero ? 'text-white' : 'text-slate-900'}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="club-mobile-menu fixed inset-0 z-[60]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="club-mobile-menu__backdrop" onClick={() => setMobileOpen(false)} />
            <motion.nav
              className="club-mobile-menu__panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            >
              <button
                type="button"
                className="absolute top-5 right-5 text-white/80 p-2"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X size={28} />
              </button>

              {user && (
                <div className="mb-8 p-4 rounded-2xl bg-white/5 ring-1 ring-white/10">
                  <div className="flex items-center gap-3">
                    <span className="club-user-avatar club-user-avatar--lg">{userInitials(user.name, user.email)}</span>
                    <div>
                      <p className="font-inter font-semibold text-white">{user.name || 'Member'}</p>
                      <p className="font-inter text-xs text-white/50">{roleLabel} · {user.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1">
                {navLinks.map((link, i) =>
                  link.href.startsWith('/#') ? (
                    <motion.a
                      key={link.label}
                      href={isHomePage ? link.href : `/${link.href.replace('/#', '')}`}
                      onClick={(e) => {
                        if (isHomePage) {
                          e.preventDefault()
                          handleNavClick(link.href)
                        }
                        setMobileOpen(false)
                      }}
                      className="club-mobile-link"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      {link.label}
                    </motion.a>
                  ) : (
                    <motion.div key={link.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link to={link.href} onClick={() => setMobileOpen(false)} className="club-mobile-link">
                        {link.label}
                      </Link>
                    </motion.div>
                  ),
                )}
              </div>

              <div className="mt-10 flex flex-col gap-3">
                {user ? (
                  <>
                    <Link to={dashboardPath} onClick={() => setMobileOpen(false)} className="ldf-btn-primary text-center">
                      Dashboard
                    </Link>
                    <button type="button" onClick={handleLogout} className="club-mobile-link text-center text-red-300">
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/player/login" onClick={() => setMobileOpen(false)} className="club-mobile-link text-center">
                      Sign in
                    </Link>
                    <Link to="/player/login" onClick={() => setMobileOpen(false)} className="ldf-btn-primary text-center">
                      Join the Pride
                    </Link>
                  </>
                )}
              </div>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
