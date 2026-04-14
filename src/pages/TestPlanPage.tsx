import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Trash2, MessageSquare, Check, X, AlertTriangle,
  MinusCircle, SkipForward, Clock, Edit2, ChevronDown, Search
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { PlanScenarioItem, TestPlan, Comment } from '../types'
import { Modal } from '../components/ui/Modal'

// ─── Status config ─────────────────────────────────────────────────────────────

type ExecStatus = PlanScenarioItem['status']

const STATUS_CONFIG: Record<ExecStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'Pendente', color: 'text-muted bg-surface2', icon: <Clock size={12} /> },
  passed:   { label: 'Passou', color: 'text-green bg-green/10', icon: <Check size={12} /> },
  failed:   { label: 'Falhou', color: 'text-red bg-red/10', icon: <X size={12} /> },
  blocked:  { label: 'Bloqueado', color: 'text-yellow-400 bg-yellow-400/10', icon: <AlertTriangle size={12} /> },
  partial:  { label: 'Parcial', color: 'text-orange-400 bg-orange-400/10', icon: <MinusCircle size={12} /> },
  skipped:  { label: 'Pulado', color: 'text-gray-400 bg-gray-400/10', icon: <SkipForward size={12} /> },
}

const PLAN_STATUS_LABELS: Record<TestPlan['status'], string> = {
  draft: 'Rascunho', active: 'Ativo', completed: 'Concluído', archived: 'Arquivado',
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

  // Group by epic
  const epicMap = Object.fromEntries(state.epics.map(e => [e.id, e.name]))

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleAdd = () => {
    selected.forEach(scenarioId => {
      const item: PlanScenarioItem = {
        scenarioId,
        assignedTo: '',
        status: 'pending',
        notes: '',
      }
      dispatch({ type: 'EXECUTE_PLAN_SCENARIO', payload: { planId, item } })
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

// ─── Execute Row Modal ─────────────────────────────────────────────────────────

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
  const [assignedTo, setAssignedTo] = useState(item.assignedTo ?? state.settings.userName ?? '')

  const handleSave = () => {
    dispatch({
      type: 'EXECUTE_PLAN_SCENARIO',
      payload: {
        planId,
        item: {
          ...item,
          status,
          notes,
          assignedTo,
          executedAt: new Date().toISOString(),
          executedBy: assignedTo,
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
            value={assignedTo}
            onChange={e => setAssignedTo(e.target.value)}
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

  // Build KPIs
  const counts: Record<ExecStatus, number> = {
    pending: 0, passed: 0, failed: 0, blocked: 0, partial: 0, skipped: 0,
  }
  plan.scenarios.forEach(s => { counts[s.status] = (counts[s.status] ?? 0) + 1 })
  const total = plan.scenarios.length
  const done = total - counts.pending
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  // Enrich scenario items with title
  const scenarioMap = Object.fromEntries(state.scenarios.map(s => [s.id, s]))

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
    const updated: TestPlan = {
      ...plan,
      scenarios: plan.scenarios.filter(s => s.scenarioId !== scenarioId),
      updatedAt: new Date().toISOString(),
    }
    dispatch({ type: 'UPDATE_TEST_PLAN', payload: updated })
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
        <KpiCard label="Total" value={total} color="text-text" />
        <KpiCard label="Passou" value={counts.passed} color="text-green" />
        <KpiCard label="Falhou" value={counts.failed} color="text-red" />
        <KpiCard label="Bloqueado" value={counts.blocked} color="text-yellow-400" />
        <KpiCard label="Parcial" value={counts.partial} color="text-orange-400" />
        <KpiCard label="Pendente" value={counts.pending} color="text-muted" />
      </div>

      {/* Progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs text-muted">
          <span>{done} de {total} executados</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 bg-surface2 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Scenarios section */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07]">
          <h2 className="text-sm font-semibold text-text">Cenários</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/80 transition-colors"
          >
            <Plus size={13} />
            Adicionar cenários
          </button>
        </div>

        {plan.scenarios.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-muted">
            <p className="text-sm">Nenhum cenário adicionado ainda</p>
            <button onClick={() => setShowAdd(true)} className="text-accent text-xs hover:underline">
              Adicionar cenários
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {plan.scenarios.map(item => {
              const scenario = scenarioMap[item.scenarioId]
              const cfg = STATUS_CONFIG[item.status]
              return (
                <div
                  key={item.scenarioId}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-surface2/50 transition-colors group"
                >
                  {/* Status badge */}
                  <span
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.color}`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </span>

                  {/* Title */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">
                      {scenario?.title ?? `Cenário ${item.scenarioId}`}
                    </p>
                    {scenario && (
                      <p className="text-xs text-muted mt-0.5">
                        {scenario.area}
                        {item.executedBy && ` · por ${item.executedBy}`}
                        {item.notes && ` · ${item.notes}`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
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
        )}
      </div>

      {/* Comments */}
      <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07]">
          <MessageSquare size={14} className="text-muted" />
          <h2 className="text-sm font-semibold text-text">Comentários</h2>
          <span className="text-xs text-muted">({plan.comments?.length ?? 0})</span>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Comment list */}
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

          {/* New comment */}
          <div className="flex gap-2">
            <textarea
              className="flex-1 bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent resize-none"
              rows={2}
              placeholder="Adicionar comentário..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddComment()
              }}
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
