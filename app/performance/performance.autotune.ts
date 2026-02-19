import { performanceMonitor, PerformanceMetrics } from './performance.monitor'
import { usePerformanceStore } from '../store/usePerformanceStore'
import { PerformanceTier } from './performance.config'

const FPS_LOW_THRESHOLD = 20
const FPS_RECOVERY_THRESHOLD = 50
const SAMPLE_WINDOW = 5
const MEMORY_HIGH_THRESHOLD_MB = 600
const COOLDOWN_MS = 15_000

const TIER_ORDER: Exclude<PerformanceTier, 'auto'>[] = ['low', 'balanced', 'high', 'ultra']

class PerformanceAutotuner {
  private fpsHistory: number[] = []
  private unsubscribe: (() => void) | null = null
  private lastChangeTime = 0
  private visibilityHandler: (() => void) | null = null

  start() {
    this.fpsHistory = []
    this.unsubscribe = performanceMonitor.subscribe(this.onMetrics)

    this.visibilityHandler = () => {
      if (!document.hidden) {
        this.fpsHistory = []
      }
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)

    performanceMonitor.start()
  }

  stop() {
    this.unsubscribe?.()
    this.unsubscribe = null
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }
    performanceMonitor.stop()
    this.fpsHistory = []
  }

  private onMetrics = (metrics: PerformanceMetrics) => {
    const store = usePerformanceStore.getState()
    if (store.userSelectedTier !== 'auto') return

    this.fpsHistory.push(metrics.fps)
    if (this.fpsHistory.length > SAMPLE_WINDOW) this.fpsHistory.shift()
    if (this.fpsHistory.length < SAMPLE_WINDOW) return

    const now = performance.now()
    if (now - this.lastChangeTime < COOLDOWN_MS) return

    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
    const currentIdx = TIER_ORDER.indexOf(store.activeTier)

    if (
      (avgFps < FPS_LOW_THRESHOLD ||
        (metrics.memoryUsageMB && metrics.memoryUsageMB > MEMORY_HIGH_THRESHOLD_MB))
      && currentIdx > 0
    ) {
      const newTier = TIER_ORDER[currentIdx - 1]
      store._autoAdjustTier(newTier)
      this.fpsHistory = []
      this.lastChangeTime = now
      return
    }

    const maxIdx = TIER_ORDER.indexOf(store.detectedTier)
    if (avgFps > FPS_RECOVERY_THRESHOLD && currentIdx < maxIdx) {
      const newTier = TIER_ORDER[currentIdx + 1]
      store._autoAdjustTier(newTier)
      this.fpsHistory = []
      this.lastChangeTime = now
    }
  }
}

export const performanceAutotuner = new PerformanceAutotuner()
