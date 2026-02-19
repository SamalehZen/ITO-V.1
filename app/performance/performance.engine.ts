import { HardwareInfo, PerformanceTier } from './performance.config'

export function detectHardware(): HardwareInfo {
  const ramGB = (navigator as any).deviceMemory ?? estimateRAM()
  const cpuCores = navigator.hardwareConcurrency ?? 2
  const gpuScore = benchmarkWebGL()
  const platform = navigator.platform
  const cpuModel = getCPUModel()

  return { ramGB, cpuCores, gpuScore, platform, cpuModel }
}

function getCPUModel(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows PC'
  if (ua.includes('Mac')) return 'Mac'
  if (ua.includes('Linux')) return 'Linux PC'
  return navigator.platform || 'Unknown'
}

function estimateRAM(): number {
  const perf = performance as any
  if (perf.memory) {
    const heapLimitGB = perf.memory.jsHeapSizeLimit / (1024 * 1024 * 1024)
    return Math.round(heapLimitGB * 2)
  }
  return 4
}

function benchmarkWebGL(): number {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!gl) return 0

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : ''

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      gl.clear(gl.COLOR_BUFFER_BIT)
    }
    gl.finish()
    const elapsed = performance.now() - start

    let score = Math.max(10, Math.min(100, Math.round(100 - elapsed)))

    if (/RTX|Radeon RX [67]|Apple M[2-9]/i.test(renderer)) score = Math.min(100, score + 20)
    if (/Intel.*HD\s*(5|6)\d{2}/i.test(renderer)) score = Math.max(10, score - 15)

    canvas.remove()
    return score
  } catch {
    return 30
  }
}

export function classifyTier(hw: HardwareInfo): Exclude<PerformanceTier, 'auto'> {
  if (hw.ramGB <= 4 || hw.cpuCores <= 2) return 'low'

  if (hw.ramGB <= 6 || hw.gpuScore < 30) return 'low'

  if (hw.ramGB <= 8 && hw.gpuScore < 60) return 'balanced'

  if (hw.ramGB <= 16) return 'high'

  if (hw.ramGB > 16 && hw.gpuScore >= 70) return 'ultra'

  return 'high'
}
