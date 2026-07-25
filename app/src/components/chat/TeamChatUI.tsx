import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, Check, CheckCheck, MessageSquare, Plus, RotateCw, Search, Trash2 } from 'lucide-react'
import type { ChatMessage } from '@/lib/clubData'
import type { ChatSendStatus } from '@/lib/clubData'

export function ChatAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className="team-chat-avatar"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden
    >
      {initials || '?'}
    </div>
  )
}

type ChatRow =
  | { type: 'date'; label: string }
  | { type: 'message'; message: ChatMessage }

function formatDateLabel(d: Date): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function buildChatRows(messages: ChatMessage[]): ChatRow[] {
  const rows: ChatRow[] = []
  let lastDate = ''
  for (const m of messages) {
    const d = new Date(m.timestamp)
    const dateKey = d.toDateString()
    if (dateKey !== lastDate) {
      lastDate = dateKey
      rows.push({ type: 'date', label: formatDateLabel(d) })
    }
    rows.push({ type: 'message', message: m })
  }
  return rows
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function StatusIndicator({
  status,
  onRetry,
}: {
  status: ChatSendStatus
  onRetry?: () => void
}) {
  if (status === 'pending') {
    return (
      <span
        className="team-chat-bubble__status team-chat-bubble__status--pending"
        title="Sending…"
        aria-label="Sending"
        data-testid="chat-status-pending"
      >
        <Check size={13} />
      </span>
    )
  }
  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="team-chat-bubble__status team-chat-bubble__status--failed"
        title="Not delivered — click to retry"
        aria-label="Message failed, retry"
        data-testid="chat-status-failed"
      >
        <AlertCircle size={13} />
        <RotateCw size={11} />
      </button>
    )
  }
  return (
    <span
      className="team-chat-bubble__status team-chat-bubble__status--sent"
      title="Sent"
      aria-label="Sent"
      data-testid="chat-status-sent"
    >
      <CheckCheck size={14} />
    </span>
  )
}

export type TeamChatTeam = {
  id: string
  name: string
  subtitle?: string
  preview?: string
}

export function TeamChatUI({
  variant,
  teams,
  activeTeamId,
  onTeamChange,
  messages,
  currentSenderName,
  currentSenderRole,
  canSend,
  sendBlockedReason,
  onSend,
  onDeleteMessage,
  onRetryMessage,
  messageStatuses,
  headerExtra,
  emptyTeamsMessage = 'No team chats yet',
}: {
  variant: 'player' | 'manager'
  teams: TeamChatTeam[]
  activeTeamId: string
  onTeamChange: (teamId: string) => void
  messages: ChatMessage[]
  currentSenderName: string
  currentSenderRole: 'manager' | 'player'
  canSend: boolean
  sendBlockedReason?: string
  onSend: (text: string) => void
  onDeleteMessage?: (messageId: string) => void
  onRetryMessage?: (messageId: string) => void
  messageStatuses?: Record<string, ChatSendStatus>
  headerExtra?: React.ReactNode
  emptyTeamsMessage?: string
}) {
  const [text, setText] = useState('')
  const [search, setSearch] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeTeam = teams.find((t) => t.id === activeTeamId)
  const filteredTeams = teams.filter((t) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || (t.subtitle?.toLowerCase().includes(q) ?? false)
  })

  const rows = useMemo(() => buildChatRows(messages), [messages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, activeTeamId])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || !canSend || !activeTeamId) return
    onSend(trimmed)
    setText('')
  }

  if (teams.length === 0) {
    return (
      <div className={`team-chat team-chat--${variant} team-chat--empty`}>
        <div className="team-chat-empty">
          <MessageSquare size={36} className="team-chat-empty__icon" />
          <p className="team-chat-empty__title">No conversations yet</p>
          <p className="team-chat-empty__text">{emptyTeamsMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`team-chat team-chat--${variant}`}>
      <aside className="team-chat-sidebar">
        <div className="team-chat-sidebar__head">
          <p className="team-chat-sidebar__eyebrow">Messages</p>
          <p className="team-chat-sidebar__title">Team Chat</p>
        </div>
        <div className="team-chat-sidebar__search">
          <Search size={14} className="team-chat-sidebar__search-icon" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams…"
            className="team-chat-sidebar__search-input"
          />
        </div>
        <div className="team-chat-sidebar__list scroll-slim">
          {filteredTeams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => onTeamChange(team.id)}
              className={`team-chat-thread${activeTeamId === team.id ? ' team-chat-thread--active' : ''}`}
              data-testid={`chat-thread-${team.id}`}
            >
              <ChatAvatar name={team.name} size={40} />
              <div className="team-chat-thread__body">
                <p className="team-chat-thread__name">{team.name}</p>
                {team.subtitle && <p className="team-chat-thread__meta">{team.subtitle}</p>}
                {team.preview && <p className="team-chat-thread__preview">{team.preview}</p>}
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className="team-chat-main">
        <header className="team-chat-header">
          <div className="team-chat-header__info">
            <p className="team-chat-header__label">Chat with</p>
            <h3 className="team-chat-header__title">{activeTeam?.name ?? 'Select a team'}</h3>
            {activeTeam?.subtitle && (
              <p className="team-chat-header__subtitle">{activeTeam.subtitle}</p>
            )}
          </div>
          {headerExtra}
        </header>

        <div ref={scrollRef} className="team-chat-feed scroll-slim">
          {rows.length === 0 ? (
            <div className="team-chat-feed__empty">
              <MessageSquare size={32} className="team-chat-feed__empty-icon" />
              <p className="team-chat-feed__empty-title">No messages yet</p>
              <p className="team-chat-feed__empty-text">Start the conversation below</p>
            </div>
          ) : (
            rows.map((row) => {
              if (row.type === 'date') {
                return (
                  <div key={`date-${row.label}`} className="team-chat-date">
                    <span>{row.label}</span>
                  </div>
                )
              }
              const msg = row.message
              const mine =
                msg.senderRole === currentSenderRole &&
                msg.senderName.toLowerCase() === currentSenderName.toLowerCase()
              const status: ChatSendStatus = messageStatuses?.[msg.id] ?? 'sent'
              const failed = mine && status === 'failed'
              return (
                <div
                  key={msg.id}
                  className={`team-chat-msg${mine ? ' team-chat-msg--mine' : ' team-chat-msg--theirs'}${failed ? ' team-chat-msg--failed' : ''}`}
                  data-testid={`chat-msg-${msg.id}`}
                >
                  {!mine && (
                    <div className="team-chat-msg__head">
                      <ChatAvatar name={msg.senderName} size={32} />
                      <span className="team-chat-msg__sender">
                        {msg.senderName}
                        {msg.senderRole === 'manager' ? ' · Manager' : ''}
                      </span>
                    </div>
                  )}
                  <div className="team-chat-bubble">
                    <p className="team-chat-bubble__text">{msg.text}</p>
                    <div className="team-chat-bubble__footer">
                      <p className="team-chat-bubble__time">{formatTime(msg.timestamp)}</p>
                      {mine && (
                        <StatusIndicator
                          status={status}
                          onRetry={
                            status === 'failed' && onRetryMessage
                              ? () => onRetryMessage(msg.id)
                              : undefined
                          }
                        />
                      )}
                      {mine && onDeleteMessage && (
                        <button
                          type="button"
                          onClick={() => onDeleteMessage(msg.id)}
                          className="team-chat-bubble__delete"
                          aria-label="Delete message"
                          title="Delete message"
                          data-testid={`chat-delete-${msg.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <footer className="team-chat-composer">
          <button type="button" className="team-chat-composer__attach" aria-label="Attach" disabled>
            <Plus size={18} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={!canSend || !activeTeamId}
            placeholder={
              !activeTeamId
                ? 'Select a team first'
                : canSend
                  ? `Message ${activeTeam?.name ?? 'team'}…`
                  : sendBlockedReason ?? "You can't send messages in this chat"
            }
            className="team-chat-composer__input"
            data-testid="chat-composer-input"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend || !text.trim() || !activeTeamId}
            className="team-chat-composer__send"
            data-testid="chat-composer-send"
          >
            Send
          </button>
        </footer>
      </section>
    </div>
  )
}
