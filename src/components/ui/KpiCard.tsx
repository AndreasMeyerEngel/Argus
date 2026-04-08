import React from 'react'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  subtitle?: string
  trend?: { value: number; positive?: boolean }
  iconColor?: string
}

export function KpiCard({ icon: Icon, label, value, subtitle, trend, iconColor = 'text-accent' }: KpiCardProps) {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
        <div className={`${iconColor} opacity-80`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="text-2xl font-bold text-text">{value}</div>
      {subtitle && <div className="text-xs text-muted">{subtitle}</div>}
      {trend && (
        <div className={`text-xs font-medium ${trend.positive ? 'text-green' : 'text-red'}`}>
          {trend.value > 0 ? '+' : ''}{trend.value}% vs período anterior
        </div>
      )}
    </div>
  )
}
