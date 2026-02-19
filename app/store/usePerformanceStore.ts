import { create } from 'zustand'
import { STORE_KEYS } from '../../lib/constants/store-keys'
import { debouncedSyncToStore } from '@/app/utils/debouncedStoreSync'
import {
  PerformanceTier,
  PerformanceConfig,
  HardwareInfo,
  TIER_CONFIGS,
} from '../performance/performance.config'
import { detectHardware, classifyTier } from '../performance/performance.engine'
import { performanceMonitor } from '../performance/performance.monitor'

interface PerformanceState {
  userSelectedTier: PerformanceTier
  detectedTier: Exclude<PerformanceTier, 'auto'>
  activeTier: Exclude<PerformanceTier, 'auto'>
  config: PerformanceConfig
  hardwareInfo: HardwareInfo | null
  setTier: (tier: PerformanceTier) => void
  _autoAdjustTier: (tier: Exclude<PerformanceTier, 'auto'>) => void
  initialize: () => void
}

const getInitialState = () => {
  try {
    const stored = window.electron?.store?.get(STORE_KEYS.PERFORMANCE)
    if (stored) {
      return {
        userSelectedTier: (stored.userSelectedTier as PerformanceTier) ?? 'auto',
        detectedTier: (stored.detectedTier as Exclude<PerformanceTier, 'auto'>) ?? 'balanced',
        activeTier: (stored.activeTier as Exclude<PerformanceTier, 'auto'>) ?? 'balanced',
        config: stored.config ?? TIER_CONFIGS.balanced,
        hardwareInfo: stored.hardwareInfo ?? null,
      }
    }
  } catch (e) {
    console.warn('[PerfStore] Failed to read stored performance state:', e)
  }
  return {
    userSelectedTier: 'auto' as PerformanceTier,
    detectedTier: 'balanced' as Exclude<PerformanceTier, 'auto'>,
    activeTier: 'balanced' as Exclude<PerformanceTier, 'auto'>,
    config: TIER_CONFIGS.balanced,
    hardwareInfo: null,
  }
}

const syncToStore = (state: Partial<PerformanceState>) => {
  const update: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    if (typeof value !== 'function') update[key] = value
  }
  debouncedSyncToStore(STORE_KEYS.PERFORMANCE, update)
}

function applyPerformanceResourceLimits(config: PerformanceConfig, _tier: string) {
  performanceMonitor.setSamplingInterval(config.fpsCap <= 30 ? 2000 : 1000)

  const root = document.documentElement
  if (!config.enableParticles) {
    root.classList.add('perf-no-particles')
  } else {
    root.classList.remove('perf-no-particles')
  }

  if (config.imageQuality === 'low') {
    root.classList.add('perf-low-quality')
  } else {
    root.classList.remove('perf-low-quality')
  }
}

function applyPerformanceCSS(config: PerformanceConfig, tier: string) {
  const root = document.documentElement
  root.dataset.perfTier = tier
  root.style.setProperty('--perf-animation-multiplier', String(config.animationDurationMultiplier))
  root.style.setProperty('--perf-blur', config.enableBlur ? '1' : '0')
  root.style.setProperty('--perf-shadows', config.enableShadows ? '1' : '0')
  root.style.setProperty('--perf-backdrop-blur', config.enableBackdropBlur ? '1' : '0')
}

export const usePerformanceStore = create<PerformanceState>((set, get) => {
  const initial = getInitialState()

  if (typeof document !== 'undefined') {
    applyPerformanceCSS(initial.config, initial.activeTier)
    applyPerformanceResourceLimits(initial.config, initial.activeTier)
  }

  return {
    ...initial,

    setTier: (tier: PerformanceTier) => {
      const { detectedTier } = get()
      const activeTier = tier === 'auto' ? detectedTier : tier as Exclude<PerformanceTier, 'auto'>
      const config = TIER_CONFIGS[activeTier]
      const update = { userSelectedTier: tier, activeTier, config }
      set(update)
      syncToStore(update)
      applyPerformanceCSS(config, activeTier)
      applyPerformanceResourceLimits(config, activeTier)
    },

    _autoAdjustTier: (tier: Exclude<PerformanceTier, 'auto'>) => {
      const config = TIER_CONFIGS[tier]
      const update = { activeTier: tier, config }
      set(update)
      syncToStore(update)
      applyPerformanceCSS(config, tier)
      applyPerformanceResourceLimits(config, tier)
    },

    initialize: () => {
      const hw = detectHardware()
      const detected = classifyTier(hw)
      const { userSelectedTier } = get()
      const activeTier = userSelectedTier === 'auto' ? detected : userSelectedTier as Exclude<PerformanceTier, 'auto'>
      const config = TIER_CONFIGS[activeTier]
      const update = { hardwareInfo: hw, detectedTier: detected, activeTier, config, userSelectedTier }
      set(update)
      syncToStore(update)
      applyPerformanceCSS(config, activeTier)
      applyPerformanceResourceLimits(config, activeTier)
    },
  }
})
