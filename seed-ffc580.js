// ─── Seed: FFC-580 GESTÃO DE SALDO VIA FATURA ───────────────────────────────
// Cole este script no Console do DevTools enquanto o app estiver aberto em
// http://localhost:5173 e depois recarregue a página (F5).

(() => {
  const KEY = 'pxqa_v1'
  const raw = localStorage.getItem(KEY)
  const state = raw ? JSON.parse(raw) : {
    epics: [], scenarios: [], bugs: [],
    nextEpicId: 1, nextScenarioId: 1, nextBugId: 1, nextExecId: 1,
    settings: { userName: '', reportPeriodDays: 14 }
  }

  const now = new Date().toISOString()

  // ── Épico ────────────────────────────────────────────────────────────────
  const epicId = String(state.nextEpicId).padStart(4, '0')
  const epic = {
    id: epicId,
    name: 'FFC-580 — Gestão de Saldo via Fatura',
    description: 'Cobertura completa do fluxo de crédito, pagamento de contrato, estorno, ciclo de faturamento, fechamento de ciclo, fatura e inadimplência.',
    squad: '',
    product: 'FFC',
    status: 'running',
    priority: 'critical',
    startDate: new Date().toISOString().slice(0, 10),
    deadline: '',
    createdAt: now,
    updatedAt: now,
  }

  // ── Cenários (28) ─────────────────────────────────────────────────────────
  const rows = [
    // [área, título, criticality, isSensitive]
    ['Limite de crédito', 'Limite disponível calculado corretamente (concedido − exposição − AR)', 'critical', true],
    ['Limite de crédito', 'Bloqueio de uso quando limite atingido ou suspenso', 'critical', true],
    ['Limite de crédito', 'Histórico de alterações registrado com valor anterior, novo, motivo e responsável', 'high', false],
    ['Limite de crédito', 'Limite cancelado impede novos usos mas mantém faturas válidas', 'high', true],
    ['Limite de crédito', 'Double-entry equilibrado em todos os eventos (débitos = créditos)', 'critical', true],
    ['Limite de crédito', 'Eventos imutáveis — correção apenas via estorno/ajuste', 'high', false],
    ['Limite de crédito', 'Limite não armazenado — sempre calculado via fórmula', 'critical', true],
    ['Pagamento de contrato', 'Pagamento usa máximo de saldo antes de consumir crédito (saldo prevalece)', 'critical', true],
    ['Pagamento de contrato', 'Pagamento rejeitado quando saldo + crédito insuficientes', 'critical', true],
    ['Pagamento de contrato', 'Split de pagamento (saldo/crédito) registrado corretamente por contrato', 'critical', true],
    ['Pagamento de contrato', 'Pagamento 100% saldo não consome crédito', 'high', true],
    ['Pagamento de contrato', 'Exposição atualizada imediatamente após pagamento com crédito', 'critical', true],
    ['Estorno', 'Estorno 100% saldo devolve saldo integralmente', 'critical', true],
    ['Estorno', 'Estorno misto devolve saldo e limite proporcionais ao split original', 'critical', true],
    ['Estorno', 'Estorno 100% crédito libera limite corretamente', 'critical', true],
    ['Estorno', 'Estorno gera novo evento — não edita evento original', 'high', false],
    ['Ciclo de faturamento', 'Ciclo possui data de início, fechamento e vencimento configuráveis', 'medium', false],
    ['Ciclo de faturamento', 'Exposição acumula corretamente ao longo do ciclo aberto', 'critical', true],
    ['Ciclo de faturamento', 'Transição de estado: Aberto → Fechado → Faturado', 'high', false],
    ['Fechamento de ciclo', 'Abatimento automático do saldo na data de fechamento', 'critical', true],
    ['Fechamento de ciclo', 'Exposição remanescente convertida em contas a receber após fechamento', 'critical', true],
    ['Fechamento de ciclo', 'Fatura com valor zero gerada e paga automaticamente quando saldo cobre 100%', 'high', true],
    ['Fatura', 'Fatura contém valor original, abatimento e valor final a pagar', 'high', true],
    ['Fatura', 'Estado da fatura: Pendente → Paga ao quitar integralmente', 'high', false],
    ['Fatura', 'Pagamento parcial muda status para Parcial e libera limite proporcional', 'critical', true],
    ['Fatura', 'Fatura vencida após prazo sem quitação total', 'high', false],
    ['Fatura', 'Movimentações da fatura montadas em tempo real (não persistidas)', 'medium', false],
    ['Inadimplência', 'Bloqueio de novos usos em caso de inadimplência (fatura vencida)', 'critical', true],
  ]

  let nextScenarioId = state.nextScenarioId
  const newScenarios = rows.map(([ area, title, criticality, isSensitive ], idx) => {
    const id = String(nextScenarioId++).padStart(4, '0')
    return {
      id,
      epicId,
      order: idx + 1,
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
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
  })

  // ── Salva ─────────────────────────────────────────────────────────────────
  state.epics.push(epic)
  state.nextEpicId += 1
  state.scenarios.push(...newScenarios)
  state.nextScenarioId = nextScenarioId

  localStorage.setItem(KEY, JSON.stringify(state))
  console.log(`✅ Épico "${epic.name}" criado com ${newScenarios.length} cenários. Recarregue a página (F5).`)
})()
