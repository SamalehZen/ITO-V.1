import React, { useState, useEffect, useRef, useMemo } from 'react'
import { usePerformanceStore } from '../../store/usePerformanceStore'
import { Square, X } from '@mynaui/icons-react'
import { useSettingsStore } from '../../store/useSettingsStore'
import {
  useOnboardingStore,
  ONBOARDING_CATEGORIES,
} from '../../store/useOnboardingStore'
import { AudioVisualizer, StaticVisualizer } from './contents/AudioBars'
import { ProcessingStatusDisplay } from './contents/AudioBarsBase'
import { useAudioStore } from '@/app/store/useAudioStore'
import { analytics, ANALYTICS_EVENTS } from '../analytics'
import { ItoIcon } from '../icons/ItoIcon'
import { soundPlayer } from '@/app/utils/soundPlayer'
import type {
  RecordingStatePayload,
  ProcessingStatePayload,
} from '@/lib/types/ipc'
import type { AppTarget } from '@/app/store/useAppStylingStore'

const globalStyles = `
  html, body, #app {
    height: 100%;
    margin: 0;
    overflow: hidden;
    background: transparent !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    pointer-events: none;
    font-family:
      'Inter',
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      Roboto,
      sans-serif;
  }
`

const PILL_WIDTH = 360
const PILL_HEIGHT = 46
const TOP_CORNER_RADIUS = 6
const BOTTOM_CORNER_RADIUS = 10

function buildNotchPath(w: number, h: number): string {
  const tr = TOP_CORNER_RADIUS
  const br = BOTTOM_CORNER_RADIUS
  return [
    `M 0 0`,
    `Q ${tr} 0 ${tr} ${tr}`,
    `L ${tr} ${h - br}`,
    `Q ${tr} ${h} ${tr + br} ${h}`,
    `L ${w - tr - br} ${h}`,
    `Q ${w - tr} ${h} ${w - tr} ${h - br}`,
    `L ${w - tr} ${tr}`,
    `Q ${w - tr} 0 ${w} 0`,
    `Z`,
  ].join(' ')
}

function getBarUpdateInterval(): number {
  const { activeTier } = usePerformanceStore.getState()
  if (activeTier === 'low') return 200
  if (activeTier === 'balanced') return 100
  return 64
}

const Pill = () => {
  const initialShowItoBarAlways = useSettingsStore(
    state => state.showItoBarAlways,
  )
  const initialInteractionSounds = useSettingsStore(
    state => state.interactionSounds,
  )
  const initialOnboardingCategory = useOnboardingStore(
    state => state.onboardingCategory,
  )
  const initialOnboardingCompleted = useOnboardingStore(
    state => state.onboardingCompleted,
  )
  const { startRecording, stopRecording } = useAudioStore()
  const activeTier = usePerformanceStore(s => s.activeTier)
  const config = usePerformanceStore(s => s.config)

  const [isRecording, setIsRecording] = useState(false)
  const [isManualRecording, setIsManualRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const isManualRecordingRef = useRef(false)
  const [interactionSounds, setInteractionSoundsLocal] = useState(
    initialInteractionSounds,
  )
  const interactionSoundsRef = useRef(initialInteractionSounds)
  const [showItoBarAlways, setShowItoBarAlways] = useState(
    initialShowItoBarAlways,
  )
  const [onboardingCategory, setOnboardingCategory] = useState(
    initialOnboardingCategory,
  )
  const [onboardingCompleted, setOnboardingCompleted] = useState(
    initialOnboardingCompleted,
  )
  const volumeHistoryRef = useRef<number[]>([])
  const lastVolumeUpdateRef = useRef(0)
  const [volumeHistory, setVolumeHistory] = useState<number[]>([])
  const [appTarget, setAppTarget] = useState<AppTarget | null>(null)
  const hasBeenShownRef = useRef(false)

  const notchPath = useMemo(() => buildNotchPath(PILL_WIDTH, PILL_HEIGHT), [])
  const animDuration = config.animationDurationMultiplier === 0 ? '0s' : '0.25s'
  const animDurationOut = config.animationDurationMultiplier === 0 ? '0s' : '0.2s'
  const currentAudioLevel = volumeHistory[volumeHistory.length - 1] || 0

  useEffect(() => {
    soundPlayer.init()
    return () => {
      soundPlayer.dispose()
    }
  }, [])

  useEffect(() => {
    interactionSoundsRef.current = interactionSounds
  }, [interactionSounds])

  useEffect(() => {
    const unsubRecording = window.api.on(
      'recording-state-update',
      (state: RecordingStatePayload) => {
        setIsRecording(state.isRecording)

        if (interactionSoundsRef.current) {
          soundPlayer.play(
            state.isRecording ? 'recording-start' : 'recording-stop',
          )
        }

        if (!isManualRecordingRef.current) {
          const analyticsEvent = state.isRecording
            ? ANALYTICS_EVENTS.RECORDING_STARTED
            : ANALYTICS_EVENTS.RECORDING_COMPLETED
          analytics.track(analyticsEvent, {
            is_recording: state.isRecording,
            mode: state.mode,
          })
        }

        if (!state.isRecording) {
          setIsManualRecording(false)
          isManualRecordingRef.current = false
          volumeHistoryRef.current = []
          setVolumeHistory([])
        }
      },
    )

    const unsubProcessing = window.api.on(
      'processing-state-update',
      (state: ProcessingStatePayload) => {
        setIsProcessing(state.isProcessing)
      },
    )

    const unsubVolume = window.api.on('volume-update', (vol: number) => {
      const now = Date.now()
      if (now - lastVolumeUpdateRef.current < getBarUpdateInterval()) {
        return
      }
      const newHistory = [...volumeHistoryRef.current, vol]
      if (newHistory.length > 42) {
        newHistory.shift()
      }
      volumeHistoryRef.current = newHistory
      lastVolumeUpdateRef.current = now
      setVolumeHistory(newHistory)
    })

    const unsubSettings = window.api.on('settings-update', (settings: any) => {
      setShowItoBarAlways(settings.showItoBarAlways)
      setInteractionSoundsLocal(settings.interactionSounds)
    })

    const unsubOnboarding = window.api.on(
      'onboarding-update',
      (onboarding: any) => {
        setOnboardingCategory(onboarding.onboardingCategory)
        setOnboardingCompleted(onboarding.onboardingCompleted)
      },
    )

    const unsubUserAuth = window.api.on('user-auth-update', (authUser: any) => {
      if (authUser) {
        analytics.identifyUser(
          authUser.id,
          {
            user_id: authUser.id,
            email: authUser.email,
            name: authUser.name,
            provider: authUser.provider,
          },
          authUser.provider,
        )
      } else {
        analytics.resetUser()
      }
    })

    return () => {
      unsubRecording()
      unsubProcessing()
      unsubVolume()
      unsubSettings()
      unsubOnboarding()
      unsubUserAuth()
    }
  }, [])

  useEffect(() => {
    if (isRecording || isManualRecording) {
      window.api.appTargets
        .getCurrent()
        .then(setAppTarget)
        .catch(() => setAppTarget(null))
    }
  }, [isRecording, isManualRecording])

  useEffect(() => {
    if (!isRecording && !isManualRecording && !isProcessing) {
      setAppTarget(null)
    }
  }, [isRecording, isManualRecording, isProcessing])

  const anyRecording = isRecording || isManualRecording
  const shouldShow =
    (onboardingCategory === ONBOARDING_CATEGORIES.TRY_IT ||
      onboardingCompleted) &&
    (anyRecording || isProcessing || showItoBarAlways || isHovered)

  if (shouldShow) {
    hasBeenShownRef.current = true
  }

  const notchState: 'idle' | 'listening' | 'thinking' = anyRecording
    ? 'listening'
    : isProcessing
      ? 'thinking'
      : 'idle'

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (window.api?.setPillMouseEvents) {
      window.api.setPillMouseEvents(false)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (window.api?.setPillMouseEvents) {
      window.api.setPillMouseEvents(true, { forward: true })
    }
  }

  const handleClick = () => {
    if (isHovered && !anyRecording && !isProcessing) {
      setIsManualRecording(true)
      isManualRecordingRef.current = true
      startRecording()
      analytics.track(ANALYTICS_EVENTS.MANUAL_RECORDING_STARTED, {
        is_recording: true,
      })
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsManualRecording(false)
    stopRecording()
    analytics.track(ANALYTICS_EVENTS.MANUAL_RECORDING_ABANDONED, {
      is_recording: false,
    })
  }

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsManualRecording(false)
    stopRecording()
    analytics.track(ANALYTICS_EVENTS.MANUAL_RECORDING_COMPLETED, {
      is_recording: false,
    })
  }

  const renderIcon = () => {
    if (appTarget?.iconBase64) {
      return (
        <img
          src={`data:image/png;base64,${appTarget.iconBase64}`}
          style={{ width: 24, height: 24, borderRadius: 4 }}
        />
      )
    }
    return <ItoIcon width={24} height={24} className="text-white" />
  }

  const renderRightContent = () => {
    if (isManualRecording) {
      return (
        <>
          <button
            onClick={handleCancel}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <X width={16} height={16} color="white" />
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AudioVisualizer audioLevel={currentAudioLevel} color="white" isActive />
          </div>
          <button
            onClick={handleStop}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Square width={16} height={16} color="white" fill="currentColor" />
          </button>
        </>
      )
    }

    if (anyRecording) {
      return <AudioVisualizer audioLevel={currentAudioLevel} color="white" isActive />
    }

    if (isProcessing) {
      return <ProcessingStatusDisplay color="white" />
    }

    return <StaticVisualizer color="white" />
  }

  const isIdle = notchState === 'idle'

  return (
    <>
      <style>{globalStyles}</style>
      <style>{`
        @keyframes notch-fadeIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes notch-fadeOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>
      <div className="fixed top-0 left-0 w-full flex justify-center z-50 pointer-events-none">
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <clipPath id="notch-clip">
              <path d={notchPath} />
            </clipPath>
          </defs>
        </svg>
        <div
          style={{
            width: PILL_WIDTH,
            height: PILL_HEIGHT,
            clipPath: 'url(#notch-clip)',
            WebkitClipPath: 'url(#notch-clip)',
            background: 'rgba(0,0,0,0.95)',
            backdropFilter: config.enableBackdropBlur ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: config.enableBackdropBlur ? 'blur(20px)' : 'none',
            opacity: !hasBeenShownRef.current && !shouldShow ? 0 : undefined,
            animation: hasBeenShownRef.current || shouldShow
              ? shouldShow
                ? `notch-fadeIn ${animDuration} ease-out forwards`
                : `notch-fadeOut ${animDurationOut} ease-in forwards`
              : 'none',
            pointerEvents: shouldShow ? 'auto' : 'none',
            cursor: isIdle && !anyRecording && !isProcessing ? 'pointer' : 'default',
            ...(activeTier !== 'low' && { willChange: 'transform, opacity' }),
          }}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            height: '100%',
            padding: '0 20px',
          }}>
            {!isManualRecording && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {renderIcon()}
                  <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '0.025em', color: 'white' }}>
                    {appTarget?.name || 'Ito'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {renderRightContent()}
                </div>
              </>
            )}
            {isManualRecording && renderRightContent()}
          </div>
        </div>
      </div>
    </>
  )
}

export default Pill
