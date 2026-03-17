import { useState, useEffect } from 'react'
import { useData } from '../hooks/useData'
import { useStore, NavAccount } from '../store'
import { LogNewBar } from '../components/LogNewBar'
import { Star } from '../components/Star'

interface AccountItem extends NavAccount {
  name: string
  odataId?: string
  lastSeen?: string
}

interface AccountsData {
  items: AccountItem[]
}

interface AccountOpp {
  oppNum: string
  name: string
  status: string
  odataId: string
  salesStage: string
}

interface AccountOppsData {
  opportunities: AccountOpp[]
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

export function AccountsView() {
  const { pendingAccount, clearPending } = useStore()
  const [selected, setSelected] = useState<AccountItem | null>(null)

  useEffect(() => {
    if (pendingAccount) {
      setSelected(pendingAccount as AccountItem)
      clearPending()
    }
  }, [pendingAccount, clearPending])

  if (selected) {
    return <AccountDetail account={selected} onBack={() => setSelected(null)} />
  }

  return <AccountList onSelect={setSelected} />
}

function AccountList({ onSelect }: { onSelect: (a: AccountItem) => void }) {
  const { data, loading, error, refetch } = useData<AccountsData>('/api/accounts')
  const { favourites } = useStore()

  const favIds = new Set(favourites.filter((f) => f.type === 'account').map((f) => f.id))
  const allItems = data?.items ?? []
  const starred = allItems.filter((i) => favIds.has(i.name))
  const rest = allItems.filter((i) => !favIds.has(i.name))

  return (
    <>
      <div className="panel-header">
        <h2>🏛️ Accounts</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {data && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{data.items.length} accounts</span>}
          <button className="refresh-btn" onClick={refetch}>↻ Refresh</button>
        </div>
      </div>

      <div className="panel-content">
        {loading && (
          <div className="loading-state">
            <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
            <span>Loading account cache...</span>
          </div>
        )}
        {error && <div className="error-state">⚠️ {error}</div>}

        {!loading && !error && allItems.length === 0 && (
          <div className="empty-state">
            <span className="icon">🏛️</span>
            No cached accounts yet.
            <br />
            <span style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
              They'll appear after fetching requests or looking up accounts in chat.
            </span>
          </div>
        )}

        {starred.length > 0 && (
          <>
            <div className="section-label">── Starred ──</div>
            {starred.map((item) => <AccountCard key={item.name} item={item} onSelect={onSelect} />)}
          </>
        )}
        {rest.length > 0 && (
          <>
            {starred.length > 0 && <div className="section-label" style={{ marginTop: 12 }}>── All ──</div>}
            {rest.map((item) => <AccountCard key={item.name} item={item} onSelect={onSelect} />)}
          </>
        )}
      </div>
    </>
  )
}

function AccountCard({ item, onSelect }: { item: AccountItem; onSelect: (a: AccountItem) => void }) {
  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => onSelect(item)}>
      <div className="card-header">
        <Star id={item.name} type="account" label={item.name} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="account-name">{item.name}</span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {item.lastSeen && <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{relativeTime(item.lastSeen)}</div>}
          <div style={{ fontSize: 10, color: 'var(--accent-lime-dim)', marginTop: 4 }}>View →</div>
        </div>
      </div>
    </div>
  )
}

function AccountDetail({ account, onBack }: { account: AccountItem; onBack: () => void }) {
  const [pullRequested, setPullRequested] = useState(false)

  const oppsUrl = account.odataId && pullRequested
    ? `/api/account-opps?accountOdataId=${encodeURIComponent(account.odataId)}`
    : null

  const { data: oppsData, loading: oppsLoading, error: oppsError, refetch: oppsRefetch } = useData<AccountOppsData>(oppsUrl)
  const opps = oppsData?.opportunities ?? []

  return (
    <>
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, padding: '0 4px 0 0' }}>◀</button>
          <Star id={account.name} type="account" label={account.name} />
          <h2 style={{ fontSize: 13 }}>{account.name}</h2>
        </div>
        <LogNewBar accountName={account.name} />
      </div>

      <div className="panel-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div className="section-label" style={{ margin: 0 }}>── Opportunities ──</div>
          {pullRequested && !oppsLoading && (
            <button className="refresh-btn" style={{ fontSize: 9 }} onClick={oppsRefetch}>↻</button>
          )}
        </div>

        {!account.odataId && (
          <div className="error-state">No odata ID cached for this account — look it up in chat first.</div>
        )}

        {account.odataId && !pullRequested && (
          <button
            onClick={() => setPullRequested(true)}
            className="card"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', fontSize: 11, color: 'var(--accent-lime-dim)', border: '1px dashed var(--accent-moss)', background: 'none', padding: '10px 12px' }}
          >
            ✦ Pull open opportunities
          </button>
        )}

        {oppsLoading && (
          <div className="loading-state">
            <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
            <span>Fetching opportunities...</span>
          </div>
        )}
        {oppsError && <div className="error-state">⚠️ {oppsError}</div>}

        {!oppsLoading && !oppsError && oppsData && (
          opps.length > 0
            ? opps.map((opp) => <AccountOppCard key={opp.oppNum} opp={opp} accountName={account.name} />)
            : (
              <div>
                <div className="empty-state" style={{ padding: '16px 0 8px' }}>No open opportunities found.</div>
                {oppsData.raw && (
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>raw response ▾</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 10, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>{oppsData.raw}</pre>
                  </details>
                )}
              </div>
            )
        )}
      </div>
    </>
  )
}

function AccountOppCard({ opp, accountName }: { opp: AccountOpp; accountName: string }) {
  const { openOpp } = useStore()

  return (
    <div
      className="card"
      style={{ cursor: 'pointer' }}
      onClick={() => openOpp({ oppNum: opp.oppNum, odataId: opp.odataId || undefined, accountName })}
    >
      <div className="card-header">
        <Star id={opp.oppNum} type="opportunity" label={opp.oppNum} subtitle={accountName} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="opp-num" style={{ marginBottom: 3 }}>{opp.oppNum}</div>
          <span className="card-title">{opp.name || accountName}</span>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          {opp.status && (
            <span className={`card-badge ${opp.status.toLowerCase().includes('open') ? 'badge-lime' : 'badge-muted'}`}>
              {opp.status}
            </span>
          )}
          <div style={{ fontSize: 10, color: 'var(--accent-lime-dim)', marginTop: 4 }}>View →</div>
        </div>
      </div>
      {opp.salesStage && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>📍 {opp.salesStage}</div>
      )}
    </div>
  )
}
