import { useState, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  ShoppingBag,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Trash2,
  Package,
  CheckCircle,
  CreditCard,
  Banknote,
} from 'lucide-react'
import {
  getProducts,
  getCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  getCartTotal,
  getCartCount,
  placeOrder,
  createPendingOrder,
  markOrderPaid,
  ensureAppStateKeySynced,
  syncCartToStock,
  getRemainingStock,
  LOW_STOCK_THRESHOLD,
  type Product,
} from '@/lib/clubData'
import { PaymentCheckout } from '@/components/PaymentCheckout'
import { redirectToStripeCheckout, isStripeCheckoutConfigured } from '@/lib/stripeCheckout'
import { getLoggedInContact } from '@/lib/authUser'
import { sendPurchaseConfirmationEmail } from '@/lib/purchaseEmail'
import { toAbsoluteImageUrl } from '@/lib/imageUrl'
import { HoneypotField, PrivacyConsentField } from '@/components/security/PrivacyConsentField'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'
import { validatePublicFormSecurity } from '@/lib/security'

const CATEGORIES = ['All', 'Jerseys', 'Apparel', 'Equipment', 'Accessories', 'Kits']

/* ─────────────────────── Cart Drawer ─────────────────────── */

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cart, setCartState] = useState(getCart)
  const [products, setProductsState] = useState(getProducts)
  const [cartNotice, setCartNotice] = useState('')
  const total = getCartTotal()
  const count = getCartCount()

  useEffect(() => {
    const sync = () => { setCartState(getCart()); setProductsState(getProducts()) }
    sync()
    const h = () => sync()
    window.addEventListener('dlbc-cart-change', h)
    window.addEventListener('dlbc-auth-change', h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener('dlbc-cart-change', h)
      window.removeEventListener('dlbc-auth-change', h)
      window.removeEventListener('storage', h)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const warnings = syncCartToStock()
    if (warnings.length > 0) setCartNotice(warnings[0])
    else setCartNotice('')
  }, [open])

  const cartItems = useMemo(() => {
    return cart
      .map((c) => {
        const p = products.find((pr) => pr.id === c.productId)
        return p ? { ...c, product: p } : null
      })
      .filter(Boolean) as { productId: string; quantity: number; product: Product }[]
  }, [cart, products])

  return createPortal(
    <>
      <div
        className={`club-store-overlay fixed inset-0 z-[70] transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div
        className={`club-store-drawer fixed top-0 right-0 bottom-0 z-[80] w-full max-w-md flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!open}
        role="dialog"
        aria-label="Your cart"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80">
          <div>
            <h2 className="font-oswald font-bold text-xl text-slate-900 tracking-tight">Your cart</h2>
            <p className="font-inter text-xs text-slate-500 mt-0.5">{count} {count === 1 ? 'item' : 'items'}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-[0.98]"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 scroll-slim">
          {cartNotice && (
            <p className="font-inter text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
              {cartNotice}
            </p>
          )}
          {cartItems.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart size={24} className="text-slate-400" />
              </div>
              <p className="font-inter font-medium text-slate-900">Cart is empty</p>
              <p className="font-inter text-sm text-slate-500 mt-1">Add club gear to get started.</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.productId} className="flex gap-3.5 p-3.5 rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-sm">
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.product.imageKey ? (
                    <img src={item.product.imageKey} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Package size={20} className="text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-inter font-medium text-sm text-slate-900 truncate">{item.product.name}</p>
                  <p className="font-inter text-xs text-slate-500 mt-0.5">€{item.product.price.toFixed(2)} each</p>
                  {item.product.stock <= LOW_STOCK_THRESHOLD && item.product.stock > 0 && (
                    <p className="font-inter text-[11px] text-amber-700 mt-0.5">Only {item.product.stock} left</p>
                  )}
                  <div className="flex items-center gap-2.5 mt-2.5">
                    <div className="flex items-center rounded-lg bg-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          const result = updateCartQuantity(item.productId, item.quantity - 1)
                          if (!result.ok && result.reason) setCartNotice(result.reason)
                          else setCartNotice('')
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 active:scale-95"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-inter text-sm text-slate-900 w-6 text-center tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const result = updateCartQuantity(item.productId, item.quantity + 1)
                          if (!result.ok && result.reason) setCartNotice(result.reason)
                          else setCartNotice('')
                        }}
                        disabled={getRemainingStock(item.productId) <= 0}
                        className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="font-inter font-semibold text-sm text-slate-900 tabular-nums shrink-0">
                  €{(item.product.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="px-5 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between mb-1">
              <span className="font-inter text-sm text-slate-500">Subtotal</span>
              <span className="font-oswald font-bold text-xl text-slate-900 tabular-nums">€{total.toFixed(2)}</span>
            </div>
          </div>
        )}
        <CheckoutButton showTrigger={cartItems.length > 0} onSuccess={onClose} />
      </div>
    </>,
    document.body,
  )
}

/* ─────────────────────── Checkout Modal ─────────────────────── */

function CheckoutButton({ showTrigger, onSuccess }: { showTrigger: boolean; onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'card' | 'cash'>('card')
  const [done, setDone] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [error, setError] = useState('')
  const [pendingOrder, setPendingOrder] = useState<{ id: string; total: number } | null>(null)
  const [paying, setPaying] = useState(false)
  const [checkoutStartedAt] = useState(() => Date.now())
  const [honeypot, setHoneypot] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const loggedInContact = getLoggedInContact()

  const openCheckout = () => {
    const contact = getLoggedInContact()
    if (contact) {
      setName(contact.name)
      setEmail(contact.email)
    }
    setOpen(true)
  }

  const handleCheckout = async () => {
    setError('')
    if (!name.trim() || !email.trim()) return

    const security = validatePublicFormSecurity({
      honeypot,
      formStartedAt: checkoutStartedAt,
      rateLimitKey: `checkout:${email.trim().toLowerCase()}`,
      privacyAccepted,
      turnstileToken,
      maxAttempts: 8,
    })
    if (!security.ok) {
      setError(security.error)
      return
    }

    if (method === 'card') {
      const { order, errors } = createPendingOrder(name.trim(), email.trim())
      if (!order) {
        setError(errors?.[0] || 'Could not place order')
        return
      }
      const lineItems = order.items.map((item) => {
        const product = getProducts().find((p) => p.id === item.productId)
        return {
          name: item.productName,
          amountCents: Math.round(item.price * 100),
          quantity: item.quantity,
          imageUrl: toAbsoluteImageUrl(product?.imageKey),
        }
      })
      setPaying(true)
      try {
        await ensureAppStateKeySynced('dlbc_orders')
        const redirected = await redirectToStripeCheckout({
          purchaseType: 'store',
          referenceId: order.id,
          customerName: name.trim(),
          customerEmail: email.trim(),
          lineItems,
          metadata: { order_id: order.id },
          turnstileToken,
        })
        if (!redirected) {
          setPendingOrder({ id: order.id, total: order.total })
          setOpen(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start payment')
        setOpen(true)
      } finally {
        setPaying(false)
      }
      return
    }
    const { order, errors } = placeOrder(name.trim(), email.trim())
    if (!order) {
      setError(errors?.[0] || 'Could not place order')
      return
    }
    setOrderId(order.id)
    setDone(true)
  }

  const closeAll = () => {
    setOpen(false)
    setDone(false)
    setName('')
    setEmail('')
    setMethod('card')
    setPendingOrder(null)
    onSuccess()
  }

  return (
    <>
      {showTrigger && (
        <div className="px-5 pb-5 pt-3">
          <button
            type="button"
            onClick={openCheckout}
            className="club-store-cta w-full font-inter font-semibold text-sm rounded-xl px-4 py-3.5 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <CreditCard size={16} /> Checkout
          </button>
        </div>
      )}

      {open && createPortal(
        <div
          className="club-store-overlay fixed inset-0 z-[200] flex items-center justify-center p-4"
          onClick={() => !done && setOpen(false)}
        >
          <div
            className="club-store-sheet w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {!done ? (
              <>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/80">
                  <div>
                    <h3 className="font-oswald font-bold text-xl text-slate-900 tracking-tight">Checkout</h3>
                    <p className="font-inter text-xs text-slate-500 mt-0.5">Confirm details and pay</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    aria-label="Close checkout"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-4 relative">
                  <HoneypotField value={honeypot} onChange={setHoneypot} />
                  {loggedInContact && (
                    <p className="font-inter text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                      Pre-filled from your account. Edit below if needed.
                    </p>
                  )}
                  <div>
                    <label className="block font-inter text-xs font-medium text-slate-600 mb-1.5">Full name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="club-store-input"
                      placeholder="e.g. Aoife Murphy"
                      autoComplete="name"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-xs font-medium text-slate-600 mb-1.5">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="club-store-input"
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-xs font-medium text-slate-600 mb-2">Payment method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMethod('card')}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 border font-inter text-sm transition-all active:scale-[0.98] ${
                          method === 'card'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <CreditCard size={16} /> Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setMethod('cash')}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 border font-inter text-sm transition-all active:scale-[0.98] ${
                          method === 'cash'
                            ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        <Banknote size={16} /> Cash
                      </button>
                    </div>
                    {method === 'cash' && (
                      <p className="font-inter text-xs text-slate-500 mt-2">Pay when you collect from the club.</p>
                    )}
                  </div>
                  <PrivacyConsentField checked={privacyAccepted} onChange={setPrivacyAccepted} tone="light" />
                  <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} theme="light" />
                </div>
                {error && (
                  <p className="font-inter text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl mx-5 mb-3 px-3 py-2.5">
                    {error}
                  </p>
                )}
                <div className="p-5 border-t border-slate-200/80 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 font-inter font-medium text-sm rounded-xl px-4 py-2.5 hover:bg-slate-50 active:scale-[0.98] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={!name.trim() || !email.trim() || paying}
                    className="club-store-cta flex-1 font-inter font-semibold text-sm rounded-xl px-4 py-2.5 transition-all disabled:opacity-40 active:scale-[0.98]"
                  >
                    {paying ? 'Redirecting…' : method === 'card' ? (isStripeCheckoutConfigured() ? 'Pay with Stripe' : 'Continue to payment') : 'Place order'}
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={28} className="text-emerald-600" />
                </div>
                <h3 className="font-oswald font-bold text-2xl text-slate-900 mb-2 tracking-tight">Order confirmed</h3>
                <p className="font-inter text-slate-600 mb-1">Thanks for supporting Dublin Lions.</p>
                <p className="font-inter text-sm text-slate-500 mb-1">Confirmation sent to {email || 'your inbox'}.</p>
                <p className="font-inter text-sm text-slate-500 mb-6">
                  Order <span className="text-slate-900 font-mono text-xs">{orderId}</span>
                </p>
                <button
                  type="button"
                  onClick={closeAll}
                  className="club-store-cta font-inter font-semibold text-sm rounded-xl px-8 py-3 transition-all active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {pendingOrder && (
        <PaymentCheckout
          open
          title="Club store checkout"
          description={`Order ${pendingOrder.id}`}
          amount={pendingOrder.total}
          onClose={() => setPendingOrder(null)}
          onSuccess={({ cardLast4 }) => {
            const paid = markOrderPaid(pendingOrder.id, cardLast4)
            if (paid) {
              void sendPurchaseConfirmationEmail({
                customerName: paid.customerName,
                customerEmail: paid.customerEmail,
                purchaseType: 'store',
                referenceId: paid.id,
                amountCents: Math.round(paid.total * 100),
                items: paid.items.map((item) => {
                  const product = getProducts().find((p) => p.id === item.productId)
                  return {
                    name: item.productName,
                    quantity: item.quantity,
                    amountCents: Math.round(item.price * 100),
                    imageUrl: toAbsoluteImageUrl(product?.imageKey),
                  }
                }),
              })
            }
            setOrderId(pendingOrder.id)
            setPendingOrder(null)
            setDone(true)
            setOpen(true)
          }}
        />
      )}
    </>
  )
}

/* ─────────────────────── Store Page ─────────────────────── */

export default function Store({ embedded = false }: { embedded?: boolean } = {}) {
  const [products, setProductsState] = useState(() => getProducts().filter((p) => p.active))
  const [category, setCategory] = useState('All')
  const [cartOpen, setCartOpen] = useState(false)
  const [cartCount, setCartCount] = useState(getCartCount)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [storeNotice, setStoreNotice] = useState('')

  useEffect(() => {
    const sync = () => {
      setProductsState(getProducts().filter((p) => p.active))
      setCartCount(getCartCount())
    }
    sync()
    const h = () => sync()
    window.addEventListener('dlbc-cart-change', h)
    window.addEventListener('dlbc-auth-change', h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener('dlbc-cart-change', h)
      window.removeEventListener('dlbc-auth-change', h)
      window.removeEventListener('storage', h)
    }
  }, [])

  const filtered = useMemo(() => {
    if (category === 'All') return products
    return products.filter((p) => p.category === category)
  }, [products, category])

  const handleAdd = useCallback((id: string) => {
    const result = addToCart(id)
    if (!result.ok) {
      setStoreNotice(result.reason || 'Could not add to cart')
      setTimeout(() => setStoreNotice(''), 3000)
      return
    }
    setStoreNotice('')
    setCartCount(getCartCount())
    setAddedId(id)
    setTimeout(() => setAddedId((curr) => (curr === id ? null : curr)), 1200)
  }, [])

  return (
    <div className={`club-store ${embedded ? 'club-store--embedded' : 'club-store--page'}`}>
      <div className={`club-store__header ${embedded ? '' : 'pt-24'} max-w-7xl mx-auto px-4 md:px-8 lg:px-12`}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-5">
          <div className="min-w-0">
            {!embedded && (
              <h1 className="font-oswald font-bold text-[clamp(2rem,4.5vw,3rem)] text-slate-900 tracking-tight leading-none">
                Club store
              </h1>
            )}
            <p className={`font-inter text-sm text-slate-600 max-w-lg ${embedded ? '' : 'mt-2'}`}>
              Official Dublin Lions gear. Profits support the club.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="club-store-cart-btn shrink-0 inline-flex items-center gap-2 font-inter font-medium text-sm px-4 py-2.5 rounded-xl transition-all active:scale-[0.98]"
          >
            <ShoppingCart size={18} />
            Cart
            {cartCount > 0 && (
              <span className="club-store-cart-count">{cartCount}</span>
            )}
          </button>
        </div>

        <div className="dash-segment overflow-x-auto max-w-full mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-selected={category === cat}
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-2 font-inter text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {storeNotice && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <p className="font-inter text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
            {storeNotice}
          </p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 pb-16">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white ring-1 ring-slate-200/80 flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-slate-300" />
            </div>
            <p className="font-inter font-medium text-slate-900">Nothing in this category</p>
            <p className="font-inter text-sm text-slate-500 mt-1">Try another filter or check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {filtered.map((product) => (
              <article
                key={product.id}
                className="club-store-card group flex flex-col overflow-hidden"
              >
                <div className="aspect-square bg-slate-100 relative overflow-hidden">
                  {product.imageKey ? (
                    <img
                      src={product.imageKey}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={40} className="text-slate-300" />
                    </div>
                  )}
                  {product.stock <= LOW_STOCK_THRESHOLD && product.stock > 0 && (
                    <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                      {product.stock} left
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="absolute top-3 left-3 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                      Sold out
                    </span>
                  )}
                </div>
                <div className="flex flex-col flex-1 p-4">
                  <p className="font-inter text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-1">{product.category}</p>
                  <h3 className="font-inter font-semibold text-slate-900 text-[0.95rem] leading-snug">{product.name}</h3>
                  <p className="font-inter text-xs text-slate-500 mt-1 line-clamp-2 flex-1">{product.description}</p>
                  <div className="flex items-center justify-between gap-3 mt-4">
                    <span className="font-oswald font-bold text-xl text-slate-900 tabular-nums">€{product.price.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => handleAdd(product.id)}
                      disabled={product.stock === 0}
                      className={`inline-flex items-center gap-1.5 font-inter font-medium text-xs px-3.5 py-2.5 rounded-xl transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
                        addedId === product.id
                          ? 'bg-emerald-500 text-white'
                          : product.stock === 0
                            ? 'bg-slate-100 text-slate-400'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {addedId === product.id ? (
                        <><CheckCircle size={14} /> Added</>
                      ) : product.stock === 0 ? (
                        'Sold out'
                      ) : (
                        <><ShoppingBag size={14} /> Add</>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}
