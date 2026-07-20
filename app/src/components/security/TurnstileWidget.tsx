import { useEffect, useRef, useState } from 'react'
import { isTurnstileConfigured } from '@/lib/security'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback'?: () => void
        'error-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
      }) => string
      remove: (widgetId: string) => void
    }
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load security check'))
    document.head.appendChild(script)
  })
  return scriptPromise
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
}

export function TurnstileWidget({ onVerify, onExpire, theme = 'auto' }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isTurnstileConfigured() || !containerRef.current) return

    let widgetId = ''
    let cancelled = false

    ;(async () => {
      try {
        await loadTurnstileScript()
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          callback: onVerify,
          'expired-callback': onExpire,
          'error-callback': () => setFailed(true),
          theme,
        })
      } catch {
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [onVerify, onExpire, theme])

  if (!isTurnstileConfigured()) return null

  return (
    <div>
      <div ref={containerRef} />
      {failed && (
        <p className="font-inter text-xs text-red-300 mt-2">Security check failed to load. Refresh and try again.</p>
      )}
    </div>
  )
}
