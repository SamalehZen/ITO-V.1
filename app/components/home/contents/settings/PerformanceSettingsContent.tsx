import { useState, useEffect } from 'react'
import { usePerformanceStore } from '@/app/store/usePerformanceStore'
import { PerformanceTier } from '@/app/performance/performance.config'
import { performanceMonitor, PerformanceMetrics } from '@/app/performance/performance.monitor'
import { Button } from '@/app/components/ui/button'

const TIER_OPTIONS: { id: PerformanceTier; label: string; description: string }[] = [
  { id: 'auto', label: 'Auto', description: 'Automatically selects the best mode for your hardware.' },
  { id: 'low', label: 'Low', description: 'Optimized for machines with limited resources. Disables visual effects for smoother performance.' },
  { id: 'balanced', label: 'Balanced', description: 'Good balance of performance and visual quality.' },
  { id: 'high', label: 'High', description: 'Full visual fidelity with all effects enabled.' },
  { id: 'ultra', label: 'Ultra', description: 'Maximum quality with 120 FPS cap and premium effects.' },
]

export default function PerformanceSettingsContent() {
  const {
    userSelectedTier,
    activeTier,
    detectedTier,
    hardwareInfo,
    setTier,
  } = usePerformanceStore()

  const [pendingTier, setPendingTier] = useState<PerformanceTier>(userSelectedTier)
  const [showSaved, setShowSaved] = useState(false)
  const isDirty = pendingTier !== userSelectedTier

  useEffect(() => {
    setPendingTier(userSelectedTier)
  }, [userSelectedTier])

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  useEffect(() => {
    performanceMonitor.start()
    const unsub = performanceMonitor.subscribe(setMetrics)
    return () => {
      unsub()
      const { userSelectedTier } = usePerformanceStore.getState()
      if (userSelectedTier !== 'auto') {
        performanceMonitor.stop()
      }
    }
  }, [])

  const handleSave = () => {
    setTier(pendingTier)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="space-y-6">
          <div>
            <div className="text-sm font-medium mb-1">Performance Mode</div>
            <div className="text-xs text-[var(--color-subtext)] mb-3">
              Choose how Ito manages visual effects and animations. Auto mode adapts to your hardware automatically.
            </div>
            <div className="flex flex-wrap gap-2">
              {TIER_OPTIONS.map((opt) => (
                <Button
                  key={opt.id}
                  variant={pendingTier === opt.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPendingTier(opt.id)}
                >
                  {opt.label}{opt.id === 'auto' ? ' (Recommended)' : ''}
                </Button>
              ))}
            </div>
            {pendingTier === 'auto' && (
              <div className="text-xs text-[var(--color-subtext)] mt-3">
                Mode automatically selected based on your hardware:{' '}
                <span className="font-semibold uppercase text-foreground">{detectedTier}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Active Mode</div>
              <div className="text-xs text-[var(--color-subtext)] mt-1">
                {TIER_OPTIONS.find(t => t.id === activeTier)?.description}
              </div>
            </div>
            <span className="text-sm font-semibold uppercase px-3 py-1 rounded-md bg-[var(--color-muted-bg)]">
              {activeTier}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--border)]" />
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={!isDirty}>
          Save
        </Button>
        {showSaved && (
          <span className="text-sm text-green-600 font-medium">&check; Saved</span>
        )}
        {isDirty && (
          <span className="text-xs text-[var(--color-subtext)]">
            Unsaved changes — click Save to apply.
          </span>
        )}
      </div>

      {hardwareInfo && (
        <div>
          <div className="text-lg font-sans font-normal mb-4">Your Hardware</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">RAM</div>
                <div className="text-xs text-[var(--color-subtext)] mt-1">System memory detected.</div>
              </div>
              <span className="text-sm text-[var(--color-subtext)]">{hardwareInfo.ramGB} GB</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">CPU Cores</div>
                <div className="text-xs text-[var(--color-subtext)] mt-1">Logical processor count.</div>
              </div>
              <span className="text-sm text-[var(--color-subtext)]">{hardwareInfo.cpuCores}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">GPU Score</div>
                <div className="text-xs text-[var(--color-subtext)] mt-1">Graphics capability (0–100).</div>
              </div>
              <span className="text-sm text-[var(--color-subtext)]">{hardwareInfo.gpuScore} / 100</span>
            </div>
          </div>
        </div>
      )}

      {metrics && (
        <div>
          <div className="text-lg font-sans font-normal mb-4">Live Metrics</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">FPS</div>
                <div className="text-xs text-[var(--color-subtext)] mt-1">Current frames per second.</div>
              </div>
              <span className={`text-sm font-semibold ${
                metrics.fps >= 50 ? 'text-green-500' :
                metrics.fps >= 30 ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {metrics.fps}
              </span>
            </div>
            {metrics.memoryUsageMB !== null && (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Memory Usage</div>
                  <div className="text-xs text-[var(--color-subtext)] mt-1">JavaScript heap usage.</div>
                </div>
                <span className="text-sm text-[var(--color-subtext)]">{metrics.memoryUsageMB} MB</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="text-lg font-sans font-normal mb-4">Mode Details</div>
        <div className="space-y-4">
          {TIER_OPTIONS.filter(t => t.id !== 'auto').map((opt) => (
            <div
              key={opt.id}
              className={`flex items-start gap-4 p-3 rounded-lg ${
                activeTier === opt.id
                  ? 'bg-[var(--color-muted-bg)] border border-[var(--border)]'
                  : ''
              }`}
            >
              <div className="text-sm font-medium w-20 flex-shrink-0 capitalize">
                {opt.label}
              </div>
              <div className="text-xs text-[var(--color-subtext)]">
                {opt.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
