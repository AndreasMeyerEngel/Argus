import React, { useMemo, useState } from 'react'
import {
  GitBranch, ChevronDown, ChevronRight, Bug as BugIcon,
  CheckCircle2, XCircle, AlertCircle, Clock, MinusCircle, Filter
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Epic, EpicTask, TestScenario, Bug } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScenarioStats {
  total: number
  passed: number
  failed: number
  blocked: number
  partial: number
  pending: number
  bugCount: number
  coverage: number
}

type RowKind = 'task' | 'bug' | 'unlinked'

interface GroupRow {
  kind: RowKind
  task: EpicTask | null
  bug: Bug | null
  scenarios: TestScenario[]
  relatedBugs: Bug[]
  stats: ScenarioStats
}

interface EpicGroup {
  epic: Epic
  rows: GroupRow[]
  stats: ScenarioStats
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStats(scenarios: TestScenario[], bugs: Bug[]): ScenarioStats {
  const total = scenarios.length
  const passed  = scenarios.filter(s => s.status === 'passed').length
  const failed  = scenarios.filter(s => s.status === 'failed').length
  const blocked = scenarios.filter(s => s.status === 'blocked').length
  const partial = scenarios.filter(s => s.status === 'partial').length
  const pending = scenarios.filter(s => s.status === 'pending').length
  const coverage = total === 0 ? 0 : Math.round((passed / total) * 100)
  return { total, passed, failed, blocked, partial, pending, bugCount: bugs.length, coverage }
}

// ─── Small Components ─────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: TestScenario['status'] }) {
  switch (status) {
    case 'passed':  return <CheckCircle2 size={14} className="text-green shrink-0" />
    case 'failed':  return <XCircle      size={14} className="text-red shrink-0" />
    case 'blocked': return <MinusCircle  size={14} className="text-amber shrink-0" />
    case 'partial': return <AlertCircle  size={14} className="text-accent shrink-0" />
    default:        return <Clock        size={14} className="text-muted shrink-0" />
  }
}

const statusLabel: Record<TestScenario['status'], string> = {
  passed: 'Aprovado', failed: 'Falhou', blocked: 'Bloqueado',
  partial: 'Parcial', pending: 'Pendente',
}

const criticalityColor: Record<string, string> = {
  critical: 'text-red', high: 'text-amber', medium: 'text-accent', low: 'text-muted',
}
const criticalityLabel: Record<string, string> = {
  critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo',
}

const bugSeverityColor: Record<string, string> = {
  critical: 'text-red', high: 'text-amber', medium: 'text-accent', low: 'text-muted',
}
const bugStatusConfig: Record<string, { label: string; cls: string }> = {
  open:       { label: 'Aberto',       cls: 'bg-green/15 text-green' },
  in_progress:{ label: 'Em andamento', cls: 'bg-accent/15 text-accent' },
  resolved:   { label: 'Resolvido',    cls: 'bg-green/15 text-green' },
  closed:     { label: 'Fechado',      cls: 'bg-surface2 text-muted' },
  reopened:   { label: 'Reaberto',     cls: 'bg-red/15 text-red' },
}

function CoverageBar({ pct }: { pct: number }) {
  const barColor =
    pct === 0 ? 'bg-surface2' :
    pct < 40  ? 'bg-red/70' :
    pct < 70  ? 'bg-amber/70' :
    pct < 100 ? 'bg-accent/70' : 'bg-green/70'
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-text w-8 text-right">{pct}%</span>
    </div>
  )
}

function StatPill({ count, color, title }: { count: number; color: string; title: string }) {
  if (count === 0) return null
  return (
    <span title={title} className={`text-xs font-medium px-1.5 py-0.5 rounded ${color}`}>
      {count}
    </span>
  )
}

function StatPills({ stats }: { stats: ScenarioStats }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <StatPill count={stats.passed}  color="bg-green/15 text-green"   title="Aprovados" />
      <StatPill count={stats.failed}  color="bg-red/15 text-red"       title="Falhou" />
      <StatPill count={stats.blocked} color="bg-amber/15 text-amber"   title="Bloqueados" />
      <StatPill count={stats.partial} color="bg-accent/15 text-accent" title="Parciais" />
      <StatPill count={stats.pending} color="bg-surface2 text-muted"   title="Pendentes" />
    </div>
  )
}

// ─── Scenario Row ─────────────────────────────────────────────────────────────

function ScenarioRow({ scenario, allBugs, indent = false }: { scenario: TestScenario; allBugs: Bug[]; indent?: boolean }) {
  const linkedBugs = allBugs.filter(b => scenario.linkedBugs.includes(b.id))
  return (
    <div className={`flex items-center gap-3 py-2 hover:bg-surface2/50 transition-colors ${indent ? 'pl-10 pr-4' : 'px-4'}`}>
      <div className="w-5 shrink-0" />
      <StatusIcon status={scenario.status} />
      <span className="text-xs text-text flex-1 truncate">{scenario.title}</span>
      <span className={`text-xs shrink-0 ${criticalityColor[scenario.criticality]}`}>
        {criticalityLabel[scenario.criticality]}
      </span>
      <span className="text-xs text-muted shrink-0 w-20 text-right">{statusLabel[scenario.status]}</span>
      <div className="flex items-center gap-1 shrink-0 w-8 justify-end">
        {linkedBugs.length > 0 && (
          <>
            <BugIcon size={12} className="text-red" />
            <span className="text-xs text-red">{linkedBugs.length}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Group Row (Task | Bug | Unlinked) ────────────────────────────────────────

function GroupRowItem({
  row,
  allBugs,
  expanded,
  onToggle,
}: {
  row: GroupRow
  allBugs: Bug[]
  expanded: boolean
  onToggle: () => void
}) {
  const { kind, task, bug, scenarios, stats } = row

  const label = (() => {
    if (kind === 'task') return <span className="text-sm text-text truncate flex-1">{task!.name}</span>
    if (kind === 'bug')  return (
      <span className="flex items-center gap-2 flex-1 min-w-0">
        <BugIcon size={14} className={`shrink-0 ${bugSeverityColor[bug!.severity]}`} />
        <span className="text-sm text-text truncate">{bug!.title}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${bugStatusConfig[bug!.status]?.cls ?? ''}`}>
          {bugStatusConfig[bug!.status]?.label ?? bug!.status}
        </span>
      </span>
    )
    return <span className="text-sm text-muted italic flex-1">Sem tarefa/bug vinculado</span>
  })()

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface2 transition-colors text-left"
      >
        <div className="w-5 shrink-0 flex justify-center">
          {scenarios.length > 0
            ? (expanded ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />)
            : <span className="w-3.5" />
          }
        </div>

        {label}

        <StatPills stats={stats} />

        {/* Bug count (only for task/unlinked rows) */}
        {kind !== 'bug' && (
          <div className="flex items-center gap-1 shrink-0 w-14 justify-end">
            {stats.bugCount > 0 && (
              <>
                <BugIcon size={13} className="text-red" />
                <span className="text-xs text-red font-medium">{stats.bugCount}</span>
              </>
            )}
          </div>
        )}
        {kind === 'bug' && <div className="w-14 shrink-0" />}

        <span className="text-xs text-muted shrink-0 w-16 text-right">
          {stats.total} {stats.total === 1 ? 'cenário' : 'cenários'}
        </span>

        <div className="shrink-0 w-36">
          <CoverageBar pct={stats.coverage} />
        </div>
      </button>

      {expanded && scenarios.length > 0 && (
        <div className="border-t border-white/[0.04]">
          {scenarios.map(s => (
            <ScenarioRow key={s.id} scenario={s} allBugs={allBugs} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Epic Group ───────────────────────────────────────────────────────────────

const epicStatusColor: Record<string, string> = {
  planning: 'bg-gray-500/20 text-gray-400',
  running:  'bg-accent/20 text-accent',
  blocked:  'bg-red/20 text-red',
  done:     'bg-green/20 text-green',
  archived: 'bg-gray-600/20 text-gray-500',
}
const epicStatusLabel: Record<string, string> = {
  planning: 'Planejamento', running: 'Em andamento',
  blocked: 'Bloqueado', done: 'Concluído', archived: 'Arquivado',
}

function EpicGroupComponent({ group, allBugs }: { group: EpicGroup; allBugs: Bug[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = (key: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const { epic, rows, stats } = group
  const rowKey = (r: GroupRow) =>
    r.kind === 'task' ? `task_${r.task!.id}` :
    r.kind === 'bug'  ? `bug_${r.bug!.id}` : '__unlinked__'

  return (
    <div className="border border-white/[0.07] rounded-xl overflow-hidden">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-surface hover:bg-surface2 transition-colors text-left"
      >
        {collapsed
          ? <ChevronRight size={16} className="text-muted shrink-0" />
          : <ChevronDown  size={16} className="text-muted shrink-0" />
        }
        <span className="text-sm font-semibold text-text flex-1 truncate">{epic.name}</span>

        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${epicStatusColor[epic.status] ?? 'bg-surface2 text-muted'}`}>
          {epicStatusLabel[epic.status] ?? epic.status}
        </span>

        <div className="flex items-center gap-1.5 shrink-0 ml-3">
          <StatPills stats={stats} />
        </div>

        {stats.bugCount > 0 && (
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <BugIcon size={13} className="text-red" />
            <span className="text-xs text-red font-medium">{stats.bugCount}</span>
          </div>
        )}

        <span className="text-xs text-muted shrink-0 ml-2 w-20 text-right">
          {stats.total} cenários
        </span>

        <div className="shrink-0 w-36 ml-2">
          <CoverageBar pct={stats.coverage} />
        </div>
      </button>

      {!collapsed && (
        <div className="divide-y divide-white/[0.04] bg-surface/50">
          {rows.map(row => {
            const key = rowKey(row)
            return (
              <GroupRowItem
                key={key}
                row={row}
                allBugs={allBugs}
                expanded={expandedRows.has(key)}
                onToggle={() => toggleRow(key)}
              />
            )
          })}
          {rows.length === 0 && (
            <div className="px-8 py-4 text-xs text-muted italic">Nenhum cenário de teste neste projeto.</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { icon: <CheckCircle2 size={13} className="text-green" />, label: 'Aprovado' },
    { icon: <XCircle      size={13} className="text-red" />,   label: 'Falhou' },
    { icon: <MinusCircle  size={13} className="text-amber" />, label: 'Bloqueado' },
    { icon: <AlertCircle  size={13} className="text-accent" />,label: 'Parcial' },
    { icon: <Clock        size={13} className="text-muted" />, label: 'Pendente' },
    { icon: <BugIcon      size={13} className="text-red" />,   label: 'Bug vinculado' },
  ]
  return (
    <div className="flex flex-wrap items-center gap-4">
      {items.map(({ icon, label }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs text-muted">
          {icon}<span>{label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-2xl font-bold ${color ?? 'text-text'}`}>{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Traceability() {
  const { state } = useApp()
  const { epics, tasks, scenarios, bugs } = state

  const [epicFilter, setEpicFilter] = useState<string>('all')

  const filteredEpics = epicFilter === 'all' ? epics : epics.filter(e => e.id === epicFilter)

  const groups = useMemo<EpicGroup[]>(() => {
    return filteredEpics.map(epic => {
      const epicScenarios = scenarios.filter(s => s.epicId === epic.id)
      const epicBugs      = bugs.filter(b => b.epicId === epic.id)
      const epicTasks     = tasks.filter(t => t.epicId === epic.id)

      const rows: GroupRow[] = []

      // 1. Scenarios linked to tasks
      epicTasks.forEach(task => {
        const taskScenarios = epicScenarios.filter(s => s.taskId === task.id)
        if (taskScenarios.length === 0) return
        const relatedBugs = epicBugs.filter(b =>
          taskScenarios.some(s => s.linkedBugs.includes(b.id))
        )
        rows.push({ kind: 'task', task, bug: null, scenarios: taskScenarios, relatedBugs, stats: computeStats(taskScenarios, relatedBugs) })
      })

      // 2. Scenarios NOT linked to any task
      const unlinked = epicScenarios.filter(s => !s.taskId)
      const coveredScenarioIds = new Set<string>()

      // Show ALL bugs from the epic as rows (even those with no linked scenarios)
      epicBugs.forEach(bug => {
        const bugScenarios = unlinked.filter(
          s => s.bugId === bug.id ||
               s.linkedBugs.includes(bug.id) ||
               bug.linkedScenarios.includes(s.id)
        )
        bugScenarios.forEach(s => coveredScenarioIds.add(s.id))
        rows.push({ kind: 'bug', task: null, bug, scenarios: bugScenarios, relatedBugs: [bug], stats: computeStats(bugScenarios, [bug]) })
      })

      // 3. Scenarios with no task and no bug link
      const orphanScenarios = unlinked.filter(s => !coveredScenarioIds.has(s.id))
      if (orphanScenarios.length > 0) {
        rows.push({ kind: 'unlinked', task: null, bug: null, scenarios: orphanScenarios, relatedBugs: [], stats: computeStats(orphanScenarios, []) })
      }

      return { epic, rows, stats: computeStats(epicScenarios, epicBugs) }
    })
  }, [filteredEpics, scenarios, bugs, tasks])

  const globalStats = useMemo(() => {
    const s = epicFilter === 'all' ? scenarios : scenarios.filter(sc => filteredEpics.some(e => e.id === sc.epicId))
    const b = epicFilter === 'all' ? bugs       : bugs.filter(bg => filteredEpics.some(e => e.id === bg.epicId))
    return computeStats(s, b)
  }, [scenarios, bugs, filteredEpics, epicFilter])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={20} className="text-accent" />
            <h1 className="text-xl font-bold text-text">Matriz de Rastreabilidade</h1>
          </div>
          <p className="text-sm text-muted">Projetos → Tarefas → Bugs → Cenários de teste</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Filter size={14} className="text-muted" />
          <select
            value={epicFilter}
            onChange={e => setEpicFilter(e.target.value)}
            className="bg-surface border border-white/[0.07] rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-accent cursor-pointer"
          >
            <option value="all">Todos os projetos</option>
            {epics.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards — 7 cols */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <SummaryCard label="Cenários"  value={globalStats.total} />
        <SummaryCard label="Aprovados" value={globalStats.passed}  color="text-green" />
        <SummaryCard label="Falharam"  value={globalStats.failed}  color="text-red" />
        <SummaryCard label="Bloqueados" value={globalStats.blocked} color="text-amber" />
        <SummaryCard label="Parciais"  value={globalStats.partial} color="text-accent" />
        <SummaryCard label="Pendentes" value={globalStats.pending} color="text-muted" />
        <SummaryCard label="Cobertura" value={`${globalStats.coverage}%`}
          color={globalStats.coverage >= 70 ? 'text-green' : globalStats.coverage >= 40 ? 'text-amber' : 'text-red'}
          sub={`${globalStats.bugCount} bug${globalStats.bugCount !== 1 ? 's' : ''}`}
        />
      </div>

      <Legend />

      <div className="flex flex-col gap-4">
        {groups.length === 0 && (
          <div className="text-center py-16 text-muted text-sm">Nenhum projeto encontrado.</div>
        )}
        {groups.map(group => (
          <EpicGroupComponent key={group.epic.id} group={group} allBugs={bugs} />
        ))}
      </div>
    </div>
  )
}
