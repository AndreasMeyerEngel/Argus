export interface TestStep {
  id: string
  order: number
  action: string
  expected: string
  observed: string
}

export interface TestExecution {
  id: string
  date: string
  result: 'passed' | 'failed' | 'blocked' | 'partial'
  notes: string
  executedBy: string
  imgCount: number
}

export interface EpicTask {
  id: string
  epicId?: string
  name: string
  description: string
  notes: string
  order: number
  createdAt: string
}

export interface TestScenario {
  id: string
  epicId: string
  taskId?: string
  bugId?: string
  order: number
  title: string
  area: string
  criticality: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'passed' | 'failed' | 'blocked' | 'partial'
  isSensitive: boolean
  preconditions: string[]
  testData: string
  acceptanceCriteria: string
  steps: TestStep[]
  linkedBugs: string[]
  executions: TestExecution[]
  responsible: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface Epic {
  id: string
  name: string
  description: string
  squad: string
  product: string
  status: 'planning' | 'running' | 'blocked' | 'done' | 'archived'
  priority: 'critical' | 'high' | 'medium' | 'low'
  startDate: string
  deadline: string
  createdAt: string
  updatedAt: string
}

export interface Bug {
  id: string
  epicId: string
  title: string
  area: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened'
  reproduction: 'always' | 'intermittent' | 'rarely' | 'not_reproducible'
  linkedScenarios: string[]
  responsible: string
  observations: string
  openedAt: string
  resolvedAt?: string
  reopenedAt?: string
  reopenCount: number
  epicName?: string
}

export interface AppState {
  epics: Epic[]
  tasks: EpicTask[]
  scenarios: TestScenario[]
  bugs: Bug[]
  nextEpicId: number
  nextTaskId: number
  nextScenarioId: number
  nextBugId: number
  nextExecId: number
  settings: {
    userName: string
    reportPeriodDays: number
  }
}
