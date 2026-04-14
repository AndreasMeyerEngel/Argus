import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { AppState, Epic, EpicTask, TestScenario, Bug, TestExecution, HistoryEntry, Comment, TestPlan, PlanScenarioItem } from '../types'
import { loadState, saveState, defaultState } from '../lib/storage'

// ─── History helper ───────────────────────────────────────────────────────────

function pushHistory(state: AppState, entry: Omit<HistoryEntry, 'id'>): AppState {
  const id = String(state.nextHistoryId ?? 1).padStart(6, '0')
  return {
    ...state,
    history: [...(state.history ?? []), { ...entry, id }],
    nextHistoryId: (state.nextHistoryId ?? 1) + 1,
  }
}

type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_EPIC'; payload: Epic }
  | { type: 'UPDATE_EPIC'; payload: Epic }
  | { type: 'DELETE_EPIC'; payload: string }
  | { type: 'DUPLICATE_EPIC'; payload: string }
  | { type: 'ADD_TASK'; payload: EpicTask }
  | { type: 'UPDATE_TASK'; payload: EpicTask }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'ADD_SCENARIO'; payload: TestScenario }
  | { type: 'UPDATE_SCENARIO'; payload: TestScenario }
  | { type: 'DELETE_SCENARIO'; payload: string }
  | { type: 'ADD_BUG'; payload: Bug }
  | { type: 'UPDATE_BUG'; payload: Bug }
  | { type: 'DELETE_BUG'; payload: string }
  | { type: 'ADD_EXECUTION'; payload: { scenarioId: string; execution: TestExecution } }
  | { type: 'UPDATE_EXECUTION'; payload: { scenarioId: string; execution: TestExecution } }
  | { type: 'DELETE_EXECUTION'; payload: { scenarioId: string; execId: string } }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }
  | { type: 'ADD_COMMENT'; payload: { entityType: 'scenario' | 'bug'; entityId: string; comment: Comment } }
  | { type: 'DELETE_COMMENT'; payload: { entityType: 'scenario' | 'bug'; entityId: string; commentId: string } }
  | { type: 'ADD_TEST_PLAN'; payload: TestPlan }
  | { type: 'UPDATE_TEST_PLAN'; payload: TestPlan }
  | { type: 'DELETE_TEST_PLAN'; payload: string }
  | { type: 'EXECUTE_PLAN_SCENARIO'; payload: { planId: string; item: PlanScenarioItem } }
  | { type: 'ADD_PLAN_COMMENT'; payload: { planId: string; comment: Comment } }
  | { type: 'DELETE_PLAN_COMMENT'; payload: { planId: string; commentId: string } }

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_STATE':
      return action.payload

    case 'ADD_EPIC':
      return {
        ...state,
        epics: [...state.epics, action.payload],
        nextEpicId: state.nextEpicId + 1
      }

    case 'UPDATE_EPIC': {
      const prev = state.epics.find(e => e.id === action.payload.id)
      let next: AppState = { ...state, epics: state.epics.map(e => e.id === action.payload.id ? action.payload : e) }
      if (prev && prev.status !== action.payload.status) {
        next = pushHistory(next, {
          timestamp: new Date().toISOString(),
          entityType: 'epic', action: 'status_changed',
          entityId: action.payload.id, entityTitle: action.payload.name,
          epicId: action.payload.id,
          from: prev.status, to: action.payload.status,
        })
      }
      return next
    }

    case 'DELETE_EPIC':
      return {
        ...state,
        epics: state.epics.filter(e => e.id !== action.payload),
        tasks: (state.tasks ?? []).filter(t => t.epicId !== action.payload),
        scenarios: state.scenarios.filter(s => s.epicId !== action.payload),
        bugs: state.bugs.filter(b => b.epicId !== action.payload)
      }

    case 'DUPLICATE_EPIC': {
      const original = state.epics.find(e => e.id === action.payload)
      if (!original) return state
      const newId = String(state.nextEpicId).padStart(4, '0')
      const newEpic: Epic = {
        ...original,
        id: newId,
        name: `${original.name} (cópia)`,
        status: 'planning',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      return {
        ...state,
        epics: [...state.epics, newEpic],
        nextEpicId: state.nextEpicId + 1
      }
    }

    case 'ADD_TASK':
      return {
        ...state,
        tasks: [...(state.tasks ?? []), action.payload],
        nextTaskId: (state.nextTaskId ?? 1) + 1
      }

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: (state.tasks ?? []).map(t => t.id === action.payload.id ? action.payload : t)
      }

    case 'DELETE_TASK':
      return {
        ...state,
        tasks: (state.tasks ?? []).filter(t => t.id !== action.payload),
        // unlink scenarios from deleted task
        scenarios: state.scenarios.map(s => s.taskId === action.payload ? { ...s, taskId: undefined } : s)
      }

    case 'ADD_SCENARIO': {
      const s = action.payload
      const next: AppState = { ...state, scenarios: [...state.scenarios, s], nextScenarioId: state.nextScenarioId + 1 }
      return pushHistory(next, {
        timestamp: s.createdAt,
        entityType: 'scenario', action: 'created',
        entityId: s.id, entityTitle: s.title,
        epicId: s.epicId,
        actor: s.responsible,
      })
    }

    case 'UPDATE_SCENARIO': {
      const prev = state.scenarios.find(s => s.id === action.payload.id)
      let next: AppState = { ...state, scenarios: state.scenarios.map(s => s.id === action.payload.id ? action.payload : s) }
      if (prev && prev.status !== action.payload.status) {
        next = pushHistory(next, {
          timestamp: action.payload.updatedAt ?? new Date().toISOString(),
          entityType: 'scenario', action: 'status_changed',
          entityId: action.payload.id, entityTitle: action.payload.title,
          epicId: action.payload.epicId,
          from: prev.status, to: action.payload.status,
          actor: action.payload.responsible,
        })
      }
      return next
    }

    case 'DELETE_SCENARIO':
      return {
        ...state,
        scenarios: state.scenarios.filter(s => s.id !== action.payload)
      }

    case 'ADD_BUG': {
      const b = action.payload
      const next: AppState = { ...state, bugs: [...state.bugs, b], nextBugId: state.nextBugId + 1 }
      return pushHistory(next, {
        timestamp: b.openedAt,
        entityType: 'bug', action: 'created',
        entityId: b.id, entityTitle: b.title,
        epicId: b.epicId,
        to: b.status,
        actor: b.responsible,
      })
    }

    case 'UPDATE_BUG': {
      const prev = state.bugs.find(b => b.id === action.payload.id)
      let next: AppState = { ...state, bugs: state.bugs.map(b => b.id === action.payload.id ? action.payload : b) }
      if (prev && prev.status !== action.payload.status) {
        next = pushHistory(next, {
          timestamp: new Date().toISOString(),
          entityType: 'bug', action: 'status_changed',
          entityId: action.payload.id, entityTitle: action.payload.title,
          epicId: action.payload.epicId,
          from: prev.status, to: action.payload.status,
          actor: action.payload.responsible,
        })
      }
      return next
    }

    case 'DELETE_BUG':
      return {
        ...state,
        bugs: state.bugs.filter(b => b.id !== action.payload),
        scenarios: state.scenarios.map(s =>
          s.bugId === action.payload ? { ...s, bugId: undefined } : s
        )
      }

    case 'ADD_EXECUTION': {
      const { scenarioId, execution } = action.payload
      const scenario = state.scenarios.find(s => s.id === scenarioId)
      let next: AppState = {
        ...state,
        scenarios: state.scenarios.map(s => {
          if (s.id !== scenarioId) return s
          return { ...s, executions: [...s.executions, execution], status: execution.result, updatedAt: new Date().toISOString() }
        }),
        nextExecId: state.nextExecId + 1,
      }
      if (scenario) {
        next = pushHistory(next, {
          timestamp: execution.date,
          entityType: 'scenario', action: 'executed',
          entityId: scenarioId, entityTitle: scenario.title,
          epicId: scenario.epicId,
          to: execution.result,
          actor: execution.executedBy,
          notes: execution.notes || undefined,
        })
      }
      return next
    }

    case 'UPDATE_EXECUTION': {
      const { scenarioId, execution } = action.payload
      return {
        ...state,
        scenarios: state.scenarios.map(s => {
          if (s.id !== scenarioId) return s
          const updatedExecs = s.executions.map(e => e.id === execution.id ? execution : e)
          const lastExec = [...updatedExecs].sort((a, b) => b.id.localeCompare(a.id))[0]
          return {
            ...s,
            executions: updatedExecs,
            status: lastExec ? lastExec.result : 'pending',
            updatedAt: new Date().toISOString()
          }
        })
      }
    }

    case 'DELETE_EXECUTION': {
      const { scenarioId, execId } = action.payload
      return {
        ...state,
        scenarios: state.scenarios.map(s => {
          if (s.id !== scenarioId) return s
          const remaining = s.executions.filter(e => e.id !== execId)
          const lastResult = remaining.length > 0 ? remaining[remaining.length - 1].result : 'pending'
          return {
            ...s,
            executions: remaining,
            status: lastResult,
            updatedAt: new Date().toISOString()
          }
        })
      }
    }

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      }

    case 'ADD_COMMENT': {
      const { entityType, entityId, comment } = action.payload
      if (entityType === 'scenario') {
        return {
          ...state,
          scenarios: state.scenarios.map(s =>
            s.id === entityId ? { ...s, comments: [...(s.comments ?? []), comment] } : s
          )
        }
      }
      return {
        ...state,
        bugs: state.bugs.map(b =>
          b.id === entityId ? { ...b, comments: [...(b.comments ?? []), comment] } : b
        )
      }
    }

    case 'DELETE_COMMENT': {
      const { entityType, entityId, commentId } = action.payload
      if (entityType === 'scenario') {
        return {
          ...state,
          scenarios: state.scenarios.map(s =>
            s.id === entityId ? { ...s, comments: (s.comments ?? []).filter(c => c.id !== commentId) } : s
          )
        }
      }
      return {
        ...state,
        bugs: state.bugs.map(b =>
          b.id === entityId ? { ...b, comments: (b.comments ?? []).filter(c => c.id !== commentId) } : b
        )
      }
    }

    case 'ADD_TEST_PLAN': {
      const tp = action.payload
      return {
        ...state,
        testPlans: [...(state.testPlans ?? []), tp],
        nextTestPlanId: (state.nextTestPlanId ?? 1) + 1,
      }
    }

    case 'UPDATE_TEST_PLAN':
      return {
        ...state,
        testPlans: (state.testPlans ?? []).map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      }

    case 'DELETE_TEST_PLAN':
      return {
        ...state,
        testPlans: (state.testPlans ?? []).filter(p => p.id !== action.payload),
      }

    case 'EXECUTE_PLAN_SCENARIO': {
      const { planId, item } = action.payload
      return {
        ...state,
        testPlans: (state.testPlans ?? []).map(p => {
          if (p.id !== planId) return p
          const exists = p.scenarios.some(s => s.scenarioId === item.scenarioId)
          const scenarios = exists
            ? p.scenarios.map(s => s.scenarioId === item.scenarioId ? item : s)
            : [...p.scenarios, item]
          return { ...p, scenarios, updatedAt: new Date().toISOString() }
        }),
      }
    }

    case 'ADD_PLAN_COMMENT': {
      const { planId, comment } = action.payload
      return {
        ...state,
        testPlans: (state.testPlans ?? []).map(p =>
          p.id === planId ? { ...p, comments: [...(p.comments ?? []), comment] } : p
        ),
      }
    }

    case 'DELETE_PLAN_COMMENT': {
      const { planId, commentId } = action.payload
      return {
        ...state,
        testPlans: (state.testPlans ?? []).map(p =>
          p.id === planId ? { ...p, comments: (p.comments ?? []).filter(c => c.id !== commentId) } : p
        ),
      }
    }

    default:
      return state
  }
}

interface AppContextType {
  state: AppState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadState().then(loaded => {
      dispatch({ type: 'SET_STATE', payload: loaded })
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (ready) saveState(state)
  }, [state, ready])

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
