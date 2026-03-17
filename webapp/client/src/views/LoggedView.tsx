import { useData } from '../hooks/useData'
import { useStore } from '../store'

interface LoggedEntry {
  appointmentStart?: string
  appointmentEnd?: string
  subject?: string
  engagementNumber?: string
  engagementName?: string
  date?: string
  [key: string]: unknown
}

interface LoggedData {
  entries: LoggedEntry[]
}

function getEntryDate(entry: LoggedEntry): Date | null {
  const raw = entry.appointmentStart ?? entry.date
  if (!raw) return null
  try {
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  } catch { return null }
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function monthKey(d: Date): string {
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
}

function dayKey(d: Date): string {
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function LoggedView() {
  const { data, loading, error, refetch } = useData<LoggedData>('/api/logged')
  const { queueChatMessage, toggleChat } = useStore()

  const entries = [...(data?.entries ?? [])].reverse()

  // Group: month → day → entries
  const months: { label: string; days: { label: string; entries: LoggedEntry[] }[] }[] = []
  const monthMap = new Map<string, Map<string, LoggedEntry[]>>()

  for (const entry of entries) {
    const d = getEntryDate(entry)
    if (!d) continue
    const mk = monthKey(d)
    const dk = dayKey(d)
    if (!monthMap.has(mk)) monthMap.set(mk, new Map())
    const dayMap = monthMap.get(mk)!
    if (!dayMap.has(dk)) dayMap.set(dk, [])
    dayMap.get(dk)!.push(entry)
  }

  for (const [mk, dayMap] of monthMap) {
    const days = []
    for (const [dk, dayEntries] of dayMap) {
      days.push({ label: dk, entries: dayEntries })
    }
    months.push({ label: mk, days })
  }

  function handleEntryClick(entry: LoggedEntry) {
    const engNum = entry.engagementNumber
    if (engNum) {
      queueChatMessage(`Show me details for ${engNum}`)
      toggleChat()
    }
  }

  return (
    <>
      <div className="panel-header">
        <h2>💼 Logged Engagements</h2>
        <button className="refresh-btn" onClick={refetch}>↻ Refresh</button>
      </div>

      <div className="panel-content">
        {loading && (
          <div className="loading-state">
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span className="loading-dot" />
            <span>Loading engagement log...</span>
          </div>
        )}

        {error && <div className="error-state">⚠️ {error}</div>}

        {!loading && !error && entries.length === 0 && (
          <div className="empty-state">
            <span className="icon">💼</span>
            No logged engagements yet.
            <br />
            <span style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
              Log your first engagement via the chat or calendar view.
            </span>
          </div>
        )}

        {months.map((month) => (
          <div key={month.label} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-pixel)', color: 'var(--accent-lime)', letterSpacing: '0.08em', marginBottom: 10, paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>
              {month.label.toUpperCase()}
            </div>

            {month.days.map((day) => (
              <div key={day.label} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, paddingLeft: 2 }}>
                  {day.label}
                </div>

                {day.entries.map((entry, i) => {
                  const startTime = formatTime(entry.appointmentStart)
                  const endTime = formatTime(entry.appointmentEnd)
                  const hasEng = !!entry.engagementNumber
                  return (
                    <div
                      key={i}
                      className="card"
                      style={{ cursor: hasEng ? 'pointer' : 'default', marginBottom: 6 }}
                      onClick={hasEng ? () => handleEntryClick(entry) : undefined}
                    >
                      <div className="card-header">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {startTime && (
                            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2, fontFamily: 'var(--font-pixel)' }}>
                              {startTime}{endTime ? ` – ${endTime}` : ''}
                            </div>
                          )}
                          <span className="card-title">
                            {entry.subject ?? entry.engagementName ?? 'Engagement'}
                          </span>
                          {entry.engagementName && entry.engagementName !== entry.subject && (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                              💼 {entry.engagementName}
                            </div>
                          )}
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'right' }}>
                          {entry.engagementNumber && (
                            <span className="opp-num">{entry.engagementNumber}</span>
                          )}
                          {hasEng && (
                            <div style={{ fontSize: 10, color: 'var(--accent-lime-dim)', marginTop: 4 }}>+ Note →</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
