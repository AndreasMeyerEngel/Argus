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
- **Planos de Teste** — agrupe cenários em planos por build/sprint com execução e status independentes do status global
- **Backup** — exportar e importar dados em JSON

---

## Modos de operação

O Argus suporta dois ambientes, chaveados automaticamente pela presença da variável `VITE_SUPABASE_URL` no momento do build:

| | Produção (Supabase) | Local (Docker) |
|---|---|---|
| Auth | Supabase Auth (e-mail/senha) | Sem autenticação |
| Banco | Supabase PostgreSQL | PostgreSQL local |
| Imagens | Supabase Storage | Armazenadas no banco (base64) |
| Como rodar | `npm run dev` | `docker-compose up` |

---

## Rodar com Docker (modo local)

**Pré-requisitos:** [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)

```bash
docker-compose up --build
```

Acesse em `http://localhost:3001`.

Na primeira execução, o build pode levar alguns minutos (instala dependências, compila frontend e backend). Nas execuções seguintes, o cache do Docker acelera o processo.

Os dados são persistidos no volume `db_data` — mesmo que o container seja reiniciado, nada é perdido.

### Como funciona internamente

```
docker-compose up
      │
      ├─ db (postgres:15)
      │    └─ healthcheck: pg_isready
      │
      └─ argus (imagem multi-stage)
           ├─ Stage 1: builda o React (sem VITE_SUPABASE_URL → modo local)
           ├─ Stage 2: compila o backend TypeScript (Express + Prisma)
           └─ Stage 3: produção
                ├─ prisma db push  (cria/sincroniza tabelas)
                └─ node dist/index.js
                     ├─ GET/PUT /api/state     → estado da aplicação
                     ├─ POST/GET /api/images/:key → screenshots
                     └─ GET /*                 → arquivos estáticos do React
```

---

## Rodar com Supabase (modo produção)

**Pré-requisitos:** Node.js 18+, conta no [Supabase](https://supabase.com)

```bash
npm install
cp .env.example .env.local
# Edite .env.local com suas chaves do Supabase
npm run dev
```

O app estará disponível em `http://localhost:5173`.

### Configuração do Supabase

**1. Criar tabela no SQL Editor**

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

**2. Criar bucket de imagens**

Storage → New bucket → Name: `screenshots` → Public bucket: **ON**

**3. Variáveis de ambiente (`.env.local`)**

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Desenvolvimento local com backend próprio

Para rodar o frontend em modo de desenvolvimento (`npm run dev`) apontando para o backend local sem Docker:

```bash
# Terminal 1 — backend
cd app
npm install
npx prisma generate
DATABASE_URL="postgresql://argus:argus123@localhost:5432/argus" npx tsx src/index.ts

# Terminal 2 — frontend (sem .env.local → IS_LOCAL = true)
# Renomeie ou remova .env.local para não usar Supabase
npm run dev
```

O Vite está configurado para fazer proxy de `/api/*` para `http://localhost:3000`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Estilo | Tailwind CSS |
| Roteamento | React Router v6 |
| Gráficos | Recharts |
| Ícones | Lucide React |
| Datas | date-fns |
| Markdown | marked |
| Backend (local) | Node.js + Express |
| ORM (local) | Prisma |
| Banco de dados | PostgreSQL (Supabase ou Docker) |
| Armazenamento de arquivos | Supabase Storage ou banco (base64) |
| Autenticação | Supabase Auth (produção) / sem auth (local) |
| Hospedagem | Vercel |

---

## Estrutura do projeto

```
├── src/                        Frontend React
│   ├── components/
│   │   ├── ui/                 Componentes reutilizáveis (Modal, Badge, Toast…)
│   │   └── Layout.tsx          Sidebar e navegação
│   ├── context/
│   │   ├── AppContext.tsx       Estado global com useReducer
│   │   └── AuthContext.tsx      Sessão do usuário (Supabase ou stub local)
│   ├── lib/
│   │   ├── supabase.ts          Cliente Supabase
│   │   └── storage.ts           Adapter: Supabase ou API local (/api/*)
│   ├── pages/
│   │   ├── Login.tsx            Tela de login (apenas modo Supabase)
│   │   ├── Home.tsx             Lista de épicos
│   │   ├── Tarefas.tsx          Tarefas avulsas
│   │   ├── EpicPage.tsx         Detalhe do épico
│   │   ├── GuidedRun.tsx        Execução guiada
│   │   ├── Dashboard.tsx        Painel de indicadores
│   │   ├── Report.tsx           Relatórios históricos
│   │   ├── TestPlans.tsx        Lista de planos de teste
│   │   └── TestPlanPage.tsx     Detalhe e execução do plano
│   └── types/index.ts           Interfaces TypeScript
│
├── app/                        Backend (modo local/Docker)
│   ├── prisma/
│   │   └── schema.prisma        AppState + Image
│   ├── src/
│   │   └── index.ts             API Express + servidor de arquivos estáticos
│   ├── package.json
│   └── tsconfig.json
│
├── Dockerfile                  Build multi-stage (React + backend)
├── docker-compose.yml          Postgres + Argus
└── .dockerignore
```

---

## Como o chaveamento Supabase ↔ local funciona

Em `src/lib/storage.ts` e `src/context/AuthContext.tsx`:

```ts
const IS_LOCAL = !import.meta.env.VITE_SUPABASE_URL
```

- **Supabase** (`VITE_SUPABASE_URL` definido): usa `supabase.auth`, `supabase.from(…)` e `supabase.storage`
- **Local** (variável ausente): usa `fetch('/api/state')` e `fetch('/api/images/:key')`

No Docker, `.env*` é excluído via `.dockerignore`, então `VITE_SUPABASE_URL` nunca chega ao build — o modo local é ativado automaticamente.

---

## Modelo de dados

```
Epic
 └── EpicTask
      └── TestScenario
           ├── TestExecution (com screenshots)
           └── Bug

EpicTask (avulsa, sem épico)

TestPlan
 └── PlanScenarioItem   (status por plano, independente do status global do cenário)
```

No modo Supabase, todo o estado é serializado como JSONB em uma única linha da tabela `app_state`.
No modo local, o mesmo JSON é armazenado na tabela `AppState` do Postgres local via Prisma. Screenshots são salvas como base64 na tabela `Image`.

---

## Deploy (Vercel)

1. Faça push para o GitHub
2. Acesse [vercel.com](https://vercel.com) → New Project → importe o repositório
3. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`)
4. Clique em **Deploy**

A cada novo push na branch `main`, o Vercel faz deploy automático.

---

## Autor

Andreas Meyer Engel — [github.com/AndreasMeyerEngel](https://github.com/AndreasMeyerEngel)
