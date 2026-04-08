# Argus

Sistema pessoal de gestão de QA — rastreie épicos, tarefas, cenários de teste, execuções e bugs em um único lugar.

> O nome é inspirado no gigante da mitologia grega com cem olhos, símbolo de vigilância e atenção — exatamente o que um bom QA precisa.

**Live:** [argus-dusky-rho.vercel.app](https://argus-dusky-rho.vercel.app)

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
- **Backup** — exportar e importar dados em JSON
- **Login** — autenticação com e-mail e senha via Supabase Auth

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
| Banco de dados | Supabase (PostgreSQL) |
| Armazenamento de arquivos | Supabase Storage |
| Autenticação | Supabase Auth |
| Hospedagem | Vercel |

---

## Como rodar localmente

**Pré-requisitos:** Node.js 18+, conta no [Supabase](https://supabase.com)

```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas chaves do Supabase

# Iniciar servidor de desenvolvimento
npm run dev
```

O app estará disponível em `http://localhost:5173`.

---

## Configuração do Supabase

### 1. Criar tabela no SQL Editor

```sql
CREATE TABLE public.app_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own state"
ON public.app_state FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

### 2. Criar bucket de imagens

**Storage → New bucket:**
- Name: `screenshots`
- Public bucket: **ON**

### 3. Variáveis de ambiente

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Deploy (Vercel)

1. Faça push para o GitHub
2. Acesse [vercel.com](https://vercel.com) → New Project → importe `AndreasMeyerEngel/Argus`
3. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
4. Clique em **Deploy**

A cada novo push na branch `main`, o Vercel faz deploy automático.

---

## Build para produção

```bash
npm run build
```

Os arquivos gerados ficam na pasta `dist/`.

---

## Estrutura do projeto

```
src/
├── components/
│   ├── ui/            # Componentes reutilizáveis (Modal, Badge, Toast, etc.)
│   └── Layout.tsx     # Sidebar, navegação e configurações
├── context/
│   ├── AppContext.tsx  # Estado global com useReducer
│   └── AuthContext.tsx # Sessão do usuário via Supabase Auth
├── lib/
│   ├── supabase.ts    # Cliente Supabase
│   └── storage.ts     # Leitura/escrita no banco e storage
├── pages/
│   ├── Login.tsx      # Tela de login e cadastro
│   ├── Home.tsx       # Lista de épicos
│   ├── Tarefas.tsx    # Tarefas avulsas (sem épico)
│   ├── EpicPage.tsx   # Detalhe do épico (tarefas, cenários, bugs)
│   ├── GuidedRun.tsx  # Execução guiada de testes
│   ├── Dashboard.tsx  # Painel de indicadores
│   └── Report.tsx     # Relatórios históricos
└── types/
    └── index.ts       # Interfaces TypeScript
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
