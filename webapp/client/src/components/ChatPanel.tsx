import { useRef, useEffect, useState, KeyboardEvent } from 'react'
import { useStore } from '../store'
import { useChat } from '../hooks/useChat'
import { ChatMessage } from './ChatMessage'

export function ChatPanel() {
  const { chatMessages, queuedMessage, clearQueuedMessage, clearChatMessages } = useStore()
  const { sendMessage, resetSession } = useChat()

  function handleReset() {
    clearChatMessages()
    resetSession()
  }

  useEffect(() => {
    if (queuedMessage) {
      sendMessage(queuedMessage)
      clearQueuedMessage()
    }
  }, [queuedMessage])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
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

  const isStreaming = chatMessages.some((m) => m.streaming)

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3>🐸 Logger Chat</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
            {isStreaming ? '● responding...' : '○ ready'}
          </span>
          <button
            onClick={handleReset}
            title="Reset chat context"
            style={{
              background: 'none',
              border: '1px solid var(--accent-moss)',
              color: 'var(--text-muted)',
              fontSize: 9,
              fontFamily: 'var(--font-pixel)',
              padding: '2px 6px',
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
              letterSpacing: '0.05em',
            }}
          >
            ↺ RESET
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {chatMessages.length === 0 && (
          <div style={{ padding: '16px 4px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <div style={{ marginBottom: 8, color: 'var(--accent-lime-dim)', fontFamily: 'var(--font-pixel)', fontSize: 10 }}>
                QUICK COMMANDS
              </div>
              {[
                ['#start', 'Run startup handshake'],
                ['#requests', 'Show active requests'],
                ['#calendar', 'Today\'s appointments'],
                ['#engagement', 'Create an engagement'],
                ['#note', 'Add a timeline note'],
                ['#help', 'All commands'],
              ].map(([cmd, desc]) => (
                <div key={cmd} style={{ marginBottom: 4 }}>
                  <span style={{ color: 'var(--accent-lime-dim)' }}>{cmd}</span>
                  <span style={{ color: 'var(--text-dim)' }}> — {desc}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 10, color: 'var(--text-dim)' }}>
                Or paste meeting notes and Logger will structure them.
              </div>
            </div>
          </div>
        )}

        {chatMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

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
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 5, textAlign: 'right' }}>
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  )
}
