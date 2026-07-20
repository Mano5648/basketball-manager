import { useState } from 'react'
import { createPortal } from 'react-dom'
import { CreditCard, Eye, EyeOff, Loader2, X, CheckCircle2 } from 'lucide-react'

export interface PaymentCheckoutResult {
  cardLast4: string
  cardholderName: string
}

interface PaymentCheckoutProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  amount: number
  onSuccess: (result: PaymentCheckoutResult) => void
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ').trim()
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function isExpiryValid(expiry: string) {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  const now = new Date()
  const exp = new Date(year, month, 0, 23, 59, 59)
  return exp >= new Date(now.getFullYear(), now.getMonth(), 1)
}

export function PaymentCheckout({ open, onClose, title, description, amount, onSuccess }: PaymentCheckoutProps) {
  const [cardholderName, setCardholderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [showCvc, setShowCvc] = useState(false)
  const [error, setError] = useState('')
  const [phase, setPhase] = useState<'form' | 'processing' | 'success'>('form')

  if (!open) return null

  const digits = cardNumber.replace(/\D/g, '')
  const canPay =
    cardholderName.trim().length >= 2 &&
    digits.length >= 15 &&
    isExpiryValid(expiry) &&
    cvc.replace(/\D/g, '').length >= 3

  const handlePay = () => {
    setError('')
    if (!canPay) {
      setError('Enter a valid cardholder name, card number, expiry, and CVC.')
      return
    }
    setPhase('processing')
    setTimeout(() => {
      setPhase('success')
      onSuccess({
        cardLast4: digits.slice(-4),
        cardholderName: cardholderName.trim(),
      })
    }, 1400)
  }

  const handleClose = () => {
    if (phase === 'processing') return
    setPhase('form')
    setError('')
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md mgr-panel shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="mgr-panel-header">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lions-500/15 border border-lions-400/25 shrink-0">
              <CreditCard size={17} className="text-lions-300" />
            </div>
            <div className="min-w-0">
              <h3 className="mgr-panel-title truncate">{title}</h3>
              {description && <p className="font-inter text-xs text-slate-500 mt-0.5 truncate">{description}</p>}
            </div>
          </div>
          <button type="button" onClick={handleClose} className="text-slate-500 hover:text-white p-1" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          {phase === 'success' ? (
            <div className="py-6 text-center">
              <CheckCircle2 size={44} className="text-emerald-400 mx-auto mb-3" />
              <p className="font-inter font-medium text-white">Payment successful</p>
              <p className="font-inter text-sm text-slate-500 mt-1">€{amount.toFixed(2)} charged to card •••• {digits.slice(-4)}</p>
              <button type="button" onClick={handleClose} className="mt-5 w-full rounded-lg px-4 py-2.5 font-inter text-sm font-semibold text-white bg-lions-500 hover:bg-lions-400 transition-colors">
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 mb-5">
                <p className="font-inter text-xs uppercase tracking-[0.16em] text-slate-500">Amount due</p>
                <p className="font-oswald font-bold text-3xl text-white mt-1">€{amount.toFixed(2)}</p>
              </div>

              <div className="bg-warn-500/10 border border-warn-500/20 rounded-lg px-3 py-2 mb-4">
                <p className="font-inter text-xs text-warn-300">
                  Demo checkout — Stripe is not configured. Use 4242 4242 4242 4242, any future expiry, any CVC.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-inter text-xs text-slate-400 mb-1">Name on card</label>
                  <input
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Full name"
                    className="mgr-chat-input w-full"
                    autoComplete="cc-name"
                  />
                </div>
                <div>
                  <label className="block font-inter text-xs text-slate-400 mb-1">Card number</label>
                  <input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                    className="mgr-chat-input w-full"
                    autoComplete="cc-number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-inter text-xs text-slate-400 mb-1">Expiry</label>
                    <input
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      className="mgr-chat-input w-full"
                      autoComplete="cc-exp"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-xs text-slate-400 mb-1">CVC</label>
                    <div className="relative">
                      <input
                        type={showCvc ? 'text' : 'password'}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        inputMode="numeric"
                        className="mgr-chat-input w-full pr-10"
                        autoComplete="cc-csc"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvc(!showCvc)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        aria-label={showCvc ? 'Hide CVC' : 'Show CVC'}
                      >
                        {showCvc ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-3 font-inter text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={!canPay || phase === 'processing'}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-lg px-4 py-3 font-inter text-sm font-semibold text-white transition-colors disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #2E6BFF, #1B52E6)' }}
              >
                {phase === 'processing' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>Pay €{amount.toFixed(2)}</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
