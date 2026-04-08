import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Copy, Archive, Trash2, ExternalLink, Layers, Bug, CheckCircle, Calendar } from 'lucide-react'
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useApp } from '../context/AppContext'
import { Epic } from '../types'
import { EpicStatusBadge, PriorityBadge } from '../components/ui/Badge'
import { KpiCard } from '../components/ui/KpiCard'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'

const emptyEpic: Omit<Epic, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  description: '',
  squad: '',
  product: '',
  status: 'planning',
  priority: 'medium',
  startDate: '',
  deadline: '',
}

function EpicModal({ epic, onClose }: { epic?: Epic; onClose: () => void }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [form, setForm] = useState<Omit<Epic, 'id' | 'createdAt' | 'updatedAt'>>(
    epic ? {
      name: epic.name,
      description: epic.description,
      squad: epic.squad,
      product: epic.product,
      status: epic.status,
      priority: epic.priority,
      startDate: epic.startDate,
      deadline: epic.deadline,
    } : { ...emptyEpic }
  )

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    if (!form.name.trim()) { toast('Nome é obrigatório', 'error'); return }
    const now = new Date().toISOString()
    if (epic) {
      dispatch({ type: 'UPDATE_EPIC', payload: { ...epic, ...form, updatedAt: now } })
      toast('Épico atualizado', 'success')
    } else {
      const id = String(state.nextEpicId).padStart(4, '0')
      dispatch({ type: 'ADD_EPIC', payload: { ...form, id, createdAt: now, updatedAt: now } })
      toast('Épico criado', 'success')
    }
    onClose()
  }

  const inputCls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'
  const labelCls = 'block text-xs text-muted mb-1.5'

  return (
    <Modal title={epic ? 'Editar Épico' : 'Novo Épico'} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Nome *</label>
          <input className={inputCls} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome do épico" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Descrição</label>
          <textarea className={inputCls + ' resize-none'} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descreva o épico" />
        </div>
        <div>
          <label className={labelCls}>Squad</label>
          <input className={inputCls} value={form.squad} onChange={e => set('squad', e.target.value)} placeholder="Nome do squad" />
        </div>
        <div>
          <label className={labelCls}>Produto</label>
          <input className={inputCls} value={form.product} onChange={e => set('product', e.target.value)} placeholder="Nome do produto" />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="planning">Planejamento</option>
            <option value="running">Em execução</option>
            <option value="blocked">Bloqueado</option>
            <option value="done">Concluído</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Prioridade</label>
          <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Data de início</label>
          <input type="date" className={inputCls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Prazo</label>
          <input type="date" className={inputCls} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-text transition-colors">Cancelar</button>
        <button onClick={save} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors">
          {epic ? 'Salvar' : 'Criar Épico'}
        </button>
      </div>
    </Modal>
  )
}

function EpicCard({ epic }: { epic: Epic }) {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)

  const epicScenarios = state.scenarios.filter(s => s.epicId === epic.id)
  const total = epicScenarios.length
  const passedScenarios = epicScenarios.filter(s => s.status === 'passed').length
  const failedScenarios = epicScenarios.filter(s => s.status === 'failed').length
  const partialScenarios = epicScenarios.filter(s => s.status === 'partial').length
  const blockedScenarios = epicScenarios.filter(s => s.status === 'blocked').length
  const pendingScenarios = epicScenarios.filter(s => s.status === 'pending').length
  const executedScenarios = total - pendingScenarios
  const openBugs = state.bugs.filter(b => b.epicId === epic.id && ['open', 'in_progress', 'reopened'].includes(b.status)).length
  const successRate = total === 0 ? 0 : Math.round((passedScenarios / total) * 100)

  const deadline = epic.deadline ? new Date(epic.deadline) : null
  const isPastDeadline = deadline && isPast(deadline)
  const daysUntilDeadline = deadline ? differenceInDays(deadline, new Date()) : null

  const deadlineColor = isPastDeadline ? 'text-red' : (daysUntilDeadline !== null && daysUntilDeadline < 7) ? 'text-amber' : 'text-muted'

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'UPDATE_EPIC', payload: { ...epic, status: 'archived', updatedAt: new Date().toISOString() } })
    toast('Épico arquivado', 'success')
  }

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch({ type: 'DUPLICATE_EPIC', payload: epic.id })
    toast('Épico duplicado', 'success')
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Excluir épico "${epic.name}"? Esta ação não pode ser desfeita.`)) {
      dispatch({ type: 'DELETE_EPIC', payload: epic.id })
      toast('Épico excluído', 'success')
    }
  }

  return (
    <>
      <div
        className="bg-surface border border-white/[0.07] rounded-xl p-5 flex flex-col gap-4 cursor-pointer hover:border-accent/30 transition-all relative group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => navigate(`/epic/${epic.id}`)}
      >
        {/* Hover actions */}
        {hovered && (
          <div className="absolute top-3 right-3 flex gap-1 z-10" onClick={e => e.stopPropagation()}>
            <button onClick={() => { setEditing(true) }} className="p-1.5 rounded-lg bg-surface2 hover:bg-surface border border-white/[0.07] text-muted hover:text-text transition-colors" title="Abrir">
              <ExternalLink size={13} />
            </button>
            <button onClick={handleDuplicate} className="p-1.5 rounded-lg bg-surface2 hover:bg-surface border border-white/[0.07] text-muted hover:text-text transition-colors" title="Duplicar">
              <Copy size={13} />
            </button>
            <button onClick={handleArchive} className="p-1.5 rounded-lg bg-surface2 hover:bg-surface border border-white/[0.07] text-muted hover:text-text transition-colors" title="Arquivar">
              <Archive size={13} />
            </button>
            <button onClick={handleDelete} className="p-1.5 rounded-lg bg-surface2 hover:bg-surface border border-white/[0.07] text-red hover:text-red transition-colors" title="Excluir">
              <Trash2 size={13} />
            </button>
          </div>
        )}

        {/* Header */}
        <div>
          <div className="flex items-start gap-2 mb-1 pr-20">
            <h3 className="text-sm font-semibold text-text leading-snug line-clamp-2">{epic.name}</h3>
          </div>
          <p className="text-xs text-muted">{epic.product} · {epic.squad}</p>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          <EpicStatusBadge status={epic.status} />
          <PriorityBadge priority={epic.priority} />
        </div>

        {/* Segmented progress bar */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted">{executedScenarios}/{total} executados</span>
            <span className="text-xs font-medium text-text">{successRate}% passou</span>
          </div>
          <div className="w-full h-2 bg-surface2 rounded-full overflow-hidden flex">
            {total > 0 && (<>
              <div className="bg-green h-full transition-all duration-300" style={{ width: `${(passedScenarios / total) * 100}%` }} title={`${passedScenarios} passou`} />
              <div className="bg-red h-full transition-all duration-300" style={{ width: `${(failedScenarios / total) * 100}%` }} title={`${failedScenarios} falhou`} />
              <div className="bg-purple h-full transition-all duration-300" style={{ width: `${(partialScenarios / total) * 100}%` }} title={`${partialScenarios} parcial`} />
              <div className="bg-amber h-full transition-all duration-300" style={{ width: `${(blockedScenarios / total) * 100}%` }} title={`${blockedScenarios} bloqueado`} />
            </>)}
          </div>
        </div>

        {/* Counters */}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1 text-muted">
            <Layers size={11} />
            {total} cenários
          </span>
          <span className="flex items-center gap-1 text-muted">
            <Bug size={11} />
            {openBugs} bugs
          </span>
          {failedScenarios > 0 && (
            <span className="flex items-center gap-1 text-red font-medium">
              <CheckCircle size={11} />
              {failedScenarios} falhou
            </span>
          )}
          {blockedScenarios > 0 && (
            <span className="flex items-center gap-1 text-amber font-medium">
              <CheckCircle size={11} />
              {blockedScenarios} bloqueado
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.04]">
          {deadline ? (
            <span className={`flex items-center gap-1 ${deadlineColor}`}>
              <Calendar size={11} />
              {format(deadline, 'dd/MM/yyyy')}
              {isPastDeadline ? ' (atrasado)' : daysUntilDeadline !== null && daysUntilDeadline < 7 ? ` (${daysUntilDeadline}d)` : ''}
            </span>
          ) : <span />}
          <span className="text-muted">
            {formatDistanceToNow(new Date(epic.updatedAt), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
      </div>
      {editing && <EpicModal epic={epic} onClose={() => setEditing(false)} />}
    </>
  )
}

export default function Home() {
  const { state } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const totalActive = state.epics.filter(e => ['running', 'planning', 'blocked'].includes(e.status)).length
  const totalScenarios = state.scenarios.length
  const criticalBugs = state.bugs.filter(b => b.severity === 'critical' && ['open', 'in_progress', 'reopened'].includes(b.status)).length
  const passedScenarios = state.scenarios.filter(s => s.status === 'passed').length
  const successRate = state.scenarios.length === 0 ? 0 : Math.round((passedScenarios / state.scenarios.length) * 100)

  const filtered = state.epics.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false
    if (priorityFilter !== 'all' && e.priority !== priorityFilter) return false
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.product.toLowerCase().includes(search.toLowerCase()) && !e.squad.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const selectCls = 'bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">Épicos</h1>
          <p className="text-sm text-muted mt-0.5">Gerencie todos os épicos de teste</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          <Plus size={16} />
          Novo Épico
        </button>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={Layers} label="Épicos Ativos" value={totalActive} />
        <KpiCard icon={CheckCircle} label="Cenários Totais" value={totalScenarios} iconColor="text-green" />
        <KpiCard icon={Bug} label="Bugs Críticos Abertos" value={criticalBugs} iconColor="text-red" />
        <KpiCard icon={CheckCircle} label="Taxa de Sucesso" value={`${successRate}%`} iconColor="text-purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full bg-surface2 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Buscar épicos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Todos os status</option>
          <option value="planning">Planejamento</option>
          <option value="running">Em execução</option>
          <option value="blocked">Bloqueado</option>
          <option value="done">Concluído</option>
          <option value="archived">Arquivado</option>
        </select>
        <select className={selectCls} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="all">Todas as prioridades</option>
          <option value="critical">Crítica</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum épico encontrado"
          description={state.epics.length === 0 ? 'Crie seu primeiro épico para começar a gerenciar os testes.' : 'Tente ajustar os filtros de busca.'}
          action={state.epics.length === 0 ? { label: 'Criar Épico', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(e => <EpicCard key={e.id} epic={e} />)}
        </div>
      )}

      {showCreate && <EpicModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
