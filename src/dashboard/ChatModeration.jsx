import { useState, useEffect, useRef } from 'react'
import { apiWebSocketUrl } from '../api/url'

const MUTE_PRESETS = [1, 5, 15, 30]
const MAX_MESSAGES = 300

// The host's master view of an event's live chat — connects with the host's
// JWT (rather than a self-typed name like viewers) so the backend flags
// every message is_host and accepts moderation actions from this connection
// only. Full control: send as the host, delete any message for everyone,
// and mute a display name for a preset duration.
export default function ChatModeration({ events }) {
  const paidEvents = events.filter((e) => e.venue_paid && !e.expired)
  const [selectedEventId, setSelectedEventId] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [muteMenuFor, setMuteMenuFor] = useState(null) // message id currently showing mute presets
  const wsRef = useRef(null)
  const listRef = useRef(null)
  const muteMenuRef = useRef(null)

  useEffect(() => {
    if (paidEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(paidEvents[0].id)
    }
  }, [events])

  useEffect(() => {
    if (!selectedEventId) return
    setMessages([])

    const token = localStorage.getItem('token') || ''
    const url = apiWebSocketUrl(`/api/v1/events/${selectedEventId}/chat/ws?token=${encodeURIComponent(token)}`)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        if (msg.type === 'delete') {
          setMessages((prev) => prev.filter((m) => m.id !== msg.id))
          return
        }
        setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), msg])
      } catch {
        // ignore malformed frames
      }
    }

    return () => ws.close()
  }, [selectedEventId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    if (!muteMenuFor) return
    function onClickOutside(e) {
      if (muteMenuRef.current && !muteMenuRef.current.contains(e.target)) setMuteMenuFor(null)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [muteMenuFor])

  function send(payload) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }

  function handleSend(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    send({ text })
    setDraft('')
  }

  function handleDelete(id) {
    send({ action: 'delete', id })
  }

  function handleMute(name, minutes) {
    send({ action: 'mute', name, minutes })
    setMuteMenuFor(null)
  }

  if (paidEvents.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center text-gray-500">
        You need at least one paid, active event before its chat can be moderated here.
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold">Chat</h1>
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-purple-500"
        >
          {paidEvents.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
        <span className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-600'}`} />
          {connected ? 'Connected as host' : 'Connecting…'}
        </span>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-[65vh]">
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 min-h-0">
          {messages.length === 0 && (
            <p className="text-gray-600 text-xs text-center mt-6">No messages yet.</p>
          )}
          {messages.map((m, i) =>
            m.type === 'system' ? (
              <p key={m.id || i} className="text-gray-600 text-xs text-center italic">{m.text}</p>
            ) : (
              <div key={m.id || i} className="group flex items-start justify-between gap-2 text-sm leading-relaxed">
                <p className="break-words min-w-0">
                  <span className={`font-semibold ${m.is_host ? 'text-amber-400' : 'text-purple-400'}`}>
                    {m.is_host && '👑 '}{m.name}:{' '}
                  </span>
                  <span className="text-gray-200">{m.text}</span>
                </p>
                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!m.is_host && (
                    <div className="relative" ref={muteMenuFor === m.id ? muteMenuRef : null}>
                      <button
                        onClick={() => setMuteMenuFor(muteMenuFor === m.id ? null : m.id)}
                        title={`Mute ${m.name}`}
                        className="text-xs text-gray-500 hover:text-amber-400 px-1.5 py-0.5 rounded"
                      >
                        🔇
                      </button>
                      {muteMenuFor === m.id && (
                        <div className="absolute top-full right-0 mt-1 z-10 bg-gray-800 border border-gray-700 rounded-lg p-1 flex gap-1 shadow-xl">
                          {MUTE_PRESETS.map((min) => (
                            <button
                              key={min}
                              onClick={() => handleMute(m.name, min)}
                              className="text-[11px] text-gray-300 hover:bg-gray-700 hover:text-white px-2 py-1 rounded whitespace-nowrap"
                            >
                              {min}m
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(m.id)}
                    title="Delete message"
                    className="text-xs text-gray-500 hover:text-red-400 px-1.5 py-0.5 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-gray-800 shrink-0">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message as host…"
            maxLength={500}
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!draft.trim() || !connected}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}
