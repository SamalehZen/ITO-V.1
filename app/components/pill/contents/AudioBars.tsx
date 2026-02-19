import React, { useState, useEffect, useRef, useMemo } from 'react'
import { usePerformanceStore } from '../../../store/usePerformanceStore'
import { BAR_COUNT, BAR_WIDTH, BAR_SPACING, MIN_BAR_HEIGHT, MAX_BAR_HEIGHT } from './AudioBarsBase'

export const AudioVisualizer: React.FC<{
  audioLevel: number
  color: string
  isActive: boolean
}> = ({ audioLevel, color, isActive }) => {
  const activeTier = usePerformanceStore(s => s.activeTier)
  const phases = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => i * 0.4),
    []
  )
  const [time, setTime] = useState(0)
  const rafRef = useRef<number>(0)
  const lastUpdateRef = useRef(0)

  useEffect(() => {
    if (!isActive) return
    const start = performance.now()
    lastUpdateRef.current = 0
    const tick = (now: number) => {
      const elapsed = now - start
      if (activeTier === 'low' && elapsed - lastUpdateRef.current < 100) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      lastUpdateRef.current = elapsed
      setTime(elapsed / 1000)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isActive, activeTier])

  const heights = useMemo(() => {
    if (!isActive) return Array(BAR_COUNT).fill(MIN_BAR_HEIGHT)
    const amplitude = Math.max(0, Math.min(1, audioLevel))
    const boosted = Math.pow(amplitude, 0.7)
    return phases.map((phase, i) => {
      const wave = Math.sin(time * 8 + phase) * 0.5 + 0.5
      const centerDist = Math.abs(i - BAR_COUNT / 2) / (BAR_COUNT / 2)
      const centerBoost = 1 - centerDist * 0.4
      return Math.max(
        MIN_BAR_HEIGHT,
        MIN_BAR_HEIGHT + boosted * wave * centerBoost * (MAX_BAR_HEIGHT - MIN_BAR_HEIGHT)
      )
    })
  }, [isActive, audioLevel, time, phases])

  const gpuAccel = activeTier !== 'low'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: BAR_SPACING,
      height: MAX_BAR_HEIGHT,
      ...(gpuAccel && { willChange: 'contents', transform: 'translateZ(0)' }),
    }}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{
            width: BAR_WIDTH,
            height: h,
            borderRadius: BAR_WIDTH / 2,
            backgroundColor: color,
            opacity: 0.85,
            transition: isActive ? 'none' : 'height 0.3s ease',
          }}
        />
      ))}
    </div>
  )
}

export const StaticVisualizer: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: BAR_SPACING, height: MAX_BAR_HEIGHT }}>
    {Array.from({ length: BAR_COUNT }).map((_, i) => (
      <div
        key={i}
        style={{
          width: BAR_WIDTH,
          height: MIN_BAR_HEIGHT,
          borderRadius: BAR_WIDTH / 2,
          backgroundColor: color,
          opacity: 0.5,
        }}
      />
    ))}
  </div>
)
