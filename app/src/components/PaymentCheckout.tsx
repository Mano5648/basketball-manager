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
    <div className="club-store-overlay fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0" onClick={handleClose} />
      <div
        className="club-store-sheet relative z-10 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 shrink-0">
              <CreditCard size={18} className="text-slate-700" />
            </div>
            <div className="min-w-0">
              <h3 className="font-oswald font-bold text-lg text-slate-900 tracking-tight truncate">{title}</h3>
              {description && <p className="font-inter text-xs text-slate-500 mt-0.5 truncate">{description}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {phase === 'success' ? (
            <div className="py-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-emerald-600" />
              </div>
              <p className="font-inter font-semibold text-slate-900">Payment successful</p>
              <p className="font-inter text-sm text-slate-500 mt-1">
                €{amount.toFixed(2)} charged to card ending {digits.slice(-4)}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="club-store-cta mt-5 w-full rounded-xl px-4 py-2.5 font-inter text-sm font-semibold transition-all active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 mb-5">
                <p className="font-inter text-xs font-medium text-slate-500">Amount due</p>
                <p className="font-oswald font-bold text-3xl text-slate-900 mt-1 tabular-nums tracking-tight">
                  €{amount.toFixed(2)}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 mb-4">
                <p className="font-inter text-xs text-amber-900">
                  Demo checkout. Stripe is not configured. Use 4242 4242 4242 4242, any future expiry, any CVC.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-inter text-xs font-medium text-slate-600 mb-1.5">Name on card</label>
                  <input
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="Full name"
                    className="club-store-input"
                    autoComplete="cc-name"
                  />
                </div>
                <div>
                  <label className="block font-inter text-xs font-medium text-slate-600 mb-1.5">Card number</label>
                  <input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                    className="club-store-input"
                    autoComplete="cc-number"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-inter text-xs font-medium text-slate-600 mb-1.5">Expiry</label>
                    <input
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      className="club-store-input"
                      autoComplete="cc-exp"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-xs font-medium text-slate-600 mb-1.5">CVC</label>
                    <div className="relative">
                      <input
                        type={showCvc ? 'text' : 'password'}
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        inputMode="numeric"
                        className="club-store-input pr-10"
                        autoComplete="cc-csc"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCvc(!showCvc)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        aria-label={showCvc ? 'Hide CVC' : 'Show CVC'}
                      >
                        {showCvc ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <p className="mt-3 font-inter text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={!canPay || phase === 'processing'}
                className="club-store-cta mt-5 w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-inter text-sm font-semibold transition-all disabled:opacity-40 active:scale-[0.98]"
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
