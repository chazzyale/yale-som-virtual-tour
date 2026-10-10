import { useEffect, useRef, useState } from 'react'
import { API, talk } from './talk.js'

// Conversations survive closing and reopening the chat (until the page reloads).
const sessions = new Map() // professor id -> { id, messages, info }

function session(profId) {
  if (!sessions.has(profId)) sessions.set(profId, { id: crypto.randomUUID?.() ?? String(Math.random()).slice(2), messages: null, info: null })
  return sessions.get(profId)
}

export default function Chat({ profId, fallbackName, onClose }) {
  const s = session(profId)
  const [info, setInfo] = useState(s.info)
  const [messages, setMessages] = useState(s.messages ?? [])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const input = useRef()
  const log = useRef()

  // professor name, courses and greeting from the backend
  useEffect(() => {
    if (s.info) return
    fetch(`${API}/api/professors/${profId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((p) => {
        s.info = p
        setInfo(p)
        setMessages((m) => (m.length ? m : [{ role: 'prof', text: p.greeting }]))
      })
      .catch(() => setOffline(true))
  }, [profId, s])

  useEffect(() => {
    s.messages = messages
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy, s])

  useEffect(() => {
    input.current?.focus()
    const esc = (e) => e.code === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const send = async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || busy) return
    setDraft('')
    setMessages((m) => [...m, { role: 'me', text }])
    setBusy(true)
    try {
      const r = await fetch(`${API}/api/professors/${profId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: s.id }),
      })
      const body = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(body.detail || `Server error ${r.status}`)
      talk.replyAt = performance.now()
      setOffline(false)
      setMessages((m) => [...m, { role: 'prof', text: body.reply }])
    } catch (err) {
      const msg = err instanceof TypeError ? "Can't reach the backend. Is it running on port 8001?" : err.message
      setMessages((m) => [...m, { role: 'error', text: msg }])
    } finally {
      setBusy(false)
      input.current?.focus()
    }
  }

  const name = info?.name ? `Prof. ${info.name.split(' ').slice(-1)[0]}` : fallbackName
  const course = info?.courses?.[0]
  return (
    <div className="chat" role="dialog" aria-label={`Chat with ${name}`}>
      <header>
        <div>
          <div className="kicker">{course || 'Office hours'}</div>
          <div className="chatname">{name}</div>
        </div>
        <button className="chatclose" onClick={onClose} aria-label="Close chat">
          ×
        </button>
      </header>
      <div className="chatlog" ref={log} aria-live="polite">
        {offline && !messages.length && (
          <div className="msg error">The professor backend isn't running, so chat is offline. Start it with the "backend" launch config (port 8001).</div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="msg prof typing" aria-label={`${name} is typing`}>
            <span />
            <span />
            <span />
          </div>
        )}
      </div>
      <form className="chatbar" onSubmit={send}>
        <textarea
          ref={input}
          rows={1}
          value={draft}
          placeholder={`Ask ${name} anything…`}
          aria-label="Message"
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e)
          }}
        />
        <button className="go" disabled={busy || !draft.trim()}>
          Send
        </button>
      </form>
      <div className="chathint">Enter to send · Esc to close</div>
    </div>
  )
}
