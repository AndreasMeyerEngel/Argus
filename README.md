# Argus

Sistema pessoal de gestão de QA — rastreie épicos, tarefas, cenários de teste, execuções e bugs em um único lugar.

> O nome é inspirado no gigante da mitologia grega com cem olhos, símbolo de vigilância e atenção — exatamente o que um bom QA precisa.

---

## Funcionalidades

- **Épicos** — organize o trabalho em épicos com status, prioridade, squad, produto e prazo
- **Tarefas** — crie tarefas dentro de épicos ou avulsas (sem vínculo com épico)
- **Cenários de teste** — mapeie cenários com pré-condições, dados de teste, critérios de aceite e passos detalhados
- **Execuções** — registre cada execução de teste com resultado, notas e screenshots
- **Bugs** — rastreie defeitos com severidade, reprodutibilidade, responsável e histórico de reabertura
- **Dashboard** — KPIs, gráficos de progresso e análise de tendências
- **Relatórios** — histórico de execuções por período
- **Guided Run** — modo guiado de execução de testes passo a passo
- **Backup** — exportar e importar dados em JSON para não perder nada

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Estilo | Tailwind CSS |
| Roteamento | React Router v6 |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Datas | date-fns |
| Markdown | marked |
| Persistência | localStorage + IndexedDB (imagens) |

---

## Como rodar localmente

**Pré-requisitos:** Node.js 18+

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:5173`.

---

## Build para produção

```bash
npm run build
```

Os arquivos gerados ficam na pasta `dist/`.

---

## Deploy (Vercel)

1. Faça push para o GitHub
2. Acesse [vercel.com](https://vercel.com) → New Project → importe o repositório `AndreasMeyerEngel/Argus`
3. As configurações são detectadas automaticamente (Vite)
4. Clique em **Deploy**

A cada novo push na branch `main`, o Vercel faz deploy automático.

---

## Dados e persistência

Todos os dados ficam armazenados **no browser** (`localStorage`). Isso significa:

- Os dados não são sincronizados entre dispositivos
- Limpar o cache do browser apaga os dados
- **Recomendado:** faça backups regulares via **Configurações → Exportar Backup**

### Backup e restauração

| Ação | Como |
|---|---|
| Exportar | Configurações → Exportar Backup → baixa `argus-backup-YYYY-MM-DD.json` |
| Importar | Configurações → Importar Backup → selecione o arquivo `.json` |

---

## Estrutura do projeto

```
src/
├── components/
│   ├── ui/          # Componentes reutilizáveis (Modal, Badge, Toast, etc.)
│   └── Layout.tsx   # Sidebar, navegação e configurações
├── context/
│   └── AppContext.tsx  # Estado global com useReducer
├── lib/
│   └── storage.ts   # localStorage e IndexedDB
├── pages/
│   ├── Home.tsx       # Lista de épicos
│   ├── Tarefas.tsx    # Tarefas avulsas (sem épico)
│   ├── EpicPage.tsx   # Detalhe do épico (tarefas, cenários, bugs)
│   ├── GuidedRun.tsx  # Execução guiada de testes
│   ├── Dashboard.tsx  # Painel de indicadores
│   └── Report.tsx     # Relatórios históricos
└── types/
    └── index.ts     # Interfaces TypeScript
```

---

## Modelo de dados

```
Epic
 └── EpicTask (tarefas do épico)
      └── TestScenario (cenários de teste)
           └── TestExecution (execuções)
           └── Bug (bugs vinculados)

EpicTask (avulsa, sem épico)
```

---

## Autor

Andreas Meyer Engel — [github.com/AndreasMeyerEngel](https://github.com/AndreasMeyerEngel)
