import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, FunnelChart, Funnel, LabelList
} from 'recharts'
import {
  Plus, Search, ChevronDown, ChevronRight, Play, Trash2, Edit2, Bug, Link,
  CheckSquare, Image as ImageIcon, AlertCircle, GripVertical, X, Save, ArrowUp, ArrowDown,
  FileText, Copy, Check
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Epic, TestScenario, TestStep, Bug as BugType, TestExecution } from '../types'
import { ScenarioStatusBadge, BugSeverityBadge, BugStatusBadge, PriorityBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { EmptyState } from '../components/ui/EmptyState'
import { useToast } from '../components/ui/Toast'
import { saveImage, loadImage, deleteImagesByPrefix } from '../lib/storage'
import { Lightbox } from '../components/ui/Lightbox'
import { Markdown } from '../components/ui/Markdown'

// ─── Scenario Form Modal ────────────────────────────────────────────────────

interface ScenarioFormProps {
  epicId: string
  scenario?: TestScenario
  defaultTaskId?: string
  onClose: () => void
}

function ScenarioFormModal({ epicId, scenario, defaultTaskId, onClose }: ScenarioFormProps) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [title, setTitle] = useState(scenario?.title || '')
  const [area, setArea] = useState(scenario?.area || '')
  const [criticality, setCriticality] = useState<TestScenario['criticality']>(scenario?.criticality || 'medium')
  const [responsible, setResponsible] = useState(scenario?.responsible || state.settings.userName || '')
  const [notes, setNotes] = useState(scenario?.notes || '')
  const [taskId, setTaskId] = useState<string>(scenario?.taskId ?? defaultTaskId ?? '')

  const epicTasks = (state.tasks ?? []).filter(t => t.epicId === epicId).sort((a, b) => a.order - b.order)

  const save = () => {
    if (!title.trim()) { toast('Título é obrigatório', 'error'); return }
    const now = new Date().toISOString()
    if (scenario) {
      dispatch({ type: 'UPDATE_SCENARIO', payload: { ...scenario, title, area, criticality, responsible, notes, taskId: taskId || undefined, updatedAt: now } })
      toast('Cenário atualizado', 'success')
    } else {
      const id = String(state.nextScenarioId).padStart(4, '0')
      const newScenario: TestScenario = {
        id, epicId,
        taskId: taskId || undefined,
        order: state.scenarios.filter(s => s.epicId === epicId).length + 1,
        title, area, criticality, responsible, notes,
        status: 'pending', isSensitive: false,
        preconditions: [], testData: '', acceptanceCriteria: '',
        steps: [], linkedBugs: [], executions: [],
        createdAt: now, updatedAt: now
      }
      dispatch({ type: 'ADD_SCENARIO', payload: newScenario })
      toast('Cenário criado', 'success')
    }
    onClose()
  }

  const inputCls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  return (
    <Modal title={scenario ? 'Editar Cenário' : 'Novo Cenário'} onClose={onClose} size="md">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Título *</label>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do cenário de teste" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1.5">Área</label>
            <input className={inputCls} value={area} onChange={e => setArea(e.target.value)} placeholder="Ex: Login, Checkout" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1.5">Criticidade</label>
            <select className={inputCls} value={criticality} onChange={e => setCriticality(e.target.value as TestScenario['criticality'])}>
              <option value="critical">Crítica</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>

              <option value="low">Baixa</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Responsável</label>
          <input className={inputCls} value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nome do responsável" />
        </div>
        {epicTasks.length > 0 && (
          <div>
            <label className="block text-xs text-muted mb-1.5">Tarefa</label>
            <select className={inputCls} value={taskId} onChange={e => setTaskId(e.target.value)}>
              <option value="">Sem tarefa</option>
              {epicTasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs text-muted mb-1.5">Notas</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas gerais" />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-text">Cancelar</button>
        <button onClick={save} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80">
          {scenario ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Bug Form Modal ──────────────────────────────────────────────────────────

interface BugFormProps {
  epicId: string
  bug?: BugType
  linkedScenarioId?: string
  onClose: () => void
}

function BugFormModal({ epicId, bug, linkedScenarioId, onClose }: BugFormProps) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const epicScenarios = state.scenarios.filter(s => s.epicId === epicId)

  const [title, setTitle] = useState(bug?.title || '')
  const [area, setArea] = useState(bug?.area || '')
  const [severity, setSeverity] = useState<BugType['severity']>(bug?.severity || 'medium')
  const [status, setStatus] = useState<BugType['status']>(bug?.status || 'open')
  const [reproduction, setReproduction] = useState<BugType['reproduction']>(bug?.reproduction || 'always')
  const [responsible, setResponsible] = useState(bug?.responsible || state.settings.userName || '')
  const [observations, setObservations] = useState(bug?.observations || '')
  const [linkedScenarios, setLinkedScenarios] = useState<string[]>(bug?.linkedScenarios || (linkedScenarioId ? [linkedScenarioId] : []))

  const toggleScenario = (id: string) => {
    setLinkedScenarios(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const save = () => {
    if (!title.trim()) { toast('Título é obrigatório', 'error'); return }
    const now = new Date().toISOString()
    if (bug) {
      const wasResolved = bug.status !== 'resolved' && status === 'resolved'
      const wasReopened = (bug.status === 'resolved' || bug.status === 'closed') && status === 'reopened'
      dispatch({
        type: 'UPDATE_BUG', payload: {
          ...bug, title, area, severity, status, reproduction, responsible, observations, linkedScenarios,
          resolvedAt: wasResolved ? now : bug.resolvedAt,
          reopenedAt: wasReopened ? now : bug.reopenedAt,
          reopenCount: wasReopened ? bug.reopenCount + 1 : bug.reopenCount
        }
      })
      toast('Bug atualizado', 'success')
    } else {
      const id = String(state.nextBugId).padStart(4, '0')
      dispatch({
        type: 'ADD_BUG', payload: {
          id, epicId, title, area, severity, status, reproduction, responsible, observations, linkedScenarios,
          openedAt: now, reopenCount: 0
        }
      })
      // link to scenarios
      linkedScenarios.forEach(sid => {
        const sc = state.scenarios.find(s => s.id === sid)
        if (sc && !sc.linkedBugs.includes(id)) {
          dispatch({ type: 'UPDATE_SCENARIO', payload: { ...sc, linkedBugs: [...sc.linkedBugs, id] } })
        }
      })
      toast('Bug criado', 'success')
    }
    onClose()
  }

  const inputCls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  return (
    <Modal title={bug ? 'Editar Bug' : 'Novo Bug'} onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs text-muted mb-1.5">Título *</label>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="Descrição do bug" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Área</label>
          <input className={inputCls} value={area} onChange={e => setArea(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Severidade</label>
          <select className={inputCls} value={severity} onChange={e => setSeverity(e.target.value as BugType['severity'])}>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Status</label>
          <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as BugType['status'])}>
            <option value="open">Aberto</option>
            <option value="in_progress">Em progresso</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
            <option value="reopened">Reaberto</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Reprodução</label>
          <select className={inputCls} value={reproduction} onChange={e => setReproduction(e.target.value as BugType['reproduction'])}>
            <option value="always">Sempre</option>
            <option value="intermittent">Intermitente</option>
            <option value="rarely">Raramente</option>
            <option value="not_reproducible">Não reproduzível</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-muted mb-1.5">Responsável</label>
          <input className={inputCls} value={responsible} onChange={e => setResponsible(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-muted mb-1.5">Observações</label>
          <textarea className={inputCls + ' resize-none'} rows={3} value={observations} onChange={e => setObservations(e.target.value)} />
        </div>
        {epicScenarios.length > 0 && (
          <div className="col-span-2">
            <label className="block text-xs text-muted mb-1.5">Cenários Vinculados</label>
            <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
              {epicScenarios.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-text cursor-pointer hover:text-accent">
                  <input type="checkbox" checked={linkedScenarios.includes(s.id)} onChange={() => toggleScenario(s.id)} className="accent-accent" />
                  <span className="font-mono text-xs text-muted mr-1">#{s.id}</span>
                  {s.title}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-text">Cancelar</button>
        <button onClick={save} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80">
          {bug ? 'Salvar' : 'Criar Bug'}
        </button>
      </div>
    </Modal>
  )
}

// ─── Execution Panel ─────────────────────────────────────────────────────────

function ExecutionPanel({ scenario, onClose }: { scenario: TestScenario; onClose: () => void }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [result, setResult] = useState<TestExecution['result']>('passed')
  const [notes, setNotes] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const isSensitiveWarning = scenario.isSensitive && result === 'passed' && images.length === 0

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.readAsDataURL(file)
    })

  const addImageFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return
    const dataUrls = await Promise.all(imageFiles.map(readFileAsDataURL))
    setImages(prev => [...prev, ...dataUrls])
    toast(`${imageFiles.length} evidência(s) adicionada(s)`, 'success')
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    addImageFiles(Array.from(files))
  }

  // Paste: Ctrl+V com imagem na área de transferência
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!dropRef.current) return
      const items = Array.from(e.clipboardData?.items ?? [])
      const imageItems = items.filter(i => i.type.startsWith('image/'))
      if (imageItems.length === 0) return
      e.preventDefault()
      const files = imageItems.map(i => i.getAsFile()).filter(Boolean) as File[]
      addImageFiles(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  // Drag & drop
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addImageFiles(Array.from(e.dataTransfer.files))
  }

  const save = async () => {
    if (isSensitiveWarning) { toast('Cenário sensível: adicione evidências antes de marcar como passou', 'warning'); return }
    const execId = String(state.nextExecId).padStart(4, '0')
    const execution: TestExecution = {
      id: execId,
      date: new Date().toISOString(),
      result,
      notes,
      executedBy: state.settings.userName || 'Anônimo',
      imgCount: images.length
    }
    // save images
    for (let i = 0; i < images.length; i++) {
      await saveImage(`exec_${execId}_img_${i}`, images[i])
    }
    dispatch({ type: 'ADD_EXECUTION', payload: { scenarioId: scenario.id, execution } })
    toast('Execução registrada', 'success')
    onClose()
  }

  const resultOptions: { value: TestExecution['result']; label: string; color: string }[] = [
    { value: 'passed', label: 'Passou', color: 'border-green/30 bg-green/10 text-green' },
    { value: 'failed', label: 'Falhou', color: 'border-red/30 bg-red/10 text-red' },
    { value: 'blocked', label: 'Bloqueado', color: 'border-amber/30 bg-amber/10 text-amber' },
    { value: 'partial', label: 'Parcial', color: 'border-purple/30 bg-purple/10 text-purple' },
  ]

  return (
    <div className="border border-accent/30 bg-accent/5 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-text">Nova Execução</h4>
        <button onClick={onClose} className="text-muted hover:text-text"><X size={16} /></button>
      </div>

      <div className="flex gap-2 mb-4">
        {resultOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setResult(opt.value)}
            className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${result === opt.value ? opt.color : 'border-white/[0.07] text-muted hover:text-text'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isSensitiveWarning && (
        <div className="flex items-center gap-2 bg-red/10 border border-red/30 rounded-lg px-3 py-2 mb-3">
          <AlertCircle size={14} className="text-red shrink-0" />
          <p className="text-xs text-red">Cenário sensível requer evidências fotográficas para ser marcado como Passou.</p>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs text-muted mb-1.5">Notas</label>
        <textarea
          className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent resize-none"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Observações sobre a execução"
        />
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-muted">Evidências ({images.length})</label>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent/80"
          >
            <ImageIcon size={12} /> Selecionar arquivo
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />

        {/* Drop / paste zone */}
        <div
          ref={dropRef}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => images.length === 0 && fileRef.current?.click()}
          className={`rounded-lg border-2 border-dashed transition-colors min-h-[64px] flex items-center justify-center gap-2 text-xs cursor-pointer
            ${dragging
              ? 'border-accent bg-accent/10 text-accent'
              : images.length === 0
                ? 'border-white/[0.07] text-muted hover:border-accent/40 hover:text-accent/60'
                : 'border-white/[0.07]'
            }`}
        >
          {images.length === 0 ? (
            <>
              <ImageIcon size={14} />
              <span>Cole uma imagem (<kbd className="font-mono bg-surface2 px-1 rounded">Ctrl+V</kbd>), arraste ou clique</span>
            </>
          ) : (
            <div className="flex gap-2 flex-wrap p-2 w-full">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} onClick={e => { e.stopPropagation(); setLightbox(i) }} className="w-16 h-16 object-cover rounded-lg border border-white/[0.07] cursor-zoom-in hover:opacity-80 transition-opacity" />
                  <button
                    onClick={e => { e.stopPropagation(); setImages(prev => prev.filter((_, j) => j !== i)) }}
                    className="absolute -top-1 -right-1 bg-red text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              {/* add more inline */}
              <button
                onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                className="w-16 h-16 rounded-lg border-2 border-dashed border-white/[0.07] hover:border-accent/40 flex items-center justify-center text-muted hover:text-accent transition-colors"
              >
                <ImageIcon size={16} />
              </button>
            </div>
          )}
        </div>
        {images.length > 0 && (
          <p className="text-xs text-muted mt-1.5">Continue colando (<kbd className="font-mono bg-surface2 px-1 rounded">Ctrl+V</kbd>) para adicionar mais</p>
        )}
      </div>

      <button
        onClick={save}
        className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
      >
        Registrar Execução
      </button>

      {lightbox !== null && (
        <Lightbox images={images} initialIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

// ─── Exec Tab ────────────────────────────────────────────────────────────────

const RESULT_LABELS: Record<string, string> = {
  passed: 'PASSOU', failed: 'FALHOU', blocked: 'BLOQUEADO', partial: 'PARCIAL'
}
const RESULT_COLOR: Record<string, string> = {
  passed: 'text-green', failed: 'text-red', blocked: 'text-amber', partial: 'text-purple'
}

interface EditExecPanelProps {
  exec: TestExecution
  scenario: TestScenario
  currentImages: string[]
  onClose: () => void
  onSaved: (updated: TestExecution, newImages: string[]) => void
}

function EditExecPanel({ exec, scenario, currentImages, onClose, onSaved }: EditExecPanelProps) {
  const toast = useToast()
  const [result, setResult] = useState<TestExecution['result']>(exec.result)
  const [notes, setNotes] = useState(exec.notes)
  const [images, setImages] = useState<string[]>(currentImages)
  const [dragging, setDragging] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isSensitiveWarning = scenario.isSensitive && result === 'passed' && images.length === 0

  const readFile = (f: File): Promise<string> => new Promise(res => {
    const r = new FileReader(); r.onload = e => res(e.target?.result as string); r.readAsDataURL(f)
  })

  const addFiles = async (files: File[]) => {
    const imgs = files.filter(f => f.type.startsWith('image/'))
    if (!imgs.length) return
    const urls = await Promise.all(imgs.map(readFile))
    setImages(p => [...p, ...urls])
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []).filter(i => i.type.startsWith('image/'))
      if (!items.length) return
      e.preventDefault()
      addFiles(items.map(i => i.getAsFile()).filter(Boolean) as File[])
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const save = async () => {
    if (isSensitiveWarning) { toast('Cenário sensível: adicione evidências', 'warning'); return }
    // persist images (overwrite)
    for (let i = 0; i < images.length; i++) {
      await saveImage(`exec_${exec.id}_img_${i}`, images[i])
    }
    const updated: TestExecution = { ...exec, result, notes, imgCount: images.length }
    onSaved(updated, images)
    toast('Execução atualizada', 'success')
    onClose()
  }

  const resultOptions: { value: TestExecution['result']; label: string; color: string }[] = [
    { value: 'passed', label: 'Passou', color: 'border-green/30 bg-green/10 text-green' },
    { value: 'failed', label: 'Falhou', color: 'border-red/30 bg-red/10 text-red' },
    { value: 'blocked', label: 'Bloqueado', color: 'border-amber/30 bg-amber/10 text-amber' },
    { value: 'partial', label: 'Parcial', color: 'border-purple/30 bg-purple/10 text-purple' },
  ]

  return (
    <div className="border border-amber/30 bg-amber/5 rounded-xl p-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-text">Editar Execução #{exec.id}</h4>
        <button onClick={onClose} className="text-muted hover:text-text"><X size={16} /></button>
      </div>
      <div className="flex gap-2 mb-3">
        {resultOptions.map(opt => (
          <button key={opt.value} onClick={() => setResult(opt.value)}
            className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${result === opt.value ? opt.color : 'border-white/[0.07] text-muted hover:text-text'}`}>
            {opt.label}
          </button>
        ))}
      </div>
      {isSensitiveWarning && (
        <div className="flex items-center gap-2 bg-red/10 border border-red/30 rounded-lg px-3 py-2 mb-3">
          <AlertCircle size={14} className="text-red shrink-0" />
          <p className="text-xs text-red">Cenário sensível requer evidências para ser marcado como Passou.</p>
        </div>
      )}
      <div className="mb-3">
        <label className="block text-xs text-muted mb-1.5">Notas</label>
        <textarea className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
      </div>
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-muted">Evidências ({images.length})</label>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80">
            <ImageIcon size={12} /> Adicionar
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => addFiles(Array.from(e.target.files ?? []))} />
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)) }}
          onClick={() => images.length === 0 && fileRef.current?.click()}
          className={`rounded-lg border-2 border-dashed transition-colors min-h-[52px] flex items-center justify-center gap-2 text-xs cursor-pointer
            ${dragging ? 'border-accent bg-accent/10 text-accent' : images.length === 0 ? 'border-white/[0.07] text-muted hover:border-accent/40' : 'border-white/[0.07]'}`}
        >
          {images.length === 0 ? (
            <><ImageIcon size={14} /><span>Cole (<kbd className="font-mono bg-surface2 px-1 rounded">Ctrl+V</kbd>), arraste ou clique</span></>
          ) : (
            <div className="flex gap-2 flex-wrap p-2 w-full">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} onClick={e => { e.stopPropagation(); setLightbox(i) }} className="w-16 h-16 object-cover rounded-lg border border-white/[0.07] cursor-zoom-in hover:opacity-80" />
                  <button onClick={e => { e.stopPropagation(); setImages(p => p.filter((_, j) => j !== i)) }} className="absolute -top-1 -right-1 bg-red text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button onClick={e => { e.stopPropagation(); fileRef.current?.click() }} className="w-16 h-16 rounded-lg border-2 border-dashed border-white/[0.07] hover:border-accent/40 flex items-center justify-center text-muted hover:text-accent transition-colors">
                <ImageIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      <button onClick={save} className="w-full py-2 bg-amber text-bg rounded-lg text-sm font-semibold hover:bg-amber/80 transition-colors">
        Salvar Alterações
      </button>
      {lightbox !== null && <Lightbox images={images} initialIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  )
}

interface ExecTabProps {
  scenario: TestScenario
  execImages: Record<string, string[]>
  setExecImages: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  lightbox: { execId: string; idx: number } | null
  setLightbox: React.Dispatch<React.SetStateAction<{ execId: string; idx: number } | null>>
  showExecPanel: boolean
  setShowExecPanel: (v: boolean) => void
}

function ExecTab({ scenario, execImages, setExecImages, lightbox, setLightbox, showExecPanel, setShowExecPanel }: ExecTabProps) {
  const { dispatch } = useApp()
  const toast = useToast()
  const [editingExecId, setEditingExecId] = useState<string | null>(null)

  const deleteExec = async (exec: TestExecution) => {
    if (!confirm('Excluir esta execução?')) return
    await deleteImagesByPrefix(`exec_${exec.id}_`)
    setExecImages(prev => { const n = { ...prev }; delete n[exec.id]; return n })
    dispatch({ type: 'DELETE_EXECUTION', payload: { scenarioId: scenario.id, execId: exec.id } })
    toast('Execução excluída', 'success')
  }

  const onExecSaved = (updated: TestExecution, newImages: string[]) => {
    dispatch({ type: 'UPDATE_EXECUTION', payload: { scenarioId: scenario.id, execution: updated } })
    setExecImages(prev => ({ ...prev, [updated.id]: newImages }))
    setEditingExecId(null)
  }

  return (
    <div>
      {!showExecPanel && (
        <button onClick={() => setShowExecPanel(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent/20 text-accent border border-accent/30 rounded-lg text-sm font-medium hover:bg-accent/30 mb-4">
          <Plus size={14} /> Registrar Nova Execução
        </button>
      )}
      {showExecPanel && <ExecutionPanel scenario={scenario} onClose={() => setShowExecPanel(false)} />}

      <div className="flex flex-col gap-3 mt-4">
        {scenario.executions.length === 0 && (
          <p className="text-sm text-muted italic">Nenhuma execução registrada ainda.</p>
        )}
        {[...scenario.executions].reverse().map(exec => (
          <div key={exec.id}>
            <div className="bg-surface2 border border-white/[0.07] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-xs font-semibold ${RESULT_COLOR[exec.result] || 'text-muted'}`}>
                  {RESULT_LABELS[exec.result] ?? exec.result}
                </span>
                <span className="text-xs text-muted">{format(new Date(exec.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                <span className="text-xs text-muted">por {exec.executedBy}</span>
                <span className="text-xs font-mono text-muted ml-auto">#{exec.id}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingExecId(editingExecId === exec.id ? null : exec.id)}
                    className={`p-1.5 rounded-lg transition-colors ${editingExecId === exec.id ? 'text-amber bg-amber/10' : 'text-muted hover:text-text hover:bg-surface'}`}
                    title="Editar execução"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deleteExec(exec)} className="p-1.5 text-muted hover:text-red hover:bg-surface rounded-lg transition-colors" title="Excluir execução">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {exec.notes && <Markdown content={exec.notes} className="prose-pxqa mb-2" />}
              {execImages[exec.id] && execImages[exec.id].length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {execImages[exec.id].map((img, i) => (
                    <img key={i} src={img} className="w-20 h-20 object-cover rounded-lg border border-white/[0.07] cursor-zoom-in hover:opacity-80 transition-opacity"
                      onClick={() => setLightbox({ execId: exec.id, idx: i })} />
                  ))}
                </div>
              )}
              {exec.imgCount > 0 && !execImages[exec.id] && (
                <p className="text-xs text-muted italic">{exec.imgCount} evidência(s) carregando...</p>
              )}
            </div>
            {editingExecId === exec.id && (
              <EditExecPanel
                exec={exec}
                scenario={scenario}
                currentImages={execImages[exec.id] ?? []}
                onClose={() => setEditingExecId(null)}
                onSaved={onExecSaved}
              />
            )}
          </div>
        ))}
      </div>

      {lightbox && execImages[lightbox.execId] && (
        <Lightbox images={execImages[lightbox.execId]} initialIndex={lightbox.idx} onClose={() => setLightbox(null)} />
      )}
    </div>
  )
}

// ─── Scenario Detail Tabs ────────────────────────────────────────────────────

function ScenarioDetailTabs({ scenario }: { scenario: TestScenario }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState<'details' | 'exec' | 'bugs'>('details')
  const [showExecPanel, setShowExecPanel] = useState(false)
  const [showBugForm, setShowBugForm] = useState(false)
  const [editingBugId, setEditingBugId] = useState<string | null>(null)

  // Details state
  const [preconditions, setPreconditions] = useState<string[]>(scenario.preconditions)
  const [newPrecond, setNewPrecond] = useState('')
  const [testData, setTestData] = useState(scenario.testData)
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(scenario.acceptanceCriteria)
  const [steps, setSteps] = useState<TestStep[]>(scenario.steps)
  const [isSensitive, setIsSensitive] = useState(scenario.isSensitive)

  const linkedBugs = state.bugs.filter(b => scenario.linkedBugs.includes(b.id))

  const saveDetails = () => {
    dispatch({
      type: 'UPDATE_SCENARIO',
      payload: { ...scenario, preconditions, testData, acceptanceCriteria, steps, isSensitive, updatedAt: new Date().toISOString() }
    })
    toast('Detalhes salvos', 'success')
  }

  const addStep = () => {
    const newStep: TestStep = {
      id: String(Date.now()),
      order: steps.length + 1,
      action: '',
      expected: '',
      observed: ''
    }
    setSteps(prev => [...prev, newStep])
  }

  const updateStep = (id: string, field: keyof TestStep, value: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const removeStep = (id: string) => {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })))
  }

  const moveStep = (id: string, dir: 'up' | 'down') => {
    const idx = steps.findIndex(s => s.id === id)
    if ((dir === 'up' && idx === 0) || (dir === 'down' && idx === steps.length - 1)) return
    const newSteps = [...steps]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[newSteps[idx], newSteps[swap]] = [newSteps[swap], newSteps[idx]]
    setSteps(newSteps.map((s, i) => ({ ...s, order: i + 1 })))
  }

  const addPrecondition = () => {
    if (!newPrecond.trim()) return
    setPreconditions(prev => [...prev, newPrecond.trim()])
    setNewPrecond('')
  }

  const unlinkBug = (bugId: string) => {
    dispatch({
      type: 'UPDATE_SCENARIO',
      payload: { ...scenario, linkedBugs: scenario.linkedBugs.filter(b => b !== bugId) }
    })
  }

  const inputCls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  const [execImages, setExecImages] = useState<Record<string, string[]>>({})
  const [lightbox, setLightbox] = useState<{ execId: string; idx: number } | null>(null)

  useEffect(() => {
    scenario.executions.forEach(exec => {
      if (exec.imgCount > 0) {
        const imgs: string[] = []
        const promises = Array.from({ length: exec.imgCount }, (_, i) =>
          loadImage(`exec_${exec.id}_img_${i}`).then(data => {
            if (data) imgs[i] = data
          })
        )
        Promise.all(promises).then(() => {
          setExecImages(prev => ({ ...prev, [exec.id]: imgs.filter(Boolean) }))
        })
      }
    })
  }, [scenario.executions])

  const tabCls = (t: string) => `px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === t ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text'}`

  return (
    <div className="mt-3 pl-4 border-l-2 border-accent/20">
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        <button className={tabCls('details')} onClick={() => setActiveTab('details')}>Detalhes</button>
        <button className={tabCls('exec')} onClick={() => setActiveTab('exec')}>
          Evidências & Execuções ({scenario.executions.length})
        </button>
        <button className={tabCls('bugs')} onClick={() => setActiveTab('bugs')}>
          Bugs Vinculados ({linkedBugs.length})
        </button>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="flex flex-col gap-4">
          {/* Sensitive toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setIsSensitive(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative ${isSensitive ? 'bg-accent' : 'bg-surface2'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isSensitive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-text">Cenário Sensível (requer evidências)</span>
            </label>
          </div>

          {/* Preconditions */}
          <div>
            <label className="block text-xs text-muted mb-2">Pré-condições</label>
            <div className="flex flex-col gap-1 mb-2">
              {preconditions.map((p, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <CheckSquare size={12} className="text-accent shrink-0" />
                  <span className="text-sm text-text flex-1">{p}</span>
                  <button onClick={() => setPreconditions(prev => prev.filter((_, j) => j !== i))} className="text-muted hover:text-red opacity-0 group-hover:opacity-100">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className={inputCls + ' text-xs py-1.5'}
                value={newPrecond}
                onChange={e => setNewPrecond(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPrecondition()}
                placeholder="Adicionar pré-condição..."
              />
              <button onClick={addPrecondition} className="px-3 py-1.5 bg-surface2 border border-white/[0.07] rounded-lg text-xs text-text hover:border-accent">
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Test Data */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Dados de Teste</label>
            <textarea className={inputCls + ' resize-none font-mono text-xs'} rows={3} value={testData} onChange={e => setTestData(e.target.value)} placeholder="Dados necessários para execução" />
            {testData && (
              <div className="mt-1.5 px-3 py-2 bg-surface rounded-lg border border-white/[0.07]">
                <Markdown content={testData} className="prose-pxqa" />
              </div>
            )}
          </div>

          {/* Acceptance Criteria */}
          <div>
            <label className="block text-xs text-muted mb-1.5">Critérios de Aceite</label>
            <textarea className={inputCls + ' resize-none text-xs'} rows={3} value={acceptanceCriteria} onChange={e => setAcceptanceCriteria(e.target.value)} placeholder="Critérios que definem o sucesso" />
            {acceptanceCriteria && (
              <div className="mt-1.5 px-3 py-2 bg-surface rounded-lg border border-white/[0.07]">
                <Markdown content={acceptanceCriteria} className="prose-pxqa" />
              </div>
            )}
          </div>

          {/* Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted">Passos do Teste</label>
              <button onClick={addStep} className="flex items-center gap-1 text-xs text-accent hover:text-accent/80">
                <Plus size={12} /> Adicionar passo
              </button>
            </div>
            {steps.length === 0 && (
              <p className="text-xs text-muted italic">Nenhum passo definido ainda.</p>
            )}
            <div className="flex flex-col gap-2">
              {steps.map((step) => (
                <div key={step.id} className="bg-surface2 border border-white/[0.07] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-muted w-6 shrink-0">{step.order}.</span>
                    <div className="flex gap-1 ml-auto">
                      <button onClick={() => moveStep(step.id, 'up')} className="text-muted hover:text-text p-0.5"><ArrowUp size={11} /></button>
                      <button onClick={() => moveStep(step.id, 'down')} className="text-muted hover:text-text p-0.5"><ArrowDown size={11} /></button>
                      <button onClick={() => removeStep(step.id)} className="text-muted hover:text-red p-0.5"><Trash2 size={11} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-xs text-muted mb-1">Ação</p>
                      <textarea
                        className="w-full bg-surface border border-white/[0.07] rounded px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
                        rows={2}
                        value={step.action}
                        onChange={e => updateStep(step.id, 'action', e.target.value)}
                        placeholder="O que fazer"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Esperado</p>
                      <textarea
                        className="w-full bg-surface border border-white/[0.07] rounded px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
                        rows={2}
                        value={step.expected}
                        onChange={e => updateStep(step.id, 'expected', e.target.value)}
                        placeholder="Resultado esperado"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted mb-1">Observado</p>
                      <textarea
                        className="w-full bg-surface border border-white/[0.07] rounded px-2 py-1.5 text-xs text-text outline-none focus:border-accent resize-none"
                        rows={2}
                        value={step.observed}
                        onChange={e => updateStep(step.id, 'observed', e.target.value)}
                        placeholder="O que aconteceu"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={saveDetails} className="self-start flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80">
            <Save size={14} /> Salvar Detalhes
          </button>
        </div>
      )}

      {/* Executions Tab */}
      {activeTab === 'exec' && (
        <ExecTab
          scenario={scenario}
          execImages={execImages}
          setExecImages={setExecImages}
          lightbox={lightbox}
          setLightbox={setLightbox}

          showExecPanel={showExecPanel}
          setShowExecPanel={setShowExecPanel}
        />
      )}

      {/* Bugs Tab */}
      {activeTab === 'bugs' && (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setShowBugForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-red/10 text-red border border-red/30 rounded-lg text-sm font-medium hover:bg-red/20"
            >
              <Plus size={14} /> Criar Bug deste Cenário
            </button>
          </div>

          {linkedBugs.length === 0 && (
            <p className="text-sm text-muted italic">Nenhum bug vinculado.</p>
          )}

          <div className="flex flex-col gap-2">
            {linkedBugs.map(bug => (
              <div key={bug.id} className="flex items-center gap-3 bg-surface2 border border-white/[0.07] rounded-lg px-4 py-3">
                <span className="font-mono text-xs text-muted">#{bug.id}</span>
                <span className="text-sm text-text flex-1">{bug.title}</span>
                <BugSeverityBadge severity={bug.severity} />
                <BugStatusBadge status={bug.status} />
                <button onClick={() => unlinkBug(bug.id)} className="text-muted hover:text-red ml-2">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBugForm && (
        <BugFormModal
          epicId={scenario.epicId}
          linkedScenarioId={scenario.id}
          onClose={() => setShowBugForm(false)}
        />
      )}
    </div>
  )
}

// ─── Shared Scenario Row ─────────────────────────────────────────────────────

function ScenarioRow({
  scenario,
  epicId,
  tasks,
  onEdit,
  onDelete,
}: {
  scenario: TestScenario
  epicId: string
  tasks: import('../types').EpicTask[]
  onEdit: (s: TestScenario) => void
  onDelete: (s: TestScenario) => void
}) {
  const { dispatch } = useApp()
  const [expanded, setExpanded] = useState(false)

  const critColors: Record<string, string> = {
    critical: 'border-l-red',
    high: 'border-l-amber',
    medium: 'border-l-purple',
    low: 'border-l-green',
  }

  const statusTint: Record<string, string> = {
    failed: 'bg-red/[0.08] border-red/50',
    blocked: 'bg-amber/[0.08] border-amber/50',
    partial: 'bg-purple/[0.08] border-purple/50',
  }

  const moveToTask = (taskId: string) => {
    dispatch({
      type: 'UPDATE_SCENARIO',
      payload: { ...scenario, taskId: taskId || undefined, updatedAt: new Date().toISOString() }
    })
  }

  return (
    <div className={`rounded-xl border-l-2 border ${statusTint[scenario.status] ?? 'bg-surface border-white/[0.07]'} ${critColors[scenario.criticality]}`}>
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface2/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? <ChevronDown size={14} className="text-muted shrink-0" /> : <ChevronRight size={14} className="text-muted shrink-0" />}
        <span className="font-mono text-xs text-muted w-10 shrink-0">#{scenario.id}</span>
        <span className="text-sm text-text flex-1 font-medium">{scenario.title}</span>
        {scenario.area && <span className="text-xs text-muted px-2 py-0.5 bg-surface2 rounded">{scenario.area}</span>}
        <ScenarioStatusBadge status={scenario.status} />
        <span className="text-xs text-muted">{scenario.executions.length} exec.</span>
        <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
          {tasks.length > 0 && (
            <select
              value={scenario.taskId ?? ''}
              onChange={e => moveToTask(e.target.value)}
              onClick={e => e.stopPropagation()}
              className="text-xs bg-surface2 border border-white/[0.07] rounded px-1.5 py-1 text-muted outline-none focus:border-accent max-w-[120px]"
              title="Mover para tarefa"
            >
              <option value="">Sem tarefa</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <button onClick={() => onEdit(scenario)} className="p-1.5 text-muted hover:text-text hover:bg-surface2 rounded-lg">
            <Edit2 size={12} />
          </button>
          <button onClick={() => onDelete(scenario)} className="p-1.5 text-muted hover:text-red hover:bg-surface2 rounded-lg">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      {expanded && <div className="px-4 pb-4"><ScenarioDetailTabs scenario={scenario} /></div>}
    </div>
  )
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

interface TaskFormProps {
  epicId: string
  task?: import('../types').EpicTask
  onClose: () => void
}

function TaskFormModal({ epicId, task, onClose }: TaskFormProps) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [name, setName] = useState(task?.name ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')

  const save = () => {
    if (!name.trim()) { toast('Nome é obrigatório', 'error'); return }
    const now = new Date().toISOString()
    if (task) {
      dispatch({ type: 'UPDATE_TASK', payload: { ...task, name, description, notes, order: task.order } })
      toast('Tarefa atualizada', 'success')
    } else {
      const existingTasks = (state.tasks ?? []).filter(t => t.epicId === epicId)
      const id = String(state.nextTaskId ?? 1).padStart(4, '0')
      dispatch({
        type: 'ADD_TASK',
        payload: { id, epicId, name, description, notes, order: existingTasks.length + 1, createdAt: now }
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
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Limite de Crédito" autoFocus />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Descrição</label>
          <textarea className={inputCls + ' resize-none'} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição da tarefa" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Observações / Riscos / Impedimentos</label>
          <textarea
            className={inputCls + ' resize-none'}
            rows={4}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Ex: Aguardando alinhamento com o dev sobre comportamento do repositório em status Suspended. Risco: testes unitários existentes podem conflitar com o critério de aceite definido."
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

// ─── Jira Export Modal ────────────────────────────────────────────────────────

const statusEmoji: Record<string, string> = {
  passed: '✅', failed: '❌', blocked: '🔶', partial: '🔸', pending: '⏳'
}
const statusLabel: Record<string, string> = {
  passed: 'Passou', failed: 'Falhou', blocked: 'Bloqueado', partial: 'Parcial', pending: 'Pendente'
}
const critLabel: Record<string, string> = {
  critical: 'Crítica', high: 'Alta', medium: 'Média', low: 'Baixa'
}

function buildJiraMarkdown(
  task: import('../types').EpicTask,
  scenarios: TestScenario[],
  bugs: BugType[]
): string {
  const lines: string[] = []

  lines.push(`## Tarefa: ${task.name}`)
  if (task.description) lines.push(`\n**Descrição:** ${task.description}`)
  if (task.notes) lines.push(`\n**Observações:** ${task.notes}`)
  lines.push('\n---')

  // Summary
  const counts = { passed: 0, failed: 0, blocked: 0, partial: 0, pending: 0 }
  scenarios.forEach(s => { counts[s.status] = (counts[s.status] ?? 0) + 1 })
  lines.push('\n### Resumo de Execução')
  lines.push(`| Status | Qtd |`)
  lines.push(`|--------|-----|`)
  if (counts.passed)  lines.push(`| ✅ Passou    | ${counts.passed} |`)
  if (counts.failed)  lines.push(`| ❌ Falhou    | ${counts.failed} |`)
  if (counts.partial) lines.push(`| 🔸 Parcial   | ${counts.partial} |`)
  if (counts.blocked) lines.push(`| 🔶 Bloqueado | ${counts.blocked} |`)
  if (counts.pending) lines.push(`| ⏳ Pendente  | ${counts.pending} |`)
  lines.push(`| **Total**    | **${scenarios.length}** |`)

  // Scenarios
  scenarios.forEach((s, i) => {
    lines.push(`\n---\n`)
    lines.push(`### Cenário ${i + 1}: ${s.title}`)
    lines.push(`**Criticidade:** ${critLabel[s.criticality]} | **Status:** ${statusEmoji[s.status]} ${statusLabel[s.status]}${s.area ? ` | **Área:** ${s.area}` : ''}`)

    if (s.preconditions?.length) {
      lines.push(`\n**Pré-condições:**`)
      s.preconditions.forEach(p => lines.push(`- ${p}`))
    }
    if (s.testData) {
      lines.push(`\n**Dados de teste:**\n\`\`\`\n${s.testData}\n\`\`\``)
    }
    if (s.acceptanceCriteria) {
      lines.push(`\n**Critérios de aceite:**\n${s.acceptanceCriteria}`)
    }
    if (s.steps?.length) {
      lines.push(`\n**Passos:**`)
      lines.push(`| # | Ação | Resultado esperado |`)
      lines.push(`|---|------|--------------------|`)
      s.steps.forEach(st => lines.push(`| ${st.order} | ${st.action} | ${st.expected} |`))
    }

    // Last execution
    if (s.executions?.length) {
      const last = [...s.executions].sort((a, b) => b.id.localeCompare(a.id))[0]
      lines.push(`\n**Última execução:** ${format(new Date(last.date), 'dd/MM/yyyy')} — ${statusEmoji[last.result]} ${statusLabel[last.result]}`)
      if (last.executedBy) lines.push(`**Executor:** ${last.executedBy}`)
      if (last.notes) lines.push(`**Notas:** ${last.notes}`)
      if (last.imgCount > 0) lines.push(`**Evidências:** ${last.imgCount} imagem(ns) anexada(s)`)
    }

    // Linked bugs
    if (s.linkedBugs?.length) {
      const linked = bugs.filter(b => s.linkedBugs.includes(b.id))
      if (linked.length) {
        lines.push(`\n**Bugs vinculados:**`)
        linked.forEach(b => lines.push(`- [${b.severity.toUpperCase()}] ${b.title} — ${b.status}`))
      }
    }
  })

  return lines.join('\n')
}

function JiraExportModal({
  task, scenarios, bugs, onClose
}: {
  task: import('../types').EpicTask
  scenarios: TestScenario[]
  bugs: BugType[]
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const markdown = buildJiraMarkdown(task, scenarios, bugs)

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal title="Exportar para Jira" onClose={onClose} size="lg">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-muted">
          Markdown formatado com todos os cenários, execuções e bugs da tarefa. Cole diretamente em qualquer campo do Jira.
        </p>
        <div className="relative">
          <pre className="bg-surface2 border border-white/[0.07] rounded-lg p-4 text-xs text-text/80 overflow-auto max-h-[50vh] whitespace-pre-wrap font-mono">
            {markdown}
          </pre>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-text">Fechar</button>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green text-white' : 'bg-accent text-white hover:bg-accent/80'}`}
          >
            {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: import('../types').EpicTask
  taskScenarios: TestScenario[]
  epicTasks: import('../types').EpicTask[]
  epicBugs: BugType[]
  pct: number
  passed: number
  total: number
  collapsed: boolean
  onToggle: () => void
  onAddScenario: () => void
  onEdit: () => void
  onDelete: () => void
  onEditScenario: (s: TestScenario) => void
  onDeleteScenario: (s: TestScenario) => void
}

function TaskCard({
  task, taskScenarios, epicTasks, epicBugs, pct, passed, total,
  collapsed, onToggle, onAddScenario, onEdit, onDelete,
  onEditScenario, onDeleteScenario,
}: TaskCardProps) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const epicId = task.epicId!

  return (
    <div className={`rounded-xl overflow-hidden border ${task.notes ? 'bg-amber/[0.03] border-amber/30' : 'bg-surface border-white/[0.07]'}`}>
      {/* ── Main header row ── */}
      <div className={`flex items-center gap-3 px-4 py-3 ${task.notes ? 'bg-amber/[0.06]' : 'bg-surface2/60'}`}>
        {/* Collapse toggle */}
        <button onClick={onToggle} className="text-muted hover:text-text transition-colors shrink-0">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Name + count */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-text">{task.name}</span>
            <span className="text-xs text-muted">({total} cenário{total !== 1 ? 's' : ''})</span>
            {task.description && (
              <span className="text-xs text-muted truncate max-w-[320px]">&mdash; {task.description}</span>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20 h-1.5 bg-surface rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green' : pct >= 40 ? 'bg-amber' : pct > 0 ? 'bg-red' : 'bg-surface2'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-xs font-mono font-medium ${pct === 100 ? 'text-green' : 'text-muted'}`}>{passed}/{total}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {task.notes && (
            <button
              onClick={() => setNotesOpen(v => !v)}
              title="Observações"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${notesOpen ? 'bg-amber/15 text-amber' : 'text-amber/60 hover:text-amber hover:bg-amber/10'}`}
            >
              <AlertCircle size={12} />
              <span>Obs.</span>
            </button>
          )}
          <button
            onClick={onAddScenario}
            className="flex items-center gap-1 px-2 py-1 text-xs text-accent hover:bg-accent/10 rounded-lg transition-colors"
          >
            <Plus size={12} /> Cenário
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="p-1.5 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors"
            title="Exportar para Jira"
          >
            <FileText size={12} />
          </button>
          <button onClick={onEdit} className="p-1.5 text-muted hover:text-text hover:bg-surface rounded-lg transition-colors">
            <Edit2 size={12} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-muted hover:text-red hover:bg-surface rounded-lg transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {showExport && (
        <JiraExportModal
          task={task}
          scenarios={taskScenarios}
          bugs={epicBugs}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* ── Notes panel (colapsável) ── */}
      {task.notes && notesOpen && (
        <div className="px-4 py-3 bg-amber/5 border-b border-amber/20">
          <Markdown content={task.notes} className="prose-pxqa prose-pxqa-amber" />
        </div>
      )}

      {/* ── Scenario rows ── */}
      {!collapsed && (
        <div className="p-3 flex flex-col gap-2">
          {taskScenarios.length === 0 ? (
            <button
              onClick={onAddScenario}
              className="text-sm text-muted text-center py-6 border-2 border-dashed border-white/[0.07] rounded-xl hover:border-accent/30 hover:text-accent/60 transition-colors w-full"
            >
              + Adicionar cenário a esta tarefa
            </button>
          ) : (
            taskScenarios.map(s => (
              <ScenarioRow
                key={s.id}
                scenario={s}
                epicId={epicId}
                tasks={epicTasks}
                onEdit={onEditScenario}
                onDelete={onDeleteScenario}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

function TasksTab({ epicId }: { epicId: string }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingTask, setEditingTask] = useState<import('../types').EpicTask | null>(null)
  const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set())
  const [showCreateScenario, setShowCreateScenario] = useState<string | null>(null) // taskId
  const [editingScenario, setEditingScenario] = useState<TestScenario | null>(null)

  const epicTasks = (state.tasks ?? [])
    .filter(t => t.epicId === epicId)
    .sort((a, b) => a.order - b.order)

  const epicScenarios = state.scenarios.filter(s => s.epicId === epicId)

  const toggleCollapse = (taskId: string) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev)
      next.has(taskId) ? next.delete(taskId) : next.add(taskId)
      return next
    })
  }

  const deleteTask = (task: import('../types').EpicTask) => {
    if (!confirm(`Excluir tarefa "${task.name}"? Os cenários vinculados ficarão sem tarefa.`)) return
    dispatch({ type: 'DELETE_TASK', payload: task.id })
    toast('Tarefa excluída', 'success')
  }

  const deleteScenario = async (s: TestScenario) => {
    if (!confirm(`Excluir cenário "${s.title}"?`)) return
    for (const exec of s.executions) await deleteImagesByPrefix(`exec_${exec.id}_`)
    dispatch({ type: 'DELETE_SCENARIO', payload: s.id })
  }

  const statusOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  const sortScenarios = (list: TestScenario[]) =>
    [...list].sort((a, b) => statusOrder[a.criticality] - statusOrder[b.criticality])

  const unassigned = epicScenarios.filter(s => !s.taskId || !epicTasks.find(t => t.id === s.taskId))

  const progressOf = (scenarios: TestScenario[]) => {
    if (scenarios.length === 0) return { pct: 0, passed: 0, total: 0 }
    const done = scenarios.filter(s => s.status !== 'pending').length
    const passed = scenarios.filter(s => s.status === 'passed').length
    return { pct: Math.round(done / scenarios.length * 100), passed, total: scenarios.length }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted">{epicTasks.length} tarefa(s) · {epicScenarios.length} cenário(s)</p>
        <button
          onClick={() => setShowCreateTask(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80"
        >
          <Plus size={14} /> Nova Tarefa
        </button>
      </div>

      {epicTasks.length === 0 && unassigned.length === 0 && (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma tarefa ainda"
          description="Crie tarefas para organizar os cenários em grupos."
          action={{ label: 'Nova Tarefa', onClick: () => setShowCreateTask(true) }}
        />
      )}

      {/* Task groups */}
      <div className="flex flex-col gap-4">
        {epicTasks.map(task => {
          const taskScenarios = sortScenarios(epicScenarios.filter(s => s.taskId === task.id))
          const { pct, passed, total } = progressOf(taskScenarios)
          const collapsed = collapsedTasks.has(task.id)

          return (
            <TaskCard
              key={task.id}
              task={task}
              taskScenarios={taskScenarios}
              epicTasks={epicTasks}
              epicBugs={state.bugs.filter(b => b.epicId === epicId)}
              pct={pct}
              passed={passed}
              total={total}
              collapsed={collapsed}
              onToggle={() => toggleCollapse(task.id)}
              onAddScenario={() => setShowCreateScenario(task.id)}
              onEdit={() => setEditingTask(task)}
              onDelete={() => deleteTask(task)}
              onEditScenario={setEditingScenario}
              onDeleteScenario={deleteScenario}
            />
          )
        })}

        {/* Unassigned */}
        {unassigned.length > 0 && (
          <div className="bg-surface border border-white/[0.07] rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-surface2/30">
              <button onClick={() => toggleCollapse('__unassigned')} className="text-muted hover:text-text transition-colors">
                {collapsedTasks.has('__unassigned') ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </button>
              <span className="font-semibold text-sm text-muted italic">Sem tarefa</span>
              <span className="text-xs text-muted">({unassigned.length})</span>
            </div>
            {!collapsedTasks.has('__unassigned') && (
              <div className="p-3 flex flex-col gap-2">
                {sortScenarios(unassigned).map(s => (
                  <ScenarioRow
                    key={s.id}
                    scenario={s}
                    epicId={epicId}
                    tasks={epicTasks}
                    onEdit={setEditingScenario}
                    onDelete={deleteScenario}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateTask && <TaskFormModal epicId={epicId} onClose={() => setShowCreateTask(false)} />}
      {editingTask && <TaskFormModal epicId={epicId} task={editingTask} onClose={() => setEditingTask(null)} />}
      {showCreateScenario !== null && (
        <ScenarioFormModal epicId={epicId} defaultTaskId={showCreateScenario} onClose={() => setShowCreateScenario(null)} />
      )}
      {editingScenario && (
        <ScenarioFormModal epicId={epicId} scenario={editingScenario} onClose={() => setEditingScenario(null)} />
      )}
    </div>
  )
}

// ─── Scenarios Tab ────────────────────────────────────────────────────────────

function ScenariosTab({ epicId }: { epicId: string }) {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [critFilter, setCritFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [editingScenario, setEditingScenario] = useState<TestScenario | null>(null)

  const epicScenarios = state.scenarios.filter(s => s.epicId === epicId)
  const areas = [...new Set(epicScenarios.map(s => s.area).filter(Boolean))]

  const filtered = epicScenarios.filter(s => {
    if (areaFilter !== 'all' && s.area !== areaFilter) return false
    if (critFilter !== 'all' && s.criticality !== critFilter) return false
    if (statusFilter !== 'all' && s.status !== statusFilter) return false
    if (search && !s.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }).sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.criticality] - order[b.criticality]
  })

  const deleteScenario = async (s: TestScenario) => {
    if (!confirm(`Excluir cenário "${s.title}"?`)) return
    // clean images
    for (const exec of s.executions) {
      await deleteImagesByPrefix(`exec_${exec.id}_`)
    }
    dispatch({ type: 'DELETE_SCENARIO', payload: s.id })
  }

  const critColors: Record<string, string> = {
    critical: 'border-l-red',
    high: 'border-l-amber',
    medium: 'border-l-purple',
    low: 'border-l-green',
  }

  const statusTint: Record<string, string> = {
    failed: 'bg-red/[0.08] border-red/50',
    blocked: 'bg-amber/[0.08] border-amber/50',
    partial: 'bg-purple/[0.08] border-purple/50',
  }

  const selectCls = 'bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  return (
    <div>
      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-40">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full bg-surface2 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Buscar cenários..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {areas.length > 0 && (
          <select className={selectCls} value={areaFilter} onChange={e => setAreaFilter(e.target.value)}>
            <option value="all">Todas as áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <select className={selectCls} value={critFilter} onChange={e => setCritFilter(e.target.value)}>
          <option value="all">Criticidade</option>
          <option value="critical">Crítica</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>
        <select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Status</option>
          <option value="pending">Pendente</option>
          <option value="passed">Passou</option>
          <option value="failed">Falhou</option>
          <option value="blocked">Bloqueado</option>
          <option value="partial">Parcial</option>
        </select>
        <button
          onClick={() => navigate(`/epic/${epicId}/run`)}
          className="flex items-center gap-2 px-3 py-2 bg-green/10 text-green border border-green/30 rounded-lg text-sm font-medium hover:bg-green/20"
        >
          <Play size={14} /> Execução Guiada
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80"
        >
          <Plus size={14} /> Novo Cenário
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhum cenário encontrado"
          description={epicScenarios.length === 0 ? 'Crie o primeiro cenário de teste.' : 'Tente ajustar os filtros.'}
          action={epicScenarios.length === 0 ? { label: 'Novo Cenário', onClick: () => setShowCreate(true) } : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(scenario => (
            <div key={scenario.id} className={`rounded-xl border-l-2 border ${statusTint[scenario.status] ?? 'bg-surface border-white/[0.07]'} ${critColors[scenario.criticality]}`}>
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface2/50 transition-colors"
                onClick={() => setExpandedId(expandedId === scenario.id ? null : scenario.id)}
              >
                {expandedId === scenario.id ? <ChevronDown size={14} className="text-muted shrink-0" /> : <ChevronRight size={14} className="text-muted shrink-0" />}
                <span className="font-mono text-xs text-muted w-10 shrink-0">#{scenario.id}</span>
                <span className="text-sm text-text flex-1 font-medium">{scenario.title}</span>
                {scenario.area && <span className="text-xs text-muted px-2 py-0.5 bg-surface2 rounded">{scenario.area}</span>}
                <ScenarioStatusBadge status={scenario.status} />
                <span className="text-xs text-muted">{scenario.executions.length} exec.</span>
                <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditingScenario(scenario)} className="p-1.5 text-muted hover:text-text hover:bg-surface2 rounded-lg">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={() => deleteScenario(scenario)} className="p-1.5 text-muted hover:text-red hover:bg-surface2 rounded-lg">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              {expandedId === scenario.id && <div className="px-4 pb-4"><ScenarioDetailTabs scenario={scenario} /></div>}
            </div>
          ))}
        </div>
      )}

      {showCreate && <ScenarioFormModal epicId={epicId} onClose={() => setShowCreate(false)} />}
      {editingScenario && <ScenarioFormModal epicId={epicId} scenario={editingScenario} onClose={() => setEditingScenario(null)} />}
    </div>
  )
}

// ─── Bugs Tab ─────────────────────────────────────────────────────────────────

function BugsTab({ epicId }: { epicId: string }) {
  const { state, dispatch } = useApp()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingBug, setEditingBug] = useState<BugType | null>(null)
  const toast = useToast()

  const bugs = state.bugs.filter(b => b.epicId === epicId).filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.area.toLowerCase().includes(search.toLowerCase())
  )

  const deleteBug = (bug: BugType) => {
    if (!confirm(`Excluir bug "${bug.title}"?`)) return
    dispatch({ type: 'DELETE_BUG', payload: bug.id })
    toast('Bug excluído', 'success')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="w-full bg-surface2 border border-white/[0.07] rounded-lg pl-9 pr-3 py-2 text-sm text-text outline-none focus:border-accent"
            placeholder="Buscar bugs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-3 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80">
          <Plus size={14} /> Novo Bug
        </button>
      </div>

      {bugs.length === 0 ? (
        <EmptyState icon={Bug} title="Nenhum bug registrado" description="Registre bugs encontrados durante o teste." action={{ label: 'Novo Bug', onClick: () => setShowCreate(true) }} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="text-xs text-muted text-left py-2 px-3 font-medium">#</th>
                <th className="text-xs text-muted text-left py-2 px-3 font-medium">Título</th>
                <th className="text-xs text-muted text-left py-2 px-3 font-medium">Área</th>
                <th className="text-xs text-muted text-left py-2 px-3 font-medium">Severidade</th>
                <th className="text-xs text-muted text-left py-2 px-3 font-medium">Status</th>
                <th className="text-xs text-muted text-left py-2 px-3 font-medium">Reprodução</th>
                <th className="text-xs text-muted text-left py-2 px-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {bugs.map(bug => (
                <tr key={bug.id} className="border-b border-white/[0.04] hover:bg-surface2/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono text-xs text-muted">#{bug.id}</td>
                  <td className="py-2.5 px-3 text-text max-w-xs">
                    <p className="truncate">{bug.title}</p>
                    {bug.reopenCount > 0 && <span className="text-xs text-orange-400">Reaberto {bug.reopenCount}x</span>}
                  </td>
                  <td className="py-2.5 px-3 text-muted text-xs">{bug.area}</td>
                  <td className="py-2.5 px-3"><BugSeverityBadge severity={bug.severity} /></td>
                  <td className="py-2.5 px-3"><BugStatusBadge status={bug.status} /></td>
                  <td className="py-2.5 px-3 text-xs text-muted">
                    {bug.reproduction === 'always' ? 'Sempre' : bug.reproduction === 'intermittent' ? 'Intermitente' : bug.reproduction === 'rarely' ? 'Raramente' : 'Não reproduzível'}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <button onClick={() => setEditingBug(bug)} className="p-1.5 text-muted hover:text-text hover:bg-surface2 rounded-lg"><Edit2 size={12} /></button>
                      <button onClick={() => deleteBug(bug)} className="p-1.5 text-muted hover:text-red hover:bg-surface2 rounded-lg"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <BugFormModal epicId={epicId} onClose={() => setShowCreate(false)} />}
      {editingBug && <BugFormModal epicId={epicId} bug={editingBug} onClose={() => setEditingBug(null)} />}
    </div>
  )
}

// ─── Summary Tab ──────────────────────────────────────────────────────────────

function SummaryTab({ epicId }: { epicId: string }) {
  const { state } = useApp()
  const scenarios = state.scenarios.filter(s => s.epicId === epicId)
  const bugs = state.bugs.filter(b => b.epicId === epicId)

  const areas = [...new Set(scenarios.map(s => s.area || 'Sem área'))]

  const rows = areas.map(area => {
    const areScenarios = scenarios.filter(s => (s.area || 'Sem área') === area)
    const total = areScenarios.length
    const passed = areScenarios.filter(s => s.status === 'passed').length
    const failed = areScenarios.filter(s => s.status === 'failed').length
    const pending = areScenarios.filter(s => s.status === 'pending').length
    const partial = areScenarios.filter(s => s.status === 'partial').length
    const blocked = areScenarios.filter(s => s.status === 'blocked').length
    const coverage = total === 0 ? 0 : Math.round(((total - pending) / total) * 100)
    const openBugs = bugs.filter(b => (b.area || 'Sem área') === area && ['open', 'in_progress', 'reopened'].includes(b.status)).length
    return { area, total, passed, failed, pending, partial, blocked, coverage, openBugs }
  })

  return (
    <div>
      <h3 className="text-sm font-semibold text-text mb-4">Resumo por Área</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.07]">
              <th className="text-xs text-muted text-left py-2 px-3 font-medium">Área</th>
              <th className="text-xs text-muted text-right py-2 px-3 font-medium">Total</th>
              <th className="text-xs text-muted text-right py-2 px-3 font-medium">Passou</th>
              <th className="text-xs text-muted text-right py-2 px-3 font-medium">Falhou</th>
              <th className="text-xs text-muted text-right py-2 px-3 font-medium">Pendente</th>
              <th className="text-xs text-muted text-right py-2 px-3 font-medium">Parcial</th>
              <th className="text-xs text-muted text-right py-2 px-3 font-medium">Cobertura</th>
              <th className="text-xs text-muted text-right py-2 px-3 font-medium">Bugs abertos</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-muted text-sm">Nenhum cenário cadastrado</td></tr>
            ) : rows.map(row => (
              <tr key={row.area} className="border-b border-white/[0.04] hover:bg-surface2/30">
                <td className="py-2.5 px-3 text-text font-medium">{row.area}</td>
                <td className="py-2.5 px-3 text-right text-muted">{row.total}</td>
                <td className="py-2.5 px-3 text-right text-green">{row.passed}</td>
                <td className="py-2.5 px-3 text-right text-red">{row.failed}</td>
                <td className="py-2.5 px-3 text-right text-muted">{row.pending}</td>
                <td className="py-2.5 px-3 text-right text-purple">{row.partial}</td>
                <td className="py-2.5 px-3 text-right">
                  <span className={`font-medium ${row.coverage > 70 ? 'text-green' : row.coverage > 40 ? 'text-amber' : 'text-red'}`}>{row.coverage}%</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className={row.openBugs > 0 ? 'text-red' : 'text-muted'}>{row.openBugs}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Epic Dashboard Tab ───────────────────────────────────────────────────────

function EpicDashboardTab({ epicId }: { epicId: string }) {
  const { state } = useApp()
  const scenarios = state.scenarios.filter(s => s.epicId === epicId)
  const bugs = state.bugs.filter(b => b.epicId === epicId)

  const funnelData = [
    { name: 'Total', value: scenarios.length, fill: '#4f8ef7' },
    { name: 'Executado', value: scenarios.filter(s => s.status !== 'pending').length, fill: '#22d3ee' },
    { name: 'Passou', value: scenarios.filter(s => s.status === 'passed').length, fill: '#34d399' },
  ]

  const bugsAreaData = (() => {
    const map: Record<string, number> = {}
    bugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status)).forEach(b => {
      const area = b.area || 'Sem área'
      map[area] = (map[area] || 0) + 1
    })
    return Object.entries(map).map(([area, count]) => ({ area, count }))
  })()

  const byCriticality = ['critical', 'high', 'medium', 'low'].map(crit => {
    const s = scenarios.filter(sc => sc.criticality === crit)
    const passed = s.filter(sc => sc.status === 'passed').length
    return {
      criticality: crit === 'critical' ? 'Crítica' : crit === 'high' ? 'Alta' : crit === 'medium' ? 'Média' : 'Baixa',
      total: s.length,
      passed,
      pct: s.length === 0 ? 0 : Math.round((passed / s.length) * 100)
    }
  }).filter(d => d.total > 0)

  const unstable = scenarios.filter(s => s.executions.filter(e => e.result === 'failed').length > 1)

  const tooltipStyle = { backgroundColor: '#13161d', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', color: '#e8eaf0', fontSize: '12px' }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funnel */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Funil de Execução</h3>
          <div className="flex flex-col gap-3">
            {funnelData.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>{d.name}</span>
                  <span>{d.value}</span>
                </div>
                <div className="h-8 bg-surface2 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all"
                    style={{ width: `${funnelData[0].value === 0 ? 0 : Math.round((d.value / funnelData[0].value) * 100)}%`, backgroundColor: d.fill }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bugs by area */}
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Bugs Abertos por Área</h3>
          {bugsAreaData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted text-sm">Nenhum bug aberto</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={bugsAreaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="area" tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#f87171" radius={[4, 4, 0, 0]} name="Bugs" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Progress by criticality */}
      <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text mb-4">Progresso por Criticidade</h3>
        {byCriticality.length === 0 ? (
          <p className="text-sm text-muted">Nenhum cenário cadastrado.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {byCriticality.map(d => (
              <div key={d.criticality}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-text">{d.criticality}</span>
                  <span className="text-muted">{d.passed}/{d.total} ({d.pct}%)</span>
                </div>
                <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${d.pct > 70 ? 'bg-green' : d.pct > 40 ? 'bg-amber' : 'bg-red'}`}
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unstable scenarios */}
      {unstable.length > 0 && (
        <div className="bg-surface border border-white/[0.07] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-4">Cenários Instáveis (falhou 2+ vezes)</h3>
          <div className="flex flex-col gap-2">
            {unstable.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-red/5 border border-red/20 rounded-lg px-4 py-3">
                <span className="font-mono text-xs text-muted">#{s.id}</span>
                <span className="text-sm text-text flex-1">{s.title}</span>
                <span className="text-xs text-red">{s.executions.filter(e => e.result === 'failed').length} falhas</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Epic Edit Modal ──────────────────────────────────────────────────────────

function EpicEditModal({ epic, onClose }: { epic: Epic; onClose: () => void }) {
  const { dispatch } = useApp()
  const toast = useToast()
  const [form, setForm] = useState({
    name: epic.name,
    description: epic.description,
    squad: epic.squad,
    product: epic.product,
    status: epic.status,
    priority: epic.priority,
    startDate: epic.startDate,
    deadline: epic.deadline,
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const save = () => {
    if (!form.name.trim()) { toast('Nome é obrigatório', 'error'); return }
    dispatch({ type: 'UPDATE_EPIC', payload: { ...epic, ...form, updatedAt: new Date().toISOString() } })
    toast('Épico atualizado', 'success')
    onClose()
  }

  const cls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'
  const lbl = 'block text-xs text-muted mb-1.5'

  return (
    <Modal title="Editar Épico" onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={lbl}>Nome *</label>
          <input className={cls} value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className={lbl}>Descrição</label>
          <textarea className={cls + ' resize-none'} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Descreva o épico" />
        </div>
        <div>
          <label className={lbl}>Squad</label>
          <input className={cls} value={form.squad} onChange={e => set('squad', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Produto</label>
          <input className={cls} value={form.product} onChange={e => set('product', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Status</label>
          <select className={cls} value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="planning">Planejamento</option>
            <option value="running">Em execução</option>
            <option value="blocked">Bloqueado</option>
            <option value="done">Concluído</option>
            <option value="archived">Arquivado</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Prioridade</label>
          <select className={cls} value={form.priority} onChange={e => set('priority', e.target.value)}>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Data de início</label>
          <input type="date" className={cls} value={form.startDate} onChange={e => set('startDate', e.target.value)} />
        </div>
        <div>
          <label className={lbl}>Deadline</label>
          <input type="date" className={cls} value={form.deadline} onChange={e => set('deadline', e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-muted hover:text-text">Cancelar</button>
        <button onClick={save} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80">Salvar</button>
      </div>
    </Modal>
  )
}

// ─── Main EpicPage ────────────────────────────────────────────────────────────

export default function EpicPage() {
  const { id } = useParams<{ id: string }>()
  const { state } = useApp()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'tasks' | 'scenarios' | 'bugs' | 'summary' | 'dashboard'>('tasks')
  const [editingEpic, setEditingEpic] = useState(false)

  const epic = state.epics.find(e => e.id === id)

  if (!epic) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted mb-4">Épico não encontrado.</p>
          <button onClick={() => navigate('/')} className="text-accent hover:text-accent/80 text-sm">
            Voltar para Épicos
          </button>
        </div>
      </div>
    )
  }

  const epicScenarios = state.scenarios.filter(s => s.epicId === epic.id)
  const epicBugs = state.bugs.filter(b => b.epicId === epic.id)
  const openBugs = epicBugs.filter(b => ['open', 'in_progress', 'reopened'].includes(b.status)).length

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === t ? 'bg-accent/20 text-accent' : 'text-muted hover:text-text hover:bg-surface2'}`

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-muted mb-2">
          <button onClick={() => navigate('/')} className="hover:text-text transition-colors">Épicos</button>
          <span>/</span>
          <span className="text-text">{epic.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-text mb-1">{epic.name}</h1>
              <button onClick={() => setEditingEpic(true)} className="p-1.5 text-muted hover:text-text hover:bg-surface2 rounded-lg transition-colors mb-1" title="Editar épico">
                <Edit2 size={14} />
              </button>
            </div>
            <p className="text-sm text-muted">{epic.product}{epic.squad ? ` · ${epic.squad}` : ''}</p>
            {epic.description && <p className="text-sm text-muted mt-1.5 max-w-2xl">{epic.description}</p>}
          </div>
          <div className="text-right text-xs text-muted shrink-0">
            <p>{epicScenarios.length} cenários</p>
            <p>{openBugs} bugs abertos</p>
          </div>
        </div>
      </div>

      {editingEpic && <EpicEditModal epic={epic} onClose={() => setEditingEpic(false)} />}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-surface rounded-xl border border-white/[0.07] w-fit">
        <button className={tabCls('tasks')} onClick={() => setActiveTab('tasks')}>
          Por Tarefa
        </button>
        <button className={tabCls('scenarios')} onClick={() => setActiveTab('scenarios')}>
          Todos ({epicScenarios.length})
        </button>
        <button className={tabCls('bugs')} onClick={() => setActiveTab('bugs')}>
          Bugs ({epicBugs.length})
        </button>
        <button className={tabCls('summary')} onClick={() => setActiveTab('summary')}>Resumo</button>
        <button className={tabCls('dashboard')} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
      </div>

      {/* Content */}
      {activeTab === 'tasks' && <TasksTab epicId={epic.id} />}
      {activeTab === 'scenarios' && <ScenariosTab epicId={epic.id} />}
      {activeTab === 'bugs' && <BugsTab epicId={epic.id} />}
      {activeTab === 'summary' && <SummaryTab epicId={epic.id} />}
      {activeTab === 'dashboard' && <EpicDashboardTab epicId={epic.id} />}
    </div>
  )
}
