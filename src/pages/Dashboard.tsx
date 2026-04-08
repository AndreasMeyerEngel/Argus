import React, { useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { format, subDays, parseISO, eachDayOfInterval, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, CheckCircle, Bug, Layers, TrendingUp, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { KpiCard } from '../components/ui/KpiCard'

const COLORS = {
  critical: '#f87171',
  high: '#fbbf24',
  medium: '#a78bfa',
  low: '#34d399',
  accent: '#4f8ef7',
  cyan: '#22d3ee',
}

export default function Dashboard() {
  const { state } = useApp()

  const totalScenarios = state.scenarios.length
  const passedScenarios = state.scenarios.filter(s => s.status === 'passed').length
  const failedScenarios = state.scenarios.filter(s => s.status === 'failed').length
  const openBugs = state.bugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status)).length
  const criticalBugs = state.bugs.filter(b => b.severity === 'critical' && ['open', 'in_progress', 'reopened'].includes(b.status)).length
  const successRate = totalScenarios === 0 ? 0 : Math.round((passedScenarios / totalScenarios) * 100)

  const avgResolutionTime = useMemo(() => {
    const resolved = state.bugs.filter(b => b.resolvedAt && b.openedAt)
    if (resolved.length === 0) return 0
    const total = resolved.reduce((acc, b) => {
      const days = (new Date(b.resolvedAt!).getTime() - new Date(b.openedAt).getTime()) / 86400000
      return acc + days
    }, 0)
    return Math.round(total / resolved.length)
  }, [state.bugs])

  // Bug burn down last 30 days
  const burnDownData = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })
    return days.map(day => {
      const dayStr = startOfDay(day).toISOString()
      const openCount = state.bugs.filter(b => {
        const opened = new Date(b.openedAt) <= day
        const resolved = b.resolvedAt ? new Date(b.resolvedAt) <= day : false
        return opened && !resolved
      }).length
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        abertos: openCount,
      }
    })
  }, [state.bugs])

  // Bug by severity
  const bugsBySeverity = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 }
    state.bugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status)).forEach(b => {
      counts[b.severity]++
    })
    return [
      { name: 'Crítico', value: counts.critical, color: COLORS.critical },
      { name: 'Alto', value: counts.high, color: COLORS.high },
      { name: 'Médio', value: counts.medium, color: COLORS.medium },
      { name: 'Baixo', value: counts.low, color: COLORS.low },
    ].filter(d => d.value > 0)
  }, [state.bugs])

  // Avg resolution time by severity
  const avgResBySevertiy = useMemo(() => {
    const map: Record<string, number[]> = { critical: [], high: [], medium: [], low: [] }
    state.bugs.filter(b => b.resolvedAt).forEach(b => {
      const days = (new Date(b.resolvedAt!).getTime() - new Date(b.openedAt).getTime()) / 86400000
      if (map[b.severity]) map[b.severity].push(days)
    })
    return Object.entries(map).map(([sev, vals]) => ({
      severity: sev === 'critical' ? 'Crítico' : sev === 'high' ? 'Alto' : sev === 'medium' ? 'Médio' : 'Baixo',
      dias: vals.length === 0 ? 0 : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }))
  }, [state.bugs])

  // Reopen rate by epic
  const reopenRateByEpic = useMemo(() => {
    return state.epics
      .filter(e => e.status !== 'archived')
      .map(e => {
        const epicBugs = state.bugs.filter(b => b.epicId === e.id)
        const reopened = epicBugs.filter(b => b.reopenCount > 0).length
        return {
          epic: e.name.length > 20 ? e.name.slice(0, 20) + '…' : e.name,
          taxa: epicBugs.length === 0 ? 0 : Math.round((reopened / epicBugs.length) * 100),
        }
      })
      .filter(d => d.taxa > 0)
      .slice(0, 6)
  }, [state.epics, state.bugs])

  // Bugs by area
  const bugsByArea = useMemo(() => {
    const map: Record<string, { critical: number; high: number; medium: number; low: number }> = {}
    state.bugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status)).forEach(b => {
      const area = b.area || 'Sem área'
      if (!map[area]) map[area] = { critical: 0, high: 0, medium: 0, low: 0 }
      map[area][b.severity]++
    })
    return Object.entries(map).map(([area, counts]) => ({ area, ...counts })).slice(0, 8)
  }, [state.bugs])

  // Execution velocity last 14 days
  const execVelocity = useMemo(() => {
    const days = eachDayOfInterval({ start: subDays(new Date(), 13), end: new Date() })
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd')
      const execs = state.scenarios.flatMap(s => s.executions).filter(e => e.date.startsWith(dayStr))
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        execucoes: execs.length,
      }
    })
  }, [state.scenarios])

  // Epic heatmap
  const epicHeatmap = state.epics.filter(e => e.status !== 'archived').map(e => {
    const scenarios = state.scenarios.filter(s => s.epicId === e.id)
    const passed = scenarios.filter(s => s.status === 'passed').length
    const pct = scenarios.length === 0 ? 0 : Math.round((passed / scenarios.length) * 100)
    const bugs = state.bugs.filter(b => b.epicId === e.id && ['open', 'in_progress', 'reopened'].includes(b.status)).length
    return { epic: e, scenarios: scenarios.length, passed, pct, bugs }
  })

  const getHeatColor = (pct: number) => {
    if (pct > 70) return 'bg-green/20 border-green/30 text-green'
    if (pct > 40) return 'bg-amber/20 border-amber/30 text-amber'
    if (pct > 0) return 'bg-red/20 border-red/30 text-red'
    return 'bg-surface2 border-white/[0.07] text-muted'
  }

  // Automatic alerts
  const alerts = useMemo(() => {
    const list: { type: 'warning' | 'critical' | 'info'; message: string }[] = []
    if (criticalBugs > 0) list.push({ type: 'critical', message: `${criticalBugs} bug(s) crítico(s) ainda em aberto.` })
    const blockedEpics = state.epics.filter(e => e.status === 'blocked').length
    if (blockedEpics > 0) list.push({ type: 'warning', message: `${blockedEpics} épico(s) bloqueados. Verifique as dependências.` })
    const unstable = state.scenarios.filter(s => s.executions.filter(e => e.result === 'failed').length > 1).length
    if (unstable > 0) list.push({ type: 'warning', message: `${unstable} cenário(s) com falhas recorrentes (instáveis).` })
    const highReopen = state.bugs.filter(b => b.reopenCount >= 2).length
    if (highReopen > 0) list.push({ type: 'warning', message: `${highReopen} bug(s) reabertos 2+ vezes. Revisar qualidade das correções.` })
    if (successRate > 80) list.push({ type: 'info', message: `Taxa de sucesso acima de 80%! Boa cobertura geral.` })
    return list
  }, [state, criticalBugs, successRate])

  const tooltipStyle = { backgroundColor: '#13161d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#e8eaf0', fontSize: '12px' }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text">Dashboard Global</h1>
        <p className="text-sm text-muted mt-0.5">Visão consolidada de qualidade</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <KpiCard icon={Layers} label="Cenários" value={totalScenarios} />
        <KpiCard icon={CheckCircle} label="Passou" value={passedScenarios} iconColor="text-green" />
        <KpiCard icon={AlertTriangle} label="Falhou" value={failedScenarios} iconColor="text-red" />
        <KpiCard icon={Bug} label="Bugs Abertos" value={openBugs} iconColor="text-amber" />
        <KpiCard icon={TrendingUp} label="Taxa Sucesso" value={`${successRate}%`} iconColor="text-accent" />
        <KpiCard icon={Clock} label="Tempo Médio Res." value={`${avgResolutionTime}d`} iconColor="text-purple" />
      </div>

      {/* Heatmap */}
      {epicHeatmap.length > 0 && (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-text mb-4">Heatmap de Cobertura por Épico</h2>
          <div className="flex flex-wrap gap-2">
            {epicHeatmap.map(({ epic, scenarios, pct, bugs }) => (
              <div key={epic.id} className={`border rounded-lg p-3 min-w-[140px] ${getHeatColor(pct)}`}>
                <p className="text-xs font-medium truncate mb-1">{epic.name}</p>
                <p className="text-lg font-bold">{pct}%</p>
                <p className="text-xs opacity-70">{scenarios} cenários · {bugs} bugs</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Burn Down */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Bug Burn Down (30 dias)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={burnDownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="severity" type="category" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} width={60} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="epic" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis dataKey="area" type="category" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="critical" stackId="a" fill={COLORS.critical} name="Crítico" />
                <Bar dataKey="high" stackId="a" fill={COLORS.high} name="Alto" />
                <Bar dataKey="medium" stackId="a" fill={COLORS.medium} name="Médio" />
                <Bar dataKey="low" stackId="a" fill={COLORS.low} name="Baixo" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Execution velocity */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text mb-4">Velocidade de Execução (14 dias)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={execVelocity}>
              <defs>
                <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
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
