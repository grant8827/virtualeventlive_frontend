import { useState, useEffect, useRef } from 'react'
import { apiWebSocketUrl } from '../api/url'

const MAX_MESSAGES = 150
const NAME_KEY = 'vel-chat-name'

const EMOJIS = [
  '😀', '😂', '😅', '😍', '🥰', '😎', '🤔', '😮',
  '😢', '😭', '😡', '🤯', '🥳', '😴', '🤝', '👍',
  '👎', '👏', '🙌', '🙏', '💪', '👋', '✌️', '❤️',
  '🔥', '🎉', '💯', '⭐', '✨', '🎊', '👀', '🚀',
]

export default function ChatPanel({ eventId }) {
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [nameDraft, setNameDraft] = useState('')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [connected, setConnected] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const wsRef = useRef(null)
  const listRef = useRef(null)
  const inputRef = useRef(null)
  const emojiRef = useRef(null)

  useEffect(() => {
    if (!name || !eventId) return

    const url = apiWebSocketUrl(`/api/v1/events/${eventId}/chat/ws?name=${encodeURIComponent(name)}`)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data)
        setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), msg])
      } catch {
        // ignore malformed frames
      }
    }

    return () => ws.close()
  }, [eventId, name])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  useEffect(() => {
    if (!showEmoji) return
    function onClickOutside(e) {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false)
    }
    function onKey(e) { if (e.key === 'Escape') setShowEmoji(false) }
    document.addEventListener('mousedown', onClickOutside)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      window.removeEventListener('keydown', onKey)
    }
  }, [showEmoji])

  function handleJoin(e) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    localStorage.setItem(NAME_KEY, trimmed)
    setName(trimmed)
  }

  function handleSend(e) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ text }))
    setDraft('')
    setShowEmoji(false)
  }

  function addEmoji(emoji) {
    setDraft((d) => d + emoji)
    inputRef.current?.focus()
  }

  if (!name) {
    return (
      <div className="h-full flex flex-col bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="font-semibold mb-1">Live Chat</h3>
        <p className="text-gray-500 text-sm mb-4">Pick a name to join the conversation.</p>
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name"
            maxLength={32}
            className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!nameDraft.trim()}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
          >
            Join
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <h3 className="font-semibold text-sm">Live Chat</h3>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-600'}`} />
          {connected ? 'Connected' : 'Connecting…'}
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-6">No messages yet — say hello.</p>
        )}
        {messages.map((m, i) =>
          m.type === 'system' ? (
            <p key={m.id || i} className="text-gray-600 text-xs text-center italic">{m.text}</p>
          ) : (
            <p key={m.id || i} className="text-sm leading-relaxed break-words">
              <span className="font-semibold text-purple-400">{m.name}: </span>
              <span className="text-gray-200">{m.text}</span>
            </p>
          )
        )}
      </div>

      <form onSubmit={handleSend} className="relative flex gap-2 p-3 border-t border-gray-800 shrink-0">
        {showEmoji && (
          <div
            ref={emojiRef}
            className="absolute bottom-full left-3 mb-2 grid grid-cols-8 gap-0.5 bg-gray-800 border border-gray-700 rounded-xl p-2 shadow-xl z-10"
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addEmoji(emoji)}
                className="text-lg leading-none hover:bg-gray-700 rounded-md p-1.5 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          title="Add emoji"
          className="shrink-0 text-lg leading-none bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl px-3 transition-colors"
        >
          🙂
        </button>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Send a message…"
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
  )
}
