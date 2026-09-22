import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, ShoppingCart, Trash2 } from 'lucide-react'
import { listAll, sb, type Order, type OrderItem, type Product } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { useAuth } from '@/lib/AuthContext'
import { money } from '@/lib/format'
import { isStripeCheckoutConfigured, startCheckout } from '@/lib/stripeCheckout'
import { Alert, Badge, Button, Card, Empty, Field, PageHeader, Select, Sheet, Spinner, Textarea, cx } from '@/components/ui'

const CART_KEY = 'club_cart_v2'
function readCart(): OrderItem[] { try { return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') } catch { return [] } }

export function useCart() {
  const [items, setItems] = useState<OrderItem[]>(readCart)
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(items)) }, [items])
  const add = (p: Product, size?: string) => setItems((prev) => {
    const idx = prev.findIndex((i) => i.product_id === p.id && i.size === size)
    if (idx >= 0) return prev.map((i, n) => (n === idx ? { ...i, quantity: i.quantity + 1 } : i))
    return [...prev, { product_id: p.id, name: p.name, price_cents: p.price_cents, quantity: 1, size, image_url: p.image_url ?? undefined }]
  })
  const setQty = (idx: number, qty: number) => setItems((prev) => (qty <= 0 ? prev.filter((_, n) => n !== idx) : prev.map((i, n) => (n === idx ? { ...i, quantity: qty } : i))))
  const clear = () => setItems([])
  const total = items.reduce((s, i) => s + i.price_cents * i.quantity, 0)
  const count = items.reduce((s, i) => s + i.quantity, 0)
  return { items, add, setQty, clear, total, count }
}

export default function ShopPage() {
  const nav = useNavigate()
  const cart = useCart()
  const [category, setCategory] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [size, setSize] = useState('')
  const q = useLiveQuery(() => listAll<Product>('products', 'sort_order', true, (x) => x.eq('active', true)), ['products'])
  const categories = useMemo(() => [...new Set((q.data ?? []).map((p) => p.category).filter(Boolean))] as string[], [q.data])
  const rows = (q.data ?? []).filter((p) => !category || p.category === category)

  return (
    <div>
      <PageHeader title="Club shop" subtitle="Official merchandise" action={
        <button data-testid="cart-btn" onClick={() => nav('/app/shop/cart')} className="relative rounded-full bg-white/10 p-2.5"><ShoppingCart size={20} />{cart.count > 0 && <span data-testid="cart-count" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-lions-500 px-1 text-[11px] font-bold">{cart.count}</span>}</button>
      } />
      {categories.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {['', ...categories].map((c) => <button key={c} data-testid={`shop-cat-${c || 'all'}`} onClick={() => setCategory(c)} className={cx('shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold', category === c ? 'border-lions-400 bg-lions-500/15 text-lions-200' : 'border-white/10 text-slate-400')}>{c || 'All'}</button>)}
        </div>
      )}
      {q.loading && !q.data ? <Spinner /> : rows.length === 0 ? <Empty icon={<ShoppingBag />} title="Shop is empty" hint="Products will appear here once the club adds them." /> : (
        <div className="grid grid-cols-2 gap-3">
          {rows.map((p) => (
            <Card key={p.id} testId={`product-${p.id}`} onClick={() => { setSelected(p); setSize(p.sizes?.[0] ?? '') }} className="overflow-hidden p-0">
              <div className="aspect-square bg-white/[0.04]">{p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-600"><ShoppingBag size={28} /></div>}</div>
              <div className="p-3">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                <div className="mt-1 flex items-center justify-between"><p className="text-sm font-bold text-lions-200">{money(p.price_cents)}</p>{p.stock != null && p.stock <= 0 && <Badge tone="red">Sold out</Badge>}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Sheet open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} testId="product-sheet">
        {selected && (
          <div className="space-y-4">
            {selected.image_url && <img src={selected.image_url} alt="" className="aspect-square w-full rounded-2xl object-cover" />}
            <p className="font-display text-2xl font-bold text-lions-200">{money(selected.price_cents)}</p>
            {selected.description && <p className="text-sm text-slate-300">{selected.description}</p>}
            {selected.sizes && selected.sizes.length > 0 && (
              <Field label="Size"><Select data-testid="product-size" value={size} onChange={(e) => setSize(e.target.value)}>{selected.sizes.map((s) => <option key={s}>{s}</option>)}</Select></Field>
            )}
            <Button data-testid="add-to-cart-btn" className="w-full" size="lg" disabled={selected.stock != null && selected.stock <= 0} onClick={() => { cart.add(selected, size || undefined); setSelected(null) }}>Add to cart</Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

export function CartPage() {
  const cart = useCart()
  const { profile } = useAuth()
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const checkout = async () => {
    if (!profile || cart.items.length === 0) return
    setBusy(true); setErr(null)
    try {
      const { data, error } = await sb().from('orders').insert({
        profile_id: profile.id, customer_name: profile.full_name || profile.email, customer_email: profile.email,
        items: cart.items, total_cents: cart.total, status: 'pending', delivery_note: note || null,
      }).select().single()
      if (error) throw error
      await startCheckout({ purchaseType: 'store', referenceId: (data as Order).id, customerName: profile.full_name || profile.email, customerEmail: profile.email })
      cart.clear()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Checkout failed') } finally { setBusy(false) }
  }

  return (
    <div>
      <PageHeader title="Your cart" back="/app/shop" />
      {cart.items.length === 0 ? <Empty icon={<ShoppingCart />} title="Cart is empty" /> : (
        <div className="space-y-3">
          {cart.items.map((i, idx) => (
            <Card key={`${i.product_id}-${i.size}`} testId={`cart-item-${idx}`} className="flex items-center gap-3 py-3">
              {i.image_url ? <img src={i.image_url} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="h-14 w-14 rounded-xl bg-white/5" />}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.name}</p><p className="text-xs text-slate-400">{i.size ? `Size ${i.size} · ` : ''}{money(i.price_cents)}</p></div>
              <div className="flex items-center gap-2">
                <button data-testid={`cart-minus-${idx}`} onClick={() => cart.setQty(idx, i.quantity - 1)} className="rounded-full bg-white/10 p-1.5">{i.quantity === 1 ? <Trash2 size={14} /> : <Minus size={14} />}</button>
                <span className="w-5 text-center text-sm font-semibold">{i.quantity}</span>
                <button data-testid={`cart-plus-${idx}`} onClick={() => cart.setQty(idx, i.quantity + 1)} className="rounded-full bg-white/10 p-1.5"><Plus size={14} /></button>
              </div>
            </Card>
          ))}
          <Field label="Note for the club (optional)"><Textarea data-testid="cart-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Collection preference, player name, etc." /></Field>
          <Card className="flex items-center justify-between"><span className="text-sm text-slate-400">Total</span><span data-testid="cart-total" className="font-display text-2xl font-bold">{money(cart.total)}</span></Card>
          {err && <Alert testId="cart-error">{err}</Alert>}
          {!isStripeCheckoutConfigured() && <Alert tone="blue">Online payments aren't configured yet.</Alert>}
          <Button data-testid="checkout-btn" className="w-full" size="lg" loading={busy} disabled={!isStripeCheckoutConfigured()} onClick={checkout}>Checkout · {money(cart.total)}</Button>
          <p className="text-center text-[11px] text-slate-500">Secure checkout by Stripe · Apple Pay & Google Pay supported</p>
        </div>
      )}
    </div>
  )
}
