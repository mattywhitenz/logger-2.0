import { useState } from 'react'
import { useStore } from '../store'

interface Props {
  oppNum?: string
  oppOdataId?: string
  accountName?: string
  engagements?: EngagementRef[]
}

export interface EngagementRef {
  engNum: string
  name: string
}

export function LogNewBar({ oppNum, accountName, engagements }: Props) {
  const { queueChatMessage } = useStore()
  const [open, setOpen] = useState(false)
  const [notePickerOpen, setNotePickerOpen] = useState(false)

  function logNewEngagement() {
    setOpen(false)
    const context = [
      oppNum ? `Opportunity: ${oppNum}` : '',
      accountName ? `Account: ${accountName}` : '',
    ].filter(Boolean).join(' · ')
    queueChatMessage(
      `Create a new engagement${context ? ` for ${context}` : ''}. Please start the engagement creation flow.`
    )
  }

  function logNoteToEngagement(eng?: EngagementRef) {
    setOpen(false)
    setNotePickerOpen(false)
    if (eng) {
      queueChatMessage(`Add a timeline note to engagement ${eng.engNum} — ${eng.name}.`)
    } else {
      queueChatMessage(`Add a timeline note to an engagement. Please ask me which engagement.`)
    }
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { setOpen((o) => !o); setNotePickerOpen(false) }}
        style={{
          background: 'var(--accent-moss)',
          border: '1px solid var(--accent-lime-dim)',
          color: 'var(--accent-lime)',
          padding: '5px 14px',
          fontSize: 11,
          fontFamily: 'var(--font-pixel)',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          borderRadius: 'var(--radius)',
          transition: 'all 0.1s',
        }}
      >
        + LOG NEW ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 4,
          background: 'var(--bg-raised)',
          border: '1px solid var(--border-bright)',
          borderRadius: 'var(--radius)',
          minWidth: 200,
          zIndex: 100,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}>
          <button onClick={logNewEngagement} style={menuItemStyle}>
            💼 New Engagement
          </button>
          <div style={{ borderTop: '1px solid var(--border)' }} />
          {engagements && engagements.length > 0 ? (
            <>
              <button
                onClick={() => setNotePickerOpen((o) => !o)}
                style={menuItemStyle}
              >
                📝 Add Note to Engagement ▸
              </button>
              {notePickerOpen && engagements.map((eng) => (
                <button
                  key={eng.engNum}
                  onClick={() => logNoteToEngagement(eng)}
                  style={{ ...menuItemStyle, paddingLeft: 24, fontSize: 11, color: 'var(--text-secondary)' }}
                >
                  {eng.engNum} — {eng.name.length > 28 ? eng.name.slice(0, 28) + '…' : eng.name}
                </button>
              ))}
            </>
          ) : (
            <button onClick={() => logNoteToEngagement()} style={menuItemStyle}>
              📝 Add Note to Engagement
            </button>
          )}
        </div>
      )}
    </div>
  )
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  padding: '9px 14px',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
  cursor: 'pointer',
  transition: 'background 0.1s',
}
