import React, { useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, BarChart2, FileText, Settings, ChevronRight, Eye, X, ClipboardList, Download, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { defaultState } from '../lib/storage'
import { AppState } from '../types'
import { Modal } from './ui/Modal'

function SettingsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useApp()
  const [userName, setUserName] = useState(state.settings.userName)
  const [reportPeriodDays, setReportPeriodDays] = useState(state.settings.reportPeriodDays)
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const save = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: { userName, reportPeriodDays } })
    onClose()
  }

  const handleExport = () => {
    const date = new Date().toISOString().slice(0, 10)
    const json = JSON.stringify(state, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `argus-backup-${date}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('')
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as AppState
        if (!parsed.epics || !parsed.scenarios || !parsed.bugs) {
          setImportError('Arquivo inválido — não parece ser um backup do Argus.')
          return
        }
        const restored: AppState = { ...defaultState, ...parsed }
        dispatch({ type: 'SET_STATE', payload: restored })
        onClose()
      } catch {
        setImportError('Erro ao ler o arquivo. Verifique se é um JSON válido.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const inputCls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2 text-sm text-text outline-none focus:border-accent'

  return (
    <Modal title="Configurações" onClose={onClose} size="sm">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-xs text-muted mb-1.5">Seu nome</label>
          <input
            className={inputCls}
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Nome do executor"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1.5">Período padrão do relatório (dias)</label>
          <input
            type="number"
            className={inputCls}
            value={reportPeriodDays}
            onChange={e => setReportPeriodDays(Number(e.target.value))}
            min={1}
            max={90}
          />
        </div>
        <button
          onClick={save}
          className="w-full py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors"
        >
          Salvar
        </button>

        {/* Backup */}
        <div className="border-t border-white/[0.07] pt-4 flex flex-col gap-2">
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Backup de dados</p>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 w-full px-3 py-2 bg-surface2 border border-white/[0.07] rounded-lg text-sm text-text hover:border-accent/40 transition-colors"
          >
            <Download size={14} className="text-accent" />
            Exportar backup (.json)
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full px-3 py-2 bg-surface2 border border-white/[0.07] rounded-lg text-sm text-text hover:border-accent/40 transition-colors"
          >
            <Upload size={14} className="text-accent" />
            Importar backup (.json)
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImport}
          />
          {importError && (
            <p className="text-xs text-red">{importError}</p>
          )}
          <p className="text-xs text-muted">
            Ao importar, os dados atuais serão substituídos pelo backup.
          </p>
        </div>
      </div>
    </Modal>
  )
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useApp()
  const navigate = useNavigate()
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const activeEpics = state.epics.filter(e => ['running', 'planning', 'blocked'].includes(e.status)).slice(0, 8)

  const navItems = [
    { to: '/', icon: LayoutGrid, label: 'Épicos' },
    { to: '/tarefas', icon: ClipboardList, label: 'Tarefas' },
    { to: '/dashboard', icon: BarChart2, label: 'Dashboard' },
    { to: '/report', icon: FileText, label: 'Relatório' },
  ]

  const epicStatusColor: Record<string, string> = {
    running: 'bg-accent',
    planning: 'bg-gray-500',
    blocked: 'bg-red',
    done: 'bg-green',
    archived: 'bg-gray-600',
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-0'} transition-all duration-200 shrink-0 flex flex-col bg-surface border-r border-white/[0.07] overflow-hidden`}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 h-14 border-b border-white/[0.07] shrink-0">
          <Eye size={18} className="text-accent" />
          <span className="text-base font-bold text-accent tracking-tight">Argus</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 pt-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-accent/20 text-accent font-medium'
                    : 'text-muted hover:text-text hover:bg-surface2'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Active Epics */}
        {activeEpics.length > 0 && (
          <div className="px-3 pt-5 flex-1 overflow-y-auto min-h-0">
            <p className="text-xs text-muted uppercase tracking-wider px-2 mb-2">Épicos Ativos</p>
            <div className="flex flex-col gap-1">
              {activeEpics.map(epic => (
                <button
                  key={epic.id}
                  onClick={() => navigate(`/epic/${epic.id}`)}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface2 transition-colors text-left w-full group"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${epicStatusColor[epic.status] || 'bg-gray-500'}`} />
                  <span className="text-xs text-muted group-hover:text-text truncate flex-1">{epic.name}</span>
                  <ChevronRight size={12} className="text-muted opacity-0 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="px-3 pb-4 mt-auto border-t border-white/[0.07] pt-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors text-sm w-full"
          >
            <Settings size={16} />
            Configurações
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-white/[0.07] flex items-center px-4 gap-3 shrink-0 bg-surface">
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface2 transition-colors"
          >
            {sidebarOpen ? <X size={18} /> : <LayoutGrid size={18} />}
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
