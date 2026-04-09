import React, { useMemo, useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay, parseISO, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, CheckCircle, Bug, Layers, TrendingUp, Clock, Calendar } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { KpiCard } from '../components/ui/KpiCard'

const COLORS = {
  critical: '#f87171',
  high: '#fbbf24',
  medium: '#a78bfa',
  low: '#34d399',
  accent: '#4f8ef7',
  cyan: '#22d3ee',
}

const toDateInput = (d: Date) => format(d, 'yyyy-MM-dd')

export default function Dashboard() {
  const { state } = useApp()
  const { theme } = useTheme()

  // ── Period filter ───────────────────────────────────────────────────────────
  const [mode, setMode] = useState<'all' | 'period'>('all')
  const [startStr, setStartStr] = useState(toDateInput(subDays(new Date(), 13)))
  const [endStr, setEndStr]     = useState(toDateInput(new Date()))

  const periodStart = useMemo(() => startOfDay(new Date(startStr + 'T00:00:00')), [startStr])
  const periodEnd   = useMemo(() => endOfDay(new Date(endStr + 'T00:00:00')), [endStr])

  const inPeriod = (dateStr: string) => {
    try { return isWithinInterval(parseISO(dateStr), { start: periodStart, end: periodEnd }) }
    catch { return false }
  }

  // ── Filtered data ───────────────────────────────────────────────────────────
  // In "period" mode, a scenario counts if it has at least one execution in the period
  const filteredScenarios = useMemo(() => {
    if (mode === 'all') return state.scenarios
    return state.scenarios.filter(s => s.executions.some(e => inPeriod(e.date)))
  }, [state.scenarios, mode, periodStart, periodEnd])

  // Filtered bugs: opened within period OR active throughout it
  const filteredBugs = useMemo(() => {
    if (mode === 'all') return state.bugs
    return state.bugs.filter(b => {
      const opened = parseISO(b.openedAt)
      const resolved = b.resolvedAt ? parseISO(b.resolvedAt) : null
      // Bug was open at some point during the period
      const wasOpen = opened <= periodEnd && (!resolved || resolved >= periodStart)
      return wasOpen
    })
  }, [state.bugs, mode, periodStart, periodEnd])

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const totalScenarios  = filteredScenarios.length
  const passedScenarios = filteredScenarios.filter(s => s.status === 'passed').length
  const failedScenarios = filteredScenarios.filter(s => s.status === 'failed').length
  const openBugs        = filteredBugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status)).length
  const criticalBugs    = filteredBugs.filter(b => b.severity === 'critical' && ['open', 'in_progress', 'reopened'].includes(b.status)).length
  const successRate     = totalScenarios === 0 ? 0 : Math.round((passedScenarios / totalScenarios) * 100)

  const avgResolutionTime = useMemo(() => {
    const resolved = filteredBugs.filter(b => b.resolvedAt && b.openedAt)
    if (resolved.length === 0) return 0
    const total = resolved.reduce((acc, b) => {
      const days = (new Date(b.resolvedAt!).getTime() - new Date(b.openedAt).getTime()) / 86400000
      return acc + days
    }, 0)
    return Math.round(total / resolved.length)
  }, [filteredBugs])

  // ── Bug burn down ───────────────────────────────────────────────────────────
  const burnDownData = useMemo(() => {
    const windowStart = mode === 'period' ? periodStart : subDays(new Date(), 29)
    const windowEnd   = mode === 'period' ? periodEnd   : new Date()
    const days = eachDayOfInterval({ start: windowStart, end: windowEnd })
    return days.map(day => {
      const openCount = state.bugs.filter(b => {
        const opened   = new Date(b.openedAt) <= day
        const resolved = b.resolvedAt ? new Date(b.resolvedAt) <= day : false
        return opened && !resolved
      }).length
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        abertos: openCount,
      }
    })
  }, [state.bugs, mode, periodStart, periodEnd])

  // ── Bugs by severity (open) ─────────────────────────────────────────────────
  const bugsBySeverity = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    filteredBugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status)).forEach(b => {
      counts[b.severity]++
    })
    return [
      { name: 'Crítico', value: counts.critical, color: COLORS.critical },
      { name: 'Alto',    value: counts.high,     color: COLORS.high },
      { name: 'Médio',   value: counts.medium,   color: COLORS.medium },
      { name: 'Baixo',   value: counts.low,      color: COLORS.low },
    ].filter(d => d.value > 0)
  }, [filteredBugs])

  // ── Avg resolution time by severity ────────────────────────────────────────
  const avgResBySevertiy = useMemo(() => {
    const map: Record<string, number[]> = { critical: [], high: [], medium: [], low: [] }
    filteredBugs.filter(b => b.resolvedAt).forEach(b => {
      const days = (new Date(b.resolvedAt!).getTime() - new Date(b.openedAt).getTime()) / 86400000
      if (map[b.severity]) map[b.severity].push(days)
    })
    return Object.entries(map).map(([sev, vals]) => ({
      severity: sev === 'critical' ? 'Crítico' : sev === 'high' ? 'Alto' : sev === 'medium' ? 'Médio' : 'Baixo',
      dias: vals.length === 0 ? 0 : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }))
  }, [filteredBugs])

  // ── Reopen rate by epic ─────────────────────────────────────────────────────
  const reopenRateByEpic = useMemo(() => {
    return state.epics
      .filter(e => e.status !== 'archived')
      .map(e => {
        const epicBugs = filteredBugs.filter(b => b.epicId === e.id)
        const reopened = epicBugs.filter(b => b.reopenCount > 0).length
        return {
          epic: e.name.length > 20 ? e.name.slice(0, 20) + '…' : e.name,
          taxa: epicBugs.length === 0 ? 0 : Math.round((reopened / epicBugs.length) * 100),
        }
      })
      .filter(d => d.taxa > 0)
      .slice(0, 6)
  }, [state.epics, filteredBugs])

  // ── Bugs by area ────────────────────────────────────────────────────────────
  const bugsByArea = useMemo(() => {
    const map: Record<string, { critical: number; high: number; medium: number; low: number }> = {}
    filteredBugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status)).forEach(b => {
      const area = b.area || 'Sem área'
      if (!map[area]) map[area] = { critical: 0, high: 0, medium: 0, low: 0 }
      map[area][b.severity]++
    })
    return Object.entries(map).map(([area, counts]) => ({ area, ...counts })).slice(0, 8)
  }, [filteredBugs])

  // ── Execution velocity ──────────────────────────────────────────────────────
  const execVelocity = useMemo(() => {
    const windowStart = mode === 'period' ? periodStart : subDays(new Date(), 13)
    const windowEnd   = mode === 'period' ? periodEnd   : new Date()
    const days = eachDayOfInterval({ start: windowStart, end: windowEnd })
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const execs = state.scenarios.flatMap(s => s.executions).filter(e => e.date.startsWith(dayStr))
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        execucoes: execs.length,
      }
    })
  }, [state.scenarios, mode, periodStart, periodEnd])

  // ── Heatmap ─────────────────────────────────────────────────────────────────
  const epicHeatmap = state.epics.filter(e => e.status !== 'archived').map(e => {
    const scenarios = filteredScenarios.filter(s => s.epicId === e.id)
    const passed = scenarios.filter(s => s.status === 'passed').length
    const pct = scenarios.length === 0 ? 0 : Math.round((passed / scenarios.length) * 100)
    const bugs = filteredBugs.filter(b => b.epicId === e.id && ['open', 'in_progress', 'reopened'].includes(b.status)).length
    return { epic: e, scenarios: scenarios.length, passed, pct, bugs }
  })

  const getHeatColor = (pct: number): { cls: string; style: React.CSSProperties } => {
    if (isLight) {
      if (pct > 70) return { cls: 'text-green', style: { background: 'rgba(52,211,153,0.22)', border: '1px solid rgba(52,211,153,0.55)' } }
      if (pct > 40) return { cls: 'text-amber', style: { background: 'rgba(251,191,36,0.22)', border: '1px solid rgba(251,191,36,0.55)' } }
      if (pct > 0)  return { cls: 'text-red',   style: { background: 'rgba(248,113,113,0.18)', border: '1px solid rgba(248,113,113,0.50)' } }
      return { cls: 'text-muted', style: { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' } }
    }
    if (pct > 70) return { cls: 'bg-green/20 border-green/30 text-green', style: {} }
    if (pct > 40) return { cls: 'bg-amber/20 border-amber/30 text-amber', style: {} }
    if (pct > 0)  return { cls: 'bg-red/20 border-red/30 text-red', style: {} }
    return { cls: 'bg-surface2 border-white/[0.07] text-muted', style: {} }
  }

  // ── Alerts ──────────────────────────────────────────────────────────────────
  const alerts = useMemo(() => {
    const list: { type: 'warning' | 'critical' | 'info'; message: string }[] = []
    if (criticalBugs > 0) list.push({ type: 'critical', message: `${criticalBugs} bug(s) crítico(s) ainda em aberto.` })
    const blockedEpics = state.epics.filter(e => e.status === 'blocked').length
    if (blockedEpics > 0) list.push({ type: 'warning', message: `${blockedEpics} épico(s) bloqueados. Verifique as dependências.` })
    const unstable = filteredScenarios.filter(s => s.executions.filter(e => e.result === 'failed').length > 1).length
    if (unstable > 0) list.push({ type: 'warning', message: `${unstable} cenário(s) com falhas recorrentes (instáveis).` })
    const highReopen = filteredBugs.filter(b => b.reopenCount >= 2).length
    if (highReopen > 0) list.push({ type: 'warning', message: `${highReopen} bug(s) reabertos 2+ vezes. Revisar qualidade das correções.` })
    if (successRate > 80) list.push({ type: 'info', message: `Taxa de sucesso acima de 80%! Boa cobertura geral.` })
    return list
  }, [state.epics, filteredScenarios, filteredBugs, criticalBugs, successRate])

  const isLight = theme === 'light'
  const tooltipStyle = isLight
    ? { backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.10)', borderRadius: '8px', color: '#0f1117', fontSize: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }
    : { backgroundColor: '#1e2230', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#f0f2f8', fontSize: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }
  const gridColor  = isLight ? 'rgba(0,0,0,0.06)'  : 'rgba(255,255,255,0.05)'
  const tickColor  = isLight ? '#94a3b8' : '#6b7280'
  const inputCls = 'bg-surface2 border border-white/[0.07] rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-accent transition-colors'

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">Dashboard Global</h1>
          <p className="text-sm text-muted mt-0.5">Visão consolidada de qualidade</p>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-3">
          {/* Toggle */}
          <div className="flex bg-surface2 border border-white/[0.07] rounded-lg p-0.5">
            <button
              onClick={() => setMode('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${mode === 'all' ? 'bg-accent text-white' : 'text-muted hover:text-text'}`}
            >
              Geral
            </button>
            <button
              onClick={() => setMode('period')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${mode === 'period' ? 'bg-accent text-white' : 'text-muted hover:text-text'}`}
            >
              <Calendar size={12} />
              Período
            </button>
          </div>

          {/* Date inputs */}
          {mode === 'period' && (
            <div className="flex items-center gap-2">
              <input type="date" className={inputCls} value={startStr} onChange={e => setStartStr(e.target.value)} />
              <span className="text-muted text-xs">até</span>
              <input type="date" className={inputCls} value={endStr} onChange={e => setEndStr(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard icon={Layers}      label="Cenários"         value={totalScenarios} />
        <KpiCard icon={CheckCircle} label="Passou"           value={passedScenarios} iconColor="text-green" />
        <KpiCard icon={AlertTriangle} label="Falhou"         value={failedScenarios} iconColor="text-red" />
        <KpiCard icon={Bug}         label="Bugs Abertos"     value={openBugs} iconColor="text-amber" />
        <KpiCard icon={TrendingUp}  label="Taxa Sucesso"     value={`${successRate}%`} iconColor="text-accent" />
        <KpiCard icon={Clock}       label="Tempo Médio Res." value={`${avgResolutionTime}d`} iconColor="text-purple" />
      </div>

      {/* Heatmap */}
      {epicHeatmap.length > 0 && (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-text mb-4">Heatmap de Cobertura por Épico</h2>
          <div className="flex flex-wrap gap-2">
            {epicHeatmap.map(({ epic, scenarios, pct, bugs }) => {
              const heat = getHeatColor(pct)
              return (
              <div key={epic.id} className={`rounded-lg p-3 min-w-[140px] ${heat.cls}`} style={heat.style}>
                <p className="text-xs font-medium truncate mb-1">{epic.name}</p>
                <p className="text-lg font-bold">{pct}%</p>
                <p className="text-xs opacity-70">{scenarios} cenários · {bugs} bugs</p>
              </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Burn Down */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">
            Bug Burn Down {mode === 'all' ? '(30 dias)' : `(${startStr} → ${endStr})`}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={burnDownData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(burnDownData.length / 8) - 1)} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="abertos" stroke={COLORS.accent} strokeWidth={2} dot={false} name="Bugs abertos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bug by severity pie */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Bugs por Severidade (abertos)</h2>
          {bugsBySeverity.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted text-sm">Nenhum bug aberto</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={bugsBySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false}>
                  {bugsBySeverity.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Avg resolution time */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Tempo Médio de Resolução por Severidade (dias)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgResBySevertiy} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis type="number" tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="severity" type="category" tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="dias" fill={COLORS.accent} radius={[0, 4, 4, 0]} name="Dias" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Reopen rate */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Taxa de Reabertura por Épico (%)</h2>
          {reopenRateByEpic.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted text-sm">Nenhuma reabertura registrada</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={reopenRateByEpic}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="epic" tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="taxa" fill={COLORS.medium} radius={[4, 4, 0, 0]} name="Taxa %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bugs by area stacked */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Bugs por Área</h2>
          {bugsByArea.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-muted text-sm">Nenhum bug aberto</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bugsByArea} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="area" type="category" tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="critical" stackId="a" fill={COLORS.critical} name="Crítico" />
                <Bar dataKey="high"     stackId="a" fill={COLORS.high}     name="Alto" />
                <Bar dataKey="medium"   stackId="a" fill={COLORS.medium}   name="Médio" />
                <Bar dataKey="low"      stackId="a" fill={COLORS.low}      name="Baixo" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Execution velocity */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">
            Velocidade de Execução {mode === 'all' ? '(14 dias)' : `(${startStr} → ${endStr})`}
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={execVelocity}>
              <defs>
                <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS.cyan} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(execVelocity.length / 8) - 1)} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="execucoes" stroke={COLORS.cyan} strokeWidth={2} fill="url(#execGrad)" name="Execuções" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Alertas Automáticos</h2>
          <div className="flex flex-col gap-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${a.type === 'critical' ? 'bg-red/10 border-red/30' : a.type === 'warning' ? 'bg-amber/10 border-amber/30' : 'bg-accent/10 border-accent/30'}`}>
                <AlertTriangle size={14} className={`mt-0.5 shrink-0 ${a.type === 'critical' ? 'text-red' : a.type === 'warning' ? 'text-amber' : 'text-accent'}`} />
                <p className="text-sm text-text">{a.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
