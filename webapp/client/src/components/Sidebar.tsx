import { useState } from 'react'
import { useStore, View } from '../store'

const NAV_ITEMS: { view: View; icon: string; label: string; ability?: string }[] = [
  { view: 'calendar',      icon: '📅', label: 'Calendar' },
  { view: 'requests',      icon: '📋', label: 'Requests',      ability: 'requests' },
  { view: 'logged',        icon: '💼', label: 'Logged' },
  { view: 'opportunities', icon: '🏢', label: 'Opportunities' },
  { view: 'accounts',      icon: '🏛️', label: 'Accounts' },
  { view: 'favourites',    icon: '★',  label: 'Favourites' },
]

export function Sidebar() {
  const { activeView, setActiveView, abilities } = useStore()
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = NAV_ITEMS.filter(({ ability }) => !ability || abilities.includes(ability))

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-logo"
        onClick={() => setActiveView('home')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '14px 12px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}
      >
        <span className="frog">🐸</span>
        <h1>LOGGER</h1>
      </button>

      <nav className="sidebar-nav">
        {visibleItems.map(({ view, icon, label }) => (
          <button
            key={view}
            className={`nav-item ${activeView === view ? 'active' : ''}`}
            onClick={() => setActiveView(view)}
            title={collapsed ? label : undefined}
          >
            <span className="icon">{icon}</span>
            <span className="nav-label">{label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">Logger 2.0 · Web UI</div>

      <button
        className="sidebar-collapse-btn"
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? '▶' : '◀'}
      </button>
    </div>
  )
}
