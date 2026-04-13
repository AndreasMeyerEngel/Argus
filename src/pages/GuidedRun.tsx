import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckSquare, X, ChevronLeft, ChevronRight, AlertTriangle, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { TestScenario, Bug } from '../types'
import { useToast } from '../components/ui/Toast'

export default function GuidedRun() {
  const { id } = useParams<{ id: string }>()
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const toast = useToast()

  const epic = state.epics.find(e => e.id === id)

  const critOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const pendingScenarios = state.scenarios
    .filter(s => s.epicId === id && s.status === 'pending')
    .sort((a, b) => critOrder[a.criticality] - critOrder[b.criticality])

  const [currentIdx, setCurrentIdx] = useState(0)
  const [checkedPreconditions, setCheckedPreconditions] = useState<Record<string, boolean>>({})
  const [observedValues, setObservedValues] = useState<Record<string, string>>({})
  const [showBugForm, setShowBugForm] = useState(false)
  const [bugTitle, setBugTitle] = useState('')
  const [bugArea, setBugArea] = useState('')
  const [bugSeverity, setBugSeverity] = useState<Bug['severity']>('high')
  const [bugObs, setBugObs] = useState('')
  const [done, setDone] = useState(false)

  if (!epic || pendingScenarios.length === 0) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <CheckSquare size={48} className="text-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text mb-2">
            {done ? 'Execução concluída!' : 'Sem cenários pendentes'}
          </h1>
          <p className="text-muted mb-6">
            {done ? 'Todos os cenários foram executados.' : 'Não há cenários pendentes neste épico.'}
          </p>
          <button
            onClick={() => navigate(`/epic/${id}`)}
            className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/80"
          >
            Voltar ao Épico
          </button>
        </div>
      </div>
    )
  }

  const currentScenario = pendingScenarios[currentIdx]

  const handleResult = (result: 'passed' | 'failed' | 'blocked') => {
    const execId = String(state.nextExecId).padStart(4, '0')
    dispatch({
      type: 'ADD_EXECUTION',
      payload: {
        scenarioId: currentScenario.id,
        execution: {
          id: execId,
          date: new Date().toISOString(),
          result,
          notes: Object.entries(observedValues).map(([k, v]) => v ? `Passo ${k}: ${v}` : '').filter(Boolean).join('\n'),
          executedBy: state.settings.userName || 'Execução Guiada',
          imgCount: 0
        }
      }
    })

    if (result === 'failed') {
      setShowBugForm(true)
      return
    }

    goNext()
  }

  const goNext = () => {
    setObservedValues({})
    setCheckedPreconditions({})
    setShowBugForm(false)
    setBugTitle('')
    setBugArea('')
    setBugObs('')

    if (currentIdx < pendingScenarios.length - 1) {
      setCurrentIdx(v => v + 1)
    } else {
      setDone(true)
    }
  }

  const saveBugAndContinue = () => {
    if (bugTitle.trim()) {
      const bugId = String(state.nextBugId).padStart(4, '0')
      dispatch({
        type: 'ADD_BUG',
        payload: {
          id: bugId,
          epicId: id!,
          title: bugTitle,
          area: bugArea || currentScenario.area,
          severity: bugSeverity,
          status: 'open',
          reproduction: 'always',
          linkedScenarios: [currentScenario.id],
          responsible: state.settings.userName || '',
          observations: bugObs,
          comments: [],
          openedAt: new Date().toISOString(),
          reopenCount: 0
        }
      })
      dispatch({
        type: 'UPDATE_SCENARIO',
        payload: { ...currentScenario, linkedBugs: [...currentScenario.linkedBugs, bugId] }
      })
      toast('Bug registrado', 'success')
    }
    goNext()
  }

  const critColor: Record<string, string> = {
    critical: 'text-red border-red/30 bg-red/5',
    high: 'text-amber border-amber/30 bg-amber/5',
    medium: 'text-purple border-purple/30 bg-purple/5',
    low: 'text-green border-green/30 bg-green/5',
  }

  const critLabel: Record<string, string> = {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Médio',
    low: 'Baixo',
  }

  if (done) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <CheckSquare size={48} className="text-green mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text mb-2">Execução concluída!</h1>
          <p className="text-muted mb-6">Todos os {pendingScenarios.length} cenários pendentes foram processados.</p>
          <button onClick={() => navigate(`/epic/${id}`)} className="px-6 py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/80">
            Voltar ao Épico
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-surface border-b border-white/[0.07] px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(`/epic/${id}`)} className="text-muted hover:text-text">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted">{epic.name} · Execução Guiada</p>
          <p className="text-sm font-medium text-text">
            Cenário {currentIdx + 1} de {pendingScenarios.length} pendentes
          </p>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-2">
          {pendingScenarios.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i < currentIdx ? 'w-3 bg-green' : i === currentIdx ? 'w-6 bg-accent' : 'w-3 bg-surface2'
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => navigate(`/epic/${id}`)}
          className="px-3 py-1.5 text-xs text-muted border border-white/[0.07] rounded-lg hover:text-text hover:border-white/20"
        >
          Encerrar execução
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        {/* Scenario Header */}
        <div className={`border rounded-xl p-4 mb-6 ${critColor[currentScenario.criticality]}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${critColor[currentScenario.criticality].split(' ')[0]}`}>
                  [{critLabel[currentScenario.criticality]}]
                </span>
                <span className="font-mono text-xs text-muted">#{currentScenario.id}</span>
                {currentScenario.area && <span className="text-xs text-muted">· {currentScenario.area}</span>}
              </div>
              <h2 className="text-lg font-bold text-text">{currentScenario.title}</h2>
            </div>
          </div>
        </div>

        {/* Preconditions */}
        {currentScenario.preconditions.length > 0 && (
          <div className="bg-surface border border-white/[0.07] rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-text mb-3">Pré-condições</h3>
            <div className="flex flex-col gap-2">
              {currentScenario.preconditions.map((p, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checkedPreconditions[i]}
                    onChange={e => setCheckedPreconditions(prev => ({ ...prev, [i]: e.target.checked }))}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className={`text-sm transition-colors ${checkedPreconditions[i] ? 'line-through text-muted' : 'text-text'}`}>{p}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Acceptance Criteria */}
        {currentScenario.acceptanceCriteria && (
          <div className="bg-surface border border-white/[0.07] rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-text mb-2">Critérios de Aceite</h3>
            <p className="text-sm text-muted whitespace-pre-wrap">{currentScenario.acceptanceCriteria}</p>
          </div>
        )}

        {/* Steps */}
        {currentScenario.steps.length > 0 && (
          <div className="bg-surface border border-white/[0.07] rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-text mb-4">Passos</h3>
            <div className="flex flex-col gap-4">
              {currentScenario.steps.map(step => (
                <div key={step.id} className="border-b border-white/[0.04] pb-4 last:border-0 last:pb-0">
                  <p className="text-xs font-mono text-muted mb-1">Passo {step.order}</p>
                  <p className="text-sm font-medium text-text mb-2">{step.action}</p>
                  {step.expected && (
                    <p className="text-xs text-green mb-2">Esperado: {step.expected}</p>
                  )}
                  <div>
                    <label className="block text-xs text-muted mb-1">O que aconteceu (observado)</label>
                    <input
                      className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent"
                      value={observedValues[step.order] || ''}
                      onChange={e => setObservedValues(prev => ({ ...prev, [step.order]: e.target.value }))}
                      placeholder="Descreva o comportamento observado..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bug Form (inline) */}
        {showBugForm && (
          <div className="bg-red/5 border border-red/30 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-red" />
              <h3 className="text-sm font-semibold text-red">Registrar Bug (opcional)</h3>
            </div>
            <div className="flex flex-col gap-3">
              <input
                className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-red"
                value={bugTitle}
                onChange={e => setBugTitle(e.target.value)}
                placeholder="Título do bug encontrado"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-red"
                  value={bugArea}
                  onChange={e => setBugArea(e.target.value)}
                  placeholder="Área"
                />
                <select
                  className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-red"
                  value={bugSeverity}
                  onChange={e => setBugSeverity(e.target.value as Bug['severity'])}
                >
                  <option value="critical">Crítico</option>
                  <option value="high">Alto</option>
                  <option value="medium">Médio</option>
                  <option value="low">Baixo</option>
                </select>
              </div>
              <textarea
                className="w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-red resize-none"
                rows={2}
                value={bugObs}
                onChange={e => setBugObs(e.target.value)}
                placeholder="Observações"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={saveBugAndContinue} className="flex items-center gap-2 px-4 py-2 bg-red text-white rounded-lg text-sm font-medium hover:bg-red/80">
                <Plus size={14} /> Criar Bug e Continuar
              </button>
              <button onClick={goNext} className="px-4 py-2 text-sm text-muted hover:text-text border border-white/[0.07] rounded-lg">
                Pular e Continuar
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showBugForm && (
          <div className="grid grid-cols-3 gap-4 mt-2">
            <button
              onClick={() => handleResult('passed')}
              className="py-4 text-base font-bold text-green border-2 border-green/30 bg-green/10 rounded-xl hover:bg-green/20 transition-all"
            >
              PASSOU
            </button>
            <button
              onClick={() => handleResult('failed')}
              className="py-4 text-base font-bold text-red border-2 border-red/30 bg-red/10 rounded-xl hover:bg-red/20 transition-all"
            >
              FALHOU
            </button>
            <button
              onClick={() => handleResult('blocked')}
              className="py-4 text-base font-bold text-amber border-2 border-amber/30 bg-amber/10 rounded-xl hover:bg-amber/20 transition-all"
            >
              BLOQUEADO
            </button>
          </div>
        )}

        {!showBugForm && (
          <button
            onClick={goNext}
            className="w-full mt-3 py-3 text-sm text-muted border border-white/[0.07] rounded-xl hover:text-text hover:border-white/20 transition-colors"
          >
            Pular cenário
          </button>
        )}
      </main>
    </div>
  )
}
