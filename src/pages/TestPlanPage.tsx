import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, MessageSquare, Check, X, AlertTriangle,
  MinusCircle, SkipForward, Clock, Edit2, ChevronDown, Search,
  UserPlus, Users, ChevronRight,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PlanScenarioItem, TestPlan, Comment } from '../types'
import { Modal } from '../components/ui/Modal'

// ─── Status config ─────────────────────────────────────────────────────────────

type ExecStatus = PlanScenarioItem['status']

const STATUS_CONFIG: Record<ExecStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pendente',   color: 'text-muted bg-surface2',           icon: <Clock size={12} /> },
  passed:   { label: 'Passou',     color: 'text-green bg-green/10',            icon: <Check size={12} /> },
  failed:   { label: 'Falhou',     color: 'text-red bg-red/10',               icon: <X size={12} /> },
  blocked:  { label: 'Bloqueado',  color: 'text-yellow-400 bg-yellow-400/10', icon: <AlertTriangle size={12} /> },
  partial:  { label: 'Parcial',    color: 'text-orange-400 bg-orange-400/10', icon: <MinusCircle size={12} /> },
  skipped:  { label: 'Pulado',     color: 'text-gray-400 bg-gray-400/10',     icon: <SkipForward size={12} /> },
}

const PLAN_STATUS_LABELS: Record<TestPlan['status'], string> = {
  draft: 'Rascunho', active: 'Ativo', completed: 'Concluído', archived: 'Arquivado',
}

// ─── Assign Dropdown ───────────────────────────────────────────────────────────

function AssignDropdown({
  current,
  knownTesters,
  onAssign,
  onClose,
}: {
  current: string
  knownTesters: string[]
  onAssign: (name: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const filtered = knownTesters.filter(
    t => t !== current && (input === '' || t.toLowerCase().includes(input.toLowerCase()))
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      onAssign(input.trim())
      onClose()
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute z-50 top-full mt-1 right-0 w-52 bg-surface border border-white/[0.12] rounded-xl shadow-xl flex flex-col overflow-hidden"
    >
      <div className="p-2 border-b border-white/[0.07]">
        <input
          autoFocus
          className="w-full bg-surface2 rounded-lg px-2.5 py-1.5 text-xs text-text outline-none placeholder:text-muted"
          placeholder="Nome do testador..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      <div className="flex flex-col max-h-44 overflow-y-auto py-1">
        {current && (
          <button
            onClick={() => { onAssign(''); onClose() }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted hover:text-red hover:bg-surface2 transition-colors text-left"
          >
            <X size={11} />
            Remover atribuição
          </button>
        )}
        {filtered.length === 0 && !input && !current && (
          <p className="text-xs text-muted px-3 py-2">Nenhum testador cadastrado</p>
        )}
        {filtered.map(name => (
          <button
            key={name}
            onClick={() => { onAssign(name); onClose() }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-text hover:bg-surface2 transition-colors text-left"
          >
            <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">
              {name[0]?.toUpperCase()}
            </span>
            {name}
          </button>
        ))}
        {input.trim() && !knownTesters.includes(input.trim()) && (
          <button
            onClick={() => { onAssign(input.trim()); onClose() }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-accent hover:bg-surface2 transition-colors text-left"
          >
            <UserPlus size={11} />
            Atribuir a "{input.trim()}"
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Add Scenarios Modal ────────────────────────────────────────────────────────

function AddScenariosModal({
  planId, alreadyAdded, onClose,
}: {
  planId: string
  alreadyAdded: string[]
  onClose: () => void
}) {
  const { state, dispatch } = useApp()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const available = state.scenarios.filter(
    s =>
      !alreadyAdded.includes(s.id) &&
      (search === '' ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.area.toLowerCase().includes(search.toLowerCase()))
  )

  const epicMap = Object.fromEntries(state.epics.map(e => [e.id, e.name]))

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleAdd = () => {
    selected.forEach(scenarioId => {
      dispatch({
        type: 'EXECUTE_PLAN_SCENARIO',
        payload: {
          planId,
          item: { scenarioId, assignedTo: '', status: 'pending', notes: '' },
        },
      })
    })
    onClose()
  }

  return (
    <Modal title="Adicionar cenários ao plano" onClose={onClose} size="lg">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full bg-surface2 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Buscar cenário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1 max-h-80 overflow-y-auto">
          {available.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">
              {search ? 'Nenhum cenário encontrado' : 'Todos os cenários já foram adicionados'}
            </p>
          ) : (
            available.map(s => (
              <label
                key={s.id}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-surface2 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 accent-accent shrink-0"
                  checked={selected.has(s.id)}
                  onChange={() => toggle(s.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text leading-snug">{s.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {epicMap[s.epicId] ?? s.epicId} · {s.area}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs px-1.5 py-0.5 rounded capitalize ${
                    s.criticality === 'critical'
                      ? 'text-red bg-red/10'
                      : s.criticality === 'high'
                      ? 'text-orange-400 bg-orange-400/10'
                      : 'text-muted bg-surface2'
                  }`}
                >
                  {s.criticality}
                </span>
              </label>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.07] pt-3">
          <span className="text-xs text-muted">{selected.size} selecionado(s)</span>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Execute Modal ─────────────────────────────────────────────────────────────

function ExecuteModal({
  planId, item, scenarioTitle, onClose,
}: {
  planId: string
  item: PlanScenarioItem
  scenarioTitle: string
  onClose: () => void
}) {
  const { state, dispatch } = useApp()
  const [status, setStatus] = useState<ExecStatus>(item.status)
  const [notes, setNotes] = useState(item.notes ?? '')
  const [executedBy, setExecutedBy] = useState(item.assignedTo || state.settings.userName || '')

  const handleSave = () => {
    dispatch({
      type: 'EXECUTE_PLAN_SCENARIO',
      payload: {
        planId,
        item: {
          ...item,
          status,
          notes,
          assignedTo: item.assignedTo,
          executedAt: new Date().toISOString(),
          executedBy,
        },
      },
    })
    onClose()
  }

  const btnCls = (s: ExecStatus) =>
    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
      status === s
        ? `${STATUS_CONFIG[s].color} border-current`
        : 'text-muted border-white/[0.07] hover:border-white/20'
    }`

  return (
    <Modal title={`Executar: ${scenarioTitle}`} onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-muted mb-2">Resultado</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_CONFIG) as ExecStatus[]).map(s => (
              <button key={s} onClick={() => setStatus(s)} className={btnCls(s)}>
                {STATUS_CONFIG[s].icon}
                {STATUS_CONFIG[s].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Executado por</label>
          <input
            className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            value={executedBy}
            onChange={e => setExecutedBy(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Observações</label>
          <textarea
            className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent resize-none"
            rows={3}
            placeholder="Comportamento observado, erros, etc."
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          Salvar resultado
        </button>
      </div>
    </Modal>
  )
}

// ─── Edit Plan Modal ───────────────────────────────────────────────────────────

function EditPlanModal({ plan, onClose }: { plan: TestPlan; onClose: () => void }) {
  const { dispatch } = useApp()
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description,
    build: plan.build,
    environment: plan.environment,
    responsible: plan.responsible,
    startDate: plan.startDate,
    dueDate: plan.dueDate,
    status: plan.status,
  })

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSave = () => {
    dispatch({
      type: 'UPDATE_TEST_PLAN',
      payload: { ...plan, ...form, status: form.status as TestPlan['status'], updatedAt: new Date().toISOString() },
    })
    onClose()
  }

  const inputCls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  return (
    <Modal title="Editar plano" onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Nome *</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Descrição</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Build / Versão</label>
            <input className={inputCls} value={form.build} onChange={e => set('build', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Ambiente</label>
            <input className={inputCls} value={form.environment} onChange={e => set('environment', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Início</label>
            <input type="date" className={inputCls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Prazo</label>
            <input type="date" className={inputCls} value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Responsável</label>
            <input className={inputCls} value={form.responsible} onChange={e => set('responsible', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Status</label>
            <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
              {(Object.keys(PLAN_STATUS_LABELS) as TestPlan['status'][]).map(s => (
                <option key={s} value={s}>{PLAN_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!form.name.trim()}
          className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
    </Modal>
  )
}

// ─── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-xl px-4 py-3 flex flex-col gap-1 min-w-0">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

// ─── Assignee avatar chip ──────────────────────────────────────────────────────

function AssigneeChip({ name, onClick }: { name: string; onClick: () => void }) {
  if (!name) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors px-1.5 py-0.5 rounded hover:bg-surface2"
      >
        <UserPlus size={11} />
        Atribuir
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs text-text hover:bg-surface2 px-1.5 py-0.5 rounded transition-colors"
      title={`Atribuído a ${name} — clique para reatribuir`}
    >
      <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold shrink-0">
        {name[0]?.toUpperCase()}
      </span>
      <span className="max-w-[80px] truncate">{name}</span>
    </button>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function TestPlanPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, dispatch } = useApp()

  const plan = (state.testPlans ?? []).find(p => p.id === id)

  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [executing, setExecuting] = useState<PlanScenarioItem | null>(null)
  const [commentText, setCommentText] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Assignment state
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkInput, setBulkInput] = useState('')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

  if (!plan) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted">
        <p>Plano não encontrado.</p>
        <button onClick={() => navigate('/test-plans')} className="text-accent text-sm hover:underline">
          Voltar para planos
        </button>
      </div>
    )
  }

  // KPIs
  const counts: Record<ExecStatus, number> = {
    pending: 0, passed: 0, failed: 0, blocked: 0, partial: 0, skipped: 0,
  }
  plan.scenarios.forEach(s => { counts[s.status] = (counts[s.status] ?? 0) + 1 })
  const total = plan.scenarios.length
  const done = total - counts.pending
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const scenarioMap = Object.fromEntries(state.scenarios.map(s => [s.id, s]))

  // Known testers = unique assignedTo values + current user
  const knownTesters = useMemo(() => {
    const names = new Set<string>()
    if (state.settings.userName) names.add(state.settings.userName)
    plan.scenarios.forEach(s => { if (s.assignedTo) names.add(s.assignedTo) })
    return [...names].sort()
  }, [plan.scenarios, state.settings.userName])

  // Filtered scenario list
  const visibleScenarios = filterAssignee === 'all'
    ? plan.scenarios
    : filterAssignee === '__unassigned__'
      ? plan.scenarios.filter(s => !s.assignedTo)
      : plan.scenarios.filter(s => s.assignedTo === filterAssignee)

  // Selection helpers
  const allVisibleSelected = visibleScenarios.length > 0 &&
    visibleScenarios.every(s => selectedIds.has(s.scenarioId))

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleScenarios.forEach(s => next.delete(s.scenarioId))
        return next
      })
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev)
        visibleScenarios.forEach(s => next.add(s.scenarioId))
        return next
      })
    }
  }

  const toggleOne = (scenarioId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(scenarioId) ? next.delete(scenarioId) : next.add(scenarioId)
      return next
    })
  }

  // Assign a single scenario
  const assignOne = (item: PlanScenarioItem, name: string) => {
    dispatch({
      type: 'EXECUTE_PLAN_SCENARIO',
      payload: { planId: plan.id, item: { ...item, assignedTo: name } },
    })
  }

  // Bulk assign selected
  const handleBulkAssign = (name: string) => {
    if (!name.trim()) return
    selectedIds.forEach(scenarioId => {
      const item = plan.scenarios.find(s => s.scenarioId === scenarioId)
      if (item) {
        dispatch({
          type: 'EXECUTE_PLAN_SCENARIO',
          payload: { planId: plan.id, item: { ...item, assignedTo: name.trim() } },
        })
      }
    })
    setSelectedIds(new Set())
    setBulkInput('')
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    const comment: Comment = {
      id: Date.now().toString(),
      text: commentText.trim(),
      author: state.settings.userName || 'Anônimo',
      createdAt: new Date().toISOString(),
    }
    dispatch({ type: 'ADD_PLAN_COMMENT', payload: { planId: plan.id, comment } })
    setCommentText('')
  }

  const handleDeletePlan = () => {
    dispatch({ type: 'DELETE_TEST_PLAN', payload: plan.id })
    navigate('/test-plans')
  }

  const handleRemoveScenario = (scenarioId: string) => {
    dispatch({
      type: 'UPDATE_TEST_PLAN',
      payload: {
        ...plan,
        scenarios: plan.scenarios.filter(s => s.scenarioId !== scenarioId),
        updatedAt: new Date().toISOString(),
      },
    })
    setSelectedIds(prev => { const next = new Set(prev); next.delete(scenarioId); return next })
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/test-plans')}
          className="mt-0.5 p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-text">{plan.name}</h1>
            <span className="text-xs text-muted bg-surface2 px-2 py-0.5 rounded-full">
              {PLAN_STATUS_LABELS[plan.status]}
            </span>
          </div>
          {plan.description && (
            <p className="text-sm text-muted mt-0.5">{plan.description}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted">
            {plan.build && <span>Build: <span className="text-text">{plan.build}</span></span>}
            {plan.environment && <span>Ambiente: <span className="text-text">{plan.environment}</span></span>}
            {plan.responsible && <span>Responsável: <span className="text-text">{plan.responsible}</span></span>}
            {plan.dueDate && <span>Prazo: <span className="text-text">{plan.dueDate}</span></span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface2 border border-white/[0.07] rounded-lg text-sm text-muted hover:text-text transition-colors"
          >
            <Edit2 size={13} />
            Editar
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface2 border border-white/[0.07] rounded-lg text-sm text-muted hover:text-red transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <KpiCard label="Total"     value={total}          color="text-text" />
        <KpiCard label="Passou"    value={counts.passed}  color="text-green" />
        <KpiCard label="Falhou"    value={counts.failed}  color="text-red" />
        <KpiCard label="Bloqueado" value={counts.blocked} color="text-yellow-400" />
        <KpiCard label="Parcial"   value={counts.partial} color="text-orange-400" />
        <KpiCard label="Pendente"  value={counts.pending} color="text-muted" />
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-muted">
          <span>{done} de {total} executados</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-surface2 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Scenarios section */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">

        {/* Section header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-text">Cenários</h2>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Assignee filter */}
            {knownTesters.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-muted shrink-0" />
                <select
                  className="bg-surface2 border border-white/[0.07] rounded-lg px-2 py-1 text-xs text-text outline-none focus:border-accent"
                  value={filterAssignee}
                  onChange={e => { setFilterAssignee(e.target.value); setSelectedIds(new Set()) }}
                >
                  <option value="all">Todos</option>
                  <option value="__unassigned__">Não atribuídos</option>
                  {knownTesters.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/80 transition-colors"
            >
              <Plus size={13} />
              Adicionar
            </button>
          </div>
        </div>

        {/* Bulk assignment toolbar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-accent/10 border-b border-accent/20 flex-wrap">
            <span className="text-xs font-medium text-accent">
              {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <UserPlus size={13} className="text-accent shrink-0" />
              <input
                className="flex-1 min-w-0 bg-surface2 border border-white/[0.07] rounded-lg px-2.5 py-1 text-xs text-text outline-none focus:border-accent"
                placeholder="Nome do testador..."
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleBulkAssign(bulkInput) }}
                list="testers-datalist"
              />
              <datalist id="testers-datalist">
                {knownTesters.map(t => <option key={t} value={t} />)}
              </datalist>
              <button
                onClick={() => handleBulkAssign(bulkInput)}
                disabled={!bulkInput.trim()}
                className="px-3 py-1 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                Atribuir
              </button>
            </div>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-muted hover:text-text transition-colors shrink-0"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Scenario rows */}
        {plan.scenarios.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted">
            <p className="text-sm">Nenhum cenário adicionado ainda</p>
            <button onClick={() => setShowAdd(true)} className="text-accent text-xs hover:underline">
              Adicionar cenários
            </button>
          </div>
        ) : visibleScenarios.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">Nenhum cenário para este filtro</p>
        ) : (
          <>
            {/* Select-all row */}
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/[0.04] bg-surface2/30">
              <input
                type="checkbox"
                className="accent-accent shrink-0"
                checked={allVisibleSelected}
                onChange={toggleAll}
              />
              <span className="text-xs text-muted">Selecionar todos</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {visibleScenarios.map(item => {
                const scenario = scenarioMap[item.scenarioId]
                const cfg = STATUS_CONFIG[item.status]
                const isSelected = selectedIds.has(item.scenarioId)

                return (
                  <div
                    key={item.scenarioId}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors group ${
                      isSelected ? 'bg-accent/5' : 'hover:bg-surface2/50'
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      className="accent-accent shrink-0"
                      checked={isSelected}
                      onChange={() => toggleOne(item.scenarioId)}
                    />

                    {/* Status badge */}
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}>
                      {cfg.icon}
                      {cfg.label}
                    </span>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text truncate">
                        {scenario?.title ?? `Cenário ${item.scenarioId}`}
                      </p>
                      {scenario && (
                        <p className="text-xs text-muted mt-0.5 truncate">
                          {scenario.area}
                          {item.executedBy && ` · executado por ${item.executedBy}`}
                          {item.notes && ` · ${item.notes}`}
                        </p>
                      )}
                    </div>

                    {/* Assignee chip */}
                    <div className="relative shrink-0">
                      <AssigneeChip
                        name={item.assignedTo}
                        onClick={() => setAssigningId(
                          assigningId === item.scenarioId ? null : item.scenarioId
                        )}
                      />
                      {assigningId === item.scenarioId && (
                        <AssignDropdown
                          current={item.assignedTo}
                          knownTesters={knownTesters}
                          onAssign={name => assignOne(item, name)}
                          onClose={() => setAssigningId(null)}
                        />
                      )}
                    </div>

                    {/* Execute / delete */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setExecuting(item)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-colors"
                      >
                        <ChevronDown size={12} />
                        Executar
                      </button>
                      <button
                        onClick={() => handleRemoveScenario(item.scenarioId)}
                        className="p-1.5 text-muted hover:text-red rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Testers summary */}
      {knownTesters.length > 0 && (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-muted" />
            <h2 className="text-sm font-semibold text-text">Testadores</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {knownTesters.map(tester => {
              const assigned = plan.scenarios.filter(s => s.assignedTo === tester)
              const passedCount = assigned.filter(s => s.status === 'passed').length
              const pendingCount = assigned.filter(s => s.status === 'pending').length
              return (
                <button
                  key={tester}
                  onClick={() => setFilterAssignee(filterAssignee === tester ? 'all' : tester)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors ${
                    filterAssignee === tester
                      ? 'border-accent/40 bg-accent/10'
                      : 'border-white/[0.07] bg-surface2 hover:border-accent/20'
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                    {tester[0]?.toUpperCase()}
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-medium text-text">{tester}</p>
                    <p className="text-[10px] text-muted">
                      {assigned.length} cenário{assigned.length !== 1 ? 's' : ''}
                      {pendingCount > 0 && ` · ${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}`}
                      {passedCount > 0 && ` · ${passedCount} passou`}
                    </p>
                  </div>
                  <ChevronRight size={12} className="text-muted ml-1" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07]">
          <MessageSquare size={14} className="text-muted" />
          <h2 className="text-sm font-semibold text-text">Comentários</h2>
          <span className="text-xs text-muted">({plan.comments?.length ?? 0})</span>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {(plan.comments ?? []).length > 0 && (
            <div className="flex flex-col gap-3">
              {plan.comments.map(c => (
                <div key={c.id} className="flex gap-3 group">
                  <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold shrink-0">
                    {c.author[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text">{c.author}</span>
                      <span className="text-xs text-muted">
                        {new Date(c.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-sm text-text/80 mt-0.5 whitespace-pre-wrap">{c.text}</p>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_PLAN_COMMENT', payload: { planId: plan.id, commentId: c.id } })}
                    className="p-1 text-muted hover:text-red opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <textarea
              className="flex-1 bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent resize-none"
              rows={2}
              placeholder="Adicionar comentário..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment() }}
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="px-3 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed self-end"
            >
              <Check size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAdd && (
        <AddScenariosModal
          planId={plan.id}
          alreadyAdded={plan.scenarios.map(s => s.scenarioId)}
          onClose={() => setShowAdd(false)}
        />
      )}
      {showEdit && <EditPlanModal plan={plan} onClose={() => setShowEdit(false)} />}
      {executing && (
        <ExecuteModal
          planId={plan.id}
          item={executing}
          scenarioTitle={scenarioMap[executing.scenarioId]?.title ?? executing.scenarioId}
          onClose={() => setExecuting(null)}
        />
      )}
      {showDeleteConfirm && (
        <Modal title="Excluir plano" onClose={() => setShowDeleteConfirm(false)} size="sm">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text">
              Tem certeza que deseja excluir o plano <strong>{plan.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 bg-surface2 border border-white/[0.07] rounded-lg text-sm text-text hover:border-white/20 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeletePlan}
                className="flex-1 py-2 bg-red/80 text-white rounded-lg text-sm font-medium hover:bg-red transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
