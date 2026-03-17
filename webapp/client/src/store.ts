import { create } from 'zustand'

export type View = 'home' | 'calendar' | 'requests' | 'logged' | 'opportunities' | 'accounts' | 'favourites'

// Shared navigation types — used to deep-link into a view from anywhere
export interface NavOpp {
  oppNum: string
  odataId?: string
  accountName?: string
  status?: string
  lastSeen?: string
  accountOdataId?: string
}
export interface NavAccount {
  name: string
  odataId?: string
}

export type FavouriteType = 'opportunity' | 'account' | 'engagement'

export interface Favourite {
  id: string
  type: FavouriteType
  label: string
  subtitle?: string
  addedAt: string
}

const FAV_KEY = 'logger-favourites'

function loadFavourites(): Favourite[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveFavourites(favs: Favourite[]): void {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs))
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface AppState {
  activeView: View
  chatMessages: ChatMessage[]
  calendarDate: string
  isChatOpen: boolean
  abilities: string
  setAbilities: (abilities: string) => void
  queuedMessage: string | null
  queueChatMessage: (text: string) => void
  clearQueuedMessage: () => void
  setActiveView: (view: View) => void
  setCalendarDate: (date: string) => void
  addUserMessage: (content: string) => string
  startAssistantMessage: () => string
  appendToMessage: (id: string, text: string) => void
  finalizeMessage: (id: string) => void
  addErrorMessage: (text: string) => void
  toggleChat: () => void
  clearChatMessages: () => void
  favourites: Favourite[]
  toggleFavourite: (fav: Omit<Favourite, 'addedAt'>) => void
  isFavourite: (id: string) => boolean
  // Deep-link navigation — set before switching view, consumed + cleared by the destination view
  pendingOpp: NavOpp | null
  pendingAccount: NavAccount | null
  openOpp: (opp: NavOpp) => void
  openAccount: (account: NavAccount) => void
  clearPending: () => void
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export const useStore = create<AppState>((set) => ({
  activeView: 'home',
  chatMessages: [],
  calendarDate: todayStr(),
  isChatOpen: true,
  abilities: '',
  setAbilities: (abilities) => set({ abilities }),
  queuedMessage: null,
  queueChatMessage: (text) => set({ queuedMessage: text }),
  clearQueuedMessage: () => set({ queuedMessage: null }),

  pendingOpp: null,
  pendingAccount: null,
  openOpp: (opp) => set({ activeView: 'opportunities', pendingOpp: opp }),
  openAccount: (account) => set({ activeView: 'accounts', pendingAccount: account }),
  clearPending: () => set({ pendingOpp: null, pendingAccount: null }),

  setActiveView: (view) => set({ activeView: view }),

  setCalendarDate: (date) => set({ calendarDate: date }),

  addUserMessage: (content) => {
    const id = crypto.randomUUID()
    set((s) => ({
      chatMessages: [...s.chatMessages, { id, role: 'user', content }],
    }))
    return id
  },

  startAssistantMessage: () => {
    const id = crypto.randomUUID()
    set((s) => ({
      chatMessages: [...s.chatMessages, { id, role: 'assistant', content: '', streaming: true }],
    }))
    return id
  },

  appendToMessage: (id, text) => {
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, content: m.content + text } : m
      ),
    }))
  },

  finalizeMessage: (id) => {
    set((s) => ({
      chatMessages: s.chatMessages.map((m) =>
        m.id === id ? { ...m, streaming: false } : m
      ),
    }))
  },

  addErrorMessage: (text) => {
    const id = crypto.randomUUID()
    set((s) => ({
      chatMessages: [...s.chatMessages, { id, role: 'assistant', content: text, streaming: false }],
    }))
  },

  toggleChat: () => set((s) => ({ isChatOpen: !s.isChatOpen })),

  clearChatMessages: () => set({ chatMessages: [] }),

  favourites: loadFavourites(),

  toggleFavourite: (fav) => set((s) => {
    const exists = s.favourites.some((f) => f.id === fav.id)
    const next = exists
      ? s.favourites.filter((f) => f.id !== fav.id)
      : [...s.favourites, { ...fav, addedAt: new Date().toISOString() }]
    saveFavourites(next)
    return { favourites: next }
  }),

  isFavourite: (id) => {
    // Read directly from store state — called outside of React render
    return useStore.getState().favourites.some((f) => f.id === id)
  },
}))
