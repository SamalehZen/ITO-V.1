import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  InfoCircle,
  Play,
  Stop,
  Copy,
  Check,
  Download,
} from '@mynaui/icons-react'
import { EXTERNAL_LINKS } from '@/lib/constants/external-links'
import { useSettingsStore } from '../../../store/useSettingsStore'
import { Tooltip, TooltipTrigger, TooltipContent } from '../../ui/tooltip'
import { useAuthStore } from '@/app/store/useAuthStore'
import { Interaction } from '@/lib/main/sqlite/models'
import { ItoMode } from '@/app/generated/ito_pb'
import { getKeyDisplay } from '@/app/utils/keyboard'
import { createStereo48kWavFromMonoPCM } from '@/app/utils/audioUtils'
import { KeyName } from '@/lib/types/keyboard'
import { usePlatform } from '@/app/hooks/usePlatform'
import { ProUpgradeDialog } from '../ProUpgradeDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog'
import { useBilling } from '@/app/contexts/BillingContext'

// Interface for interaction statistics
interface InteractionStats {
  streakDays: number
  totalWords: number
  averageWPM: number
}

const _StatCard = ({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}) => {
  return (
    <div className="flex flex-col p-4 w-1/3 border border-[var(--border)] rounded-[var(--radius-lg)] gap-4">
      <div className="flex flex-row items-center">
        <div className="flex flex-col gap-1">
          <div>{title}</div>
          <div className="font-bold">{value}</div>
        </div>
        <div className="flex flex-col items-end flex-1">{icon}</div>
      </div>
      <div className="w-full text-[var(--color-subtext)]">{description}</div>
    </div>
  )
}

interface HomeContentProps {
  isStartingTrial?: boolean
}

export default function HomeContent({
  isStartingTrial = false,
}: HomeContentProps) {
  const { getItoModeShortcuts } = useSettingsStore()
  const keyboardShortcut = getItoModeShortcuts(ItoMode.TRANSCRIBE)[0].keys
  const { user } = useAuthStore()
  const firstName = user?.name?.split(' ')[0]
  const platform = usePlatform()
  const INTERACTIONS_PAGE_SIZE = 50
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const audioInstancesRef = useRef<Map<string, HTMLAudioElement>>(new Map())
  const [visibleCount, setVisibleCount] = useState(INTERACTIONS_PAGE_SIZE)
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set())
  const [openTooltipKey, setOpenTooltipKey] = useState<string | null>(null)
  const [stats, setStats] = useState<InteractionStats>({
    streakDays: 0,
    totalWords: 0,
    averageWPM: 0,
  })
  const [showProDialog, setShowProDialog] = useState(false)
  const [showStatsDialog, setShowStatsDialog] = useState(false)
  const billingState = useBilling()

  // Persist "has shown trial dialog" flag in electron-store to survive remounts
  const [hasShownTrialDialog, setHasShownTrialDialogState] = useState(() => {
    try {
      const authStore = window.electron?.store?.get('auth') || {}
      const value = authStore?.hasShownTrialDialog === true
      return value
    } catch {
      return false
    }
  })

  const setHasShownTrialDialog = useCallback((value: boolean) => {
    try {
      setHasShownTrialDialogState(value)
      window.api.send('electron-store-set', 'auth.hasShownTrialDialog', value)
    } catch {
      console.warn('Failed to persist hasShownTrialDialog flag')
    }
  }, [])

  // Show trial dialog when trial starts
  useEffect(() => {
    if (
      billingState.isTrialActive &&
      billingState.proStatus === 'free_trial' &&
      !hasShownTrialDialog &&
      !billingState.isLoading
    ) {
      setShowProDialog(true)
      setHasShownTrialDialog(true)
    }
  }, [
    billingState.isTrialActive,
    billingState.proStatus,
    billingState.isLoading,
    isStartingTrial,
    hasShownTrialDialog,
    setHasShownTrialDialog,
  ])

  const billingRefreshRef = useRef(billingState.refresh)
  useEffect(() => {
    billingRefreshRef.current = billingState.refresh
  }, [billingState.refresh])

  useEffect(() => {
    const offTrialStarted = window.api.on('trial-started', async () => {
      await billingRefreshRef.current()
    })
    const offBillingSuccess = window.api.on(
      'billing-session-completed',
      async () => {
        await billingRefreshRef.current()
      },
    )
    return () => {
      offTrialStarted?.()
      offBillingSuccess?.()
    }
  }, [])

  // Reset dialog flag when trial is no longer active or user becomes pro
  // Only reset if we're certain the trial has ended (not just during loading/refreshing)
  useEffect(() => {
    if (billingState.isLoading) {
      // Don't reset during loading to avoid race conditions
      return
    }

    const shouldReset =
      billingState.proStatus === 'active_pro' ||
      (billingState.proStatus === 'none' && !billingState.isTrialActive)

    if (shouldReset && hasShownTrialDialog) {
      setHasShownTrialDialog(false)
    }
  }, [
    billingState.proStatus,
    billingState.isTrialActive,
    billingState.isLoading,
    hasShownTrialDialog,
    setHasShownTrialDialog,
  ])

  // Calculate statistics from interactions
  const calculateStats = useCallback(
    (interactions: Interaction[]): InteractionStats => {
      if (interactions.length === 0) {
        return { streakDays: 0, totalWords: 0, averageWPM: 0 }
      }

      // Calculate streak (consecutive days with interactions)
      const streakDays = calculateStreak(interactions)

      // Calculate total words from transcripts
      const totalWords = calculateTotalWords(interactions)

      // Calculate average WPM (estimate based on average speaking rate)
      const averageWPM = calculateAverageWPM(interactions)

      return { streakDays, totalWords, averageWPM }
    },
    [],
  )

  const calculateStreak = (interactions: Interaction[]): number => {
    if (interactions.length === 0) return 0

    // Group interactions by date
    const dateGroups = new Map<string, Interaction[]>()
    interactions.forEach(interaction => {
      const date = new Date(interaction.created_at).toDateString()
      if (!dateGroups.has(date)) {
        dateGroups.set(date, [])
      }
      dateGroups.get(date)!.push(interaction)
    })

    // Sort dates in descending order (most recent first)
    const sortedDates = Array.from(dateGroups.keys()).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime(),
    )

    let streak = 0
    const today = new Date()

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i])
      const expectedDate = new Date(today)
      expectedDate.setDate(today.getDate() - i)

      // Check if current date matches expected date (allowing for today or previous consecutive days)
      if (currentDate.toDateString() === expectedDate.toDateString()) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  const calculateTotalWords = (interactions: Interaction[]): number => {
    return interactions.reduce((total, interaction) => {
      const transcript = interaction.asr_output?.transcript?.trim()
      if (transcript) {
        // Count words by splitting on whitespace and filtering out empty strings
        const words = transcript.split(/\s+/).filter(word => word.length > 0)
        return total + words.length
      }
      return total
    }, 0)
  }

  const calculateAverageWPM = (interactions: Interaction[]): number => {
    const validInteractions = interactions.filter(
      interaction =>
        interaction.asr_output?.transcript?.trim() && interaction.duration_ms,
    )

    if (validInteractions.length === 0) return 0

    let totalWords = 0
    let totalDurationMs = 0

    validInteractions.forEach(interaction => {
      const transcript = interaction.asr_output?.transcript?.trim()
      if (transcript && interaction.duration_ms) {
        // Count words by splitting on whitespace and filtering out empty strings
        const words = transcript.split(/\s+/).filter(word => word.length > 0)
        totalWords += words.length
        totalDurationMs += interaction.duration_ms
      }
    })

    if (totalDurationMs === 0) return 0

    // Calculate WPM: (total words / total duration in minutes)
    const totalMinutes = totalDurationMs / (1000 * 60)
    const wpm = totalWords / totalMinutes

    // Round to nearest integer and ensure it's reasonable
    return Math.round(Math.max(1, wpm))
  }

  const formatStreakText = (days: number): string => {
    if (days === 0) return '0 days'
    if (days === 1) return '1 day'
    if (days < 7) return `${days} days`
    if (days < 14) return '1 week'
    if (days < 30) return `${Math.floor(days / 7)} weeks`
    if (days < 60) return '1 month'
    return `${Math.floor(days / 30)} months`
  }

  const loadInteractions = useCallback(async () => {
    try {
      const allInteractions = await window.api.interactions.getAll()

      // Sort by creation date (newest first) - remove the slice(0, 10) to show all interactions
      const sortedInteractions = allInteractions.sort(
        (a: Interaction, b: Interaction) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      setInteractions(sortedInteractions)

      // Calculate and set statistics
      const calculatedStats = calculateStats(sortedInteractions)
      setStats(calculatedStats)
    } catch (error) {
      console.error('Failed to load interactions:', error)
    } finally {
      setLoading(false)
    }
  }, [calculateStats])

  useEffect(() => {
    loadInteractions()

    // Listen for new interactions
    const handleInteractionCreated = () => {
      loadInteractions()
    }

    const unsubscribe = window.api.on(
      'interaction-created',
      handleInteractionCreated,
    )

    // Cleanup listener on unmount
    return unsubscribe
  }, [loadInteractions])

  useEffect(() => {
    setVisibleCount(INTERACTIONS_PAGE_SIZE)
  }, [interactions.length])

  // Cleanup audio instances on unmount
  useEffect(() => {
    const map = audioInstancesRef.current
    return () => {
      map.forEach(audio => {
        try {
          audio.pause()
          audio.currentTime = 0
          if (audio.src?.startsWith('blob:')) {
            URL.revokeObjectURL(audio.src)
          }
        } catch {
          /* ignore */
        }
      })
      map.clear()
    }
  }, [])

  const MAX_AUDIO_CACHE = 5

  const evictOldestAudio = useCallback(() => {
    const map = audioInstancesRef.current
    if (map.size <= MAX_AUDIO_CACHE) return
    const oldestKey = map.keys().next().value
    if (oldestKey) {
      const oldAudio = map.get(oldestKey)
      if (oldAudio) {
        oldAudio.pause()
        if (oldAudio.src?.startsWith('blob:')) {
          URL.revokeObjectURL(oldAudio.src)
        }
      }
      map.delete(oldestKey)
    }
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    const isToday = date.toDateString() === today.toDateString()
    const isYesterday = date.toDateString() === yesterday.toDateString()

    if (isToday) return 'TODAY'
    if (isYesterday) return 'YESTERDAY'

    return date
      .toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
      .toUpperCase()
  }

  const groupInteractionsByDate = (interactions: Interaction[]) => {
    const groups: { [key: string]: Interaction[] } = {}

    interactions.forEach(interaction => {
      const dateKey = formatDate(interaction.created_at)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(interaction)
    })

    return groups
  }

  const getDisplayText = (interaction: Interaction) => {
    // Check for errors first
    if (interaction.asr_output?.error) {
      // Prefer precise error code mapping when available
      const code = interaction.asr_output?.errorCode
      if (code === 'CLIENT_TRANSCRIPTION_QUALITY_ERROR') {
        return {
          text: 'Audio quality too low',
          isError: true,
          tooltip:
            'Audio quality was too low to generate a reliable transcript',
        }
      }
      if (
        interaction.asr_output.error.includes('No speech detected in audio.') ||
        interaction.asr_output.error.includes('Unable to transcribe audio.')
      ) {
        return {
          text: 'Audio is silent',
          isError: true,
          tooltip: "Ito didn't detect any words so the transcript is empty",
        }
      }
      return {
        text: 'Transcription failed',
        isError: true,
        tooltip: interaction.asr_output.error,
      }
    }

    // Check for empty transcript
    const transcript = interaction.asr_output?.transcript?.trim()

    if (!transcript) {
      return {
        text: 'Audio is silent.',
        isError: true,
        tooltip: "Ito didn't detect any words so the transcript is empty",
      }
    }

    // Return the actual transcript
    return {
      text: transcript,
      isError: false,
      tooltip: null,
    }
  }

  const handleAudioPlayStop = async (interaction: Interaction) => {
    try {
      // If this interaction is currently playing, stop it
      if (playingAudio === interaction.id) {
        const current = audioInstancesRef.current.get(interaction.id)
        if (current) {
          current.pause()
          current.currentTime = 0
        }
        setPlayingAudio(null)
        return
      }

      // Stop any other playing audio
      if (playingAudio) {
        const other = audioInstancesRef.current.get(playingAudio)
        if (other) {
          other.pause()
          other.currentTime = 0
        }
      }

      if (!interaction.has_raw_audio) {
        console.warn('No audio data available for this interaction')
        return
      }

      // Set playing state immediately for responsive UI
      setPlayingAudio(interaction.id)

      // Reuse existing audio instance if available
      let audio = audioInstancesRef.current.get(interaction.id)

      if (!audio) {
        const fullInteraction = await window.api.interactions.getById(
          interaction.id,
        )
        if (!fullInteraction?.raw_audio) {
          console.warn('Failed to load audio data')
          setPlayingAudio(null)
          return
        }
        const pcmData = new Uint8Array(fullInteraction.raw_audio)
        try {
          // Convert raw PCM (mono, typically 16 kHz) to 48 kHz stereo WAV for smoother playback
          const wavBuffer = createStereo48kWavFromMonoPCM(
            pcmData,
            interaction.sample_rate || 16000,
            48000,
          )
          const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' })
          const audioUrl = URL.createObjectURL(audioBlob)

          audio = new Audio(audioUrl)
          audio.onended = () => {
            setPlayingAudio(null)
          }
          audio.onerror = err => {
            console.error('Audio playback error:', err)
            setPlayingAudio(null)
          }

          audioInstancesRef.current.set(interaction.id, audio!)
          evictOldestAudio()
        } catch (error) {
          console.error('Failed to create audio instance:', error)
          setPlayingAudio(null)
          return
        }
      }

      try {
        await audio.play()
      } catch (playError) {
        console.error('Failed to start audio playback:', playError)
        setPlayingAudio(null)
      }
    } catch (error) {
      console.error('Failed to play/stop audio:', error)
      setPlayingAudio(null)
    }
  }

  const visibleInteractions = useMemo(
    () => interactions.slice(0, visibleCount),
    [interactions, visibleCount],
  )

  const groupedInteractions = useMemo(
    () => groupInteractionsByDate(visibleInteractions),
    [visibleInteractions],
  )

  const copyToClipboard = async (text: string, interactionId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedItems(prev => new Set(prev).add(interactionId))
      setOpenTooltipKey(`copy:${interactionId}`) // Keep tooltip open

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev)
          newSet.delete(interactionId)
          return newSet
        })
        // Close tooltip if it's still open for this item (do not override if user hovered elsewhere)
        setOpenTooltipKey(prev =>
          prev === `copy:${interactionId}` ? null : prev,
        )
      }, 2000)
    } catch (error) {
      console.error('Failed to copy text:', error)
    }
  }

  const handleAudioDownload = async (interaction: Interaction) => {
    try {
      if (!interaction.has_raw_audio) {
        console.warn('No audio data available for download')
        return
      }

      const fullInteraction = await window.api.interactions.getById(
        interaction.id,
      )
      if (!fullInteraction?.raw_audio) {
        console.warn('Failed to load audio data for download')
        return
      }

      const pcmData = new Uint8Array(fullInteraction.raw_audio)
      // Convert raw PCM to WAV format
      const wavBuffer = createStereo48kWavFromMonoPCM(
        pcmData,
        interaction.sample_rate || 16000,
        48000,
      )
      const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' })
      const audioUrl = URL.createObjectURL(audioBlob)

      // Format filename with timestamp (YYYYMMDD_HHMMSS)
      const date = new Date(interaction.created_at)
      const timestamp = date
        .toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '_')
        .slice(0, 15)
      const filename = `ito-recording-${timestamp}.wav`

      // Create temporary link and trigger download
      const link = document.createElement('a')
      link.href = audioUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Clean up the blob URL
      URL.revokeObjectURL(audioUrl)
    } catch (error) {
      console.error('Failed to download audio:', error)
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Fixed Header Content */}
      <div className="flex-shrink-0 px-12 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-[30px] font-semibold tracking-tight font-sans">
            Welcome back{firstName ? `, ${firstName}` : ''}
          </h1>
          <div
            className="flex items-center gap-5 text-[13px] bg-[var(--color-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] px-6 py-3 shadow-card cursor-pointer hover:shadow-soft hover:-translate-y-0.5 transition-all duration-180"
            onClick={() => setShowStatsDialog(true)}
          >
            <div className="flex items-center gap-2">
              <span>🔥</span>
              <span className="font-medium text-[var(--color-text)]">
                {formatStreakText(stats.streakDays)}
              </span>
            </div>
            <div className="h-5 w-px bg-warm-200" />
            <div className="flex items-center gap-2">
              <span>🚀</span>
              <span className="font-medium text-[var(--color-text)]">
                {stats.totalWords.toLocaleString()} words
              </span>
            </div>
            <div className="h-5 w-px bg-warm-200" />
            <div className="flex items-center gap-2">
              <span>🏆</span>
              <span className="font-medium text-[var(--color-text)]">
                {stats.averageWPM} WPM
              </span>
            </div>
          </div>
        </div>

        {/* Dictation Info Box */}
        <div className="bg-[var(--color-surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-7 flex items-center justify-between mb-10 shadow-[var(--shadow-soft)]">
          <div>
            <div className="text-lg font-sans font-medium mb-1">
              Voice dictation in any app
            </div>
            <div className="text-sm text-[var(--color-subtext)]">
              <span key="hold-down">Hold down the trigger key </span>
              {keyboardShortcut.map((key, index) => (
                <React.Fragment key={index}>
                  <span className="bg-white border border-[var(--border)] px-1.5 py-0.5 rounded text-xs font-mono shadow-sm">
                    {getKeyDisplay(key as KeyName, platform, {
                      showDirectionalText: false,
                      format: 'label',
                    })}
                  </span>
                  <span>{index < keyboardShortcut.length - 1 && ' + '}</span>
                </React.Fragment>
              ))}
              <span key="and"> and speak into any textbox</span>
            </div>
          </div>
          <button
            className="bg-[var(--primary)] text-[var(--primary-foreground)] px-6 py-3 rounded-[var(--radius-lg)] font-semibold hover:opacity-90 cursor-pointer transition-opacity"
            onClick={() =>
              window.api?.invoke('web-open-url', EXTERNAL_LINKS.WEBSITE)
            }
          >
            Explore use cases
          </button>
        </div>

        {/* Recent Activity Header */}
        <div className="text-xs font-semibold tracking-[1px] uppercase text-[var(--color-subtext)] mb-6">
          Recent activity
        </div>
      </div>

      {/* Scrollable Recent Activity Section */}
      <div className="flex-1 px-12 max-w-4xl mx-auto w-full overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="bg-white dark:bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] p-8 text-center text-[var(--color-subtext)]">
            Loading recent activity...
          </div>
        ) : interactions.length === 0 ? (
          <div className="bg-white dark:bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] p-8 text-center text-[var(--color-subtext)]">
            <p className="text-sm">No interactions yet</p>
            <p className="text-xs mt-1">
              Try using voice dictation by pressing{' '}
              {keyboardShortcut.join(' + ')}
            </p>
          </div>
        ) : (
          <>
            {Object.entries(groupedInteractions).map(
              ([dateLabel, dateInteractions]) => (
                <div key={dateLabel} className="mb-6">
                  <div className="text-xs font-semibold tracking-[1px] uppercase text-[var(--color-subtext)] mb-4">
                    {dateLabel}
                  </div>
                  <div className="bg-white dark:bg-[var(--card)] rounded-[var(--radius-lg)] border border-[var(--border)] shadow-[var(--shadow-card)] divide-y divide-[var(--border)]">
                    {dateInteractions.map(interaction => {
                      const displayInfo = getDisplayText(interaction)

                      return (
                        <div
                          key={interaction.id}
                          className="flex items-center justify-between px-4 py-4 gap-10 hover:bg-[var(--color-muted-bg)] transition-colors duration-200 group"
                        >
                          <div className="flex items-center gap-10">
                            <div className="text-[var(--color-subtext)] text-[13px] min-w-[60px]">
                              {formatTime(interaction.created_at)}
                            </div>
                            <div
                              className={`${displayInfo.isError ? 'text-[var(--color-subtext)]' : 'text-foreground'} flex items-center gap-1`}
                            >
                              {displayInfo.text}
                              {displayInfo.tooltip && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <InfoCircle className="w-4 h-4 text-[var(--color-subtext)]" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {displayInfo.tooltip}
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>

                          {/* Copy, Download, and Play buttons - only show on hover or when playing */}
                          <div
                            className={`flex items-center gap-2 ${playingAudio === interaction.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200`}
                          >
                            {/* Copy button */}
                            {!displayInfo.isError && (
                              <Tooltip
                                open={
                                  openTooltipKey === `copy:${interaction.id}`
                                }
                                onOpenChange={open => {
                                  if (open) {
                                    setOpenTooltipKey(`copy:${interaction.id}`)
                                  } else {
                                    if (!copiedItems.has(interaction.id)) {
                                      setOpenTooltipKey(prev =>
                                        prev === `copy:${interaction.id}`
                                          ? null
                                          : prev,
                                      )
                                    }
                                  }
                                }}
                              >
                                <TooltipTrigger asChild>
                                  <button
                                    className={`p-1.5 hover:bg-warm-200 rounded transition-colors cursor-pointer ${
                                      copiedItems.has(interaction.id)
                                        ? 'text-green-600'
                                        : 'text-[var(--color-subtext)]'
                                    }`}
                                    onClick={() =>
                                      copyToClipboard(
                                        displayInfo.text,
                                        interaction.id,
                                      )
                                    }
                                  >
                                    {copiedItems.has(interaction.id) ? (
                                      <Check className="w-4 h-4" />
                                    ) : (
                                      <Copy className="w-4 h-4" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={5}>
                                  {copiedItems.has(interaction.id)
                                    ? 'Copied 🎉'
                                    : 'Copy'}
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Download button */}
                            {interaction.has_raw_audio && (
                              <Tooltip
                                open={
                                  openTooltipKey ===
                                  `download:${interaction.id}`
                                }
                                onOpenChange={open => {
                                  setOpenTooltipKey(
                                    open ? `download:${interaction.id}` : null,
                                  )
                                }}
                              >
                                <TooltipTrigger asChild>
                                  <button
                                    className="p-1.5 hover:bg-warm-200 rounded transition-colors cursor-pointer text-[var(--color-subtext)]"
                                    onClick={() =>
                                      handleAudioDownload(interaction)
                                    }
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={5}>
                                  Download audio
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Play/Stop button with tooltip */}
                            <Tooltip
                              open={openTooltipKey === `play:${interaction.id}`}
                              onOpenChange={open => {
                                setOpenTooltipKey(
                                  open ? `play:${interaction.id}` : null,
                                )
                              }}
                            >
                              <TooltipTrigger asChild>
                                <button
                                  className={`p-1.5 hover:bg-warm-200 rounded transition-colors cursor-pointer ${
                                    playingAudio === interaction.id
                                      ? 'bg-blue-50 text-blue-600'
                                      : 'text-[var(--color-subtext)]'
                                  }`}
                                  onClick={() =>
                                    handleAudioPlayStop(interaction)
                                  }
                                  disabled={!interaction.has_raw_audio}
                                >
                                  {playingAudio === interaction.id ? (
                                    <Stop className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={5}>
                                {!interaction.has_raw_audio
                                  ? 'No audio available'
                                  : playingAudio === interaction.id
                                    ? 'Stop'
                                    : 'Play'}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ),
            )}
            {interactions.length > visibleCount && (
              <button
                onClick={() =>
                  setVisibleCount(prev => prev + INTERACTIONS_PAGE_SIZE)
                }
                className="w-full py-3 text-sm text-[var(--color-subtext)] hover:text-foreground transition-colors duration-200"
              >
                Show more ({interactions.length - visibleCount} remaining)
              </button>
            )}
          </>
        )}
      </div>

      {/* Pro Upgrade Dialog */}
      <ProUpgradeDialog open={showProDialog} onOpenChange={setShowProDialog} />

      {/* Stats Detail Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="!border-0 shadow-xl p-0 max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Your Stats</DialogTitle>
          </DialogHeader>
          <div className="p-8">
            <h2 className="text-xl font-bold text-center mb-1">
              You've been Flowing. Hard.
            </h2>
            <p className="text-sm text-[var(--color-subtext)] text-center mb-8">
              Here's a personal snapshot of your productivity with Ito.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-5">
                <div className="text-xs font-semibold tracking-wider text-[var(--color-subtext)] uppercase mb-3">
                  Daily Streak
                </div>
                <div className="text-2xl font-bold mb-1">
                  {stats.streakDays} {stats.streakDays === 1 ? 'day' : 'days'}{' '}
                  🔥
                </div>
                <div className="text-sm text-[var(--color-subtext)]">
                  {stats.streakDays === 0
                    ? 'Start your streak today!'
                    : stats.streakDays === 1
                      ? 'Just getting started!'
                      : stats.streakDays < 7
                        ? `${stats.streakDays} days strong.`
                        : 'On fire! Keep going!'}
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-5">
                <div className="text-xs font-semibold tracking-wider text-[var(--color-subtext)] uppercase mb-3">
                  Average Speed
                </div>
                <div className="text-2xl font-bold mb-1">
                  {stats.averageWPM} WPM 🏆
                </div>
                <div className="text-sm text-[var(--color-subtext)]">
                  Top performer!
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-5">
                <div className="text-xs font-semibold tracking-wider text-[var(--color-subtext)] uppercase mb-3">
                  Total Words Dictated
                </div>
                <div className="text-2xl font-bold mb-1">
                  {stats.totalWords.toLocaleString()} 🚀
                </div>
                <div className="text-sm text-[var(--color-subtext)]">
                  {stats.totalWords < 1000
                    ? 'Getting warmed up!'
                    : stats.totalWords < 5000
                      ? `You've written ${Math.floor(stats.totalWords / 280)} tweets!`
                      : `That's ${Math.floor(stats.totalWords / 250)} pages of text!`}
                </div>
              </div>

              <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-5">
                <div className="text-xs font-semibold tracking-wider text-[var(--color-subtext)] uppercase mb-3">
                  Total Interactions
                </div>
                <div className="text-2xl font-bold mb-1">
                  {interactions.length} ⭐
                </div>
                <div className="text-sm text-[var(--color-subtext)]">
                  {interactions.length < 10
                    ? 'Keep using Ito!'
                    : 'You are almost at flow mastery!'}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
