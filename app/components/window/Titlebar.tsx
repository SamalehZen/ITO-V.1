import { useWindowContext } from './WindowContext'
import React, { useState, useEffect } from 'react'
import { OnboardingTitlebar } from './OnboardingTitlebar'
import { useOnboardingStore } from '@/app/store/useOnboardingStore'
import { UserCircle, PanelLeft, CogFour, Logout, Bell } from '@mynaui/icons-react'
import { useMainStore } from '@/app/store/useMainStore'
import { useAuthStore } from '@/app/store/useAuthStore'
import { useAuth } from '@/app/components/auth/useAuth'

export const Titlebar = () => {
  const { onboardingCompleted } = useOnboardingStore()
  const { isAuthenticated } = useAuthStore()
  const showOnboarding = !onboardingCompleted || !isAuthenticated
  const { toggleNavExpanded, setCurrentPage, setSettingsPage, navExpanded } =
    useMainStore()
  const { logoutUser } = useAuth()
  const wcontext = useWindowContext().window
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [isUpdateDownloaded, setUpdateDownloaded] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserDropdown(false)
    }

    if (showUserDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }

    return () => {}
  }, [showUserDropdown])

  useEffect(() => {
    window.api.updater.getUpdateStatus().then(status => {
      if (status.updateAvailable) {
        setIsUpdateAvailable(true)
      }
      if (status.updateDownloaded) {
        setUpdateDownloaded(true)
      }
    })

    window.api.updater.onUpdateAvailable(() => {
      setIsUpdateAvailable(true)
    })

    window.api.updater.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
      setIsDownloading(false)
    })
  }, [])

  const toggleUserDropdown = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowUserDropdown(!showUserDropdown)
  }

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentPage('settings')
    setSettingsPage('account')
    setShowUserDropdown(false)
  }

  const handleSignOutClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await logoutUser()
    } catch (error) {
      console.error('Logout failed:', error)
    }
    setShowUserDropdown(false)
  }

  const style: React.CSSProperties = onboardingCompleted
    ? {
        position: 'relative' as const,
        borderBottom: 'none',
      }
    : { position: 'relative' as const }

  return (
    <div
      className={`window-titlebar ${wcontext?.platform ? `platform-${wcontext.platform}` : ''}`}
      style={style}
    >
      {showOnboarding && <OnboardingTitlebar />}
      {showOnboarding && wcontext?.platform === 'win32' && (
        <div className="titlebar-action-btn ml-auto z-10">
          <TitlebarControls />
        </div>
      )}

      {!showOnboarding && (
        <div
          className="titlebar-action-btn flex items-center z-10"
          style={{ gap: '2px' }}
        >
          <div
            className={`h-full border-r border-transparent transition-all duration-200 ease-in-out ${navExpanded ? 'w-56' : 'w-[72px]'}`}
          ></div>
          <div
            className="titlebar-action-btn hover:bg-warm-200 ml-2"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 30,
              border: 'none',
              cursor: 'pointer',
              borderRadius: 6,
              padding: 0,
            }}
            aria-label="Open Panel"
            tabIndex={0}
            onClick={toggleNavExpanded}
          >
            <PanelLeft style={{ width: 20, height: 20 }} />
          </div>

          <div className="relative">
            <div
              className="titlebar-action-btn hover:bg-warm-200"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 30,
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                padding: 0,
              }}
              aria-label="Account"
              tabIndex={0}
              onClick={toggleUserDropdown}
            >
              <UserCircle style={{ width: 20, height: 20 }} />
            </div>

            {showUserDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-[var(--card)] border border-warm-100 dark:border-warm-800 rounded-lg shadow-lg z-20">
                <button
                  onClick={handleSettingsClick}
                  className="w-full px-2 py-2 text-left text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2 rounded-t-lg cursor-pointer"
                >
                  <CogFour className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={handleSignOutClick}
                  className="w-full px-2 py-2 text-left text-sm text-warm-700 hover:bg-warm-50 flex items-center gap-2 rounded-b-lg cursor-pointer"
                >
                  <Logout className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {!showOnboarding && (
        <div
          className="titlebar-action-btn flex items-center z-10"
          style={{ gap: '2px' }}
        >
          {isUpdateAvailable && (
            <button
              className={`titlebar-action-btn bg-sky-800 text-white px-3 py-1 rounded-md font-semibold ${
                isDownloading
                  ? 'cursor-not-allowed opacity-70'
                  : 'hover:bg-sky-700 cursor-pointer'
              }`}
              disabled={isDownloading}
              onClick={() => {
                if (isUpdateDownloaded) {
                  if (
                    confirm(
                      'Are you sure you want to install the update? The app will restart.',
                    )
                  ) {
                    window.api.updater.installUpdate()
                  }
                } else if (!isDownloading) {
                  setIsDownloading(true)
                  window.api.updater.downloadUpdate().catch(() => {
                    setIsDownloading(false)
                  })
                }
              }}
            >
              {isUpdateDownloaded
                ? 'Install Update'
                : isDownloading
                  ? 'Downloading...'
                  : 'Download Update'}
            </button>
          )}

          <button
            className="titlebar-action-btn flex items-center justify-center w-8 h-8 rounded-lg hover:bg-warm-100 transition-colors"
            title="Notifications"
            onClick={() => {}}
          >
            <Bell className="w-4 h-4 text-warm-600" />
          </button>

          {wcontext?.platform === 'win32' && <TitlebarControls />}
        </div>
      )}
    </div>
  )
}

const TitlebarControls = () => {
  const closePath =
    'M 0,0 0,0.7 4.3,5 0,9.3 0,10 0.7,10 5,5.7 9.3,10 10,10 10,9.3 5.7,5 10,0.7 10,0 9.3,0 5,4.3 0.7,0 Z'
  const maximizePath = 'M 0,0 0,10 10,10 10,0 Z M 1,1 9,1 9,9 1,9 Z'
  const minimizePath = 'M 0,5 10,5 10,6 0,6 Z'
  const wcontext = useWindowContext().window

  return (
    <div className="window-titlebar-controls">
      {wcontext?.minimizable && (
        <TitlebarControlButton label="minimize" svgPath={minimizePath} />
      )}
      {wcontext?.maximizable && (
        <TitlebarControlButton label="maximize" svgPath={maximizePath} />
      )}
      <TitlebarControlButton label="close" svgPath={closePath} />
    </div>
  )
}

const TitlebarControlButton = ({
  svgPath,
  label,
}: {
  svgPath: string
  label: string
}) => {
  const handleAction = () => {
    switch (label) {
      case 'minimize':
        window.api.invoke('window-minimize')
        break
      case 'maximize':
        window.api.invoke('window-maximize-toggle')
        break
      case 'close':
        window.api.invoke('window-close')
        break
      default:
        console.warn(`Unhandled action for label: ${label}`)
    }
  }

  return (
    <div
      aria-label={label}
      className="titlebar-controlButton"
      onClick={handleAction}
    >
      <svg width="10" height="10">
        <path fill="currentColor" d={svgPath} />
      </svg>
    </div>
  )
}

export interface TitlebarProps {
  title: string
  titleCentered?: boolean
  icon?: string
}
