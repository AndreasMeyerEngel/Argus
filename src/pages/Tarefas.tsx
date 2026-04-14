import React, { useState } from 'react'
import { Plus, Pencil, Trash2, ClipboardList, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useApp } from '../context/AppContext'
import { EpicTask } from '../types'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'

// ─── Form Modal ───────────────────────────────────────────────────────────────

function TaskFormModal({ task, onClose }: { task?: EpicTask; onClose: () => void }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [name, setName] = useState(task?.name ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')

  const save = () => {
    if (!name.trim()) { toast('Nome é obrigatório', 'error'); return }
    const now = new Date().toISOString()
    if (task) {
      dispatch({ type: 'UPDATE_TASK', payload: { ...task, name, description, notes } })
      toast('Tarefa atualizada', 'success')
    } else {
      const freeTasks = (state.tasks ?? []).filter(t => !t.epicId)
      const id = String(state.nextTaskId ?? 1).padStart(4, '0')
      dispatch({
        type: 'ADD_TASK',
        payload: { id, name, description, notes, order: freeTasks.length + 1, createdAt: now }
      })
      toast('Tarefa criada', 'success')
    }
    onClose()
  }

  const inputCls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  return (
    <Modal title={task ? 'Editar Tarefa' : 'Nova Tarefa'} onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Nome *</label>
          <input
            className={inputCls}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Verificar integração de pagamentos"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Descrição</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição da tarefa"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Observações / Riscos / Impedimentos</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={4}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex: Aguardando alinhamento com o dev. Risco: mudança de contrato da API."
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-text">Cancelar</button>
          <button onClick={save} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80">
            {task ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({ task }: { task: EpicTask }) {
  const { dispatch } = useApp()
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)

  const handleDelete = () => {
    if (confirm(`Excluir tarefa "${task.name}"? Esta ação não pode ser desfeita.`)) {
      dispatch({ type: 'DELETE_TASK', payload: task.id })
      toast('Tarefa excluída', 'success')
    }
  }

  const hasNotes = !!task.notes?.trim()
  const hasDescription = !!task.description?.trim()
  const hasDetails = hasNotes || hasDescription

  return (
    <>
      <div className={`rounded-xl overflow-hidden border ${hasNotes ? 'bg-amber/[0.03] border-amber/30' : 'bg-surface border-white/[0.07]'}`}>
        {/* Header row */}
        <div className={`flex items-center gap-3 px-4 py-3 ${hasNotes ? 'bg-amber/[0.06]' : 'bg-surface2/60'}`}>
          <button
            onClick={() => hasDetails && setExpanded(v => !v)}
            className={`text-muted transition-colors shrink-0 ${hasDetails ? 'hover:text-text' : 'opacity-0 pointer-events-none'}`}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-text">{task.name}</span>
              {hasNotes && (
                <span className="flex items-center gap-1 text-xs text-amber">
                  <AlertTriangle size={11} />
                  observações
                </span>
              )}
            </div>
            {task.description && !expanded && (
              <p className="text-xs text-muted truncate mt-0.5">{task.description}</p>
            )}
          </div>

          <span className="text-xs text-muted shrink-0">
            {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: ptBR })}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors"
              title="Editar"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-muted hover:text-red transition-colors"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Expandable details */}
        {expanded && hasDetails && (
          <div className="px-11 py-3 flex flex-col gap-3 border-t border-white/[0.04]">
            {hasDescription && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Descrição</p>
                <p className="text-sm text-text/80">{task.description}</p>
              </div>
            )}
            {hasNotes && (
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">Observações</p>
                <p className="text-sm text-amber/80 whitespace-pre-wrap">{task.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {editing && <TaskFormModal task={task} onClose={() => setEditing(false)} />}
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Tarefas() {
  const { state } = useApp()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const freeTasks = (state.tasks ?? [])
    .filter(t => !t.epicId)
    .sort((a, b) => a.order - b.order)

  const filtered = freeTasks.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">Tarefas Avulsas</h1>
          <p className="text-sm text-muted mt-0.5">Tarefas que não estão vinculadas a nenhum projeto</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          <Plus size={16} />
          Nova Tarefa
        </button>
      </div>

      {/* Search */}
      {freeTasks.length > 0 && (
        <div className="mb-5">
          <input
            className="w-full max-w-xs bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Buscar tarefas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma tarefa avulsa"
          description={
            freeTasks.length === 0
              ? 'Crie tarefas que não precisam estar vinculadas a um projeto.'
              : 'Nenhuma tarefa encontrada para essa busca.'
          }
          action={freeTasks.length === 0 ? { label: 'Nova Tarefa', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(t => <TaskRow key={t.id} task={t} />)}
        </div>
      )}

      {showCreate && <TaskFormModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
