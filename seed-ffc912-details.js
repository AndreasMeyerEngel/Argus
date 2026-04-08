// ─── Seed: FFC-912 — pré-condições, dados de teste e critérios de aceite ──────
// Cole no Console do DevTools com o app aberto e recarregue (F5).

(() => {
  const KEY = 'pxqa_v1'
  const raw = localStorage.getItem(KEY)
  if (!raw) { console.error('❌ Estado não encontrado.'); return }
  const state = JSON.parse(raw)

  const tasks = state.tasks ?? []
  const epic = state.epics.find(e => e.name.includes('FFC-580'))
  if (!epic) { console.error('❌ Épico FFC-580 não encontrado.'); return }

  const task = tasks.find(t => t.epicId === epic.id && t.name.includes('FFC-912'))
  if (!task) { console.error('❌ Tarefa FFC-912 não encontrada.'); return }

  const taskScenarios = state.scenarios
    .filter(s => s.taskId === task.id)
    .sort((a, b) => a.order - b.order)

  console.log(`✅ ${taskScenarios.length} cenário(s) encontrados na tarefa.`)

  // Pré-condição base (reutilizada em vários cenários)
  const BASE_PRE = [
    'Branch worktree-FFC-912 rodando localmente',
    'Banco de dados acessível via Sail',
    'FinancialAccountLimitService instanciado no Tinker',
  ]
  const TINKER_PRE = [
    'Serviço instanciado no Tinker',
    'Nenhum dado de banco necessário',
  ]

  // ── Dados por ordem de cenário na tarefa ─────────────────────────────────
  // Mapeamento: índice 0 = primeiro cenário da tarefa (order menor)
  const details = [
    // #1 — Limite disponível calculado corretamente com débitos
    {
      preconditions: BASE_PRE,
      testData: [
        'FinancialAccount: owner_type=company, product_type=credit, status=active',
        'FinancialAccountLimit: limit=10000, available_limit=10000, status=active',
        'FinancialAccountLedgerEntry: direction=DEBIT, amount=3000',
      ].join('\n'),
      acceptanceCriteria: [
        'dto->grantedLimit = 10000',
        'dto->availableLimit = 7000',
        'Campo available_limit na tabela atualizado para 7000',
        'Campo version incrementado de 0 para 1',
      ].join('\n'),
    },
    // #2 — Débito e crédito: net balance correto
    {
      preconditions: ['Mesmas do cenário #1', ...BASE_PRE],
      testData: [
        'FinancialAccount: status=active',
        'FinancialAccountLimit: limit=10000, status=active',
        'FinancialAccountLedgerEntry[1]: direction=DEBIT, amount=4000',
        'FinancialAccountLedgerEntry[2]: direction=CREDIT, amount=1500',
      ].join('\n'),
      acceptanceCriteria: [
        'net = 4000 - 1500 = 2500',
        'dto->grantedLimit = 10000',
        'dto->availableLimit = 7500',
      ].join('\n'),
    },
    // #3 — available_limit é persistido no banco após cálculo
    {
      preconditions: ['Mesmas do cenário #1', ...BASE_PRE],
      testData: [
        'FinancialAccount: status=active',
        'FinancialAccountLimit: limit=10000, available_limit=10000, version=0, status=active',
        'FinancialAccountLedgerEntry: direction=DEBIT, amount=4000',
      ].join('\n'),
      acceptanceCriteria: [
        'available_limit na tabela financial_account_limits = 6000 após a chamada',
        'version na tabela = 1 (foi incrementado pelo locking otimista)',
        'Nenhuma outra linha da tabela foi alterada',
      ].join('\n'),
    },
    // #4 — Locking otimista — versão obsoleta lança RuntimeException
    {
      preconditions: [
        ...BASE_PRE,
        'Simular outro processo atualizando version diretamente no banco antes da chamada',
      ],
      testData: [
        'FinancialAccountLimit: limit=10000, available_limit=10000, version=0, status=active',
        'DB::update: version=99 (simula concorrência)',
      ].join('\n'),
      acceptanceCriteria: [
        'Lança RuntimeException com mensagem contendo "Optimistic lock failed"',
        'available_limit permanece inalterado no banco (rollback confirmado)',
      ].join('\n'),
    },
    // #5 — Falha no save reverte transação — available_limit inalterado
    {
      preconditions: [
        ...BASE_PRE,
        'Versão adulterada para forçar falha no save',
      ],
      testData: [
        'FinancialAccountLimit: limit=10000, available_limit=10000, version=0, status=active',
        'DB::update: version=99 antes da chamada',
      ].join('\n'),
      acceptanceCriteria: [
        'Exceção propagada para o chamador',
        'available_limit no banco = 10000 (valor original preservado)',
        'Nenhuma linha parcialmente atualizada',
      ].join('\n'),
    },
    // #6 — Conta ativa sem entradas de ledger retorna limite completo
    {
      preconditions: [
        ...BASE_PRE,
        'Nenhuma FinancialAccountLedgerEntry vinculada à conta',
      ],
      testData: [
        'FinancialAccount: status=active',
        'FinancialAccountLimit: limit=10000, available_limit=10000, status=active',
        'FinancialAccountLedgerEntry: (nenhuma)',
      ].join('\n'),
      acceptanceCriteria: [
        'dto->grantedLimit = 10000',
        'dto->availableLimit = 10000',
        'available_limit no banco = 10000',
      ].join('\n'),
    },
    // #7 — Múltiplas entradas de débito são somadas corretamente
    {
      preconditions: ['Mesmas do cenário #1', ...BASE_PRE],
      testData: [
        'FinancialAccount: status=active',
        'FinancialAccountLimit: limit=10000, status=active',
        'FinancialAccountLedgerEntry[1]: direction=DEBIT, amount=2000',
        'FinancialAccountLedgerEntry[2]: direction=DEBIT, amount=3000',
      ].join('\n'),
      acceptanceCriteria: [
        'net = 2000 + 3000 = 5000',
        'dto->availableLimit = 5000',
      ].join('\n'),
    },
    // #8 — accountId zero lança InvalidArgumentException
    {
      preconditions: TINKER_PRE,
      testData: 'accountId = 0',
      acceptanceCriteria: [
        'Lança InvalidArgumentException',
        'Mensagem: "ID de conta inválido"',
        'Warning logado com account_id=0',
      ].join('\n'),
    },
    // #9 — accountId negativo lança InvalidArgumentException
    {
      preconditions: TINKER_PRE,
      testData: 'accountId = -1',
      acceptanceCriteria: [
        'Lança InvalidArgumentException',
        'Mensagem: "ID de conta inválido"',
      ].join('\n'),
    },
    // #10 — Conta inexistente lança ActiveFinancialAccountLimitNotFoundException
    {
      preconditions: [
        'Serviço instanciado no Tinker',
        'Confirmar que não existe conta com o ID informado no banco',
      ],
      testData: 'accountId = 999999 (inexistente)',
      acceptanceCriteria: [
        'Lança ActiveFinancialAccountLimitNotFoundException',
        'Mensagem: "Nenhum limite ativo encontrado para a conta 999999"',
      ].join('\n'),
    },
  ]

  // Cenários 11-16 ainda não existem na tarefa (foram adicionados pelo seed anterior)
  // Mapeia pelo título para garantir match correto
  const extraDetails = [
    // #11 — Limite com status Suspended
    {
      titleFragment: 'Suspended',
      preconditions: ['Mesmas do cenário #1', ...BASE_PRE],
      testData: [
        'FinancialAccount: status=active',
        'FinancialAccountLimit: limit=10000, status=suspended',
      ].join('\n'),
      acceptanceCriteria: [
        'Lança ActiveFinancialAccountLimitNotFoundException',
        'Limite suspenso é ignorado pelo repositório',
      ].join('\n'),
    },
    // #12 — Isolamento: outras contas não contaminam
    {
      titleFragment: 'outras contas não afetam',
      preconditions: [
        ...BASE_PRE,
        'Duas contas distintas criadas no banco',
      ],
      testData: [
        'ContaA: FinancialAccountLimit limit=10000, status=active, sem ledger entries',
        'ContaB: FinancialAccountLedgerEntry direction=DEBIT, amount=9000',
      ].join('\n'),
      acceptanceCriteria: [
        'calculateAvailableLimit(contaA->id) retorna availableLimit=10000',
        'Débito da conta B não interfere no resultado',
      ].join('\n'),
    },
    // #13 — Isolamento: outra empresa
    {
      titleFragment: 'outra empresa',
      preconditions: [
        'Duas FinancialAccount com owner_id distintos (empresas diferentes)',
        ...BASE_PRE,
      ],
      testData: [
        'EmpresaA: FinancialAccount + FinancialAccountLimit limit=10000, status=active',
        'EmpresaB: FinancialAccount + FinancialAccountLimit limit=50000, status=active',
      ].join('\n'),
      acceptanceCriteria: [
        'calculateAvailableLimit(contaA->id) retorna grantedLimit=10000',
        'Limite da empresa B não aparece no resultado da empresa A',
      ].join('\n'),
    },
    // #14 — available_limit negativo
    {
      titleFragment: 'negativo quando débitos excedem',
      preconditions: ['Mesmas do cenário #1', ...BASE_PRE],
      testData: [
        'FinancialAccountLimit: limit=5000, status=active',
        'FinancialAccountLedgerEntry: direction=DEBIT, amount=6000',
      ].join('\n'),
      acceptanceCriteria: [
        'dto->grantedLimit = 5000',
        'dto->availableLimit = -1000',
        'Serviço não lança exceção (aceita negativo)',
        'available_limit no banco = -1000',
      ].join('\n'),
    },
    // #15 — Crédito puro aumenta além do limite
    {
      titleFragment: 'crédito aumenta além do limite',
      preconditions: ['Mesmas do cenário #1', ...BASE_PRE],
      testData: [
        'FinancialAccountLimit: limit=10000, status=active',
        'FinancialAccountLedgerEntry: direction=CREDIT, amount=5000',
      ].join('\n'),
      acceptanceCriteria: [
        'net = -5000 (crédito puro)',
        'dto->availableLimit = 15000',
        'Confirmar com dev se esse comportamento é intencional',
      ].join('\n'),
    },
    // #16 — COALESCE retorna zero
    {
      titleFragment: 'COALESCE',
      preconditions: [
        'FinancialAccountLedgerEntryRepository acessível no Tinker',
        ...BASE_PRE,
      ],
      testData: 'FinancialAccount criada sem nenhuma FinancialAccountLedgerEntry',
      acceptanceCriteria: [
        'obtainNetBalanceByAccountId($account->id) retorna 0 (inteiro)',
        'Não retorna null',
        'Não lança exceção',
      ].join('\n'),
    },
  ]

  let updated = 0
  const now = new Date().toISOString()

  // Aplica por índice (cenários 1-10 em ordem da tarefa)
  taskScenarios.forEach((scenario, idx) => {
    const d = details[idx]
    if (!d) return

    const s = state.scenarios.find(s => s.id === scenario.id)
    if (!s) return

    s.preconditions = d.preconditions
    s.testData = d.testData
    s.acceptanceCriteria = d.acceptanceCriteria
    s.updatedAt = now
    updated++
  })

  // Aplica por fragmento de título (cenários 11-16)
  extraDetails.forEach(({ titleFragment, preconditions, testData, acceptanceCriteria }) => {
    const s = state.scenarios.find(s =>
      s.taskId === task.id &&
      s.title.toLowerCase().includes(titleFragment.toLowerCase())
    )
    if (!s) { console.warn(`⚠️  Não encontrou cenário com fragmento: "${titleFragment}"`); return }
    s.preconditions = preconditions
    s.testData = testData
    s.acceptanceCriteria = acceptanceCriteria
    s.updatedAt = now
    updated++
  })

  localStorage.setItem(KEY, JSON.stringify(state))
  console.log(`✅ ${updated} cenário(s) atualizados com pré-condições, dados de teste e critérios de aceite. Recarregue (F5).`)
})()
