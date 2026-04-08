// ─── Seed COMPLETO: FFC-912 — recria todos os 16 cenários do zero ─────────────
// Cole no Console do DevTools com o app aberto e recarregue (F5).

(() => {
  const KEY = 'pxqa_v1'
  const raw = localStorage.getItem(KEY)
  if (!raw) { console.error('❌ Estado não encontrado.'); return }
  const state = JSON.parse(raw)

  // ── 1. Localiza épico e tarefa ────────────────────────────────────────────
  const epic = state.epics.find(e => e.name.includes('FFC-580'))
  if (!epic) { console.error('❌ Épico FFC-580 não encontrado.'); return }

  const tasks = state.tasks ?? []
  const task = tasks.find(t => t.epicId === epic.id && t.name.includes('FFC-912'))
  if (!task) { console.error('❌ Tarefa FFC-912 não encontrada dentro do épico FFC-580.'); return }

  console.log(`✅ Épico: "${epic.name}"`)
  console.log(`✅ Tarefa: "${task.name}"`)

  // ── 2. Remove TODOS os cenários existentes desta tarefa ───────────────────
  const antes = state.scenarios.filter(s => s.taskId === task.id).length
  state.scenarios = state.scenarios.filter(s => s.taskId !== task.id)
  console.log(`🗑️  ${antes} cenário(s) anteriores removidos.`)

  // ── 3. Pré-condições reutilizáveis ────────────────────────────────────────
  const BASE = [
    'Branch worktree-FFC-912 rodando localmente',
    'Banco de dados acessível via Sail',
    'FinancialAccountLimitService instanciado no Tinker',
  ]
  const TINKER = [
    'Serviço instanciado no Tinker',
    'Nenhum dado de banco necessário para este cenário',
  ]

  // ── 4. Definição completa dos 16 cenários ─────────────────────────────────
  // [área, título, criticality, isSensitive, preconditions[], testData, acceptanceCriteria]
  const cenarios = [
    {
      area: 'FinancialAccountLimitService',
      title: 'Limite disponível calculado corretamente com débitos',
      criticality: 'critical',
      isSensitive: true,
      preconditions: BASE,
      testData:
`FinancialAccount: owner_type=company, product_type=credit, status=active
FinancialAccountLimit: limit=10000, available_limit=10000, status=active
FinancialAccountLedgerEntry: direction=DEBIT, amount=3000`,
      acceptanceCriteria:
`dto->grantedLimit = 10000
dto->availableLimit = 7000
Campo available_limit na tabela atualizado para 7000
Campo version incrementado de 0 para 1`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'Débito e crédito: net balance correto',
      criticality: 'critical',
      isSensitive: true,
      preconditions: BASE,
      testData:
`FinancialAccount: status=active
FinancialAccountLimit: limit=10000, status=active
FinancialAccountLedgerEntry[1]: direction=DEBIT, amount=4000
FinancialAccountLedgerEntry[2]: direction=CREDIT, amount=1500`,
      acceptanceCriteria:
`net = 4000 - 1500 = 2500
dto->grantedLimit = 10000
dto->availableLimit = 7500`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'available_limit é persistido no banco após cálculo',
      criticality: 'high',
      isSensitive: true,
      preconditions: BASE,
      testData:
`FinancialAccount: status=active
FinancialAccountLimit: limit=10000, available_limit=10000, version=0, status=active
FinancialAccountLedgerEntry: direction=DEBIT, amount=4000`,
      acceptanceCriteria:
`available_limit na tabela financial_account_limits = 6000 após a chamada
version na tabela = 1 (foi incrementado pelo locking otimista)
Nenhuma outra linha da tabela foi alterada`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'Locking otimista — versão obsoleta lança RuntimeException',
      criticality: 'high',
      isSensitive: false,
      preconditions: [
        ...BASE,
        'Simular outro processo atualizando version diretamente no banco antes da chamada',
      ],
      testData:
`FinancialAccountLimit: limit=10000, available_limit=10000, version=0, status=active
DB::update: version=99 (simula concorrência)`,
      acceptanceCriteria:
`Lança RuntimeException com mensagem contendo "Optimistic lock failed"
available_limit permanece inalterado no banco (rollback confirmado)`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'Falha no save reverte transação — available_limit inalterado',
      criticality: 'high',
      isSensitive: false,
      preconditions: [
        ...BASE,
        'Versão adulterada para forçar falha no save',
      ],
      testData:
`FinancialAccountLimit: limit=10000, available_limit=10000, version=0, status=active
DB::update: version=99 antes da chamada`,
      acceptanceCriteria:
`Exceção propagada para o chamador
available_limit no banco = 10000 (valor original preservado)
Nenhuma linha parcialmente atualizada`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'Conta ativa sem entradas de ledger retorna limite completo',
      criticality: 'high',
      isSensitive: false,
      preconditions: [
        ...BASE,
        'Nenhuma FinancialAccountLedgerEntry vinculada à conta',
      ],
      testData:
`FinancialAccount: status=active
FinancialAccountLimit: limit=10000, available_limit=10000, status=active
FinancialAccountLedgerEntry: (nenhuma)`,
      acceptanceCriteria:
`dto->grantedLimit = 10000
dto->availableLimit = 10000
available_limit no banco = 10000`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'Múltiplas entradas de débito são somadas corretamente',
      criticality: 'high',
      isSensitive: true,
      preconditions: BASE,
      testData:
`FinancialAccount: status=active
FinancialAccountLimit: limit=10000, status=active
FinancialAccountLedgerEntry[1]: direction=DEBIT, amount=2000
FinancialAccountLedgerEntry[2]: direction=DEBIT, amount=3000`,
      acceptanceCriteria:
`net = 2000 + 3000 = 5000
dto->availableLimit = 5000`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'accountId zero lança InvalidArgumentException',
      criticality: 'high',
      isSensitive: false,
      preconditions: TINKER,
      testData: `accountId = 0`,
      acceptanceCriteria:
`Lança InvalidArgumentException
Mensagem: "ID de conta inválido"
Warning logado com account_id=0`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'accountId negativo lança InvalidArgumentException',
      criticality: 'high',
      isSensitive: false,
      preconditions: TINKER,
      testData: `accountId = -1`,
      acceptanceCriteria:
`Lança InvalidArgumentException
Mensagem: "ID de conta inválido"`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'Conta inexistente lança ActiveFinancialAccountLimitNotFoundException',
      criticality: 'high',
      isSensitive: false,
      preconditions: [
        'Serviço instanciado no Tinker',
        'Confirmar que não existe conta com o ID informado no banco',
      ],
      testData: `accountId = 999999 (inexistente)`,
      acceptanceCriteria:
`Lança ActiveFinancialAccountLimitNotFoundException
Mensagem: "Nenhum limite ativo encontrado para a conta 999999"`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'Limite com status Suspended não é encontrado — lança exceção',
      criticality: 'high',
      isSensitive: false,
      preconditions: BASE,
      testData:
`FinancialAccount: status=active
FinancialAccountLimit: limit=10000, status=suspended`,
      acceptanceCriteria:
`Lança ActiveFinancialAccountLimitNotFoundException
Limite suspenso é ignorado pelo repositório (findActiveByAccountId ignora Suspended)`,
    },
    {
      area: 'Isolamento de Dados',
      title: 'Entradas de ledger de outras contas não afetam o cálculo',
      criticality: 'high',
      isSensitive: false,
      preconditions: [
        ...BASE,
        'Duas contas distintas criadas no banco',
      ],
      testData:
`ContaA: FinancialAccountLimit limit=10000, status=active, sem ledger entries
ContaB: FinancialAccountLedgerEntry direction=DEBIT, amount=9000`,
      acceptanceCriteria:
`calculateAvailableLimit(contaA->id) retorna availableLimit=10000
Débito da conta B não interfere no resultado`,
    },
    {
      area: 'Isolamento de Dados',
      title: 'Limite de outra empresa não interfere no resultado',
      criticality: 'high',
      isSensitive: false,
      preconditions: [
        'Duas FinancialAccount com owner_id distintos (empresas diferentes)',
        ...BASE,
      ],
      testData:
`EmpresaA: FinancialAccount + FinancialAccountLimit limit=10000, status=active
EmpresaB: FinancialAccount + FinancialAccountLimit limit=50000, status=active`,
      acceptanceCriteria:
`calculateAvailableLimit(contaA->id) retorna grantedLimit=10000
Limite da empresa B não aparece no resultado da empresa A`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'available_limit fica negativo quando débitos excedem o limite',
      criticality: 'low',
      isSensitive: false,
      preconditions: BASE,
      testData:
`FinancialAccountLimit: limit=5000, status=active
FinancialAccountLedgerEntry: direction=DEBIT, amount=6000`,
      acceptanceCriteria:
`dto->grantedLimit = 5000
dto->availableLimit = -1000
Serviço não lança exceção (aceita negativo)
available_limit no banco = -1000`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'Conta apenas com entradas de crédito aumenta além do limite concedido',
      criticality: 'low',
      isSensitive: false,
      preconditions: BASE,
      testData:
`FinancialAccountLimit: limit=10000, status=active
FinancialAccountLedgerEntry: direction=CREDIT, amount=5000`,
      acceptanceCriteria:
`net = -5000 (crédito puro reduz a exposição)
dto->availableLimit = 15000
⚠️ Confirmar com dev se esse comportamento é intencional`,
    },
    {
      area: 'FinancialAccountLimitService',
      title: 'COALESCE garante retorno zero quando não há entradas de ledger',
      criticality: 'low',
      isSensitive: false,
      preconditions: [
        'FinancialAccountLedgerEntryRepository acessível no Tinker',
        ...BASE,
      ],
      testData: `FinancialAccount criada sem nenhuma FinancialAccountLedgerEntry`,
      acceptanceCriteria:
`obtainNetBalanceByAccountId($account->id) retorna 0 (inteiro)
Não retorna null
Não lança exceção`,
    },
  ]

  // ── 5. Reseta o contador para o menor ID livre e cria os cenários ──────────
  // Descobre o maior ID em uso para não colidir com cenários de outros épicos
  const maxId = state.scenarios.reduce((max, s) => {
    const n = parseInt(s.id, 10)
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)
  state.nextScenarioId = maxId + 1

  const now = new Date().toISOString()
  let nextId = state.nextScenarioId

  const novos = cenarios.map((c, idx) => {
    const id = String(nextId++).padStart(4, '0')
    return {
      id,
      epicId: epic.id,
      taskId: task.id,
      order: idx + 1,
      title: c.title,
      area: c.area,
      criticality: c.criticality,
      status: 'pending',
      isSensitive: c.isSensitive,
      preconditions: c.preconditions,
      testData: c.testData,
      acceptanceCriteria: c.acceptanceCriteria,
      steps: [],
      linkedBugs: [],
      executions: [],
      responsible: '',
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
  })

  state.scenarios.push(...novos)
  state.nextScenarioId = nextId

  // ── 6. Salva ──────────────────────────────────────────────────────────────
  localStorage.setItem(KEY, JSON.stringify(state))

  console.log(`✅ ${novos.length} cenários criados do zero (IDs ${novos[0].id} → ${novos[novos.length-1].id}).`)
  console.warn('⚠️  ATENÇÃO: Cenários 10 e 11 conflitam com testes unitários existentes que esperam DTO vazio. Alinhe com o dev antes de fechar o critério de aceite.')
  console.log('Recarregue a página (F5).')
})()
