import { useMemo, useState, type ReactNode } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Card, Empty, Field, ImageUpload, Input, Select, Sheet, Spinner, Textarea, Toggle, Alert } from './ui'
import { deleteRow, listAll, upsertRow } from '@/lib/db'
import { useLiveQuery } from '@/lib/useLiveQuery'
import { toLocalInput } from '@/lib/format'

export type FieldType = 'text' | 'textarea' | 'number' | 'money' | 'datetime' | 'date' | 'time' | 'select' | 'toggle' | 'image' | 'tags'
export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  options?: { value: string; label: string }[]
  hint?: string
  folder?: string
  half?: boolean
}

export interface CrudProps<T extends { id: string }> {
  table: string
  fields: FieldDef[]
  orderBy?: string
  ascending?: boolean
  itemTitle: (row: T) => string
  itemSubtitle?: (row: T) => ReactNode
  itemBadge?: (row: T) => ReactNode
  newLabel?: string
  defaults?: Partial<T>
  emptyText?: string
  extraActions?: (row: T, close: () => void) => ReactNode
  transformIn?: (row: T) => Record<string, unknown>
  transformOut?: (form: Record<string, unknown>) => Record<string, unknown>
  filter?: (row: T) => boolean
  toolbar?: ReactNode
  testPrefix?: string
}

function toForm(row: Record<string, unknown>, fields: FieldDef[]): Record<string, unknown> {
  const f: Record<string, unknown> = { ...row }
  for (const fd of fields) {
    const v = row[fd.key]
    if (fd.type === 'money') f[fd.key] = v == null ? '' : (Number(v) / 100).toFixed(2)
    else if (fd.type === 'datetime') f[fd.key] = toLocalInput(v as string)
    else if (fd.type === 'tags') f[fd.key] = Array.isArray(v) ? v.join(', ') : ''
    else if (fd.type === 'time') f[fd.key] = typeof v === 'string' ? v.slice(0, 5) : ''
    else if (v == null) f[fd.key] = fd.type === 'toggle' ? false : ''
  }
  return f
}

function fromForm(form: Record<string, unknown>, fields: FieldDef[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (form.id) out.id = form.id
  for (const fd of fields) {
    const v = form[fd.key]
    if (fd.type === 'money') out[fd.key] = Math.round(parseFloat(String(v || '0')) * 100)
    else if (fd.type === 'number') out[fd.key] = v === '' || v == null ? null : Number(v)
    else if (fd.type === 'datetime') out[fd.key] = v ? new Date(String(v)).toISOString() : null
    else if (fd.type === 'tags') out[fd.key] = String(v || '').split(',').map((s) => s.trim()).filter(Boolean)
    else if (fd.type === 'toggle') out[fd.key] = Boolean(v)
    else out[fd.key] = v === '' ? null : v
  }
  return out
}

export function FormFields({ fields, form, setForm }: { fields: FieldDef[]; form: Record<string, unknown>; setForm: (f: Record<string, unknown>) => void }) {
  const set = (k: string, v: unknown) => setForm({ ...form, [k]: v })
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((fd) => {
        const v = form[fd.key]
        const wrap = fd.half ? '' : 'col-span-2'
        const tid = `field-${fd.key}`
        if (fd.type === 'toggle') return <div key={fd.key} className={wrap}><Toggle testId={tid} label={fd.label} checked={Boolean(v)} onChange={(b) => set(fd.key, b)} /></div>
        if (fd.type === 'image') return <div key={fd.key} className={wrap}><ImageUpload label={fd.label} value={v as string} folder={fd.folder ?? 'misc'} onChange={(u) => set(fd.key, u)} /></div>
        return (
          <Field key={fd.key} label={fd.label} hint={fd.hint} className={wrap}>
            {fd.type === 'textarea' ? <Textarea data-testid={tid} value={String(v ?? '')} onChange={(e) => set(fd.key, e.target.value)} required={fd.required} />
              : fd.type === 'select' ? (
                <Select data-testid={tid} value={String(v ?? '')} onChange={(e) => set(fd.key, e.target.value)} required={fd.required}>
                  {!fd.required && <option value="">—</option>}
                  {fd.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              ) : (
                <Input
                  data-testid={tid}
                  type={fd.type === 'money' || fd.type === 'number' ? 'number' : fd.type === 'datetime' ? 'datetime-local' : fd.type === 'date' ? 'date' : fd.type === 'time' ? 'time' : 'text'}
                  step={fd.type === 'money' ? '0.01' : fd.type === 'number' ? '1' : undefined}
                  min={fd.type === 'money' || fd.type === 'number' ? 0 : undefined}
                  value={String(v ?? '')}
                  onChange={(e) => set(fd.key, e.target.value)}
                  required={fd.required}
                  placeholder={fd.type === 'tags' ? 'Comma separated' : undefined}
                />
              )}
          </Field>
        )
      })}
    </div>
  )
}

export function AdminCrud<T extends { id: string }>(p: CrudProps<T>) {
  const { data, loading, error, refresh } = useLiveQuery(() => listAll<T>(p.table, p.orderBy ?? 'created_at', p.ascending ?? false), [p.table])
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const rows = useMemo(() => (data ?? []).filter((r) => (p.filter ? p.filter(r) : true)), [data, p.filter])
  const prefix = p.testPrefix ?? p.table

  const openNew = () => { setErr(null); setEditing(toForm({ ...(p.defaults ?? {}) } as Record<string, unknown>, p.fields)) }
  const openEdit = (row: T) => { setErr(null); setEditing(toForm(p.transformIn ? p.transformIn(row) : (row as unknown as Record<string, unknown>), p.fields)) }
  const close = () => setEditing(null)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editing) return
    setSaving(true); setErr(null)
    try {
      let payload = fromForm(editing, p.fields)
      if (p.transformOut) payload = p.transformOut(payload)
      await upsertRow(p.table, payload as Partial<T>)
      close(); void refresh()
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Save failed') } finally { setSaving(false) }
  }
  const remove = async () => {
    if (!editing?.id || !confirm('Delete this item? This cannot be undone.')) return
    setSaving(true)
    try { await deleteRow(p.table, String(editing.id)); close(); void refresh() } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Delete failed') } finally { setSaving(false) }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">{p.toolbar}</div>
        <Button data-testid={`${prefix}-new-btn`} size="sm" onClick={openNew}><Plus size={16} /> {p.newLabel ?? 'Add'}</Button>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading && !data ? <Spinner /> : rows.length === 0 ? <Empty title={p.emptyText ?? 'Nothing here yet'} hint="Tap Add to create the first one." /> : (
        <div className="space-y-2">
          {rows.map((row) => (
            <Card key={row.id} testId={`${prefix}-row-${row.id}`} onClick={() => openEdit(row)} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{p.itemTitle(row)}</p>
                {p.itemSubtitle && <p className="mt-0.5 truncate text-xs text-slate-400">{p.itemSubtitle(row)}</p>}
              </div>
              {p.itemBadge?.(row)}
            </Card>
          ))}
        </div>
      )}
      <Sheet open={editing !== null} onClose={close} title={editing?.id ? 'Edit' : (p.newLabel ?? 'Add')} testId={`${prefix}-sheet`}>
        {editing && (
          <form onSubmit={save} className="space-y-4">
            <FormFields fields={p.fields} form={editing} setForm={setEditing} />
            {err && <Alert testId="crud-error">{err}</Alert>}
            {editing.id && p.extraActions ? <div className="space-y-2">{p.extraActions(rows.find((r) => r.id === editing.id) as T, close)}</div> : null}
            <div className="flex items-center justify-between gap-2 pt-1">
              {editing.id ? <Button type="button" variant="danger" size="sm" onClick={remove} data-testid={`${prefix}-delete-btn`}><Trash2 size={14} /> Delete</Button> : <span />}
              <Button type="submit" loading={saving} data-testid={`${prefix}-save-btn`}>Save</Button>
            </div>
          </form>
        )}
      </Sheet>
    </div>
  )
}
