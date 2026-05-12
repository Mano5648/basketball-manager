import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useSiteImage } from '@/hooks/useSiteImages'

const navLinks = [
  { label: 'About', href: '/#about' },
  { label: 'Teams', href: '/teams' },
  { label: 'Schedule', href: '/#schedule' },
  { label: 'Gallery', href: '/#gallery' },
  { label: 'Contact', href: '/contact' },
  { label: 'Store', href: '/store' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const logoUrl = useSiteImage('logo')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const isHomePage = location.pathname === '/'

  const handleNavClick = (href: string) => {
    setMobileOpen(false)
    if (href.startsWith('/#') && isHomePage) {
      const id = href.replace('/#', '')
      const el = document.getElementById(id)
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    }
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(10,22,40,0.95)] backdrop-blur-md shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-16 md:h-20 items-center justify-between px-4 md:px-8 lg:px-12 max-w-7xl">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={logoUrl}
              alt="Dublin Lions"
              className="h-10 md:h-12 w-auto brightness-0 invert"
            />
            <span className="font-oswald font-bold text-white text-lg md:text-xl tracking-tight hidden sm:block">
              DUBLIN LIONS
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
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
                  className="relative font-inter font-medium text-sm uppercase tracking-widest text-white hover:text-electric-blue transition-colors duration-200 group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-1/2 h-[2px] w-0 bg-electric-blue transition-all duration-200 group-hover:w-full group-hover:left-0" />
                </a>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className="relative font-inter font-medium text-sm uppercase tracking-widest text-white hover:text-electric-blue transition-colors duration-200 group"
                >
                  {link.label}
                  <span className="absolute -bottom-1 left-1/2 h-[2px] w-0 bg-electric-blue transition-all duration-200 group-hover:w-full group-hover:left-0" />
                </Link>
              )
            )}
          </div>

          {/* Desktop CTA + Auth links */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/player/login"
              className="font-inter font-medium text-sm uppercase tracking-widest text-white/70 hover:text-electric-blue transition-colors duration-200"
            >
              Player Login
            </Link>
            <Link
              to="/manager/login"
              className="bg-electric-blue text-white font-inter font-semibold text-sm uppercase tracking-widest px-6 py-3 rounded hover:bg-blue-400 hover:scale-[1.03] hover:shadow-lg transition-all duration-150"
            >
              Join the Pride
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-deep-navy transition-transform duration-400 ease-out ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8 px-8">
          <button
            className="absolute top-5 right-5 text-white p-2"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X size={32} />
          </button>
          {navLinks.map((link, i) =>
            link.href.startsWith('/#') ? (
              <a
                key={link.label}
                href={isHomePage ? link.href : `/${link.href.replace('/#', '')}`}
                onClick={(e) => {
                  if (isHomePage) {
                    e.preventDefault()
                    handleNavClick(link.href)
                  }
                  setMobileOpen(false)
                }}
                className="font-oswald font-bold text-2xl text-white hover:text-electric-blue transition-colors duration-200"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="font-oswald font-bold text-2xl text-white hover:text-electric-blue transition-colors duration-200"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {link.label}
              </Link>
            )
          )}
          <div className="flex flex-col gap-4 mt-4 items-center">
            <Link
              to="/player/login"
              onClick={() => setMobileOpen(false)}
              className="font-inter font-semibold text-base uppercase tracking-widest text-white/80 hover:text-electric-blue transition-colors duration-200"
            >
              Player Login
            </Link>
            <Link
              to="/manager/login"
              onClick={() => setMobileOpen(false)}
              className="bg-electric-blue text-white font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:bg-blue-400 transition-all duration-150"
            >
              Join the Pride
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
