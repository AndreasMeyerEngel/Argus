import React, { useMemo, useState } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  format, subDays, parseISO, isWithinInterval, startOfDay, endOfDay, differenceInDays
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  FileText, Download, Monitor, ChevronLeft, ChevronRight, X,
  TrendingUp, TrendingDown, Minus, AlertTriangle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Bug, TestScenario } from '../types'

const COLORS = {
  critical: '#f87171',
  high: '#fbbf24',
  medium: '#a78bfa',
  low: '#34d399',
  accent: '#4f8ef7',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function inPeriod(dateStr: string, start: Date, end: Date) {
  try {
    const d = parseISO(dateStr)
    return isWithinInterval(d, { start: startOfDay(start), end: endOfDay(end) })
  } catch { return false }
}

function fmt(d: Date) { return format(d, 'dd/MM/yyyy', { locale: ptBR }) }

function Trend({ current, previous, higherIsBetter = true }: { current: number; previous: number; higherIsBetter?: boolean }) {
  if (previous === 0 && current === 0) return <span className="text-muted text-xs">—</span>
  const diff = current - previous
  const pct = previous === 0 ? 100 : Math.round(Math.abs(diff / previous) * 100)
  const up = diff > 0
  const good = higherIsBetter ? up : !up
  if (diff === 0) return <span className="text-muted text-xs flex items-center gap-1"><Minus size={12} /> 0%</span>
  return (
    <span className={`text-xs flex items-center gap-1 font-medium ${good ? 'text-green' : 'text-red'}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? '+' : '-'}{pct}%
    </span>
  )
}

// ─── Presentation Mode ────────────────────────────────────────────────────────

function PresentationMode({
  onClose,
  slides,
}: {
  onClose: () => void
  slides: React.ReactNode[]
}) {
  const [idx, setIdx] = useState(0)
  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(slides.length - 1, i + 1))

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/[0.07] shrink-0">
        <span className="text-accent font-bold text-lg">PX/QA — Ticket Review</span>
        <div className="flex items-center gap-4">
          <span className="text-muted text-sm">{idx + 1} / {slides.length}</span>
          <button onClick={onClose} className="text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface2 transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Slide */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-12">
        {slides[idx]}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-center gap-6 py-5 border-t border-white/[0.07] shrink-0">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface2 border border-white/[0.07] text-sm text-text disabled:opacity-30 hover:bg-surface transition-colors"
        >
          <ChevronLeft size={16} /> Anterior
        </button>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === idx ? 'bg-accent' : 'bg-white/20'}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={idx === slides.length - 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface2 border border-white/[0.07] text-sm text-text disabled:opacity-30 hover:bg-surface transition-colors"
        >
          Próximo <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Report Page ─────────────────────────────────────────────────────────

export default function Report() {
  const { state } = useApp()
  const [presentationMode, setPresentationMode] = useState(false)

  const defaultEnd = new Date()
  const defaultStart = subDays(defaultEnd, state.settings.reportPeriodDays - 1)

  const [startDate, setStartDate] = useState(format(defaultStart, 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(defaultEnd, 'yyyy-MM-dd'))

  const periodStart = useMemo(() => new Date(startDate + 'T00:00:00'), [startDate])
  const periodEnd = useMemo(() => new Date(endDate + 'T23:59:59'), [endDate])
  const periodDays = differenceInDays(periodEnd, periodStart) + 1

  const prevEnd = subDays(periodStart, 1)
  const prevStart = subDays(prevEnd, periodDays - 1)

  // ── Current period data ──────────────────────────────────────────────────

  const currentBugsOpened = useMemo(
    () => state.bugs.filter(b => inPeriod(b.openedAt, periodStart, periodEnd)),
    [state.bugs, periodStart, periodEnd]
  )
  const currentBugsResolved = useMemo(
    () => state.bugs.filter(b => b.resolvedAt && inPeriod(b.resolvedAt, periodStart, periodEnd)),
    [state.bugs, periodStart, periodEnd]
  )
  const openBugsNow = state.bugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status))

  const executedInPeriod = useMemo(() => {
    const result: TestScenario[] = []
    for (const s of state.scenarios) {
      const hasExec = s.executions.some(e => inPeriod(e.date, periodStart, periodEnd))
      if (hasExec) result.push(s)
    }
    return result
  }, [state.scenarios, periodStart, periodEnd])

  const passedInPeriod = executedInPeriod.filter(s => {
    const lastExec = [...s.executions].filter(e => inPeriod(e.date, periodStart, periodEnd)).pop()
    return lastExec?.result === 'passed'
  })

  const successRate = executedInPeriod.length === 0
    ? 0
    : Math.round((passedInPeriod.length / executedInPeriod.length) * 100)

  const reopenedInPeriod = state.bugs.filter(b => b.reopenedAt && inPeriod(b.reopenedAt, periodStart, periodEnd))
  const reopenRate = currentBugsOpened.length === 0
    ? 0
    : Math.round((reopenedInPeriod.length / currentBugsOpened.length) * 100)

  const avgResolutionCurrent = useMemo(() => {
    if (currentBugsResolved.length === 0) return 0
    const total = currentBugsResolved.reduce((acc, b) => {
      return acc + differenceInDays(new Date(b.resolvedAt!), new Date(b.openedAt))
    }, 0)
    return Math.round(total / currentBugsResolved.length * 10) / 10
  }, [currentBugsResolved])

  // ── Previous period data ─────────────────────────────────────────────────

  const prevBugsOpened = state.bugs.filter(b => inPeriod(b.openedAt, prevStart, prevEnd))
  const prevBugsResolved = state.bugs.filter(b => b.resolvedAt && inPeriod(b.resolvedAt, prevStart, prevEnd))
  const prevExecuted = state.scenarios.filter(s =>
    s.executions.some(e => inPeriod(e.date, prevStart, prevEnd))
  )
  const prevPassed = prevExecuted.filter(s => {
    const lastExec = [...s.executions].filter(e => inPeriod(e.date, prevStart, prevEnd)).pop()
    return lastExec?.result === 'passed'
  })
  const prevSuccessRate = prevExecuted.length === 0 ? 0 : Math.round((prevPassed.length / prevExecuted.length) * 100)
  const prevReopened = state.bugs.filter(b => b.reopenedAt && inPeriod(b.reopenedAt, prevStart, prevEnd))
  const prevReopenRate = prevBugsOpened.length === 0 ? 0 : Math.round((prevReopened.length / prevBugsOpened.length) * 100)

  const prevAvgResolution = useMemo(() => {
    if (prevBugsResolved.length === 0) return 0
    const total = prevBugsResolved.reduce((acc, b) => {
      return acc + differenceInDays(new Date(b.resolvedAt!), new Date(b.openedAt))
    }, 0)
    return Math.round(total / prevBugsResolved.length * 10) / 10
  }, [prevBugsResolved])

  // ── Top bugs ─────────────────────────────────────────────────────────────

  const topBugs = useMemo(() => {
    return currentBugsOpened
      .filter(b => ['critical', 'high'].includes(b.severity))
      .sort((a, b) => {
        const sevOrder: Record<string, number> = { critical: 0, high: 1 }
        return (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2)
      })
  }, [currentBugsOpened])

  // ── Coverage by epic ──────────────────────────────────────────────────────

  const coverageByEpic = useMemo(() => {
    return state.epics
      .filter(e => e.status !== 'archived')
      .map(epic => {
        const epicScenarios = state.scenarios.filter(s => s.epicId === epic.id)
        const executedCount = epicScenarios.filter(s =>
          s.executions.some(e => inPeriod(e.date, periodStart, periodEnd))
        ).length
        const openBugs = state.bugs.filter(b =>
          b.epicId === epic.id && ['open', 'in_progress', 'reopened'].includes(b.status)
        ).length
        const coverage = epicScenarios.length === 0 ? 0 : Math.round(executedCount / epicScenarios.length * 100)
        return { epic, total: epicScenarios.length, executed: executedCount, coverage, openBugs }
      })
  }, [state, periodStart, periodEnd])

  // ── Bugs by severity pie ──────────────────────────────────────────────────

  const bugsBySev = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    openBugsNow.forEach(b => counts[b.severity]++)
    return [
      { name: 'Crítico', value: counts.critical, color: COLORS.critical },
      { name: 'Alto', value: counts.high, color: COLORS.high },
      { name: 'Médio', value: counts.medium, color: COLORS.medium },
      { name: 'Baixo', value: counts.low, color: COLORS.low },
    ].filter(d => d.value > 0)
  }, [openBugsNow])

  // ── Recommendations ───────────────────────────────────────────────────────

  const recommendations = useMemo(() => {
    const recs: string[] = []

    // Area concentration
    const areaCounts: Record<string, number> = {}
    currentBugsOpened.forEach(b => { areaCounts[b.area] = (areaCounts[b.area] || 0) + 1 })
    const total = currentBugsOpened.length
    if (total > 0) {
      Object.entries(areaCounts).forEach(([area, count]) => {
        const pct = Math.round(count / total * 100)
        if (pct > 30) {
          recs.push(`Área "${area}" concentra ${pct}% dos bugs do período. Recomenda-se revisão dos cenários desta área e possível refinamento dos critérios de aceite.`)
        }
      })
    }

    // Reopen rate
    if (reopenRate > 20) {
      recs.push(`Taxa de reabertura de ${reopenRate}% indica possível problema na qualidade dos fixes. Sugerido: incluir cenário de regressão específico para bugs reabertos.`)
    }

    // Critical scenarios not executed
    const criticalNotExec = state.scenarios.filter(s =>
      s.criticality === 'critical' && !s.executions.some(e => inPeriod(e.date, periodStart, periodEnd))
    )
    if (criticalNotExec.length > 0) {
      recs.push(`${criticalNotExec.length} cenário(s) de criticidade Crítica não foram executados no período. Risco de cobertura inadequada.`)
    }

    // Velocity drop
    const prevVelocity = prevExecuted.length / periodDays
    const currVelocity = executedInPeriod.length / periodDays
    if (prevVelocity > 0 && currVelocity < prevVelocity * 0.7) {
      const drop = Math.round((1 - currVelocity / prevVelocity) * 100)
      recs.push(`Velocity de execução caiu ${drop}% em relação ao período anterior. Verifique bloqueios ou sobrecargas no processo de QA.`)
    }

    // Critical bugs open > 2 days
    const staleCritical = openBugsNow.filter(b => {
      if (b.severity !== 'critical') return false
      return differenceInDays(new Date(), new Date(b.openedAt)) > 2
    })
    if (staleCritical.length > 0) {
      recs.push(`${staleCritical.length} bug(s) crítico(s) aberto(s) há mais de 2 dias sem resolução. Atenção imediata necessária.`)
    }

    if (recs.length === 0) {
      recs.push('Nenhuma recomendação crítica para o período. Continue monitorando os indicadores semanalmente.')
    }

    return recs
  }, [currentBugsOpened, reopenRate, state.scenarios, executedInPeriod, prevExecuted, periodDays, openBugsNow, periodStart, periodEnd])

  // ── Executive summary text ────────────────────────────────────────────────

  const executiveSummary = useMemo(() => {
    const activeEpics = state.epics.filter(e => ['running', 'planning', 'blocked'].includes(e.status)).length
    const comparison = prevSuccessRate > 0
      ? successRate > prevSuccessRate
        ? `Comparado ao período anterior, a taxa de sucesso aumentou ${successRate - prevSuccessRate} pontos percentuais.`
        : successRate < prevSuccessRate
          ? `Comparado ao período anterior, a taxa de sucesso diminuiu ${prevSuccessRate - successRate} pontos percentuais.`
          : 'A taxa de sucesso permaneceu estável em relação ao período anterior.'
      : ''

    return `No período de ${fmt(periodStart)} a ${fmt(periodEnd)} foram executados ${executedInPeriod.length} cenário(s) em ${activeEpics} épico(s) ativo(s). A taxa de sucesso foi de ${successRate}%. Foram abertos ${currentBugsOpened.length} bug(s), dos quais ${currentBugsOpened.filter(b => b.severity === 'critical').length} são críticos. ${comparison}`
  }, [state, periodStart, periodEnd, executedInPeriod, successRate, currentBugsOpened, prevSuccessRate])

  // ── Export HTML ───────────────────────────────────────────────────────────

  const exportHTML = () => {
    const rows = coverageByEpic.map(c =>
      `<tr><td>${c.epic.name}</td><td>${c.total}</td><td>${c.executed}</td><td>${c.coverage}%</td><td>${c.openBugs}</td></tr>`
    ).join('')

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Relatório PX/QA — ${fmt(periodStart)} a ${fmt(periodEnd)}</title>
<style>
  body { font-family: sans-serif; max-width: 900px; margin: 40px auto; color: #1a1a2e; }
  h1 { color: #4f8ef7; } h2 { border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 13px; }
  td { padding: 9px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
  .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 16px 0; }
  .kpi-card { background: #f8faff; border: 1px solid #dde7ff; border-radius: 8px; padding: 16px; }
  .kpi-value { font-size: 28px; font-weight: 700; color: #4f8ef7; }
  .kpi-label { font-size: 13px; color: #666; margin-top: 4px; }
  .rec { background: #fff8e1; border-left: 4px solid #fbbf24; padding: 12px; margin: 8px 0; border-radius: 4px; font-size: 14px; }
  p { line-height: 1.6; }
</style>
</head>
<body>
<h1>Relatório PX/QA</h1>
<p><strong>Período:</strong> ${fmt(periodStart)} a ${fmt(periodEnd)}</p>
<h2>Resumo Executivo</h2>
<p>${executiveSummary}</p>
<div class="kpi">
  <div class="kpi-card"><div class="kpi-value">${executedInPeriod.length}</div><div class="kpi-label">Cenários executados</div></div>
  <div class="kpi-card"><div class="kpi-value">${successRate}%</div><div class="kpi-label">Taxa de sucesso</div></div>
  <div class="kpi-card"><div class="kpi-value">${currentBugsOpened.length}</div><div class="kpi-label">Bugs abertos no período</div></div>
  <div class="kpi-card"><div class="kpi-value">${currentBugsResolved.length}</div><div class="kpi-label">Bugs resolvidos</div></div>
  <div class="kpi-card"><div class="kpi-value">${reopenRate}%</div><div class="kpi-label">Taxa de reabertura</div></div>
  <div class="kpi-card"><div class="kpi-value">${avgResolutionCurrent}d</div><div class="kpi-label">Tempo médio de resolução</div></div>
</div>
<h2>Top Bugs do Período</h2>
<table><tr><th>ID</th><th>Título</th><th>Área</th><th>Severidade</th><th>Status</th><th>Dias em aberto</th></tr>
${topBugs.map(b => `<tr><td>#${b.id}</td><td>${b.title}</td><td>${b.area}</td><td>${b.severity}</td><td>${b.status}</td><td>${differenceInDays(new Date(), new Date(b.openedAt))}</td></tr>`).join('')}
</table>
<h2>Cobertura por Épico</h2>
<table><tr><th>Épico</th><th>Total</th><th>Executados</th><th>Cobertura</th><th>Bugs abertos</th></tr>${rows}</table>
<h2>Recomendações</h2>
${recommendations.map(r => `<div class="rec">${r}</div>`).join('')}
<footer style="margin-top:40px;color:#999;font-size:12px">Gerado por PX/QA em ${fmt(new Date())}</footer>
</body></html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pxqa-report-${format(new Date(), 'yyyy-MM-dd')}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Slide content ─────────────────────────────────────────────────────────

  const slides: React.ReactNode[] = [
    // Slide 1: KPIs
    <div key="kpis" className="w-full max-w-3xl">
      <h2 className="text-3xl font-bold text-text mb-2">Indicadores do Período</h2>
      <p className="text-muted mb-8">{fmt(periodStart)} — {fmt(periodEnd)}</p>
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'Cenários Executados', value: executedInPeriod.length, color: 'text-accent' },
          { label: 'Taxa de Sucesso', value: `${successRate}%`, color: successRate >= 70 ? 'text-green' : successRate >= 40 ? 'text-amber' : 'text-red' },
          { label: 'Bugs Abertos', value: currentBugsOpened.length, color: 'text-amber' },
          { label: 'Bugs Resolvidos', value: currentBugsResolved.length, color: 'text-green' },
          { label: 'Taxa de Reabertura', value: `${reopenRate}%`, color: reopenRate > 20 ? 'text-red' : 'text-green' },
          { label: 'Tempo Médio Resolução', value: `${avgResolutionCurrent}d`, color: 'text-cyan' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-surface border border-white/[0.07] rounded-xl p-6">
            <div className={`text-4xl font-bold font-mono ${color}`}>{value}</div>
            <div className="text-muted text-sm mt-2">{label}</div>
          </div>
        ))}
      </div>
    </div>,

    // Slide 2: Bug severity chart
    <div key="bugs-chart" className="w-full max-w-2xl">
      <h2 className="text-3xl font-bold text-text mb-2">Bugs em Aberto por Severidade</h2>
      <p className="text-muted mb-8">Distribuição atual</p>
      {bugsBySev.length === 0 ? (
        <div className="text-center text-muted py-20 text-lg">Nenhum bug em aberto</div>
      ) : (
        <div className="flex flex-col items-center">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={bugsBySev} cx="50%" cy="50%" outerRadius={110} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine>
                {bugsBySev.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>,

    // Slide 3: Top critical/high bugs
    <div key="top-bugs" className="w-full max-w-3xl">
      <h2 className="text-3xl font-bold text-text mb-2">Top Bugs Críticos e Altos</h2>
      <p className="text-muted mb-6">Período {fmt(periodStart)} — {fmt(periodEnd)}</p>
      {topBugs.length === 0 ? (
        <div className="text-muted text-center py-10">Nenhum bug crítico ou alto no período</div>
      ) : (
        <div className="flex flex-col gap-3">
          {topBugs.slice(0, 6).map(bug => (
            <div key={bug.id} className="flex items-center gap-4 bg-surface border border-white/[0.07] rounded-xl px-5 py-4">
              <span className={`text-xs font-medium px-2.5 py-1 rounded ${bug.severity === 'critical' ? 'bg-red/20 text-red' : 'bg-amber/20 text-amber'}`}>
                {bug.severity === 'critical' ? 'Crítico' : 'Alto'}
              </span>
              <span className="text-text flex-1 text-sm">{bug.title}</span>
              <span className="text-muted text-xs">{bug.area}</span>
              <span className="text-muted text-xs font-mono">{differenceInDays(new Date(), new Date(bug.openedAt))}d</span>
            </div>
          ))}
        </div>
      )}
    </div>,

    // Slide 4: Coverage by epic
    <div key="coverage" className="w-full max-w-3xl">
      <h2 className="text-3xl font-bold text-text mb-2">Cobertura por Épico</h2>
      <p className="text-muted mb-6">Cenários executados no período</p>
      <div className="overflow-hidden rounded-xl border border-white/[0.07]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface2">
              <th className="text-left px-4 py-3 text-muted font-medium">Épico</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Executados</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Total</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Cobertura</th>
              <th className="text-right px-4 py-3 text-muted font-medium">Bugs abertos</th>
            </tr>
          </thead>
          <tbody>
            {coverageByEpic.map(({ epic, total, executed, coverage, openBugs }) => (
              <tr key={epic.id} className="border-t border-white/[0.07]">
                <td className="px-4 py-3 text-text">{epic.name}</td>
                <td className="px-4 py-3 text-right font-mono text-text">{executed}</td>
                <td className="px-4 py-3 text-right font-mono text-muted">{total}</td>
                <td className={`px-4 py-3 text-right font-mono font-medium ${coverage >= 70 ? 'text-green' : coverage >= 40 ? 'text-amber' : 'text-red'}`}>
                  {coverage}%
                </td>
                <td className={`px-4 py-3 text-right font-mono ${openBugs > 0 ? 'text-red' : 'text-muted'}`}>{openBugs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,

    // Slide 5: Recommendations
    <div key="recs" className="w-full max-w-3xl">
      <h2 className="text-3xl font-bold text-text mb-2">Recomendações</h2>
      <p className="text-muted mb-6">Análise automática do período</p>
      <div className="flex flex-col gap-4">
        {recommendations.map((rec, i) => (
          <div key={i} className="flex gap-4 bg-surface border border-amber/20 rounded-xl px-5 py-4">
            <AlertTriangle size={18} className="text-amber shrink-0 mt-0.5" />
            <p className="text-text text-sm leading-relaxed">{rec}</p>
          </div>
        ))}
      </div>
    </div>,
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {presentationMode && (
        <PresentationMode slides={slides} onClose={() => setPresentationMode(false)} />
      )}

      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Relatório Quinzenal</h1>
            <p className="text-muted text-sm mt-1">Gerado automaticamente com base nos dados reais</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setPresentationMode(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface2 border border-white/[0.07] text-sm text-text hover:bg-surface transition-colors"
            >
              <Monitor size={16} /> Modo Apresentação
            </button>
            <button
              onClick={exportHTML}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 transition-colors"
            >
              <Download size={16} /> Exportar HTML
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5 flex items-center gap-4">
          <FileText size={18} className="text-muted" />
          <span className="text-sm text-muted">Período:</span>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="bg-surface2 border border-white/[0.07] rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
          <span className="text-muted text-sm">até</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="bg-surface2 border border-white/[0.07] rounded-lg px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
          />
          <span className="text-muted text-xs ml-2">({periodDays} dias)</span>
        </div>

        {/* Section 1 — Executive summary */}
        <section className="bg-surface border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-base font-semibold text-text mb-4">Resumo Executivo</h2>
          <p className="text-sm text-text/80 leading-relaxed">{executiveSummary}</p>
        </section>

        {/* Section 2 — Indicator comparison */}
        <section className="bg-surface border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-base font-semibold text-text mb-4">Evolução dos Indicadores</h2>
          <p className="text-xs text-muted mb-4">Período anterior: {fmt(prevStart)} — {fmt(prevEnd)}</p>
          <div className="overflow-hidden rounded-lg border border-white/[0.07]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface2">
                  <th className="text-left px-4 py-3 text-muted font-medium">Indicador</th>
                  <th className="text-right px-4 py-3 text-muted font-medium">Período Anterior</th>
                  <th className="text-right px-4 py-3 text-muted font-medium">Período Atual</th>
                  <th className="text-right px-4 py-3 text-muted font-medium">Variação</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Taxa de sucesso', prev: prevSuccessRate, curr: successRate, format: (v: number) => `${v}%`, higherIsBetter: true },
                  { label: 'Bugs abertos', prev: prevBugsOpened.length, curr: currentBugsOpened.length, format: (v: number) => String(v), higherIsBetter: false },
                  { label: 'Bugs resolvidos', prev: prevBugsResolved.length, curr: currentBugsResolved.length, format: (v: number) => String(v), higherIsBetter: true },
                  { label: 'Cenários executados', prev: prevExecuted.length, curr: executedInPeriod.length, format: (v: number) => String(v), higherIsBetter: true },
                  { label: 'Taxa de reabertura', prev: prevReopenRate, curr: reopenRate, format: (v: number) => `${v}%`, higherIsBetter: false },
                  { label: 'Tempo médio de resolução', prev: prevAvgResolution, curr: avgResolutionCurrent, format: (v: number) => `${v}d`, higherIsBetter: false },
                ].map(row => (
                  <tr key={row.label} className="border-t border-white/[0.07]">
                    <td className="px-4 py-3 text-text">{row.label}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{row.format(row.prev)}</td>
                    <td className="px-4 py-3 text-right font-mono text-text font-medium">{row.format(row.curr)}</td>
                    <td className="px-4 py-3 text-right">
                      <Trend current={row.curr} previous={row.prev} higherIsBetter={row.higherIsBetter} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 — Top bugs */}
        <section className="bg-surface border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-base font-semibold text-text mb-4">Top Bugs do Período (Críticos e Altos)</h2>
          {topBugs.length === 0 ? (
            <p className="text-muted text-sm">Nenhum bug crítico ou alto aberto no período.</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/[0.07]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface2">
                    <th className="text-left px-4 py-3 text-muted font-medium">ID</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Título</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Área</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Épico</th>
                    <th className="text-left px-4 py-3 text-muted font-medium">Status</th>
                    <th className="text-right px-4 py-3 text-muted font-medium">Dias em aberto</th>
                  </tr>
                </thead>
                <tbody>
                  {topBugs.map(bug => {
                    const epic = state.epics.find(e => e.id === bug.epicId)
                    const days = differenceInDays(new Date(), new Date(bug.openedAt))
                    return (
                      <tr key={bug.id} className="border-t border-white/[0.07]">
                        <td className="px-4 py-3 font-mono text-muted text-xs">#{bug.id}</td>
                        <td className="px-4 py-3 text-text">{bug.title}</td>
                        <td className="px-4 py-3 text-muted">{bug.area || '—'}</td>
                        <td className="px-4 py-3 text-muted truncate max-w-[160px]">{epic?.name || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            bug.status === 'open' ? 'bg-red/20 text-red' :
                            bug.status === 'in_progress' ? 'bg-amber/20 text-amber' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {bug.status === 'open' ? 'Aberto' : bug.status === 'in_progress' ? 'Em progresso' : bug.status}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm font-medium ${days > 2 ? 'text-red' : 'text-muted'}`}>{days}d</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Section 4 — Coverage by epic */}
        <section className="bg-surface border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-base font-semibold text-text mb-4">Cobertura por Épico</h2>
          <div className="overflow-hidden rounded-lg border border-white/[0.07]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface2">
                  <th className="text-left px-4 py-3 text-muted font-medium">Épico</th>
                  <th className="text-right px-4 py-3 text-muted font-medium">Total cenários</th>
                  <th className="text-right px-4 py-3 text-muted font-medium">Executados</th>
                  <th className="text-right px-4 py-3 text-muted font-medium">Cobertura</th>
                  <th className="text-right px-4 py-3 text-muted font-medium">Bugs abertos</th>
                  <th className="text-left px-4 py-3 text-muted font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {coverageByEpic.map(({ epic, total, executed, coverage, openBugs }) => (
                  <tr key={epic.id} className="border-t border-white/[0.07]">
                    <td className="px-4 py-3 text-text">{epic.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted">{total}</td>
                    <td className="px-4 py-3 text-right font-mono text-text">{executed}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-mono font-medium text-sm ${coverage >= 70 ? 'text-green' : coverage >= 40 ? 'text-amber' : 'text-red'}`}>
                        {coverage}%
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${openBugs > 0 ? 'text-red' : 'text-muted'}`}>{openBugs}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        epic.status === 'running' ? 'bg-accent/20 text-accent' :
                        epic.status === 'done' ? 'bg-green/20 text-green' :
                        epic.status === 'blocked' ? 'bg-red/20 text-red' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {epic.status === 'running' ? 'Em execução' : epic.status === 'done' ? 'Concluído' : epic.status === 'blocked' ? 'Bloqueado' : epic.status === 'planning' ? 'Planejamento' : epic.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {coverageByEpic.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">Nenhum épico ativo</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 5 — Recommendations */}
        <section className="bg-surface border border-white/[0.07] rounded-xl p-6">
          <h2 className="text-base font-semibold text-text mb-4">Recomendações Automáticas</h2>
          <div className="flex flex-col gap-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 bg-amber/5 border border-amber/20 rounded-lg px-4 py-3">
                <AlertTriangle size={16} className="text-amber shrink-0 mt-0.5" />
                <p className="text-sm text-text/90 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
