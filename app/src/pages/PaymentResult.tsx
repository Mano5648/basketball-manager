import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { verifyCheckout } from '@/lib/stripeCheckout'
import { money } from '@/lib/format'
import { Button, Card } from '@/components/ui'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'

function Frame({ children }: { children: React.ReactNode }) {
  const { settings } = useClub()
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-app px-6 text-fg">
      <div className="w-full max-w-sm space-y-6 text-center">
        <img src={settings?.logo_url || './logo-lions-emblem.png'} alt="" className="mx-auto h-16 w-16 rounded-2xl bg-white object-contain" />
        {children}
      </div>
    </div>
  )
}

export default function PaymentSuccess() {
  const { search } = useLocation()
  const { user } = useAuth()
  const params = new URLSearchParams(search)
  const sessionId = params.get('session_id') ?? ''
  const vt = params.get('vt') ?? ''
  const [state, setState] = useState<{ status: 'checking' | 'ok' | 'error'; amount?: number; items?: string[]; message?: string }>({ status: 'checking' })

  useEffect(() => {
    let tries = 0
    const run = async () => {
      try {
        const v = await verifyCheckout(sessionId, vt)
        setState({ status: 'ok', amount: v.purchase?.amount_cents, items: v.purchase?.items.map((i) => `${i.quantity}× ${i.name}`) })
      } catch (e) {
        if (tries++ < 5) { setTimeout(run, 2000); return }
        setState({ status: 'error', message: e instanceof Error ? e.message : 'Could not verify payment' })
      }
    }
    if (sessionId && vt) void run()
    else setState({ status: 'error', message: 'Missing payment reference' })
  }, [sessionId, vt])

  return (
    <Frame>
      {state.status === 'checking' && <><Loader2 className="mx-auto animate-spin text-lions-400" size={36} /><p className="text-sm text-muted">Confirming your payment with Stripe…</p></>}
      {state.status === 'ok' && (
        <div data-testid="payment-success" className="space-y-4">
          <CheckCircle2 className="mx-auto text-emerald-400" size={48} />
          <h1 className="font-display text-2xl font-bold">Payment received</h1>
          <Card className="text-left text-sm"><p className="text-muted">{state.items?.join(' · ')}</p><p className="mt-2 font-display text-2xl font-bold">{money(state.amount ?? 0)}</p></Card>
          <p className="text-xs text-muted">A receipt has been emailed to you. {!user && 'You can close this window and return to the app.'}</p>
          {user && <Link to="/app/orders"><Button className="w-full" data-testid="payment-view-orders">View my purchases</Button></Link>}
        </div>
      )}
      {state.status === 'error' && (
        <div data-testid="payment-error" className="space-y-4">
          <XCircle className="mx-auto text-rose-400" size={48} />
          <h1 className="font-display text-2xl font-bold">We couldn't confirm that</h1>
          <p className="text-sm text-muted">{state.message}. If you were charged, the payment will show up in your purchases once Stripe confirms it.</p>
          <Link to="/app/orders"><Button variant="secondary" className="w-full">Go to purchases</Button></Link>
        </div>
      )}
    </Frame>
  )
}

export function PaymentCancel() {
  return (
    <Frame>
      <div data-testid="payment-cancel" className="space-y-4">
        <XCircle className="mx-auto text-muted" size={48} />
        <h1 className="font-display text-2xl font-bold">Payment cancelled</h1>
        <p className="text-sm text-muted">Nothing was charged. You can try again whenever you're ready.</p>
        <Link to="/app"><Button className="w-full">Back to the app</Button></Link>
      </div>
    </Frame>
  )
}

export function PrivacyPage() {
  const { settings } = useClub()
  return (
    <div className="mx-auto max-w-2xl px-6 py-12 text-fg">
      <h1 className="font-display text-3xl font-bold text-fg">Privacy policy</h1>
      <p className="mt-2 text-sm text-muted">{settings?.club_name} · club app</p>
      {settings?.privacy_text ? <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed">{settings.privacy_text}</div> : <div className="mt-6 space-y-4 text-sm leading-relaxed">
        <p><b>What we collect.</b> Your name, email, phone number (optional), member type, the names and dates of birth of children you register, team assignments, event RSVPs, lotto entries, bookings and purchase records.</p>
        <p><b>Why.</b> To run the club: communicate news and events, organise teams and fixtures, process payments for memberships, shop orders, tickets, lotto and bookings, and to send you notifications you've opted into.</p>
        <p><b>Payments.</b> Card details are handled entirely by Stripe. We never see or store your card number.</p>
        <p><b>Push notifications.</b> If you allow notifications, a device token is stored so the club can send you messages. You can revoke this in your device settings at any time.</p>
        <p><b>Sharing.</b> Data is stored with Supabase (EU region) and payments with Stripe. We do not sell your data or share it with advertisers.</p>
        <p><b>Your rights.</b> You can update your profile at any time and delete your account and data from <i>Profile → Delete my account</i>, or contact {settings?.contact_email ?? 'the club'}.</p>
      </div>}
      <Link to="/app" className="mt-8 inline-block text-sm text-lions-300 underline">Back to the app</Link>
    </div>
  )
}
