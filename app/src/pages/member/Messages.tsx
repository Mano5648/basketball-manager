import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Check, CheckCheck, ChevronRight, MessageSquare, RotateCw, Send, Trash2, Users } from 'lucide-react'
import { deleteMessage, fetchMessages, sendMessage, subscribeToTeam, CLUB_CHANNEL_ID, type ChatMessage, type ChatSendStatus } from '@/lib/chat'
import { useAuth } from '@/lib/AuthContext'
import { useClub } from '@/lib/ClubContext'
import { fmtDate, fmtTime, initials } from '@/lib/format'
import { Card, Empty, PageHeader, Spinner, cx } from '@/components/ui'

export function useChatThreads() {
  const { role } = useAuth()
  const { teams, myTeamIds, isFeatureOn } = useClub()
  return useMemo(() => {
    const list = [{ id: CLUB_CHANNEL_ID, name: 'Club announcements & chat', subtitle: 'Everyone' }]
    const visible = role === 'manager' ? teams : teams.filter((t) => myTeamIds.includes(t.id))
    for (const t of visible) list.push({ id: t.id, name: t.name, subtitle: t.age_group ?? 'Team chat' })
    return isFeatureOn('messages') ? list : []
  }, [teams, myTeamIds, role, isFeatureOn])
}

export default function MessagesPage({ base = '/app/messages' }: { base?: string }) {
  const threads = useChatThreads()
  const nav = useNavigate()
  return (
    <div>
      <PageHeader title="Messages" subtitle="Team & club chat" back={base.startsWith('/app') ? '/app/more' : undefined} />
      {threads.length === 0 ? <Empty icon={<MessageSquare />} title="No chats available" hint="You'll see team chats here once you're assigned to a team." /> : (
        <div className="space-y-2">
          {threads.map((t) => (
            <Card key={t.id} testId={`chat-thread-${t.id}`} onClick={() => nav(`${base}/${t.id}`)} className="flex items-center gap-3 py-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-lions-500/20 text-sm font-bold text-lions-100">{t.id === CLUB_CHANNEL_ID ? <Users size={18} /> : initials(t.name)}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.name}</p><p className="text-xs text-slate-400">{t.subtitle}</p></div>
              <ChevronRight size={18} className="text-slate-600" />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function Status({ s }: { s: ChatSendStatus }) {
  if (s === 'pending') return <Check size={13} className="text-slate-400" data-testid="chat-status-pending" />
  if (s === 'failed') return <AlertCircle size={13} className="text-rose-400" data-testid="chat-status-failed" />
  return <CheckCheck size={13} className="text-lions-200" data-testid="chat-status-sent" />
}

export function ChatThread({ base = '/app/messages' }: { base?: string }) {
  const { teamId = '' } = useParams()
  const threads = useChatThreads()
  const thread = threads.find((t) => t.id === teamId)
  const { profile, role, user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [statuses, setStatuses] = useState<Record<string, ChatSendStatus>>({})
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const pending = useRef(new Map<string, ChatMessage>())
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try { setMessages(await fetchMessages(teamId)) } catch { /* keep old */ } finally { setLoading(false) }
  }, [teamId])

  useEffect(() => {
    setLoading(true)
    void load()
    return subscribeToTeam(teamId,
      (m) => setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m])),
      (id) => setMessages((prev) => prev.filter((m) => m.id !== id)),
    )
  }, [teamId, load])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }) }, [messages])

  const senderName = profile?.full_name || profile?.email || 'Member'
  const senderRole = role === 'manager' ? 'manager' : 'player'

  const publish = async (m: ChatMessage) => {
    setStatuses((s) => ({ ...s, [m.id]: 'pending' }))
    try {
      await sendMessage({ id: m.id, teamId, senderName: m.senderName, senderRole, text: m.text })
      pending.current.delete(m.id)
      setStatuses((s) => ({ ...s, [m.id]: 'sent' }))
    } catch {
      setStatuses((s) => ({ ...s, [m.id]: 'failed' }))
    }
  }
  const send = () => {
    const t = text.trim()
    if (!t) return
    const m: ChatMessage = { id: crypto.randomUUID(), teamId, senderName, senderRole, text: t, timestamp: new Date().toISOString() }
    pending.current.set(m.id, m)
    setMessages((prev) => [...prev, m])
    setText('')
    void publish(m)
  }
  const retry = (id: string) => { const m = pending.current.get(id); if (m) void publish(m) }
  const remove = async (id: string) => { if (confirm('Delete this message?')) { await deleteMessage(id).catch(() => {}); setMessages((p) => p.filter((m) => m.id !== id)) } }

  if (!thread) return <Empty title="Chat not available" hint="You don't have access to this conversation." />

  let lastDay = ''
  return (
    <div className="-mx-4 -mt-5 flex h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] flex-col" data-testid="chat-view">
      <div className="px-4 pt-4"><PageHeader title={thread.name} subtitle={thread.subtitle} back={base} /></div>
      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-3">
        {loading && messages.length === 0 ? <Spinner /> : messages.length === 0 ? <Empty icon={<MessageSquare />} title="No messages yet" hint="Start the conversation below." /> : messages.map((m) => {
          const day = fmtDate(m.timestamp, { day: 'numeric', month: 'short' })
          const showDay = day !== lastDay; lastDay = day
          const mine = pending.current.has(m.id) || statuses[m.id] !== undefined || (m.senderName.toLowerCase() === senderName.toLowerCase() && m.senderRole === senderRole)
          const st = statuses[m.id] ?? 'sent'
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">{day}</p>}
              <div data-testid={`chat-msg-${m.id}`} className={cx('group flex', mine ? 'justify-end' : 'justify-start')}>
                <div className={cx('max-w-[80%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug', mine ? 'rounded-br-md bg-lions-500 text-white' : 'rounded-bl-md bg-white/[0.08] text-slate-100', st === 'failed' && 'ring-1 ring-rose-400')}>
                  {!mine && <p className="mb-0.5 text-[11px] font-bold text-lions-200">{m.senderName}{m.senderRole === 'manager' ? ' · Admin' : ''}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <div className={cx('mt-1 flex items-center justify-end gap-1.5 text-[10px]', mine ? 'text-white/70' : 'text-slate-500')}>
                    <span>{fmtTime(m.timestamp)}</span>
                    {mine && <Status s={st} />}
                    {mine && st === 'failed' && <button data-testid={`chat-retry-${m.id}`} onClick={() => retry(m.id)} className="ml-1 rounded-full bg-white/20 p-0.5"><RotateCw size={11} /></button>}
                    {(mine || role === 'manager') && st === 'sent' && <button data-testid={`chat-delete-${m.id}`} onClick={() => remove(m.id)} className="ml-1 opacity-0 transition-opacity group-hover:opacity-100"><Trash2 size={11} /></button>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="border-t border-white/[0.06] bg-[#0a1120] px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <form onSubmit={(e) => { e.preventDefault(); send() }} className="flex items-end gap-2">
          <textarea data-testid="chat-composer-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} rows={1} placeholder={`Message ${thread.name}…`} className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-slate-500 focus:border-lions-400" />
          <button data-testid="chat-composer-send" type="submit" disabled={!text.trim() || !user} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lions-500 text-white disabled:opacity-40"><Send size={18} /></button>
        </form>
      </div>
    </div>
  )
}
