import { useStore } from '../store'

const ASCII_ART = `                   _
                 .'_\`--.___   __
                ( 'o\`   - .\`.'_ )
                 \`-._      \`_\`./_
                   '/\\    ( .'/ )
                  ,__//\`---\`-'_/`

const LOGO = `██╗      ██████╗  ██████╗  ██████╗ ███████╗██████╗
██║     ██╔═══██╗██╔════╝ ██╔════╝ ██╔════╝██╔══██╗
██║     ██║   ██║██║  ███╗██║  ███╗█████╗  ██████╔╝
██║     ██║   ██║██║   ██║██║   ██║██╔══╝  ██╔══██╗
███████╗╚██████╔╝╚██████╔╝╚██████╔╝███████╗██║  ██║
╚══════╝ ╚═════╝  ╚═════╝  ╚═════╝ ╚══════╝╚═╝  ╚═╝`

const NAV_TILES: { view: 'calendar' | 'requests' | 'logged' | 'opportunities' | 'favourites'; icon: string; label: string; desc: string }[] = [
  { view: 'calendar',      icon: '📅', label: 'Calendar',      desc: "Today's appointments" },
  { view: 'requests',      icon: '📋', label: 'Requests',      desc: 'Your active SC requests' },
  { view: 'logged',        icon: '💼', label: 'Logged',        desc: 'Engagement history' },
  { view: 'opportunities', icon: '🏢', label: 'Opportunities', desc: 'Cached opps & accounts' },
  { view: 'favourites',    icon: '★',  label: 'Favourites',    desc: 'Starred items' },
]

export function HomeView() {
  const { setActiveView } = useStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px 32px', gap: 0 }}>
      <pre style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        lineHeight: 1.4,
        color: 'var(--accent-lime)',
        margin: 0,
        textAlign: 'left',
        textShadow: '0 0 12px var(--accent-lime)',
        letterSpacing: '0.02em',
      }}>
        {ASCII_ART}
      </pre>

      <pre style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        lineHeight: 1.3,
        color: 'var(--accent-lime)',
        margin: '4px 0 0 0',
        textAlign: 'left',
        textShadow: '0 0 8px var(--accent-lime)',
        letterSpacing: '0.05em',
        opacity: 0.9,
      }}>
        {LOGO}
      </pre>

      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--font-pixel)', letterSpacing: '0.12em', marginTop: 16, marginBottom: 24 }}>
        LOG ENGAGEMENTS · TRACK OPPS · STAY IN FLOW
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, width: '100%', maxWidth: 480 }}>
        {NAV_TILES.map(({ view, icon, label, desc }) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--accent-moss)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '12px 10px',
              textAlign: 'center',
              transition: 'border-color 0.15s, background 0.15s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-lime-dim)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-moss)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-surface)'
            }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-pixel)', letterSpacing: '0.05em', color: 'var(--accent-lime-dim)' }}>{label}</span>
            <span style={{ fontSize: 9, color: 'var(--text-dim)', lineHeight: 1.3 }}>{desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
