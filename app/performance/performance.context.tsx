import { createContext, useContext, ReactNode } from 'react'
import { usePerformanceStore } from '../store/usePerformanceStore'
import type { PerformanceConfig, PerformanceTier, HardwareInfo } from './performance.config'

interface PerformanceContextValue {
  tier: Exclude<PerformanceTier, 'auto'>
  config: PerformanceConfig
  hardwareInfo: HardwareInfo | null
  userSelectedTier: PerformanceTier
  setTier: (tier: PerformanceTier) => void
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null)

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const store = usePerformanceStore()
  return (
    <PerformanceContext.Provider value={{
      tier: store.activeTier,
      config: store.config,
      hardwareInfo: store.hardwareInfo,
      userSelectedTier: store.userSelectedTier,
      setTier: store.setTier,
    }}>
      {children}
    </PerformanceContext.Provider>
  )
}

export function usePerformance() {
  const ctx = useContext(PerformanceContext)
  if (!ctx) throw new Error('usePerformance must be used within PerformanceProvider')
  return ctx
}
