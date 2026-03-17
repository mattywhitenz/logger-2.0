import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useData } from '../hooks/useData'
import { useStore, NavOpp } from '../store'
import { LogNewBar, EngagementRef } from '../components/LogNewBar'
import { Star } from '../components/Star'

interface OppItem extends NavOpp {
  oppNum: string
  odataId?: string
  accountName?: string
  status?: string
  lastSeen?: string
  accountOdataId?: string
}

interface OppData {
  items: OppItem[]
  accountCount: number
}

interface ParsedEngagement {
  odataId: string
  engNum: string
  name: string
  status: string
  type: string
  product: string
  owner: string
  salesStage: string
  modified: string
}

interface EngagementsData {
  engagements: ParsedEngagement[]
}

interface AISummaryData {
  summary: string
}

interface TimelineNote {
  title: string
  date: string
  text: string
}

interface TimelineData {
  notes: TimelineNote[]
  raw: string
}

function relativeTime(dateStr?: string): string {
  if (!dateStr) return ''
  try {
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return `${Math.floor(days / 30)}mo ago`
  } catch { return '' }
}

export function OpportunitiesView() {
  const { pendingOpp, clearPending } = useStore()
  const [selected, setSelected] = useState<OppItem | null>(null)

  // Consume deep-link navigation from store (e.g. clicking a favourite)
  useEffect(() => {
    if (pendingOpp) {
      setSelected(pendingOpp as OppItem)
      clearPending()
    }
  }, [pendingOpp, clearPending])

  if (selected) {
    return <OppDetail opp={selected} onBack={() => setSelected(null)} />
  }

  return <OppList onSelect={setSelected} />
}

function OppList({ onSelect }: { onSelect: (opp: OppItem) => void }) {
  const { data, loading, error, refetch } = useData<OppData>('/api/opportunities')
  const { favourites } = useStore()

  const favOppIds = new Set(favourites.filter((f) => f.type === 'opportunity').map((f) => f.id))
  const allItems = data?.items ?? []
  const starred = allItems.filter((i) => favOppIds.has(i.oppNum))
  const rest = allItems.filter((i) => !favOppIds.has(i.oppNum))

  return (
    <>
      <div className="panel-header">
        <h2>🏢 Opportunities</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {data && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>
              {data.items.length} opps · {data.accountCount} accounts
            </span>
          )}
          <LogNewBar />
          <button className="refresh-btn" onClick={refetch}>↻ Refresh</button>
        </div>
      </div>

      <div className="panel-content">
        {loading && (
          <div className="loading-state">
            <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
            <span>Loading opportunity cache...</span>
          </div>
        )}
        {error && <div className="error-state">⚠️ {error}</div>}

        {!loading && !error && allItems.length === 0 && (
          <div className="empty-state">
            <span className="icon">🏢</span>
            No cached opportunities yet.
            <br />
            <span style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
              They'll appear after fetching requests or looking up opportunities in chat.
            </span>
          </div>
        )}

        {starred.length > 0 && (
          <>
            <div className="section-label">── Starred ──</div>
            {starred.map((item) => <OppCard key={item.oppNum} item={item} onSelect={onSelect} />)}
          </>
        )}

        {rest.length > 0 && (
          <>
            {starred.length > 0 && <div className="section-label" style={{ marginTop: 12 }}>── All ──</div>}
            {rest.map((item) => <OppCard key={item.oppNum} item={item} onSelect={onSelect} />)}
          </>
        )}
      </div>
    </>
  )
}

function OppCard({ item, onSelect }: { item: OppItem; onSelect: (opp: OppItem) => void }) {
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => onSelect(item)}>
      <div className="card-header">
        <Star id={item.oppNum} type="opportunity" label={item.oppNum} subtitle={item.accountName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="opp-num" style={{ marginBottom: 3 }}>{item.oppNum}</div>
          <span className="account-name">{item.accountName ?? '—'}</span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {item.status && (
            <span className={`card-badge ${item.status.toLowerCase().includes('open') ? 'badge-lime' : 'badge-muted'}`}>
              {item.status}
            </span>
          )}
          {item.lastSeen && (
            <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{relativeTime(item.lastSeen)}</div>
          )}
          <div style={{ fontSize: 10, color: 'var(--accent-lime-dim)', marginTop: 4 }}>View →</div>
        </div>
      </div>
    </div>
  )
}

function OppDetail({ opp, onBack }: { opp: OppItem; onBack: () => void }) {
  const [summaryRequested, setSummaryRequested] = useState(false)

  const engUrl = opp.odataId
    ? `/api/engagements?oppOdataId=${encodeURIComponent(opp.odataId)}`
    : null

  const summaryUrl = opp.odataId && summaryRequested
    ? `/api/aisummary?oppOdataId=${encodeURIComponent(opp.odataId)}`
    : null

  const { data: engData, loading: engLoading, error: engError, refetch: engRefetch } = useData<EngagementsData>(engUrl)
  const { data: summaryData, loading: summaryLoading, error: summaryError, refetch: summaryRefetch } = useData<AISummaryData>(summaryUrl)

  const engagements = engData?.engagements ?? []
  const engRefs: EngagementRef[] = engagements.map((e) => ({ engNum: e.engNum, name: e.name }))

  return (
    <>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px 0 0' }}>◀</button>
          <Star id={opp.oppNum} type="opportunity" label={opp.oppNum} subtitle={opp.accountName} />
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-pixel)', letterSpacing: '0.1em' }}>{opp.oppNum}</div>
            <h2 style={{ fontSize: 12 }}>{opp.accountName ?? '—'}</h2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <LogNewBar oppNum={opp.oppNum} oppOdataId={opp.odataId} accountName={opp.accountName} engagements={engRefs} />
        </div>
      </div>

      <div className="panel-content">
        {/* AI Summary */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div className="section-label" style={{ margin: 0 }}>── AI Summary ──</div>
            {summaryData && !summaryLoading && (
              <button className="refresh-btn" style={{ fontSize: 9 }} onClick={summaryRefetch}>↻ Refresh</button>
            )}
          </div>
          {!summaryRequested && !summaryData && opp.odataId && (
            <button
              onClick={() => setSummaryRequested(true)}
              className="card"
              style={{ width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 11, color: 'var(--accent-lime-dim)', border: '1px dashed var(--accent-moss)', background: 'none', padding: '10px 12px' }}
            >
              ✦ Generate AI summary <span style={{ color: 'var(--text-dim)' }}>(up to 60s)</span>
            </button>
          )}
          {summaryLoading && (
            <div className="loading-state">
              <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
              <span>Generating summary — up to 60s...</span>
            </div>
          )}
          {summaryError && <div className="error-state">⚠️ {summaryError}</div>}
          {!summaryLoading && summaryData?.summary && (
            <div className="card" style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--text-secondary)' }}>
              <ReactMarkdown>{summaryData.summary}</ReactMarkdown>
            </div>
          )}
          {!opp.odataId && (
            <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '8px 0' }}>No odata ID — look up opp in chat first.</div>
          )}
        </div>

        {/* Engagements */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="section-label" style={{ margin: 0 }}>── Engagements ──</div>
          {!engLoading && <button className="refresh-btn" style={{ fontSize: 9 }} onClick={engRefetch}>↻</button>}
        </div>

        {engLoading && (
          <div className="loading-state">
            <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
            <span>Loading engagements...</span>
          </div>
        )}
        {engError && <div className="error-state">⚠️ {engError}</div>}

        {!engLoading && !engError && engData && (
          engagements.length > 0
            ? engagements.map((eng) => (
                <EngagementCard key={eng.engNum} eng={eng} opp={opp} />
              ))
            : <div className="empty-state" style={{ padding: '20px 0' }}>No engagements found.</div>
        )}

        {!opp.odataId && (
          <div className="error-state">No odata ID cached — look it up in chat first.</div>
        )}
      </div>
    </>
  )
}

function EngagementCard({ eng, opp }: { eng: ParsedEngagement; opp: OppItem }) {
  const [showNotes, setShowNotes] = useState(false)
  const timelineUrl = showNotes && eng.odataId
    ? `/api/timeline?engOdataId=${encodeURIComponent(eng.odataId)}`
    : null
  const { data: tlData, loading: tlLoading, error: tlError, refetch: tlRefetch } = useData<TimelineData>(timelineUrl)

  return (
    <div className="card">
      <div className="card-header">
        <Star id={eng.engNum} type="engagement" label={eng.name || eng.engNum} subtitle={opp.accountName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="opp-num" style={{ marginBottom: 3 }}>{eng.engNum}</div>
          <span className="card-title">{eng.name}</span>
        </div>
        <LogNewBar oppNum={opp.oppNum} accountName={opp.accountName} engagements={[{ engNum: eng.engNum, name: eng.name }]} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
        {eng.type && <span>🔷 {eng.type}</span>}
        {eng.status && <span style={{ color: eng.status.toLowerCase() === 'open' ? 'var(--accent-lime-dim)' : 'var(--text-muted)' }}>● {eng.status}</span>}
        {eng.salesStage && <span>📍 {eng.salesStage}</span>}
        {eng.product && <span>🛠️ {eng.product}</span>}
        {eng.owner && <span>👤 {eng.owner}</span>}
        {eng.modified && <span style={{ color: 'var(--text-muted)' }}>✏️ {new Date(eng.modified).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
      </div>

      {eng.odataId && (
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => setShowNotes((v) => !v)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-lime-dim)', fontSize: 10, cursor: 'pointer', padding: 0, fontFamily: 'var(--font-pixel)' }}
          >
            {showNotes ? '▴ Hide notes' : '▾ Timeline notes'}
          </button>

          {showNotes && (
            <div style={{ marginTop: 8 }}>
              {tlLoading && (
                <div className="loading-state" style={{ padding: '4px 0' }}>
                  <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                  <span>Loading notes...</span>
                </div>
              )}
              {tlError && <div className="error-state">⚠️ {tlError}</div>}
              {!tlLoading && tlData && (
                tlData.notes.length > 0
                  ? tlData.notes.map((note, i) => <NoteCard key={i} note={note} onRefresh={tlRefetch} />)
                  : <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '4px 0' }}>No timeline notes found.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NoteCard({ note, onRefresh }: { note: TimelineNote; onRefresh: () => void }) {
  return (
    <div style={{ borderLeft: '2px solid var(--accent-moss)', paddingLeft: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--text-primary)', fontWeight: 600 }}>{note.title || 'Note'}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {note.date && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{note.date}</span>}
          <button onClick={onRefresh} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer', padding: 0 }}>↻</button>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{note.text}</div>
    </div>
  )
}
