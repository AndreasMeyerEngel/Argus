import React from 'react'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="w-16 h-16 rounded-full bg-surface2 flex items-center justify-center">
        <Icon size={28} className="text-muted" />
      </div>
      <div className="text-center">
        <h3 className="text-base font-medium text-text mb-1">{title}</h3>
        {description && <p className="text-sm text-muted max-w-sm">{description}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
