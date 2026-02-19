import { create } from 'zustand'
import { STORE_KEYS } from '../../lib/constants/store-keys'
import { debouncedSyncToStore } from '@/app/utils/debouncedStoreSync'

type PageType =
  | 'home'
  | 'dictionary'
  | 'notes'
  | 'app-styling'
  | 'settings'
  | 'about'
type SettingsPageType =
  | 'general'
  | 'keyboard'
  | 'audio'
  | 'performance'
  | 'my-details'
  | 'account'
  | 'advanced'
  | 'pricing-billing'

interface MainStore {
  navExpanded: boolean
  currentPage: PageType
  settingsPage: SettingsPageType
  toggleNavExpanded: () => void
  setCurrentPage: (page: PageType) => void
  setSettingsPage: (page: SettingsPageType) => void
}

// Initialize from electron store
const getInitialState = () => {
  const storedMain = window.electron?.store?.get(STORE_KEYS.MAIN)

  return {
    navExpanded: storedMain?.navExpanded ?? true,
    currentPage: (storedMain?.currentPage as PageType) ?? 'home',
    settingsPage: (storedMain?.settingsPage as SettingsPageType) ?? 'general',
  }
}

const syncToStore = (state: Partial<MainStore>) => {
  const update: Record<string, unknown> = {}
  if ('navExpanded' in state) update.navExpanded = state.navExpanded
  if ('settingsPage' in state) update.settingsPage = state.settingsPage
  debouncedSyncToStore(STORE_KEYS.MAIN, update)
}

export const useMainStore = create<MainStore>(set => {
  const initialState = getInitialState()
  return {
    navExpanded: initialState.navExpanded,
    currentPage: 'home',
    settingsPage: initialState.settingsPage,
    toggleNavExpanded: () =>
      set(state => {
        const newState = { navExpanded: !state.navExpanded }
        syncToStore(newState)
        return newState
      }),
    setCurrentPage: (page: PageType) => set({ currentPage: page }),
    setSettingsPage: (page: SettingsPageType) => {
      const newState = { settingsPage: page }
      syncToStore(newState)
      set(newState)
    },
  }
})
