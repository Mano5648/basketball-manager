import { Link } from 'react-router-dom'
import { Instagram, Facebook, Twitter, MapPin, Mail, User } from 'lucide-react'
import { useSiteImage } from '@/hooks/useSiteImages'

export default function Footer() {
  const logoUrl = useSiteImage('logo')

  return (
    <footer className="bg-darker-navy border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-16 md:py-20">
        {/* Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1 - Brand */}
          <div className="space-y-4">
            <img
              src={logoUrl}
              alt="Dublin Lions"
              className="h-12 w-auto brightness-0 invert"
            />
            <p className="font-inter font-semibold text-sm text-white">
              Dublin Lions Basketball Club
            </p>
            <p className="font-inter text-xs text-slate-400">
              Pride of Dublin since 2018
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div className="space-y-4">
            <h4 className="font-inter font-semibold text-xs uppercase tracking-widest text-slate-400">
              CLUB
            </h4>
            <ul className="space-y-2">
              {['About', 'Teams', 'Fixtures', 'Gallery', 'Membership'].map((item) => (
                <li key={item}>
                  <Link
                    to={item === 'About' ? '/#about' : item === 'Gallery' ? '/#gallery' : item === 'Membership' ? '/#membership' : `/${item.toLowerCase()}`}
                    className="font-inter text-sm text-slate-300 hover:text-electric-blue transition-colors duration-200"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Information */}
          <div className="space-y-4">
            <h4 className="font-inter font-semibold text-xs uppercase tracking-widest text-slate-400">
              INFO
            </h4>
            <ul className="space-y-2">
              {['Contact', 'Venue', 'Coaches', 'Sponsors', 'Privacy Policy'].map((item) => (
                <li key={item}>
                  <Link
                    to={item === 'Contact' ? '/contact' : item === 'Venue' ? '/#venue' : item === 'Privacy Policy' ? '/privacy' : `/${item.toLowerCase()}`}
                    className="font-inter text-sm text-slate-300 hover:text-electric-blue transition-colors duration-200"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Connect */}
          <div className="space-y-4">
            <h4 className="font-inter font-semibold text-xs uppercase tracking-widest text-slate-400">
              CONNECT
            </h4>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/dublinlionsbc/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a
                href="#"
                className="text-slate-400 hover:text-white transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a
                href="#"
                className="text-slate-400 hover:text-white transition-colors duration-200"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </a>
            </div>
            <p className="font-inter text-sm text-slate-300">@dublinlionsbc</p>

            <div className="pt-2 space-y-2">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-electric-blue shrink-0 mt-0.5" />
                <span className="font-inter text-sm text-slate-300">
                  Coláiste Bríde, New Road, Clondalkin, Dublin 22
                </span>
              </div>
              <div className="flex items-start gap-3">
                <Mail size={18} className="text-electric-blue shrink-0 mt-0.5" />
                <span className="font-inter text-sm text-slate-300">
                  info@dublinlions.ie
                </span>
              </div>
              <div className="flex items-start gap-3">
                <User size={18} className="text-electric-blue shrink-0 mt-0.5" />
                <span className="font-inter text-sm text-slate-300">
                  Jack Maguire — Club Secretary
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sponsors Bar */}
        <div className="mt-12 py-6 bg-white/[0.03] rounded-lg">
          <p className="font-inter font-semibold text-xs uppercase tracking-widest text-slate-500 text-center mb-4">
            PROUDLY SPONSORED BY
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <img
              src="/sponsor-joels.png"
              alt="JOELS"
              className="h-8 w-auto grayscale opacity-70 hover:opacity-100 transition-opacity duration-200"
            />
            <img
              src="/sponsor-abbey-seals.png"
              alt="Abbey Seals"
              className="h-8 w-auto grayscale opacity-70 hover:opacity-100 transition-opacity duration-200"
            />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-inter text-xs text-slate-500">
            © 2025 Dublin Lions Basketball Club. All rights reserved.
          </p>
          <p className="font-inter text-xs text-slate-500">
            Designed with pride in Dublin.
          </p>
        </div>
      </div>
    </footer>
  )
}
