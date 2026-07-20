import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PRIVACY_POLICY_PATH } from '@/lib/security'

const STORAGE_KEY = 'dlbc_cookie_notice'

export function CookieNotice() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-[120] p-4">
      <div className="max-w-3xl mx-auto rounded-xl border border-white/10 bg-[#0f172a]/95 backdrop-blur-md shadow-2xl p-4 md:p-5">
        <p className="font-inter text-sm text-slate-200">
          We use essential cookies and local storage to keep you signed in, remember cart items, and protect forms from abuse.
          We do not use advertising trackers. See our{' '}
          <Link to={PRIVACY_POLICY_PATH} className="text-amber-400 hover:text-amber-300 underline">
            Privacy Policy
          </Link>{' '}
          for how we handle personal data under Irish and EU law.
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, 'accepted')
            setVisible(false)
          }}
          className="mt-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0A1628] font-inter text-sm font-semibold px-4 py-2"
        >
          OK, understood
        </button>
      </div>
    </div>
  )
}
