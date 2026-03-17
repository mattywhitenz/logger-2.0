import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import { useStore } from '../store'
import type { ChatMessage as ChatMessageType } from '../store'

interface Props {
  message: ChatMessageType
}

// Pre-transform OPTY/ENG numbers in markdown into special anchor links
// e.g. OPTY12345 → [OPTY12345](#star|opportunity|OPTY12345)
// The custom `a` renderer will intercept these and render as inline chips
function transformStarLinks(content: string): string {
  return content
    .replace(/\bOPTY(\d+)\b/g, '[OPTY$1](#star|opportunity|OPTY$1)')
    .replace(/\bENG(\d+)\b/g, '[ENG$1](#star|engagement|ENG$1)')
}

function InlineStarChip({ id, type, label }: { id: string; type: 'opportunity' | 'engagement'; label: string }) {
  const { favourites, toggleFavourite } = useStore()
  const starred = favourites.some((f) => f.id === id)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        background: starred ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${starred ? 'rgba(74,222,128,0.35)' : 'var(--border-bright)'}`,
        borderRadius: '4px',
        padding: '0px 5px',
        fontSize: '0.88em',
        fontFamily: 'var(--font-mono)',
        color: starred ? 'var(--accent-lime)' : 'var(--text-secondary)',
        verticalAlign: 'baseline',
        lineHeight: 1.7,
        cursor: 'default',
        whiteSpace: 'nowrap',
        letterSpacing: '0.04em',
      }}
    >
      {label}
      <button
        onClick={() => toggleFavourite({ id, type, label })}
        title={starred ? 'Remove from favourites' : 'Add to favourites'}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 0 0 2px',
          fontSize: '0.9em',
          color: starred ? 'var(--accent-amber)' : 'var(--text-muted)',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          transition: 'color 0.1s',
        }}
      >
        {starred ? '★' : '☆'}
      </button>
    </span>
  )
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'
  const transformed = !isUser ? transformStarLinks(message.content) : message.content

  return (
    <div className={`chat-message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="chat-message-prefix">logger</div>
      )}
      <div className="chat-message-bubble">
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div className={message.streaming && !message.content ? 'cursor-blink' : ''}>
            {message.content ? (
              <div className={message.streaming ? 'cursor-blink' : ''}>
                <ReactMarkdown
                  remarkPlugins={[remarkBreaks]}
                  components={{
                    a: ({ href, children }) => {
                      if (href?.startsWith('#star|')) {
                        const rest = href.slice('#star|'.length) // "opportunity|OPTY12345"
                        const pipe = rest.indexOf('|')
                        const type = rest.slice(0, pipe) as 'opportunity' | 'engagement'
                        const id = rest.slice(pipe + 1)
                        return <InlineStarChip id={id} type={type} label={String(children)} />
                      }
                      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                    },
                  }}
                >
                  {transformed}
                </ReactMarkdown>
              </div>
            ) : (
              <span style={{ color: 'var(--accent-lime)', opacity: 0.6 }}>▋</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
