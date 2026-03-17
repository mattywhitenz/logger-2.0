import { useState } from 'react'
import { useStore } from '../store'
import { useData } from '../hooks/useData'

interface CalendarItem {
  start: string
  end: string
  subject: string
  attendees: string
  categories: string
  isEngagement: boolean
  loggedEntry?: { engagementNumber?: string }
}

interface CalendarData {
  date: string
  items: CalendarItem[]
}

function formatTime(dtStr: string | undefined): string {
  if (!dtStr) return '—'
  // "DD/MM/YYYY HH:MM AM/PM"
  const parts = dtStr.split(' ')
  if (parts.length >= 3) return `${parts[1]} ${parts[2]}`
  // ISO: "2026-03-11T09:00:00" or "2026-03-11T09:00:00.000Z"
  const isoMatch = dtStr.match(/T(\d{2}):(\d{2})/)
  if (isoMatch) {
    let h = parseInt(isoMatch[1], 10)
    const m = isoMatch[2]
    const ampm = h >= 12 ? 'PM' : 'AM'
    if (h > 12) h -= 12
    if (h === 0) h = 12
    return `${h}:${m} ${ampm}`
  }
  return dtStr
}

function toTotalMinutes(dtStr: string): number {
  // "DD/MM/YYYY HH:MM AM/PM"
  const parts = dtStr.split(' ')
  if (parts.length >= 3) {
    const [hStr, mStr] = parts[1].split(':')
    let h = parseInt(hStr, 10)
    const m = parseInt(mStr, 10)
    const ampm = parts[2].toUpperCase()
    if (ampm === 'PM' && h !== 12) h += 12
    if (ampm === 'AM' && h === 12) h = 0
    return h * 60 + m
  }
  // ISO fallback
  const isoMatch = dtStr.match(/T(\d{2}):(\d{2})/)
  if (isoMatch) return parseInt(isoMatch[1], 10) * 60 + parseInt(isoMatch[2], 10)
  return 0
}

function timeToMinutes(dtStr: string): number {
  return toTotalMinutes(dtStr)
}

function formatDuration(startStr: string | undefined, endStr: string | undefined): string {
  if (!startStr || !endStr) return ''
  const diff = toTotalMinutes(endStr) - toTotalMinutes(startStr)
  if (diff <= 0) return ''
  if (diff < 60) return `${diff}min`
  const h = Math.floor(diff / 60)
  const m = diff % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function CalendarView() {
  const { calendarDate, setCalendarDate } = useStore()
  const { data, loading, error, refetch } = useData<CalendarData>(`/api/calendar?date=${calendarDate}`)

  // Server already sorts by start time
  const allItems = data?.items ?? []

  return (
    <>
      <div className="panel-header">
        <h2>📅 Calendar</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="date-nav">
            <button className="date-nav-btn" onClick={() => setCalendarDate(offsetDate(calendarDate, -1))}>◀ Prev</button>
            <span className="date-display">{formatDateDisplay(calendarDate)}</span>
            <button className="date-nav-btn" onClick={() => setCalendarDate(offsetDate(calendarDate, 1))}>Next ▶</button>
          </div>
          <button className="refresh-btn" onClick={refetch}>↻ Refresh</button>
        </div>
      </div>

      <div className="panel-content">
        {loading && (
          <div className="loading-state">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span>Fetching calendar...</span>
          </div>
        )}

        {error && <div className="error-state">⚠️ {error}</div>}

        {!loading && !error && data && (
          <>
            {allItems.map((item, i) => (
              <CalendarCard key={i} item={item} />
            ))}
            {allItems.length === 0 && (
              <div className="empty-state">
                <span className="icon">📅</span>
                No appointments found for this day.
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

function CalendarCard({ item }: { item: CalendarItem }) {
  const { queueChatMessage } = useStore()
  const [showAttendees, setShowAttendees] = useState(false)

  const startTime = formatTime(item.start)
  const endTime = formatTime(item.end)
  const duration = formatDuration(item.start, item.end)
  const attendeeList = item.attendees?.split(',').map((a) => a.trim()).filter(Boolean) ?? []

  function handleLog() {
    const attendeeStr = attendeeList.slice(0, 5).join(', ')
    queueChatMessage(
      `I want to log this appointment as an engagement:\n\n` +
      `**Subject:** ${item.subject}\n` +
      `**Time:** ${item.start} – ${item.end}\n` +
      (attendeeStr ? `**Attendees:** ${attendeeStr}\n` : '') +
      `\nPlease start the engagement creation flow for this meeting.`
    )
  }

  return (
    <div className={`card ${item.isEngagement ? 'engagement-tagged' : ''}`} style={{ padding: '7px 10px' }}>
      <div className="card-header" style={{ marginBottom: 2 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>{item.isEngagement ? '⭐' : '📅'}</span>
        <span className="card-title" style={{ flex: 1, fontSize: 11 }}>
          {item.subject}
        </span>
        <span className="card-time" style={{ flexShrink: 0, fontSize: 10, textAlign: 'right' }}>
          {startTime}{endTime && endTime !== '—' ? ` – ${endTime}` : ''}
          {duration && <span style={{ display: 'block', color: 'var(--text-dim)', fontSize: 9 }}>{duration}</span>}
        </span>
      </div>

      {attendeeList.length > 0 && (
        <div className="card-meta" style={{ marginTop: 2 }}>
          <button
            onClick={() => setShowAttendees((v) => !v)}
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', padding: 0 }}
          >
            👥 {attendeeList.length} attendee{attendeeList.length !== 1 ? 's' : ''} {showAttendees ? '▴' : '▾'}
          </button>
          {showAttendees && (
            <div style={{ marginTop: 3, wordBreak: 'break-word', overflowWrap: 'break-word', color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.5 }}>
              {attendeeList.join(', ')}
            </div>
          )}
        </div>
      )}

      <div className="card-meta" style={{ marginTop: 5, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {item.isEngagement && (
            item.loggedEntry
              ? <span className="logged-yes" style={{ fontSize: 10 }}>✅ {item.loggedEntry.engagementNumber ?? 'Logged'}</span>
              : <span className="logged-no" style={{ fontSize: 10 }}>— Not logged</span>
          )}
          {item.categories && (
            <span className="card-badge badge-muted" style={{ fontSize: 9 }}>{item.categories}</span>
          )}
        </div>
        {!item.loggedEntry && (
          <button
            onClick={handleLog}
            style={{
              background: 'var(--accent-moss)',
              border: '1px solid var(--accent-lime-dim)',
              color: 'var(--accent-lime)',
              padding: '2px 8px',
              fontSize: 9,
              fontFamily: 'var(--font-pixel)',
              letterSpacing: '0.05em',
              cursor: 'pointer',
              borderRadius: 'var(--radius)',
              transition: 'all 0.1s',
            }}
          >
            LOG →
          </button>
        )}
      </div>
    </div>
  )
}
