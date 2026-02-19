type StoreKey = string

interface PendingSyncState {
  timer: ReturnType<typeof setTimeout> | null
  pending: Record<string, unknown>
}

const syncStates = new Map<StoreKey, PendingSyncState>()

const DEBOUNCE_MS = 100

export function debouncedSyncToStore(
  storeKey: StoreKey,
  partialUpdate: Record<string, unknown>,
  immediate = false,
): void {
  let state = syncStates.get(storeKey)
  if (!state) {
    state = { timer: null, pending: {} }
    syncStates.set(storeKey, state)
  }

  Object.assign(state.pending, partialUpdate)

  if (immediate) {
    if (state.timer) clearTimeout(state.timer)
    flushSync(storeKey, state)
    return
  }

  if (state.timer) clearTimeout(state.timer)
  state.timer = setTimeout(() => {
    flushSync(storeKey, state!)
  }, DEBOUNCE_MS)
}

function flushSync(storeKey: StoreKey, state: PendingSyncState): void {
  state.timer = null
  if (Object.keys(state.pending).length === 0) return

  const currentStore = window.electron?.store?.get(storeKey) || {}
  const merged = { ...currentStore, ...state.pending }
  window.electron?.store?.set(storeKey, merged)
  state.pending = {}
}

export function flushAllPendingSyncs(): void {
  for (const [key, state] of syncStates) {
    if (state.timer) clearTimeout(state.timer)
    flushSync(key, state)
  }
}
