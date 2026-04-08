import React, { useState } from 'react'
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError('E-mail ou senha incorretos.')
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) {
          setError(error.message)
        } else {
          setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-surface2 border border-white/[0.07] rounded-lg px-3 py-2.5 text-sm text-text outline-none focus:border-accent transition-colors'

  return (
    <div className="flex h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
            <Eye size={24} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Argus</h1>
          <p className="text-sm text-muted">Sistema de gestão de QA</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-white/[0.07] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-text mb-5">
            {mode === 'login' ? 'Entrar na conta' : 'Criar conta'}
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-muted mb-1.5">E-mail</label>
              <input
                type="email"
                className={inputCls}
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs text-muted mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={inputCls + ' pr-10'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-green bg-green/10 border border-green/20 rounded-lg px-3 py-2">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn size={15} /> Entrar</>
              ) : (
                <><UserPlus size={15} /> Criar conta</>
              )}
            </button>
          </form>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-xs text-muted mt-4">
          {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
            className="text-accent hover:underline"
          >
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  )
}
