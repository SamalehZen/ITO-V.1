import { ReactNode } from 'react'
import React from 'react'
import { Tooltip, TooltipTrigger, TooltipContent } from './tooltip'

interface NavItemProps {
  icon: ReactNode
  label: string
  isActive?: boolean
  showText: boolean
  onClick?: () => void
}

export const NavItem = React.memo(function NavItem({
  icon,
  label,
  isActive = false,
  showText,
  onClick,
}: NavItemProps) {
  const navContent = (
    <div
      className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-180 ${
        isActive
          ? 'bg-[var(--sidebar-active)] text-[var(--sidebar-active-text)] font-medium shadow-sm'
          : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
      }`}
      onClick={onClick}
    >
      <div className="w-6 flex items-center justify-center">{icon}</div>
      <span
        className={`transition-opacity duration-100 ${
          showText ? 'opacity-100' : 'opacity-0'
        } ${showText ? 'ml-3' : 'w-0 overflow-hidden'}`}
      >
        {label}
      </span>
    </div>
  )

  if (!showText) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{navContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={2} className="text-sm">
          {label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return navContent
})
