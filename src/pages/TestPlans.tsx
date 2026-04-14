import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ClipboardList, Calendar, User, Layers, ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { TestPlan } from '../types'
import { Modal } from '../components/ui/Modal'

const STATUS_LABELS: Record<TestPlan['status'], string> = {
  draft: 'Rascunho',
  active: 'Ativo',
  completed: 'Concluído',
  archived: 'Arquivado',
}

const STATUS_COLORS: Record<TestPlan['status'], string> = {
  draft: 'text-gray-400 bg-gray-400/10',
  active: 'text-accent bg-accent/10',
  completed: 'text-green bg-green/10',
  archived: 'text-muted bg-surface2',
}

const FILTER_TABS: Array<{ key: 'all' | TestPlan['status']; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'draft', label: 'Rascunho' },
  { key: 'active', label: 'Ativo' },
  { key: 'completed', label: 'Concluído' },
  { key: 'archived', label: 'Arquivado' },
]

function CreatePlanModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    description: '',
    build: '',
    environment: '',
    responsible: state.settings.userName ?? '',
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
  })

  const set = (field: string, value: string) =>
    setForm(f => ({ ...f, [field]: value }))

  const handleCreate = () => {
    if (!form.name.trim()) return
    const id = String(state.nextTestPlanId ?? 1).padStart(4, '0')
    const now = new Date().toISOString()
    const plan: TestPlan = {
      id,
      name: form.name.trim(),
      description: form.description.trim(),
      build: form.build.trim(),
      environment: form.environment.trim(),
      status: 'draft',
      responsible: form.responsible.trim(),
      startDate: form.startDate,
      dueDate: form.dueDate,
      scenarios: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
    }
    dispatch({ type: 'ADD_TEST_PLAN', payload: plan })
    onClose()
    navigate(`/test-plan/${id}`)
  }

  const inputCls =
    'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  return (
    <Modal title="Novo Plano de Teste" onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Nome do plano *</label>
          <input
            className={inputCls}
            placeholder="Ex: Sprint 12 – Regressão"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Descrição</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={2}
            placeholder="Objetivo e escopo do plano"
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Build / Versão</label>
            <input
              className={inputCls}
              placeholder="1.4.2"
              value={form.build}
              onChange={e => set('build', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Ambiente</label>
            <input
              className={inputCls}
              placeholder="Staging / QA"
              value={form.environment}
              onChange={e => set('environment', e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted mb-1.5">Início</label>
            <input
              type="date"
              className={inputCls}
              value={form.startDate}
              onChange={e => set('startDate', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Prazo</label>
            <input
              type="date"
              className={inputCls}
              value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Responsável</label>
          <input
            className={inputCls}
            value={form.responsible}
            onChange={e => set('responsible', e.target.value)}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!form.name.trim()}
          className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Criar plano
        </button>
      </div>
    </Modal>
  )
}

function planProgress(plan: TestPlan) {
  const total = plan.scenarios.length
  if (total === 0) return { total: 0, done: 0, pct: 0 }
  const done = plan.scenarios.filter(s => s.status !== 'pending').length
  return { total, done, pct: Math.round((done / total) * 100) }
}

export default function TestPlans() {
  const { state } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | TestPlan['status']>('all')
  const [showCreate, setShowCreate] = useState(false)

  const plans = (state.testPlans ?? []).filter(
    p => filter === 'all' || p.status === filter
  )

  const tabCls = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'
    }`

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text">Planos de Teste</h1>
          <p className="text-sm text-muted mt-0.5">Organize execuções por build ou sprint</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          <Plus size={15} />
          Novo plano
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={tabCls(filter === tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted">
          <ClipboardList size={40} strokeWidth={1.2} />
          <p className="text-sm">Nenhum plano de teste encontrado</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-accent text-sm hover:underline"
          >
            Criar o primeiro plano
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => {
            const { total, done, pct } = planProgress(plan)
            return (
              <button
                key={plan.id}
                onClick={() => navigate(`/test-plan/${plan.id}`)}
                className="flex flex-col gap-3 bg-surface border border-white/[0.07] rounded-xl p-4 text-left hover:border-accent/40 transition-colors group"
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-text leading-snug line-clamp-2 flex-1">
                    {plan.name}
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[plan.status]
                    }`}
                  >
                    {STATUS_LABELS[plan.status]}
                  </span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {plan.build && (
                    <span className="text-xs text-muted bg-surface2 px-2 py-0.5 rounded">
                      v{plan.build}
                    </span>
                  )}
                  {plan.environment && (
                    <span className="text-xs text-muted bg-surface2 px-2 py-0.5 rounded">
                      {plan.environment}
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Layers size={11} />
                      {done}/{total} cenários
                    </span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-muted pt-1 border-t border-white/[0.05]">
                  <span className="flex items-center gap-1">
                    <User size={11} />
                    {plan.responsible || '—'}
                  </span>
                  {plan.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {plan.dueDate}
                    </span>
                  )}
                  <ChevronRight
                    size={13}
                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                  />
                </div>
              </button>
            )
          })}
        </div>
      )}

      {showCreate && <CreatePlanModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
