import { useMainStore } from '@/app/store/useMainStore'
import GeneralSettingsContent from './settings/GeneralSettingsContent'
import AudioSettingsContent from './settings/AudioSettingsContent'
import AccountSettingsContent from './settings/AccountSettingsContent'
import KeyboardSettingsContent from './settings/KeyboardSettingsContent'
import AdvancedSettingsContent from './settings/AdvancedSettingsContent'
import PricingBillingSettingsContent from './settings/PricingBillingSettingsContent'
import MyDetailsSettingsContent from './settings/MyDetailsSettingsContent'
import PerformanceSettingsContent from './settings/PerformanceSettingsContent'
import {
  FineTune,
  Keyboard,
  Microphone,
  Code,
  UserCircle,
  Users,
  CreditCard,
  Lightning,
} from '@mynaui/icons-react'

const settingsNavItems = [
  { id: 'general', label: 'General', icon: FineTune },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard },
  { id: 'audio', label: 'Audio & Mic', icon: Microphone },
  { id: 'performance', label: 'Performance', icon: Lightning },
  { id: 'advanced', label: 'Advanced', icon: Code },
]

const accountNavItems = [
  { id: 'my-details', label: 'My Details', icon: UserCircle },
  { id: 'account', label: 'Account', icon: Users },
  { id: 'pricing-billing', label: 'Pricing & Billing', icon: CreditCard },
]

const pageTitles: Record<string, string> = {
  general: 'General',
  keyboard: 'Keyboard',
  audio: 'Audio & Mic',
  performance: 'Performance',
  advanced: 'Advanced',
  'my-details': 'My Details',
  account: 'Account',
  'pricing-billing': 'Pricing & Billing',
}

export default function SettingsContent() {
  const { settingsPage, setSettingsPage } = useMainStore()

  const renderSettingsContent = () => {
    switch (settingsPage) {
      case 'general':
        return <GeneralSettingsContent />
      case 'keyboard':
        return <KeyboardSettingsContent />
      case 'audio':
        return <AudioSettingsContent />
      case 'performance':
        return <PerformanceSettingsContent />
      case 'pricing-billing':
        return <PricingBillingSettingsContent />
      case 'my-details':
        return <MyDetailsSettingsContent />
      case 'account':
        return <AccountSettingsContent />
      case 'advanced':
        return <AdvancedSettingsContent />
      default:
        return <GeneralSettingsContent />
    }
  }

  return (
    <div className="flex h-full pl-6">
      <div className="w-[220px] flex-shrink-0 flex flex-col justify-between pr-6 border-r border-[var(--border)]">
        <div>
          <div className="text-xs font-semibold tracking-[1px] text-[var(--color-subtext)] uppercase mb-2 px-3">
            Settings
          </div>
          {settingsNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setSettingsPage(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                settingsPage === item.id
                  ? 'bg-[var(--color-muted-bg)] font-medium text-foreground shadow-sm'
                  : 'text-[var(--color-subtext)] hover:bg-[var(--color-muted-bg)]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}

          <div className="text-xs font-semibold tracking-[1px] text-[var(--color-subtext)] uppercase mb-2 mt-6 px-3">
            Account
          </div>
          {accountNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => setSettingsPage(item.id as any)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                settingsPage === item.id
                  ? 'bg-[var(--color-muted-bg)] font-medium text-foreground shadow-sm'
                  : 'text-[var(--color-subtext)] hover:bg-[var(--color-muted-bg)]'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-[var(--color-subtext)] px-3 pb-2">Ito v0.2.3</div>
      </div>

      <div className="flex-1 pl-8 pr-8 pb-8 overflow-y-auto">
        <h1 className="font-sans text-[30px] font-semibold mb-6">
          {pageTitles[settingsPage] ?? 'General'}
        </h1>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-card)] border border-[var(--border)]">
          {renderSettingsContent()}
        </div>
      </div>
    </div>
  )
}
