import React, { useState, useEffect } from 'react'

export const BAR_COUNT = 15
export const BAR_WIDTH = 3
export const BAR_SPACING = 2
export const MIN_BAR_HEIGHT = 4
export const MAX_BAR_HEIGHT = 28

export const ProgressAnimation: React.FC<{ color: string; speed?: number }> = ({ color, speed = 0.3 }) => {
  const dotCount = 5
  const dotSize = 3
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setCurrent((c) => {
        const next = c + 1
        return next > dotCount + 1 ? 0 : next
      })
    }, speed * 1000)
    return () => clearInterval(id)
  }, [speed])

  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: dotCount }).map((_, i) => (
        <div
          key={i}
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: color,
            opacity: i <= current ? 0.85 : 0.25,
          }}
        />
      ))}
    </div>
  )
}

export const ProcessingStatusDisplay: React.FC<{ color: string }> = ({ color }) => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: MAX_BAR_HEIGHT,
  }}>
    <span style={{ color, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
      Transcribing
    </span>
    <ProgressAnimation color={color} speed={0.18} />
  </div>
)
