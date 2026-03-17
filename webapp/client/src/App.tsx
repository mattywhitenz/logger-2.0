import { useEffect } from 'react'
import { useStore } from './store'
import { Sidebar } from './components/Sidebar'
import { FloatingChat } from './components/FloatingChat'
import { CalendarView } from './views/CalendarView'
import { RequestsView } from './views/RequestsView'
import { LoggedView } from './views/LoggedView'
import { OpportunitiesView } from './views/OpportunitiesView'
import { AccountsView } from './views/AccountsView'
import { FavouritesView } from './views/FavouritesView'
import { HomeView } from './views/HomeView'

function MainPanel() {
  const { activeView } = useStore()

  return (
    <div className="main-panel">
      {activeView === 'home'          && <HomeView />}
      {activeView === 'calendar'      && <CalendarView />}
      {activeView === 'requests'      && <RequestsView />}
      {activeView === 'logged'        && <LoggedView />}
      {activeView === 'opportunities' && <OpportunitiesView />}
      {activeView === 'accounts'      && <AccountsView />}
      {activeView === 'favourites'    && <FavouritesView />}
    </div>
  )
}

export default function App() {
  const { setAbilities } = useStore()

  useEffect(() => {
    fetch('/api/me')
      .then((r) => r.json())
      .then((d: { abilities?: string }) => { if (d.abilities) setAbilities(d.abilities) })
      .catch(() => {})
  }, [])

  return (
    <div className="layout">
      <Sidebar />
      <MainPanel />
      <FloatingChat />
    </div>
  )
}
