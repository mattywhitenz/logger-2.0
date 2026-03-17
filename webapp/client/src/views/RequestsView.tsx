import { useState } from 'react'
import { useData } from '../hooks/useData'
import { LogNewBar } from '../components/LogNewBar'

interface RequestsData {
  blocks: string[]
}

interface ParsedRequest {
  title: string
  type: string
  account: string
  oppNum: string
  status: string
  product: string
  acv: string
  closeDate: string
  aiSummary: string
  link: string
  rawBlock: string
}

function extractField(block: string, ...keys: string[]): string {
  for (const key of keys) {
    const re = new RegExp(`${key}\\s*[:\\-]\\s*(.+)`, 'i')
    const m = block.match(re)
    if (m) return m[1].trim()
  }
  return ''
}

function parseBlock(block: string): ParsedRequest {
  const lines = block.trim().split('\n')
  const title = lines[0]?.replace(/^\*+\s*/, '').trim() ?? 'Request'
  return {
    title,
    type: extractField(block, 'Request Type', 'Type'),
    account: extractField(block, 'Account'),
    oppNum: extractField(block, 'Opp #', 'Opportunity #', 'Opp Number'),
    status: extractField(block, 'Opp Status', 'Status'),
    product: extractField(block, 'Products?', 'Product'),
    acv: extractField(block, 'ACV'),
    closeDate: extractField(block, 'Close'),
    aiSummary: extractField(block, 'AI Summary', 'Summary'),
    link: block.match(/https?:\/\/\S+/)?.[0] ?? '',
    rawBlock: block,
  }
}

const PREVIEW_LINES = 6

function RequestCard({ req, index }: { req: ParsedRequest; index: number }) {
  const [expanded, setExpanded] = useState(false)

  const rawLines = req.rawBlock.trim().split('\n').slice(1) // skip title line
  const previewLines = rawLines.slice(0, PREVIEW_LINES)
  const hasMore = rawLines.length > PREVIEW_LINES

  return (
    <div className="card">
      <div className="card-header" style={{ alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="card-badge badge-muted" style={{ fontSize: 9, flexShrink: 0 }}>#{index + 1}</span>
            {req.type && (
              <span className={`card-badge ${req.type.toLowerCase().includes('opportunity') ? 'badge-lime' : 'badge-amber'}`} style={{ fontSize: 9, flexShrink: 0 }}>
                {req.type}
              </span>
            )}
          </div>
          <div className="card-title" style={{ wordBreak: 'break-word' }}>🏢 {req.title}</div>
        </div>
        <LogNewBar
          oppNum={req.oppNum || undefined}
          accountName={req.account || undefined}
        />
      </div>

      {/* Key fields row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>
        {req.account && <span>🏢 {req.account}</span>}
        {req.oppNum && <span className="opp-num">{req.oppNum}</span>}
        {req.status && <span style={{ color: req.status.toLowerCase().includes('open') ? 'var(--accent-lime-dim)' : 'var(--text-muted)' }}>{req.status}</span>}
        {req.acv && <span>💰 {req.acv}</span>}
        {req.closeDate && <span>📅 Close: {req.closeDate}</span>}
      </div>

      {req.product && (
        <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>🛠️ {req.product}</div>
      )}

      {req.aiSummary && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic', wordBreak: 'break-word' }}>
          📝 {req.aiSummary.length > 180 ? req.aiSummary.slice(0, 180) + '…' : req.aiSummary}
        </div>
      )}

      {/* Expandable raw block */}
      {hasMore && (
        <div style={{ marginTop: 8 }}>
          {expanded && (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 6px' }}>
              {rawLines.join('\n')}
            </pre>
          )}
          {!expanded && (
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 6px' }}>
              {previewLines.join('\n')}
            </pre>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{ background: 'none', border: 'none', color: 'var(--accent-lime-dim)', fontSize: 11, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            {expanded ? 'show less ▲' : `show more ▼ (${rawLines.length - PREVIEW_LINES} more lines)`}
          </button>
        </div>
      )}

      {req.link && (
        <div style={{ marginTop: 8 }}>
          <a href={req.link} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 11, color: 'var(--accent-lime-dim)', textDecoration: 'underline' }}>
            🔗 View Request
          </a>
        </div>
      )}
    </div>
  )
}

export function RequestsView() {
  const { data, loading, error, refetch } = useData<RequestsData>('/api/requests')
  const requests = data?.blocks ? data.blocks.map(parseBlock) : []

  return (
    <>
      <div className="panel-header">
        <h2>📋 Requests</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {requests.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{requests.length} requests</span>
          )}
          <LogNewBar />
          <button className="refresh-btn" onClick={refetch}>↻ Refresh</button>
        </div>
      </div>

      <div className="panel-content">
        {loading && (
          <div className="loading-state">
            <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
            <span>Fetching requests from Dynamics...</span>
          </div>
        )}

        {error && (
          <div className="error-state">
            ⚠️ {error.includes('403') ? 'Requests ability not enabled for your account.' : error}
          </div>
        )}

        {!loading && !error && requests.map((req, i) => (
          <RequestCard key={i} req={req} index={i} />
        ))}

        {!loading && !error && requests.length === 0 && data && (
          <div className="empty-state">
            <span className="icon">📋</span>
            No requests found.
          </div>
        )}
      </div>
    </>
  )
}
