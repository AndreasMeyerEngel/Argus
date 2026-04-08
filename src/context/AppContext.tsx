import React, { createContext, useContext, useReducer, useEffect, useState } from 'react'
import { AppState, Epic, EpicTask, TestScenario, Bug, TestExecution } from '../types'
import { loadState, saveState, defaultState } from '../lib/storage'

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

    case 'UPDATE_EPIC':
      return {
        ...state,
        epics: state.epics.map(e => e.id === action.payload.id ? action.payload : e)
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

    case 'ADD_SCENARIO':
      return {
        ...state,
        scenarios: [...state.scenarios, action.payload],
        nextScenarioId: state.nextScenarioId + 1
      }

    case 'UPDATE_SCENARIO':
      return {
        ...state,
        scenarios: state.scenarios.map(s => s.id === action.payload.id ? action.payload : s)
      }

    case 'DELETE_SCENARIO':
      return {
        ...state,
        scenarios: state.scenarios.filter(s => s.id !== action.payload)
      }

    case 'ADD_BUG':
      return {
        ...state,
        bugs: [...state.bugs, action.payload],
        nextBugId: state.nextBugId + 1
      }

    case 'UPDATE_BUG':
      return {
        ...state,
        bugs: state.bugs.map(b => b.id === action.payload.id ? action.payload : b)
      }

    case 'DELETE_BUG':
      return {
        ...state,
        bugs: state.bugs.filter(b => b.id !== action.payload)
      }

    case 'ADD_EXECUTION': {
      const { scenarioId, execution } = action.payload
      return {
        ...state,
        scenarios: state.scenarios.map(s => {
          if (s.id !== scenarioId) return s
          return {
            ...s,
            executions: [...s.executions, execution],
            status: execution.result,
            updatedAt: new Date().toISOString()
          }
        }),
        nextExecId: state.nextExecId + 1
      }
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
