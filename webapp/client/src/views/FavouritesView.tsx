import { useStore, Favourite, FavouriteType } from '../store'
import { useData } from '../hooks/useData'
import { LogNewBar } from '../components/LogNewBar'
import { Star } from '../components/Star'

interface LoggedEntry {
  engagementNumber?: string
  [key: string]: unknown
}
interface LoggedData { entries: LoggedEntry[] }

const TYPE_LABEL: Record<FavouriteType, string> = {
  opportunity: '── Opportunities ──',
  account: '── Accounts ──',
  engagement: '── Engagements ──',
}

const TYPE_ICON: Record<FavouriteType, string> = {
  opportunity: '🏢',
  account: '🏛️',
  engagement: '💼',
}

function OppAccountCard({ fav }: { fav: Favourite }) {
  const { openOpp, openAccount } = useStore()

  function handleNavigate() {
    if (fav.type === 'opportunity') {
      openOpp({ oppNum: fav.id, accountName: fav.subtitle })
    } else if (fav.type === 'account') {
      openAccount({ name: fav.label })
    }
  }

  const oppNum = fav.type === 'opportunity' ? fav.id : undefined
  const accountName = fav.type === 'account' ? fav.label : fav.subtitle

  return (
    <div
      className="card"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
      onClick={handleNavigate}
    >
      <Star id={fav.id} type={fav.type} label={fav.label} subtitle={fav.subtitle} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card-header" style={{ marginBottom: 2 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {fav.type === 'opportunity' && (
              <div className="opp-num" style={{ marginBottom: 2 }}>{fav.id}</div>
            )}
            <span className="card-title">
              {TYPE_ICON[fav.type]} {fav.label}
            </span>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <LogNewBar oppNum={oppNum} accountName={accountName} />
          </div>
        </div>
        {fav.subtitle && <div className="card-meta">{fav.subtitle}</div>}
        <div style={{ fontSize: 10, color: 'var(--accent-lime-dim)', marginTop: 4 }}>View →</div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>
          Starred {new Date(fav.addedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

function EngagementCard({ fav, loggedNums }: { fav: Favourite; loggedNums: Set<string> }) {
  const isLogged = loggedNums.has(fav.id)
  const accountName = fav.subtitle

  return (
    <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <Star id={fav.id} type="engagement" label={fav.label} subtitle={fav.subtitle} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="card-header" style={{ marginBottom: 3 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span className="opp-num">{fav.id}</span>
              {isLogged && (
                <span className="card-badge badge-lime" style={{ fontSize: 9 }}>✓ logged</span>
              )}
            </div>
            <span className="card-title">💼 {fav.label}</span>
          </div>
          <LogNewBar
            accountName={accountName}
            engagements={[{ engNum: fav.id, name: fav.label }]}
          />
        </div>
        {fav.subtitle && <div className="card-meta">{fav.subtitle}</div>}
        <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
          Starred {new Date(fav.addedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  )
}

export function FavouritesView() {
  const { favourites } = useStore()
  const { data: loggedData } = useData<LoggedData>('/api/logged')

  const loggedNums = new Set(
    (loggedData?.entries ?? [])
      .map((e) => e.engagementNumber)
      .filter((n): n is string => !!n)
  )

  const byType = (type: FavouriteType) =>
    [...favourites].filter((f) => f.type === type).sort((a, b) => b.addedAt.localeCompare(a.addedAt))

  const opps = byType('opportunity')
  const accounts = byType('account')
  const engagements = byType('engagement')
  const total = favourites.length

  return (
    <>
      <div className="panel-header">
        <h2>★ Favourites</h2>
        {total > 0 && (
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{total} starred</span>
        )}
      </div>

      <div className="panel-content">
        {total === 0 && (
          <div className="empty-state">
            <span className="icon">☆</span>
            No favourites yet.
            <br />
            <span style={{ fontSize: 11, marginTop: 6, display: 'block' }}>
              Hit ☆ on any opportunity, account, or engagement to star it.
            </span>
          </div>
        )}

        {opps.length > 0 && (
          <>
            <div className="section-label">{TYPE_LABEL.opportunity}</div>
            {opps.map((f) => <OppAccountCard key={f.id} fav={f} />)}
          </>
        )}

        {accounts.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: opps.length > 0 ? 16 : 0 }}>{TYPE_LABEL.account}</div>
            {accounts.map((f) => <OppAccountCard key={f.id} fav={f} />)}
          </>
        )}

        {engagements.length > 0 && (
          <>
            <div className="section-label" style={{ marginTop: (opps.length + accounts.length) > 0 ? 16 : 0 }}>{TYPE_LABEL.engagement}</div>
            {engagements.map((f) => <EngagementCard key={f.id} fav={f} loggedNums={loggedNums} />)}
          </>
        )}
      </div>
    </>
  )
}
