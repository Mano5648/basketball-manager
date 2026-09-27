import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronLeft, ImagePlus, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { uploadImage } from '@/lib/format'

export function cx(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(' ') }

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
const variants: Record<Variant, string> = {
  primary: 'bg-lions-500 text-white hover:bg-lions-600 shadow-[0_8px_24px_-8px_var(--btn-shadow)]',
  secondary: 'bg-line/10 text-fg hover:bg-line/15 border border-line/10',
  ghost: 'bg-transparent text-muted hover:bg-line/10',
  danger: 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30',
  outline: 'bg-transparent border border-line/20 text-fg hover:bg-line/10',
}

export function Button({ variant = 'primary', loading, className, children, size = 'md', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,transform,opacity] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'h-9 px-4 text-sm' : size === 'lg' ? 'h-13 px-7 text-base' : 'h-11 px-5 text-sm',
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Card({ className, children, onClick, testId }: { className?: string; children: ReactNode; onClick?: () => void; testId?: string }) {
  return (
    <div
      data-testid={testId}
      onClick={onClick}
      className={cx('rounded-2xl border border-line/[0.08] bg-surface p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]', onClick && 'cursor-pointer hover:border-line/20 transition-colors', className)}
    >
      {children}
    </div>
  )
}

export function Badge({ children, tone = 'blue', className }: { children: ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' | 'slate'; className?: string }) {
  const tones = {
    blue: 'bg-lions-500/15 text-lions-200 border-lions-500/30',
    green: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-warn-500/15 text-warn-400 border-warn-500/30',
    red: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    slate: 'bg-line/5 text-muted border-line/10',
  }
  return <span className={cx('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider', tones[tone], className)}>{children}</span>
}

const fieldCls = 'w-full rounded-xl border border-line/10 bg-line/[0.04] px-3.5 py-2.5 text-[15px] text-fg placeholder:text-subtle outline-none focus:border-lions-400 focus:ring-2 focus:ring-lions-500/30 transition-colors'

export function Field({ label, hint, children, className }: { label?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block space-y-1.5', className)}>
      {label && <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>}
      {children}
      {hint && <span className="block text-xs text-subtle">{hint}</span>}
    </label>
  )
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={cx(fieldCls, props.className)} /> }
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...props} className={cx(fieldCls, 'min-h-[96px]', props.className)} /> }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={cx(fieldCls, 'appearance-none', props.className)} /> }

export function Toggle({ checked, onChange, label, testId }: { checked: boolean; onChange: (v: boolean) => void; label: string; testId?: string }) {
  return (
    <button type="button" data-testid={testId} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line/10 bg-line/[0.03] px-3.5 py-3 text-left">
      <span className="text-sm text-fg">{label}</span>
      <span className={cx('relative h-6 w-11 rounded-full transition-colors', checked ? 'bg-lions-500' : 'bg-line/15')}>
        <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', checked ? 'translate-x-[22px]' : 'translate-x-0.5')} />
      </span>
    </button>
  )
}

export function Sheet({ open, onClose, title, children, testId }: { open: boolean; onClose: () => void; title: string; children: ReactNode; testId?: string }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div data-testid={testId} className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl border border-line/10 bg-surface3 shadow-2xl sm:rounded-3xl animate-in slide-in-from-bottom-8 fade-in duration-200">
        <div className="flex items-center justify-between border-b border-line/[0.08] px-5 py-4">
          <h2 className="text-base font-bold text-fg">{title}</h2>
          <button data-testid="sheet-close" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-line/10 hover:text-fg" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

export function Empty({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div data-testid="empty-state" className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line/10 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-subtle">{icon}</div>}
      <p className="text-sm font-semibold text-fg">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-subtle">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cx('flex justify-center py-10', className)}><Loader2 className="animate-spin text-lions-400" size={28} /></div>
}

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: boolean | string; action?: ReactNode }) {
  const nav = useNavigate()
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        {back && (
          <button data-testid="page-back" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))} className="-ml-2 mt-0.5 rounded-full p-1.5 text-muted hover:bg-line/10" aria-label="Back"><ChevronLeft size={22} /></button>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function ImageUpload({ value, onChange, folder, label = 'Image' }: { value: string | null | undefined; onChange: (url: string | null) => void; folder: string; label?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-3">
        {value ? <img src={value} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-line/15 text-subtle"><ImagePlus size={20} /></div>}
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" loading={busy} onClick={() => ref.current?.click()} data-testid="image-upload-btn">{value ? 'Replace' : 'Upload'}</Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setBusy(true); setErr(null)
          try { onChange(await uploadImage(f, folder)) } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Upload failed') } finally { setBusy(false); e.target.value = '' }
        }} />
      </div>
      {err && <p className="text-xs text-rose-400">{err}</p>}
    </div>
  )
}

export function Alert({ tone = 'red', children, testId }: { tone?: 'red' | 'green' | 'blue'; children: ReactNode; testId?: string }) {
  const t = { red: 'border-rose-500/30 bg-rose-500/10 text-rose-200', green: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200', blue: 'border-lions-500/30 bg-lions-500/10 text-lions-100' }[tone]
  return <div data-testid={testId} className={cx('rounded-xl border px-3.5 py-2.5 text-sm', t)}>{children}</div>
}
