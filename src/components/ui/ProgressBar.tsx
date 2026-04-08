import React from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  className?: string
  height?: string
}

export function ProgressBar({ value, max = 100, showLabel = true, className = '', height = 'h-1.5' }: ProgressBarProps) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  const color = pct > 70 ? 'bg-green' : pct > 40 ? 'bg-amber' : 'bg-red'

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-muted">{value}/{max}</span>
          <span className="text-xs font-medium text-text">{pct}%</span>
        </div>
      )}
      <div className={`w-full ${height} bg-surface2 rounded-full overflow-hidden`}>
        <div
          className={`${height} ${color} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
