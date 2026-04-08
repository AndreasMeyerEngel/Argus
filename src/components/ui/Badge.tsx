import React from 'react'

type BadgeVariant =
  | 'epic-planning' | 'epic-running' | 'epic-blocked' | 'epic-done' | 'epic-archived'
  | 'bug-critical' | 'bug-high' | 'bug-medium' | 'bug-low'
  | 'bug-open' | 'bug-in_progress' | 'bug-resolved' | 'bug-closed' | 'bug-reopened'
  | 'scenario-pending' | 'scenario-passed' | 'scenario-failed' | 'scenario-blocked' | 'scenario-partial'
  | 'priority-critical' | 'priority-high' | 'priority-medium' | 'priority-low'

const variantStyles: Record<BadgeVariant, string> = {
  'epic-planning': 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  'epic-running': 'bg-accent/20 text-accent border border-accent/30',
  'epic-blocked': 'bg-red/20 text-red border border-red/30',
  'epic-done': 'bg-green/20 text-green border border-green/30',
  'epic-archived': 'bg-gray-500/10 text-gray-500 border border-gray-500/20',
  'bug-critical': 'bg-red/20 text-red border border-red/30',
  'bug-high': 'bg-amber/20 text-amber border border-amber/30',
  'bug-medium': 'bg-purple/20 text-purple border border-purple/30',
  'bug-low': 'bg-green/20 text-green border border-green/30',
  'bug-open': 'bg-red/20 text-red border border-red/30',
  'bug-in_progress': 'bg-amber/20 text-amber border border-amber/30',
  'bug-resolved': 'bg-green/20 text-green border border-green/30',
  'bug-closed': 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  'bug-reopened': 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  'scenario-pending': 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
  'scenario-passed': 'bg-green/20 text-green border border-green/30',
  'scenario-failed': 'bg-red/20 text-red border border-red/30',
  'scenario-blocked': 'bg-amber/20 text-amber border border-amber/30',
  'scenario-partial': 'bg-purple/20 text-purple border border-purple/30',
  'priority-critical': 'bg-red/20 text-red border border-red/30',
  'priority-high': 'bg-amber/20 text-amber border border-amber/30',
  'priority-medium': 'bg-purple/20 text-purple border border-purple/30',
  'priority-low': 'bg-green/20 text-green border border-green/30',
}

const variantLabels: Record<string, string> = {
  'epic-planning': 'Planejamento',
  'epic-running': 'Em execução',
  'epic-blocked': 'Bloqueado',
  'epic-done': 'Concluído',
  'epic-archived': 'Arquivado',
  'bug-critical': 'Crítico',
  'bug-high': 'Alto',
  'bug-medium': 'Médio',
  'bug-low': 'Baixo',
  'bug-open': 'Aberto',
  'bug-in_progress': 'Em progresso',
  'bug-resolved': 'Resolvido',
  'bug-closed': 'Fechado',
  'bug-reopened': 'Reaberto',
  'scenario-pending': 'Pendente',
  'scenario-passed': 'Passou',
  'scenario-failed': 'Falhou',
  'scenario-blocked': 'Bloqueado',
  'scenario-partial': 'Parcial',
  'priority-critical': 'Crítica',
  'priority-high': 'Alta',
  'priority-medium': 'Média',
  'priority-low': 'Baixa',
}

interface BadgeProps {
  variant: BadgeVariant
  className?: string
}

export function Badge({ variant, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {variantLabels[variant]}
    </span>
  )
}

export function EpicStatusBadge({ status }: { status: string }) {
  return <Badge variant={`epic-${status}` as BadgeVariant} />
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={`priority-${priority}` as BadgeVariant} />
}

export function BugSeverityBadge({ severity }: { severity: string }) {
  return <Badge variant={`bug-${severity}` as BadgeVariant} />
}

export function BugStatusBadge({ status }: { status: string }) {
  return <Badge variant={`bug-${status}` as BadgeVariant} />
}

export function ScenarioStatusBadge({ status }: { status: string }) {
  return <Badge variant={`scenario-${status}` as BadgeVariant} />
}
