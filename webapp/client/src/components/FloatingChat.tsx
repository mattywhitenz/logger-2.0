import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useStore } from '../store'
import { useChat } from '../hooks/useChat'
import { ChatMessage } from './ChatMessage'

const QUICK_COMMANDS = [
  { cmd: '#requests',   desc: 'Active requests' },
  { cmd: '#calendar',   desc: "Today's calendar" },
  { cmd: '#engagement', desc: 'Create engagement' },
  { cmd: '#note',       desc: 'Add timeline note' },
  { cmd: '#status',     desc: 'Cache status' },
  { cmd: '#help',       desc: 'All commands' },
]

export function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [input, setInput] = useState('')

  const { chatMessages, queuedMessage, clearQueuedMessage, clearChatMessages } = useStore()
  const { sendMessage, interrupt, resetSession } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [input])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [isOpen])

  // Queued messages (from LOG → buttons etc) — populate input, don't auto-send
  useEffect(() => {
    if (queuedMessage) {
      setIsOpen(true)
      setInput(queuedMessage)
      clearQueuedMessage()
      setTimeout(() => {
        const ta = textareaRef.current
        if (!ta) return
        ta.focus()
        ta.selectionStart = ta.selectionEnd = ta.value.length
      }, 80)
    }
  }, [queuedMessage])

  function handleReset() {
    clearChatMessages()
    resetSession()
  }

  function handleSend() {
    const text = input.trim()
    if (!text) return
    setInput('')
    sendMessage(text)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleCommand(cmd: string) {
    sendMessage(cmd)
  }

  const isStreaming = chatMessages.some((m) => m.streaming)

  return (
    <>
      {/* FAB bubble */}
      <button
        className="chat-fab"
        onClick={() => setIsOpen((v) => !v)}
        title="Logger Chat"
      >
        <span className={isStreaming ? 'frog-jumping' : ''}>🐸</span>
      </button>

      {/* Chat popup */}
      {isOpen && (
        <div className={`chat-popup ${isFullscreen ? 'fullscreen' : ''}`}>
          {/* Header */}
          <div className="chat-header">
            <h3>Logger Chat</h3>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {isStreaming
                ? (
                  <button
                    onClick={interrupt}
                    title="Stop response"
                    style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 9, fontFamily: 'var(--font-pixel)', padding: '2px 7px', cursor: 'pointer', borderRadius: 'var(--radius-sm)', letterSpacing: '0.05em' }}
                  >
                    ■ stop
                  </button>
                )
                : <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>○ ready</span>
              }
              <button
                onClick={handleReset}
                title="Reset chat context"
                style={{ background: 'none', border: '1px solid var(--accent-moss)', color: 'var(--text-muted)', fontSize: 9, fontFamily: 'var(--font-pixel)', padding: '2px 6px', cursor: 'pointer', borderRadius: 'var(--radius)', letterSpacing: '0.05em' }}
              >
                ↺
              </button>
              <button
                onClick={() => setIsFullscreen((v) => !v)}
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
              >
                {isFullscreen ? '⊡' : '⊞'}
              </button>
              <button
                onClick={() => { setIsOpen(false); setIsFullscreen(false) }}
                title="Close"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', padding: '2px 4px', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {chatMessages.length === 0 && (
              <div style={{ padding: '12px 4px' }}>
                <div style={{ fontSize: 10, color: 'var(--accent-lime-dim)', fontFamily: 'var(--font-pixel)', marginBottom: 8 }}>
                  QUICK COMMANDS
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {QUICK_COMMANDS.map(({ cmd, desc }) => (
                    <button
                      key={cmd}
                      onClick={() => handleCommand(cmd)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 6px', borderRadius: 'var(--radius)', transition: 'background 0.1s', display: 'flex', gap: 8 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{ color: 'var(--accent-lime-dim)', fontSize: 11, fontFamily: 'var(--font-mono)', minWidth: 90 }}>{cmd}</span>
                      <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{desc}</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-dim)' }}>
                  Or paste meeting notes to structure as SPICED.
                </div>
              </div>
            )}

            {chatMessages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <div className="chat-input-row">
              <textarea
                ref={textareaRef}
                className="chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="#help, #requests, or paste notes..."
                rows={1}
                disabled={isStreaming}
              />
              <button
                className="chat-send-btn"
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
              >
                SEND
              </button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4, textAlign: 'right' }}>
              Enter to send · Shift+Enter for newline
            </div>
          </div>
        </div>
      )}
    </>
  )
}
