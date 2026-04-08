import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be within ToastProvider')
  return ctx.toast
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={16} className="text-green" />,
  error: <XCircle size={16} className="text-red" />,
  warning: <AlertCircle size={16} className="text-amber" />,
  info: <Info size={16} className="text-accent" />,
}

const bgColors: Record<ToastType, string> = {
  success: 'border-green/30 bg-green/10',
  error: 'border-red/30 bg-red/10',
  warning: 'border-amber/30 bg-amber/10',
  info: 'border-accent/30 bg-accent/10',
}

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${bgColors[t.type]} backdrop-blur-sm shadow-lg min-w-[280px] max-w-sm`}
        >
          <div className="mt-0.5 shrink-0">{icons[t.type]}</div>
          <p className="text-sm text-text flex-1">{t.message}</p>
          <button onClick={() => onRemove(t.id)} className="text-muted hover:text-text shrink-0">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
