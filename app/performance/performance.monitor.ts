export interface PerformanceMetrics {
  fps: number
  memoryUsageMB: number | null
  timestamp: number
}

type MonitorCallback = (metrics: PerformanceMetrics) => void

class PerformanceMonitor {
  private rafId: number | null = null
  private frameCount = 0
  private lastTime = 0
  private callbacks: Set<MonitorCallback> = new Set()
  private running = false
  private paused = false
  private samplingInterval = 1000
  private visibilityHandler: (() => void) | null = null

  setSamplingInterval(ms: number) {
    this.samplingInterval = ms
  }

  start() {
    if (this.running) return
    this.running = true
    this.paused = false
    this.lastTime = performance.now()
    this.frameCount = 0

    this.visibilityHandler = () => {
      if (document.hidden) {
        this.pause()
      } else {
        this.resume()
      }
    }
    document.addEventListener('visibilitychange', this.visibilityHandler)

    if (!document.hidden) {
      this.tick()
    } else {
      this.paused = true
    }
  }

  stop() {
    this.running = false
    this.paused = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler)
      this.visibilityHandler = null
    }
  }

  private pause() {
    if (!this.running || this.paused) return
    this.paused = true
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private resume() {
    if (!this.running || !this.paused) return
    this.paused = false
    this.lastTime = performance.now()
    this.frameCount = 0
    this.tick()
  }

  subscribe(cb: MonitorCallback): () => void {
    this.callbacks.add(cb)
    return () => this.callbacks.delete(cb)
  }

  private tick = () => {
    if (!this.running || this.paused) return
    this.frameCount++
    const now = performance.now()
    const elapsed = now - this.lastTime

    if (elapsed >= this.samplingInterval) {
      const fps = Math.round((this.frameCount * 1000) / elapsed)
      const perf = performance as any
      const memoryUsageMB = perf.memory
        ? Math.round(perf.memory.usedJSHeapSize / (1024 * 1024))
        : null

      const metrics: PerformanceMetrics = { fps, memoryUsageMB, timestamp: now }
      this.callbacks.forEach(cb => cb(metrics))
      this.frameCount = 0
      this.lastTime = now
    }

    this.rafId = requestAnimationFrame(this.tick)
  }
}

export const performanceMonitor = new PerformanceMonitor()
