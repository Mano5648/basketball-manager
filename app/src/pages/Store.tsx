import { useState, useEffect, useMemo, useCallback } from 'react'
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
  type Product,
} from '@/lib/clubData'

const CATEGORIES = ['All', 'Jerseys', 'Apparel', 'Equipment', 'Accessories', 'Kits']

/* ─────────────────────── Cart Drawer ─────────────────────── */

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [cart, setCartState] = useState(getCart)
  const [products, setProductsState] = useState(getProducts)
  const total = getCartTotal()
  const count = getCartCount()

  useEffect(() => {
    const sync = () => { setCartState(getCart()); setProductsState(getProducts()) }
    sync()
    const h = () => sync()
    window.addEventListener('dlbc-cart-change', h)
    window.addEventListener('storage', h)
    return () => { window.removeEventListener('dlbc-cart-change', h); window.removeEventListener('storage', h) }
  }, [open])

  const cartItems = useMemo(() => {
    return cart
      .map((c) => {
        const p = products.find((pr) => pr.id === c.productId)
        return p ? { ...c, product: p } : null
      })
      .filter(Boolean) as { productId: string; quantity: number; product: Product }[]
  }, [cart, products])

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[80] w-full max-w-md bg-[#0F172A] border-l border-white/[0.06] shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
            <h2 className="font-oswald font-bold text-xl text-white flex items-center gap-2">
              <ShoppingCart size={20} /> Your Cart ({count})
            </h2>
            <button onClick={onClose} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart size={48} className="text-slate-600 mx-auto mb-4" />
                <p className="font-inter text-slate-400">Your cart is empty.</p>
                <p className="font-inter text-sm text-slate-500 mt-1">Browse our club gear and add items here.</p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.productId} className="flex gap-4 bg-[#1E293B] rounded-xl p-4 border border-white/[0.06]">
                  <div className="w-16 h-16 bg-[#0A1628] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {item.product.imageKey ? (
                      <img src={item.product.imageKey} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} className="text-slate-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter font-medium text-sm text-white truncate">{item.product.name}</p>
                    <p className="font-inter text-xs text-slate-400 mt-0.5">€{item.product.price.toFixed(2)} each</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1 bg-[#0A1628] rounded-lg">
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-inter text-sm text-white w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-inter font-semibold text-sm text-white">
                      €{(item.product.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {cartItems.length > 0 && (
            <div className="p-5 border-t border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-inter text-slate-300">Subtotal</span>
                <span className="font-inter font-bold text-lg text-white">€{total.toFixed(2)}</span>
              </div>
              <CheckoutButton onSuccess={onClose} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/* ─────────────────────── Checkout Modal ─────────────────────── */

function CheckoutButton({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [method, setMethod] = useState<'card' | 'cash'>('card')
  const [done, setDone] = useState(false)
  const [orderId, setOrderId] = useState('')

  const handleCheckout = () => {
    if (!name.trim() || !email.trim()) return
    const order = placeOrder(name.trim(), email.trim())
    if (order) {
      setOrderId(order.id)
      setDone(true)
    }
  }

  const closeAll = () => {
    setOpen(false)
    setDone(false)
    setName('')
    setEmail('')
    setMethod('card')
    onSuccess()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full bg-electric-blue hover:bg-blue-400 text-white font-inter font-semibold text-sm rounded-lg px-4 py-3 transition-all flex items-center justify-center gap-2"
      >
        <CreditCard size={16} /> Checkout
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !done && setOpen(false)}>
          <div className="bg-[#1E293B] rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {!done ? (
              <>
                <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                  <h3 className="font-oswald font-bold text-xl text-white">Checkout</h3>
                  <button onClick={() => setOpen(false)} className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g. John Murphy"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#0A1628] border border-white/[0.06] rounded-lg px-4 py-2.5 font-inter text-sm text-white focus:outline-none focus:border-blue-500"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <label className="block font-inter text-xs text-slate-400 uppercase tracking-wider mb-2">Payment Method</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMethod('card')}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 border font-inter text-sm transition-all ${
                          method === 'card'
                            ? 'border-electric-blue bg-blue-500/10 text-white'
                            : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <CreditCard size={16} /> Card
                      </button>
                      <button
                        onClick={() => setMethod('cash')}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 border font-inter text-sm transition-all ${
                          method === 'cash'
                            ? 'border-electric-blue bg-blue-500/10 text-white'
                            : 'border-white/[0.06] text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Banknote size={16} /> Cash on Collection
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-5 border-t border-white/[0.06] flex gap-3">
                  <button onClick={() => setOpen(false)} className="flex-1 bg-white/5 border border-white/[0.06] text-slate-300 font-inter font-medium text-sm rounded-lg px-4 py-2.5 hover:bg-white/10">
                    Cancel
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={!name.trim() || !email.trim()}
                    className="flex-1 bg-electric-blue hover:bg-blue-400 disabled:opacity-40 text-white font-inter font-semibold text-sm rounded-lg px-4 py-2.5 transition-colors"
                  >
                    Place Order
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <CheckCircle size={56} className="text-green-400 mx-auto mb-4" />
                <h3 className="font-oswald font-bold text-2xl text-white mb-2">Order Confirmed!</h3>
                <p className="font-inter text-slate-300 mb-1">Thank you for supporting Dublin Lions BC.</p>
                <p className="font-inter text-sm text-slate-400 mb-6">Order ID: <span className="text-white font-mono">{orderId}</span></p>
                <button
                  onClick={closeAll}
                  className="bg-electric-blue hover:bg-blue-400 text-white font-inter font-semibold text-sm rounded-lg px-8 py-3 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/* ─────────────────────── Store Page ─────────────────────── */

export default function Store() {
  const [products, setProductsState] = useState<Product[]>([])
  const [category, setCategory] = useState('All')
  const [cartOpen, setCartOpen] = useState(false)
  const [cartCount, setCartCount] = useState(getCartCount)
  const [addedId, setAddedId] = useState<string | null>(null)

  useEffect(() => {
    const sync = () => {
      setProductsState(getProducts().filter((p) => p.active))
      setCartCount(getCartCount())
    }
    sync()
    const h = () => sync()
    window.addEventListener('dlbc-cart-change', h)
    window.addEventListener('storage', h)
    return () => { window.removeEventListener('dlbc-cart-change', h); window.removeEventListener('storage', h) }
  }, [])

  const filtered = useMemo(() => {
    if (category === 'All') return products
    return products.filter((p) => p.category === category)
  }, [products, category])

  const handleAdd = useCallback((id: string) => {
    addToCart(id)
    setCartCount(getCartCount())
    setAddedId(id)
    setTimeout(() => setAddedId((curr) => (curr === id ? null : curr)), 1200)
  }, [])

  return (
    <div className="min-h-[100dvh] bg-deep-navy">
      {/* Header */}
      <div className="pt-24 pb-8 px-4 md:px-8 lg:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-oswald font-bold text-[clamp(2rem,5vw,3.5rem)] text-white leading-tight">
              CLUB STORE
            </h1>
            <p className="font-inter text-slate-400 mt-1 max-w-lg">
              Official Dublin Lions BC merchandise — jerseys, apparel, equipment and more. All profits support the club.
            </p>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-2 bg-[#1E293B] hover:bg-[#26354a] border border-white/[0.06] text-white font-inter font-medium text-sm px-5 py-3 rounded-lg transition-colors"
          >
            <ShoppingCart size={18} />
            Cart
            {cartCount > 0 && (
              <span className="bg-electric-blue text-white text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>
            )}
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mt-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg font-inter text-sm transition-all ${
                category === cat
                  ? 'bg-electric-blue text-white'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-4 md:px-8 lg:px-12 pb-20 max-w-7xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="text-slate-700 mx-auto mb-4" />
            <p className="font-inter text-lg text-slate-400">No products available in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div
                key={product.id}
                className="bg-[#1E293B] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl group"
              >
                <div className="aspect-square bg-[#0A1628] relative overflow-hidden">
                  {product.imageKey ? (
                    <img
                      src={product.imageKey}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={48} className="text-slate-700" />
                    </div>
                  )}
                  {product.stock <= 5 && product.stock > 0 && (
                    <span className="absolute top-3 right-3 bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                      Low Stock
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="absolute top-3 right-3 bg-red-500/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded">
                      Out of Stock
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <p className="font-inter text-[10px] uppercase tracking-widest text-slate-500 mb-1">{product.category}</p>
                  <h3 className="font-inter font-semibold text-white text-base leading-snug">{product.name}</h3>
                  <p className="font-inter text-xs text-slate-400 mt-1 line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="font-oswald font-bold text-xl text-white">€{product.price.toFixed(2)}</span>
                    <button
                      onClick={() => handleAdd(product.id)}
                      disabled={product.stock === 0}
                      className={`flex items-center gap-1.5 font-inter font-medium text-xs px-4 py-2.5 rounded-lg transition-all ${
                        addedId === product.id
                          ? 'bg-green-500 text-white'
                          : product.stock === 0
                          ? 'bg-white/5 text-slate-600 cursor-not-allowed'
                          : 'bg-electric-blue hover:bg-blue-400 text-white'
                      }`}
                    >
                      {addedId === product.id ? (
                        <>
                          <CheckCircle size={14} /> Added
                        </>
                      ) : (
                        <>
                          <ShoppingBag size={14} /> Add to Cart
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  )
}
