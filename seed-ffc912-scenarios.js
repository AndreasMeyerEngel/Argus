// ─── Seed: FFC-912 — adiciona cenários 7-16 + remove "Sem tarefa" ─────────────
// Cole no Console do DevTools com o app aberto e recarregue (F5).

(() => {
  const KEY = 'pxqa_v1'
  const raw = localStorage.getItem(KEY)
  if (!raw) { console.error('❌ Estado não encontrado. O app foi aberto?'); return }
  const state = JSON.parse(raw)

  // ── 1. Acha o épico FFC-580 ──────────────────────────────────────────────
  const epic = state.epics.find(e => e.name.includes('FFC-580'))
  if (!epic) { console.error('❌ Épico FFC-580 não encontrado.'); return }
  console.log(`✅ Épico: "${epic.name}" (id: ${epic.id})`)

  // ── 2. Acha a tarefa FFC-912 dentro do épico ─────────────────────────────
  const tasks = state.tasks ?? []
  const task = tasks.find(t => t.epicId === epic.id && t.name.includes('FFC-912'))
  if (!task) { console.error('❌ Tarefa "FFC-912" não encontrada dentro do épico FFC-580.'); return }
  console.log(`✅ Tarefa: "${task.name}" (id: ${task.id})`)

  // ── 3. Remove todos os cenários sem tarefa deste épico ───────────────────
  const semTarefa = state.scenarios.filter(s =>
    s.epicId === epic.id && (!s.taskId || !tasks.find(t => t.id === s.taskId && t.epicId === epic.id))
  )
  const semTarefaIds = new Set(semTarefa.map(s => s.id))
  state.scenarios = state.scenarios.filter(s => !semTarefaIds.has(s.id))
  console.log(`🗑️  ${semTarefa.length} cenário(s) sem tarefa removidos.`)

  // ── 4. Novos cenários a adicionar ─────────────────────────────────────────
  // [área, título, criticality, isSensitive, notes]
  const newRows = [
    [
      'FinancialAccountLimitService',
      'Múltiplas entradas de débito são somadas corretamente',
      'high', true,
      'DEBIT=2000 + DEBIT=3000 → available=5000'
    ],
    [
      'FinancialAccountLimitService',
      'accountId zero lança InvalidArgumentException',
      'high', false,
      'Verificar log de warning também'
    ],
    [
      'FinancialAccountLimitService',
      'accountId negativo lança InvalidArgumentException',
      'high', false,
      ''
    ],
    [
      'FinancialAccountLimitService',
      'Conta inexistente lança ActiveFinancialAccountLimitNotFoundException',
      'high', false,
      'accountId=999999'
    ],
    [
      'FinancialAccountLimitService',
      'Limite com status Suspended não é encontrado — lança exceção',
      'high', false,
      'findActiveByAccountId ignora Suspended'
    ],
    [
      'Isolamento de Dados',
      'Entradas de ledger de outras contas não afetam o cálculo',
      'high', false,
      'Conta B com DEBIT=9000 não contamina conta A'
    ],
    [
      'Isolamento de Dados',
      'Limite de outra empresa não interfere no resultado',
      'high', false,
      'Duas companies distintas com accounts distintas'
    ],
    [
      'FinancialAccountLimitService',
      'available_limit fica negativo quando débitos excedem o limite',
      'low', false,
      'DEBIT=6000 > limit=5000 → available=-1000'
    ],
    [
      'FinancialAccountLimitService',
      'Conta apenas com entradas de crédito aumenta além do limite concedido',
      'low', false,
      'CREDIT=5000, limit=10000 → available=15000'
    ],
    [
      'FinancialAccountLimitService',
      'COALESCE garante retorno zero quando não há entradas de ledger',
      'low', false,
      'Sem entradas → net=0, não null'
    ],
  ]

  const now = new Date().toISOString()
  let nextId = state.nextScenarioId

  // Calcula order a partir dos existentes da tarefa
  const existingInTask = state.scenarios.filter(s => s.taskId === task.id)
  let orderCounter = existingInTask.length + 1

  const newScenarios = newRows.map(([area, title, criticality, isSensitive, notes]) => {
    const id = String(nextId++).padStart(4, '0')
    return {
      id,
      epicId: epic.id,
      taskId: task.id,
      order: orderCounter++,
      title,
      area,
      criticality,
      status: 'pending',
      isSensitive,
      preconditions: [],
      testData: '',
      acceptanceCriteria: '',
      steps: [],
      linkedBugs: [],
      executions: [],
      responsible: '',
      notes,
      createdAt: now,
      updatedAt: now,
    }
  })

  state.scenarios.push(...newScenarios)
  state.nextScenarioId = nextId

  // ── 5. Alerta sobre cenários conflitantes ─────────────────────────────────
  console.warn(
    '⚠️  ATENÇÃO: Os cenários 10 e 11 (lança exceção) conflitam com testes existentes ' +
    '(test_returns_empty_when_account_has_no_limit e test_returns_empty_when_limit_is_suspended) ' +
    'que esperam DTO vazio. Alinhe com o dev antes de definir o comportamento esperado.'
  )

  // ── 6. Salva ──────────────────────────────────────────────────────────────
  localStorage.setItem(KEY, JSON.stringify(state))
  console.log(`✅ ${newScenarios.length} cenário(s) adicionados à tarefa "${task.name}". Recarregue (F5).`)
})()
