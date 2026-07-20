import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { CornerDownLeft, Search } from 'lucide-react'

export type CommandItem = {
  id: string
  label: string
  hint?: string
  group: string
  icon: LucideIcon
  keywords?: string
  run: () => void
}

export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean
  onClose: () => void
  commands: CommandItem[]
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) =>
      `${c.label} ${c.group} ${c.hint ?? ''} ${c.keywords ?? ''}`.toLowerCase().includes(q),
    )
  }, [query, commands])

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    filtered.forEach((c) => {
      if (!map.has(c.group)) map.set(c.group, [])
      map.get(c.group)!.push(c)
    })
    return Array.from(map.entries())
  }, [filtered])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      const t = setTimeout(() => inputRef.current?.focus(), 40)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[active]
        if (item) {
          item.run()
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, active, onClose])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cmd-index="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  let runningIndex = -1

  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div className="cmdk-panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="cmdk-search">
          <Search size={18} className="text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actions, pages, members..."
            className="cmdk-input"
            aria-label="Command palette search"
          />
          <kbd className="cmdk-kbd">Esc</kbd>
        </div>

        <div ref={listRef} className="cmdk-list scroll-slim">
          {filtered.length === 0 ? (
            <div className="cmdk-empty">
              <Search size={28} className="text-slate-600 mx-auto mb-3" />
              <p className="font-inter text-sm text-slate-400">No matches for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            groups.map(([group, items]) => (
              <div key={group} className="cmdk-group">
                <p className="cmdk-group-label">{group}</p>
                {items.map((item) => {
                  runningIndex += 1
                  const idx = runningIndex
                  const isActive = idx === active
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-cmd-index={idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => {
                        item.run()
                        onClose()
                      }}
                      className={`cmdk-item ${isActive ? 'cmdk-item-active' : ''}`}
                    >
                      <span className="cmdk-item-icon">
                        <Icon size={16} />
                      </span>
                      <span className="font-inter text-sm text-slate-200 flex-1 text-left">{item.label}</span>
                      {item.hint && <span className="font-inter text-xs text-slate-500">{item.hint}</span>}
                      {isActive && <CornerDownLeft size={14} className="text-amber-400" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="cmdk-footer">
          <span className="flex items-center gap-1.5">
            <kbd className="cmdk-kbd">↑</kbd>
            <kbd className="cmdk-kbd">↓</kbd>
            to navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="cmdk-kbd">↵</kbd>
            to select
          </span>
        </div>
      </div>
    </div>
  )
}
