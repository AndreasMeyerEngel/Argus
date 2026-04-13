import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import EpicPage from './pages/EpicPage'
import GuidedRun from './pages/GuidedRun'
import Report from './pages/Report'
import Tarefas from './pages/Tarefas'
import Traceability from './pages/Traceability'
import Login from './pages/Login'

function AppRoutes() {
  const { user } = useAuth()

  if (!user) return <Login />

  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/tarefas" element={<Layout><Tarefas /></Layout>} />
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/report" element={<Layout><Report /></Layout>} />
        <Route path="/traceability" element={<Layout><Traceability /></Layout>} />
        <Route path="/epic/:id" element={<Layout><EpicPage /></Layout>} />
        <Route path="/epic/:id/run" element={<GuidedRun />} />
      </Routes>
    </AppProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
