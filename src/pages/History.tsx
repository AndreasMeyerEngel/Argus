import React, { useMemo, useState } from 'react'
import {
  History as HistoryIcon, Filter, Plus, RefreshCw, Play,
  CheckCircle2, XCircle, AlertCircle, MinusCircle, Clock,
  Bug as BugIcon, Layers, ChevronRight
} from 'lucide-react'
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useApp } from '../context/AppContext'
import { HistoryEntry } from '../types'

// ─── Config ───────────────────────────────────────────────────────────────────

const actionConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'created:scenario':      { label: 'Cenário criado',        icon: <Plus size={13} />,        color: 'text-accent bg-accent/10 border-accent/20' },
  'created:bug':           { label: 'Bug registrado',         icon: <BugIcon size={13} />,     color: 'text-red bg-red/10 border-red/20' },
  'created:epic':          { label: 'Projeto criado',           icon: <Layers size={13} />,      color: 'text-accent bg-accent/10 border-accent/20' },
  'executed:scenario':     { label: 'Execução registrada',    icon: <Play size={13} />,        color: 'text-amber bg-amber/10 border-amber/20' },
  'status_changed:scenario': { label: 'Status do cenário',   icon: <RefreshCw size={13} />,   color: 'text-muted bg-surface2 border-white/10' },
  'status_changed:bug':    { label: 'Status do bug',          icon: <RefreshCw size={13} />,   color: 'text-muted bg-surface2 border-white/10' },
  'status_changed:epic':   { label: 'Status do projeto',        icon: <RefreshCw size={13} />,   color: 'text-muted bg-surface2 border-white/10' },
  'deleted:scenario':      { label: 'Cenário removido',       icon: <MinusCircle size={13} />, color: 'text-red bg-red/10 border-red/20' },
  'deleted:bug':           { label: 'Bug removido',           icon: <MinusCircle size={13} />, color: 'text-red bg-red/10 border-red/20' },
}

function getActionConfig(entry: HistoryEntry) {
  return actionConfig[`${entry.action}:${entry.entityType}`]
    ?? { label: entry.action, icon: <HistoryIcon size={13} />, color: 'text-muted bg-surface2 border-white/10' }
}

// Result / status icons
function StatusIcon({ value }: { value?: string }) {
  switch (value) {
    case 'passed':    return <CheckCircle2 size={12} className="text-green" />
    case 'failed':    return <XCircle size={12} className="text-red" />
    case 'blocked':   return <MinusCircle size={12} className="text-amber" />
    case 'partial':   return <AlertCircle size={12} className="text-accent" />
    case 'pending':   return <Clock size={12} className="text-muted" />
    case 'open':      return <BugIcon size={12} className="text-red" />
    case 'resolved':  return <CheckCircle2 size={12} className="text-green" />
    case 'closed':    return <CheckCircle2 size={12} className="text-muted" />
    case 'in_progress': return <RefreshCw size={12} className="text-accent" />
    case 'reopened':  return <AlertCircle size={12} className="text-amber" />
    case 'running':   return <Play size={12} className="text-accent" />
    case 'planning':  return <Clock size={12} className="text-muted" />
    case 'done':      return <CheckCircle2 size={12} className="text-green" />
    case 'archived':  return <MinusCircle size={12} className="text-muted" />
    default:          return null
  }
}

const statusTranslation: Record<string, string> = {
  passed: 'Aprovado', failed: 'Falhou', blocked: 'Bloqueado', partial: 'Parcial', pending: 'Pendente',
  open: 'Aberto', in_progress: 'Em andamento', resolved: 'Resolvido', closed: 'Fechado', reopened: 'Reaberto',
  running: 'Em andamento', planning: 'Planejamento', done: 'Concluído', archived: 'Arquivado',
}

function translateStatus(v?: string) {
  return v ? (statusTranslation[v] ?? v) : '—'
}

// ─── History entry card ───────────────────────────────────────────────────────

function EntryCard({ entry, epicName }: { entry: HistoryEntry; epicName?: string }) {
  const cfg = getActionConfig(entry)
  const time = format(parseISO(entry.timestamp), 'HH:mm', { locale: ptBR })

  return (
    <div className="flex gap-3 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center shrink-0 pt-0.5">
        <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${cfg.color}`}>
          {cfg.icon}
        </div>
        <div className="w-px flex-1 bg-white/[0.05] mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs font-medium text-text">{entry.entityTitle}</span>
          {epicName && (
            <span className="text-xs text-muted bg-surface2 px-1.5 py-0.5 rounded shrink-0">{epicName}</span>
          )}
          <span className="text-xs text-muted ml-auto shrink-0">{time}</span>
        </div>

        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-xs text-muted">{cfg.label}</span>

          {/* Status change: from → to */}
          {entry.action === 'status_changed' && (entry.from || entry.to) && (
            <span className="flex items-center gap-1 text-xs">
              <StatusIcon value={entry.from} />
              <span className="text-muted">{translateStatus(entry.from)}</span>
              <ChevronRight size={10} className="text-muted" />
              <StatusIcon value={entry.to} />
              <span className="text-text font-medium">{translateStatus(entry.to)}</span>
            </span>
          )}

          {/* Execution result */}
          {entry.action === 'executed' && entry.to && (
            <span className="flex items-center gap-1 text-xs">
              <StatusIcon value={entry.to} />
              <span className="font-medium text-text">{translateStatus(entry.to)}</span>
            </span>
          )}

          {/* Bug created: show initial status */}
          {entry.action === 'created' && entry.entityType === 'bug' && entry.to && (
            <span className="flex items-center gap-1 text-xs text-muted">
              · <StatusIcon value={entry.to} /> {translateStatus(entry.to)}
            </span>
          )}
        </div>

        {/* Notes */}
        {entry.notes && (
          <p className="text-xs text-muted mt-1 line-clamp-2 italic">"{entry.notes}"</p>
        )}

        {/* Actor */}
        {entry.actor && (
          <p className="text-xs text-muted/60 mt-0.5">{entry.actor}</p>
        )}
      </div>
    </div>
  )
}

// ─── Day group ────────────────────────────────────────────────────────────────

function DayGroup({ date, entries, epicMap }: {
  date: string
  entries: HistoryEntry[]
  epicMap: Map<string, string>
}) {
  const label = (() => {
    try {
      const d = parseISO(date)
      const today = new Date()
      const yesterday = subDays(today, 1)
      if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'Hoje'
      if (format(d, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) return 'Ontem'
      return format(d, "dd 'de' MMMM", { locale: ptBR })
    } catch { return date }
  })()

  return (
    <div>
      <div className="sticky top-0 z-10 py-2 mb-3">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider bg-bg px-2 py-1 rounded-full border border-white/[0.07]">
          {label}
        </span>
      </div>
      <div>
        {entries.map(e => (
          <EntryCard key={e.id} entry={e} epicName={epicMap.get(e.epicId)} />
        ))}
      </div>
    </div>
  )
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const PERIOD_OPTIONS = [
  { label: 'Hoje',        days: 1 },
  { label: 'Últimos 7d',  days: 7 },
  { label: 'Últimos 30d', days: 30 },
  { label: 'Todos',       days: 0 },
]

const TYPE_OPTIONS = [
  { label: 'Tudo',      value: 'all' },
  { label: 'Cenários',  value: 'scenario' },
  { label: 'Bugs',      value: 'bug' },
  { label: 'Projetos',    value: 'epic' },
]

const ACTION_OPTIONS = [
  { label: 'Todas ações',   value: 'all' },
  { label: 'Criados',       value: 'created' },
  { label: 'Executados',    value: 'executed' },
  { label: 'Status alterado', value: 'status_changed' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function History() {
  const { state } = useApp()
  const { history = [], epics } = state

  const [epicFilter, setEpicFilter]     = useState('all')
  const [typeFilter, setTypeFilter]     = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [periodDays, setPeriodDays]     = useState(30)

  const epicMap = useMemo(() => new Map(epics.map(e => [e.id, e.name])), [epics])

  const filtered = useMemo(() => {
    const now = new Date()
    return [...history]
      .filter(e => epicFilter  === 'all' || e.epicId     === epicFilter)
      .filter(e => typeFilter  === 'all' || e.entityType === typeFilter)
      .filter(e => actionFilter === 'all' || e.action    === actionFilter)
      .filter(e => {
        if (periodDays === 0) return true
        try {
          return isWithinInterval(parseISO(e.timestamp), {
            start: startOfDay(subDays(now, periodDays - 1)),
            end:   endOfDay(now),
          })
        } catch { return false }
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [history, epicFilter, typeFilter, actionFilter, periodDays])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, HistoryEntry[]>()
    filtered.forEach(e => {
      const day = e.timestamp.slice(0, 10)
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(e)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const selectCls = 'bg-surface border border-white/[0.07] rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-accent cursor-pointer'

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <HistoryIcon size={20} className="text-accent" />
        <div>
          <h1 className="text-xl font-bold text-text">Histórico de Alterações</h1>
          <p className="text-sm text-muted">{filtered.length} {filtered.length === 1 ? 'evento' : 'eventos'} encontrados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter size={14} className="text-muted shrink-0" />

        {/* Period */}
        <div className="flex gap-1 bg-surface border border-white/[0.07] rounded-lg p-1">
          {PERIOD_OPTIONS.map(o => (
            <button
              key={o.days}
              onClick={() => setPeriodDays(o.days)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                periodDays === o.days ? 'bg-accent text-white' : 'text-muted hover:text-text'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <select value={epicFilter}    onChange={e => setEpicFilter(e.target.value)}    className={selectCls}>
          <option value="all">Todos os projetos</option>
          {epics.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>

        <select value={typeFilter}    onChange={e => setTypeFilter(e.target.value)}    className={selectCls}>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <select value={actionFilter}  onChange={e => setActionFilter(e.target.value)}  className={selectCls}>
          {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="text-center py-20 text-muted text-sm">
          {history.length === 0
            ? 'Nenhuma atividade registrada ainda. As próximas alterações serão registradas aqui.'
            : 'Nenhum evento encontrado para os filtros selecionados.'}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([date, entries]) => (
            <DayGroup key={date} date={date} entries={entries} epicMap={epicMap} />
          ))}
        </div>
      )}
    </div>
  )
}
