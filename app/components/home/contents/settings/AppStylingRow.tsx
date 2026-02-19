import {
  useAppStylingStore,
  type AppTarget,
  type Tone,
} from '@/app/store/useAppStylingStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Button } from '@/app/components/ui/button'
import { Trash, Globe } from '@mynaui/icons-react'
import AppWindowIcon from '@/app/components/icons/AppWindowIcon'

type Props = {
  app: AppTarget
  tones: Tone[]
}

export const AppStylingRow = ({ app, tones }: Props) => {
  const { updateAppTone, deleteAppTarget } = useAppStylingStore()

  const currentTone = tones.find(t => t.id === (app.toneId || 'polished'))
  const isDomain = app.matchType === 'domain'

  return (
    <div className="flex items-center gap-4 p-4">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-muted-bg)] flex items-center justify-center overflow-hidden">
        {app.iconBase64 ? (
          <img
            src={`data:image/png;base64,${app.iconBase64}`}
            alt={app.name}
            className="w-8 h-8"
          />
        ) : isDomain ? (
          <Globe className="w-5 h-5 text-[var(--color-subtext)]" />
        ) : (
          <AppWindowIcon className="w-5 h-5 text-[var(--color-subtext)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{app.name}</p>
        <p className="text-xs text-[var(--color-subtext)]">
          {isDomain ? 'Domain' : 'Application'}
        </p>
      </div>

      <Select
        value={app.toneId || 'polished'}
        onValueChange={value => updateAppTone(app.id, value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue>{currentTone?.name || 'Polished'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {tones.map(tone => (
            <SelectItem key={tone.id} value={tone.id}>
              {tone.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => deleteAppTarget(app.id)}
      >
        <Trash className="h-4 w-4 text-[var(--color-subtext)]" />
      </Button>
    </div>
  )
}
