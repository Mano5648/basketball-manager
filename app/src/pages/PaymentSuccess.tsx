import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import { verifyStripeCheckout } from '@/lib/stripeCheckout'
import {
  markOrderPaid,
  recordCardPayment,
  recordGuestCardPayment,
  addTicketPurchase,
} from '@/lib/clubData'

function finalizeLocalPurchase(verified: Awaited<ReturnType<typeof verifyStripeCheckout>>) {
  const purchase = verified.purchase
  if (!purchase || !verified.confirmed || verified.status !== 'paid') return

  const meta = { ...(purchase.metadata ?? {}), ...(verified.metadata ?? {}) }
  const type = purchase.purchase_type
  const amount = purchase.amount_cents / 100

  if (type === 'store') {
    markOrderPaid(purchase.reference_id)
    return
  }

  if (type === 'ticket') {
    recordGuestCardPayment({
      payerName: purchase.customer_name,
      payerEmail: purchase.customer_email,
      amount,
      plan: `Ticket - ${meta.fixture_name || 'Match'}`,
      referenceId: purchase.reference_id,
      method: 'Stripe',
    })

    if (meta.user_id) {
      addTicketPurchase({
        userId: meta.user_id,
        fixtureKey: meta.fixture_key || '',
        fixtureName: meta.fixture_name || 'Match',
        fixtureDate: meta.fixture_date || '',
        adultQty: Number(meta.adult_qty || 0),
        kidQty: Number(meta.kid_qty || 0),
        adultPrice: Number(meta.adult_price || 0),
        kidPrice: Number(meta.kid_price || 0),
        total: amount,
        receiptId: purchase.reference_id,
        paymentMethod: 'card',
        buyerName: purchase.customer_name,
        buyerEmail: purchase.customer_email,
      })
    }
    return
  }

  if (type === 'membership') {
    const playerId = meta.player_id || purchase.metadata?.player_id
    if (!playerId) return
    recordCardPayment({
      playerId,
      amount,
      plan: meta.plan_label || 'Membership',
      payerName: purchase.customer_name,
      method: 'Stripe',
    })
  }
}

export default function PaymentSuccess() {
  const [params] = useSearchParams()
  const sessionId = params.get('session_id')
  const verificationToken = params.get('vt')
  const [phase, setPhase] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  useEffect(() => {
    if (!sessionId || !verificationToken) {
      setPhase('error')
      setMessage('Missing payment session.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const verified = await verifyStripeCheckout(sessionId, verificationToken)
        if (cancelled) return
        if (verified.status === 'paid' && verified.confirmed) {
          finalizeLocalPurchase(verified)
          setEmailSent(Boolean(verified.emailSent))
          setPhase('success')
        } else {
          setPhase('error')
          setMessage('Payment was not completed. Please try again.')
        }
      } catch (err) {
        if (cancelled) return
        setPhase('error')
        setMessage(err instanceof Error ? err.message : 'Could not verify payment')
      }
    })()

    return () => { cancelled = true }
  }, [sessionId, verificationToken])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="mgr-panel max-w-md w-full p-8 text-center">
        {phase === 'loading' && (
          <>
            <Loader2 className="mx-auto mb-4 text-lions-400 animate-spin" size={40} />
            <h1 className="font-oswald font-bold text-2xl text-white">Confirming payment…</h1>
            <p className="font-inter text-sm text-slate-400 mt-2">Please wait while we confirm your payment with Stripe.</p>
          </>
        )}
        {phase === 'success' && (
          <>
            <CheckCircle className="mx-auto mb-4 text-emerald-400" size={44} />
            <h1 className="font-oswald font-bold text-2xl text-white">Payment successful</h1>
            <p className="font-inter text-sm text-slate-400 mt-2">
              {emailSent
                ? 'Thank you — your purchase has been recorded and a confirmation email is on its way.'
                : 'Thank you — your purchase has been recorded.'}
            </p>
            <Link to="/" className="inline-block mt-6 font-inter text-sm text-lions-300 hover:text-white">Back to home</Link>
          </>
        )}
        {phase === 'error' && (
          <>
            <XCircle className="mx-auto mb-4 text-red-400" size={44} />
            <h1 className="font-oswald font-bold text-2xl text-white">Payment issue</h1>
            <p className="font-inter text-sm text-slate-400 mt-2">{message}</p>
            <Link to="/store" className="inline-block mt-6 font-inter text-sm text-lions-300 hover:text-white">Return to store</Link>
          </>
        )}
      </div>
    </div>
  )
}

export function PaymentCancel() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="mgr-panel max-w-md w-full p-8 text-center">
        <XCircle className="mx-auto mb-4 text-slate-400" size={44} />
        <h1 className="font-oswald font-bold text-2xl text-white">Checkout cancelled</h1>
        <p className="font-inter text-sm text-slate-400 mt-2">No payment was taken. You can try again whenever you&apos;re ready.</p>
        <Link to="/store" className="inline-block mt-6 font-inter text-sm text-lions-300 hover:text-white">Back to store</Link>
      </div>
    </div>
  )
}
