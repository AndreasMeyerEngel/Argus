import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Eye, ChevronLeft, ChevronRight, X,
  Layers, CheckSquare, Play, Bug, BarChart2,
  GitBranch, History, MessageSquare, FileText,
  AlertTriangle, CheckCircle2, XCircle, Clock,
  ArrowRight, Shield, Zap, Users
} from 'lucide-react'

// ─── Slide Shell ──────────────────────────────────────────────────────────────

function Slide({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-5xl mx-auto flex flex-col justify-center min-h-full px-4 ${className}`}>
      {children}
    </div>
  )
}

function Tag({ children, color = 'accent' }: { children: React.ReactNode; color?: string }) {
  const cls: Record<string, string> = {
    accent: 'bg-accent/15 text-accent border-accent/30',
    green:  'bg-green/15 text-green border-green/30',
    red:    'bg-red/15 text-red border-red/30',
    amber:  'bg-amber/15 text-amber border-amber/30',
    muted:  'bg-surface2 text-muted border-white/10',
  }
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cls[color] ?? cls.accent}`}>
      {children}
    </span>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-2xl p-5 flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-text mb-1">{title}</p>
        <p className="text-xs text-muted leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function ProblemRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.05] last:border-0">
      <div className="text-red mt-0.5 shrink-0">{icon}</div>
      <p className="text-base text-text/80">{text}</p>
    </div>
  )
}

function CompareRow({ before, after }: { before: string; after: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-start gap-2 bg-red/5 border border-red/15 rounded-xl px-4 py-3">
        <XCircle size={15} className="text-red mt-0.5 shrink-0" />
        <p className="text-sm text-text/70">{before}</p>
      </div>
      <div className="flex items-start gap-2 bg-green/5 border border-green/15 rounded-xl px-4 py-3">
        <CheckCircle2 size={15} className="text-green mt-0.5 shrink-0" />
        <p className="text-sm text-text/70">{after}</p>
      </div>
    </div>
  )
}

// ─── Slides ───────────────────────────────────────────────────────────────────

const slides: React.ReactNode[] = [

  /* 1 — Capa */
  <Slide key="cover" className="items-center text-center">
    <div className="flex items-center justify-center gap-3 mb-8">
      <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center">
        <Eye size={32} className="text-accent" />
      </div>
    </div>
    <h1 className="text-6xl font-black text-text tracking-tight mb-4">Argus</h1>
    <p className="text-xl text-muted mb-10">Sistema de Gestão de QA</p>
    <p className="text-sm text-muted/60 italic max-w-md mx-auto">
      "Argus era o gigante da mitologia grega com cem olhos —<br />
      símbolo de vigilância total. Exatamente o que um bom QA precisa."
    </p>
    <div className="mt-12 flex items-center justify-center gap-2 text-xs text-muted">
      <span>Use</span>
      <kbd className="bg-surface2 border border-white/10 px-2 py-0.5 rounded font-mono">←</kbd>
      <kbd className="bg-surface2 border border-white/10 px-2 py-0.5 rounded font-mono">→</kbd>
      <span>para navegar</span>
    </div>
  </Slide>,

  /* 2 — O Problema */
  <Slide key="problem">
    <div className="mb-10">
      <Tag color="red">O Problema</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Como era antes?</h2>
      <p className="text-muted text-lg">O dia a dia sem uma ferramenta centralizada de QA</p>
    </div>
    <div className="flex flex-col">
      <ProblemRow icon={<AlertTriangle size={16} />} text="Cenários de teste espalhados em planilhas, Notion, documentos Word — cada um em um lugar diferente" />
      <ProblemRow icon={<AlertTriangle size={16} />} text="Nenhum histórico de execuções: impossível saber quem testou o quê, quando, e com qual resultado" />
      <ProblemRow icon={<AlertTriangle size={16} />} text="Bugs registrados sem rastreabilidade — não se sabe qual cenário falhou ou qual funcionalidade está em risco" />
      <ProblemRow icon={<AlertTriangle size={16} />} text="Gestores sem visibilidade real do progresso de testes antes de uma release" />
      <ProblemRow icon={<AlertTriangle size={16} />} text="Retrabalho constante: cenários reescritos, evidências perdidas, nada versionado" />
    </div>
  </Slide>,

  /* 3 — A Solução */
  <Slide key="solution">
    <div className="mb-10">
      <Tag color="green">A Solução</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Argus centraliza tudo</h2>
      <p className="text-muted text-lg">Um único lugar para planejar, executar, rastrear e reportar</p>
    </div>
    <div className="flex items-center justify-center gap-3 flex-wrap">
      {[
        { icon: <Layers size={18} />, label: 'Projetos' },
        { icon: <CheckSquare size={18} />, label: 'Cenários' },
        { icon: <Play size={18} />, label: 'Execuções' },
        { icon: <Bug size={18} />, label: 'Bugs' },
        { icon: <BarChart2 size={18} />, label: 'Dashboard' },
        { icon: <GitBranch size={18} />, label: 'Rastreabilidade' },
        { icon: <History size={18} />, label: 'Histórico' },
        { icon: <FileText size={18} />, label: 'Relatórios' },
      ].map(({ icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-2 bg-surface border border-white/[0.07] rounded-2xl px-6 py-4 w-32">
          <div className="text-accent">{icon}</div>
          <span className="text-xs font-medium text-text">{label}</span>
        </div>
      ))}
    </div>
    <div className="mt-8 bg-accent/5 border border-accent/20 rounded-2xl px-6 py-4 text-center">
      <p className="text-sm text-text">
        Hierarquia clara: <span className="text-accent font-semibold">Projeto</span> → <span className="text-accent font-semibold">Tarefa</span> → <span className="text-accent font-semibold">Cenário</span> → <span className="text-accent font-semibold">Execução</span> / <span className="text-red font-semibold">Bug</span>
      </p>
    </div>
  </Slide>,

  /* 4 — Projetos e Tarefas */
  <Slide key="epics">
    <div className="mb-10">
      <Tag>Projetos e Tarefas</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Organize o trabalho</h2>
      <p className="text-muted text-lg">Agrupe os esforços de QA por entrega ou funcionalidade</p>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FeatureCard icon={<Layers size={18} />} title="Projetos" desc="Cada projeto representa uma entrega: tem status, prioridade, squad, produto e prazo. Visual claro do que está em andamento." />
      <FeatureCard icon={<CheckSquare size={18} />} title="Tarefas" desc="Tarefas dentro do projeto organizam os cenários por ticket ou funcionalidade específica." />
      <FeatureCard icon={<BarChart2 size={18} />} title="Progresso visual" desc="Barra de progresso mostrando quantos cenários foram executados e a taxa de aprovação em tempo real." />
      <FeatureCard icon={<Users size={18} />} title="Visibilidade por squad" desc="Filtre projetos por squad e produto. Saiba exatamente o que cada time está testando." />
    </div>
  </Slide>,

  /* 5 — Cenários de Teste */
  <Slide key="scenarios">
    <div className="mb-10">
      <Tag>Cenários de Teste</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Documentação estruturada</h2>
      <p className="text-muted text-lg">Cada cenário é uma especificação completa e executável</p>
    </div>
    <div className="grid grid-cols-3 gap-3 mb-6">
      {[
        { label: 'Pré-condições', desc: 'O que precisa estar pronto antes do teste' },
        { label: 'Dados de teste', desc: 'Entradas, usuários, cenários de dados necessários' },
        { label: 'Critérios de aceite', desc: 'O que define que o teste passou' },
        { label: 'Passos detalhados', desc: 'Ação → Resultado esperado → Resultado observado' },
        { label: 'Criticidade', desc: 'Crítico, Alto, Médio ou Baixo — priorize o que importa' },
        { label: 'Responsável', desc: 'Quem é o dono do cenário e da execução' },
      ].map(({ label, desc }) => (
        <div key={label} className="bg-surface border border-white/[0.07] rounded-xl p-4">
          <p className="text-xs font-semibold text-accent mb-1">{label}</p>
          <p className="text-xs text-muted leading-relaxed">{desc}</p>
        </div>
      ))}
    </div>
    <div className="bg-surface2 rounded-xl px-4 py-3 flex items-center gap-3">
      <Zap size={16} className="text-amber shrink-0" />
      <p className="text-sm text-text/80"><strong>Guided Run</strong> — modo passo a passo guiado que exibe cada passo na tela durante a execução, reduzindo erros e esquecimentos.</p>
    </div>
  </Slide>,

  /* 6 — Execuções e Evidências */
  <Slide key="executions">
    <div className="mb-10">
      <Tag>Execuções</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Registro completo de cada teste</h2>
      <p className="text-muted text-lg">Histórico imutável de quem testou, quando e o que encontrou</p>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div>
        <p className="text-xs text-muted uppercase tracking-wider mb-3">Resultados possíveis</p>
        <div className="flex flex-col gap-2">
          {[
            { icon: <CheckCircle2 size={15} className="text-green" />, label: 'Aprovado', desc: 'Comportamento conforme esperado' },
            { icon: <XCircle size={15} className="text-red" />, label: 'Falhou', desc: 'Desvio encontrado, bug registrado' },
            { icon: <AlertTriangle size={15} className="text-amber" />, label: 'Bloqueado', desc: 'Não foi possível executar' },
            { icon: <Clock size={15} className="text-accent" />, label: 'Parcial', desc: 'Passou parcialmente' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 bg-surface border border-white/[0.07] rounded-xl px-4 py-2.5">
              {icon}
              <span className="text-sm font-medium text-text w-24">{label}</span>
              <span className="text-xs text-muted">{desc}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted uppercase tracking-wider mb-3">Evidências</p>
        <div className="flex flex-col gap-3">
          <div className="bg-surface border border-white/[0.07] rounded-xl p-4">
            <p className="text-sm font-semibold text-text mb-1">Screenshots anexadas</p>
            <p className="text-xs text-muted">Capture evidências diretamente durante a execução. As imagens ficam vinculadas ao resultado.</p>
          </div>
          <div className="bg-surface border border-white/[0.07] rounded-xl p-4">
            <p className="text-sm font-semibold text-text mb-1">Notas de execução</p>
            <p className="text-xs text-muted">Campo livre para descrever o comportamento observado, contexto ou instruções de reprodução.</p>
          </div>
          <div className="bg-surface border border-white/[0.07] rounded-xl p-4">
            <p className="text-sm font-semibold text-text mb-1">Histórico completo</p>
            <p className="text-xs text-muted">Todas as execuções ficam salvas com data, executor e resultado. Nada se perde.</p>
          </div>
        </div>
      </div>
    </div>
  </Slide>,

  /* 7 — Bugs */
  <Slide key="bugs">
    <div className="mb-10">
      <Tag color="red">Bugs</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Rastreamento integrado de defeitos</h2>
      <p className="text-muted text-lg">Bugs vinculados diretamente aos cenários que os descobriram</p>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="flex flex-col gap-3">
        <FeatureCard icon={<Bug size={18} />} title="Vinculado ao cenário" desc="Cada bug nasce de um cenário de teste — a rastreabilidade é automática, não depende de processo manual." />
        <FeatureCard icon={<AlertTriangle size={18} />} title="Severidade e reprodutibilidade" desc="Classifique o impacto (Crítico → Baixo) e com que frequência o bug ocorre." />
      </div>
      <div className="flex flex-col gap-3">
        <FeatureCard icon={<History size={18} />} title="Histórico de reaberturas" desc="O sistema registra quantas vezes o bug foi reaberto, quando e por quem — essencial para acompanhar regressões." />
        <FeatureCard icon={<CheckSquare size={18} />} title="Cenários de verificação" desc="Crie cenários de teste específicos para verificar a correção do bug, diretamente dentro do bug." />
      </div>
    </div>
    <div className="mt-4 grid grid-cols-5 gap-2">
      {['Aberto', 'Em andamento', 'Resolvido', 'Fechado', 'Reaberto'].map((s, i) => {
        const colors = ['text-green', 'text-accent', 'text-green', 'text-muted', 'text-red']
        return (
          <div key={s} className="bg-surface border border-white/[0.07] rounded-xl p-3 text-center">
            {i < 4 && <ArrowRight size={12} className="text-muted mx-auto mb-1" />}
            <p className={`text-xs font-semibold ${colors[i]}`}>{s}</p>
          </div>
        )
      })}
    </div>
  </Slide>,

  /* 8 — Dashboard */
  <Slide key="dashboard">
    <div className="mb-10">
      <Tag>Dashboard</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Visibilidade em tempo real</h2>
      <p className="text-muted text-lg">KPIs e gráficos para gestores e líderes de QA</p>
    </div>
    <div className="grid grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Projetos Ativos', color: 'text-accent' },
        { label: 'Cenários Totais', color: 'text-text' },
        { label: 'Bugs Críticos', color: 'text-red' },
        { label: 'Taxa de Sucesso', color: 'text-green' },
      ].map(({ label, color }) => (
        <div key={label} className="bg-surface border border-white/[0.07] rounded-2xl p-4 text-center">
          <div className={`text-3xl font-black ${color} mb-1`}>—</div>
          <p className="text-xs text-muted">{label}</p>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-4">
      <FeatureCard icon={<BarChart2 size={18} />} title="Progresso por projeto" desc="Veja quantos cenários foram executados em cada projeto, a taxa de aprovação e quantos bugs estão abertos." />
      <FeatureCard icon={<Clock size={18} />} title="Filtro por período" desc="Analise os dados de hoje, última semana, último mês ou de todo o histórico do projeto." />
      <FeatureCard icon={<GitBranch size={18} />} title="Heatmap de cobertura" desc="Visualize quais projetos têm maior ou menor cobertura de testes — identifique gaps rapidamente." />
      <FeatureCard icon={<FileText size={18} />} title="Relatório para stakeholders" desc="Gere relatórios por período prontos para compartilhar com o time de produto e gestão." />
    </div>
  </Slide>,

  /* 9 — Rastreabilidade */
  <Slide key="traceability">
    <div className="mb-10">
      <Tag>Matriz de Rastreabilidade</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Do requisito ao bug, tudo conectado</h2>
      <p className="text-muted text-lg">Visão completa da cobertura de testes por entrega</p>
    </div>
    <div className="bg-surface border border-white/[0.07] rounded-2xl overflow-hidden mb-6">
      <div className="px-5 py-3 bg-surface2 border-b border-white/[0.07] flex items-center justify-between">
        <span className="text-sm font-semibold text-text">Projeto: [FFC-580] Gestão de saldo via fatura</span>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-green/15 text-green px-2 py-0.5 rounded-full">25 aprovados</span>
          <span className="text-xs text-muted">100%</span>
        </div>
      </div>
      {[
        { task: 'FFC-912 · Readaptar Cálculo de Limite', count: '16 cenários', pct: '100%', color: 'bg-green/70' },
        { task: 'FFC-932 · Criação da aba faturas',      count: '6 cenários',  pct: '100%', color: 'bg-green/70' },
        { task: 'FFC-928 · FinancialAPI Facade',          count: '3 cenários',  pct: '100%', color: 'bg-green/70' },
      ].map(({ task, count, pct, color }) => (
        <div key={task} className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04]">
          <span className="text-sm text-text flex-1">{task}</span>
          <span className="text-xs text-muted">{count}</span>
          <div className="w-28 h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: pct }} />
          </div>
          <span className="text-xs font-medium text-text w-8 text-right">{pct}</span>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-surface border border-white/[0.07] rounded-xl p-4 text-center">
        <p className="text-xs text-muted mb-1">Requisito → Cenário</p>
        <p className="text-sm font-semibold text-text">Cobertura por tarefa</p>
      </div>
      <div className="bg-surface border border-white/[0.07] rounded-xl p-4 text-center">
        <p className="text-xs text-muted mb-1">Cenário → Bug</p>
        <p className="text-sm font-semibold text-text">Bugs que causaram falhas</p>
      </div>
      <div className="bg-surface border border-white/[0.07] rounded-xl p-4 text-center">
        <p className="text-xs text-muted mb-1">Projeto → %</p>
        <p className="text-sm font-semibold text-text">Taxa de cobertura geral</p>
      </div>
    </div>
  </Slide>,

  /* 10 — Histórico e Comentários */
  <Slide key="history">
    <div className="mb-10">
      <Tag>Histórico e Comentários</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Colaboração e auditoria</h2>
      <p className="text-muted text-lg">Tudo que acontece no sistema fica registrado automaticamente</p>
    </div>
    <div className="grid grid-cols-2 gap-6">
      <div>
        <p className="text-xs text-muted uppercase tracking-wider mb-3">Histórico automático</p>
        <div className="flex flex-col gap-2">
          {[
            { dot: 'bg-accent', text: 'Cenário criado por Andreas', time: '09:32' },
            { dot: 'bg-green',  text: 'Cenário #0022 → Aprovado',  time: '10:15' },
            { dot: 'bg-red',    text: 'Bug registrado: CDAMP-01676', time: '11:04' },
            { dot: 'bg-amber',  text: 'Status do projeto → Em andamento', time: '14:20' },
          ].map(({ dot, text, time }) => (
            <div key={text} className="flex items-center gap-3 bg-surface border border-white/[0.07] rounded-xl px-4 py-2.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
              <span className="text-xs text-text flex-1">{text}</span>
              <span className="text-xs text-muted">{time}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">Filtre por projeto, tipo de evento e período</p>
      </div>
      <div>
        <p className="text-xs text-muted uppercase tracking-wider mb-3">Comentários</p>
        <div className="flex flex-col gap-3">
          <div className="bg-surface border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-xs font-bold text-accent">A</span>
              </div>
              <span className="text-xs font-medium text-text">Andreas</span>
              <span className="text-xs text-muted ml-auto">há 2h</span>
            </div>
            <p className="text-sm text-text/80">"Cenário validado em ambiente de staging. Comportamento conforme esperado."</p>
          </div>
          <FeatureCard icon={<MessageSquare size={18} />} title="Em cenários e bugs" desc="Deixe observações, dúvidas e decisões registradas diretamente onde o trabalho acontece." />
        </div>
      </div>
    </div>
  </Slide>,

  /* 11 — Antes x Depois */
  <Slide key="compare">
    <div className="mb-10">
      <Tag color="green">Transformação</Tag>
      <h2 className="text-4xl font-bold text-text mt-4 mb-2">Antes × Depois</h2>
      <p className="text-muted text-lg">O que muda no dia a dia do time de QA</p>
    </div>
    <div className="flex flex-col gap-3">
      <CompareRow before="Cenários em planilhas e docs desatualizados" after="Cenários versionados, estruturados e sempre acessíveis" />
      <CompareRow before="Ninguém sabe o que já foi testado" after="Histórico completo de todas as execuções com data e executor" />
      <CompareRow before="Bugs sem contexto: 'qual cenário falhou?'" after="Bug vinculado ao cenário que o descobriu — rastreabilidade automática" />
      <CompareRow before="Gestor pergunta: 'já podemos entregar?'" after="Dashboard mostra taxa de sucesso e bugs abertos em tempo real" />
      <CompareRow before="Regressões detectadas tarde demais" after="Histórico de reaberturas e heatmap de cobertura revelam riscos antes da release" />
    </div>
  </Slide>,

  /* 12 — Encerramento */
  <Slide key="close" className="items-center text-center">
    <div className="flex items-center justify-center gap-3 mb-6">
      <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center">
        <Eye size={28} className="text-accent" />
      </div>
    </div>
    <h2 className="text-5xl font-black text-text mb-4">Argus</h2>
    <p className="text-xl text-muted mb-10">Visibilidade total. Qualidade rastreável.</p>

    <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-10">
      <div className="bg-surface border border-white/[0.07] rounded-2xl p-5">
        <Shield size={24} className="text-accent mx-auto mb-2" />
        <p className="text-sm font-semibold text-text">Centralizado</p>
        <p className="text-xs text-muted mt-1">Tudo em um único sistema</p>
      </div>
      <div className="bg-surface border border-white/[0.07] rounded-2xl p-5">
        <GitBranch size={24} className="text-accent mx-auto mb-2" />
        <p className="text-sm font-semibold text-text">Rastreável</p>
        <p className="text-xs text-muted mt-1">Do requisito ao bug</p>
      </div>
      <div className="bg-surface border border-white/[0.07] rounded-2xl p-5">
        <BarChart2 size={24} className="text-accent mx-auto mb-2" />
        <p className="text-sm font-semibold text-text">Mensurável</p>
        <p className="text-xs text-muted mt-1">KPIs e cobertura em tempo real</p>
      </div>
    </div>

    <p className="text-sm text-muted">
      Desenvolvido por <span className="text-text font-semibold">Andreas Meyer Engel</span>
    </p>
  </Slide>,
]

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Presentation() {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(0)

  const prev = () => setIdx(i => Math.max(0, i - 1))
  const next = () => setIdx(i => Math.min(slides.length - 1, i + 1))

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next()
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev()
      if (e.key === 'Escape') navigate('/')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-accent" />
          <span className="text-sm font-bold text-accent">Argus</span>
          <span className="text-muted text-sm">— Apresentação para o Time de QA</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-muted text-sm">{idx + 1} / {slides.length}</span>
          <button
            onClick={() => navigate('/')}
            className="text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface2 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-10">
        {slides[idx]}
      </div>

      {/* Footer nav */}
      <div className="flex items-center justify-center gap-6 py-5 border-t border-white/[0.07] shrink-0">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface2 border border-white/[0.07] text-sm text-text disabled:opacity-30 hover:bg-surface transition-colors"
        >
          <ChevronLeft size={16} /> Anterior
        </button>

        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-accent w-5' : 'bg-white/20 hover:bg-white/40'}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={idx === slides.length - 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-surface2 border border-white/[0.07] text-sm text-text disabled:opacity-30 hover:bg-surface transition-colors"
        >
          Próximo <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
