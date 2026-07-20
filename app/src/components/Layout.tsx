import type { ReactNode } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import { CookieNotice } from '@/components/security/CookieNotice'
import { useSmoothScroll } from '@/hooks/useSmoothScroll'

interface LayoutProps {
  children: ReactNode
  hideFooter?: boolean
}

export default function Layout({ children, hideFooter = false }: LayoutProps) {
  useSmoothScroll()

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      {!hideFooter && <Footer />}
      <CookieNotice />
    </div>
  )
}
