import { HashRouter, Routes, Route } from 'react-router-dom'
import appIcon from '@/resources/build/icon.png'
import HomeKit from '@/app/components/home/HomeKit'
import WelcomeKit from '@/app/components/welcome/WelcomeKit'
import Pill from '@/app/components/pill/Pill'
import {
  STEP_NAMES,
  STEP_NAMES_ARRAY,
  useOnboardingStore,
} from '@/app/store/useOnboardingStore'
import { useAuth } from '@/app/components/auth/useAuth'
import { WindowContextProvider } from '@/lib/window'
import { SupabaseProvider } from '@/app/components/auth/SupabaseProvider'
import { usePerformanceStore } from '@/app/store/usePerformanceStore'
import { PerformanceProvider } from '@/app/performance/performance.context'
import { BillingProvider } from '@/app/contexts/BillingContext'
import { useDeviceChangeListener } from './hooks/useDeviceChangeListener'
import { verifyStoredMicrophone } from './media/microphone'
import { performanceAutotuner } from './performance/performance.autotune'
import { useEffect } from 'react'

usePerformanceStore.getState().initialize()

const MainApp = () => {
  const { onboardingCompleted, onboardingStep } = useOnboardingStore()
  const { isAuthenticated } = useAuth()
  useDeviceChangeListener()

  useEffect(() => {
    verifyStoredMicrophone()
  }, [])

  useEffect(() => {
    const applyAutotunerState = () => {
      const { userSelectedTier } = usePerformanceStore.getState()
      if (userSelectedTier === 'auto') {
        performanceAutotuner.start()
      } else {
        performanceAutotuner.stop()
      }
    }

    applyAutotunerState()

    const unsub = usePerformanceStore.subscribe(applyAutotunerState)
    return () => {
      unsub()
      performanceAutotuner.stop()
    }
  }, [])

  const onboardingSetupCompleted =
    onboardingStep >= STEP_NAMES_ARRAY.indexOf(STEP_NAMES.TRY_IT_OUT)

  const shouldEnableShortcutGlobally =
    onboardingCompleted || onboardingSetupCompleted

  // If authenticated and onboarding completed, show main app
  if (isAuthenticated && onboardingCompleted) {
    window.api?.send(
      'electron-store-set',
      'settings.isShortcutGloballyEnabled',
      shouldEnableShortcutGlobally,
    )
    return (
      <BillingProvider>
        <HomeKit />
      </BillingProvider>
    )
  }

  window.api?.send(
    'electron-store-set',
    'settings.isShortcutGloballyEnabled',
    shouldEnableShortcutGlobally,
  )
  return <WelcomeKit />
}

export default function App() {
  return (
    <SupabaseProvider>
      <PerformanceProvider>
        <HashRouter>
          <Routes>
            {/* Route for the pill window */}
            <Route
              path="/pill"
              element={
                <>
                  <Pill />
                </>
              }
            />

            {/* Default route for the main application window */}
            <Route
              path="/"
              element={
                <>
                  <WindowContextProvider
                    titlebar={{ title: 'Ito', icon: appIcon }}
                  >
                    <MainApp />
                  </WindowContextProvider>
                </>
              }
            />
          </Routes>
        </HashRouter>
      </PerformanceProvider>
    </SupabaseProvider>
  )
}
