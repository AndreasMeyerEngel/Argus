import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { ToastProvider } from './components/ui/Toast'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import EpicPage from './pages/EpicPage'
import GuidedRun from './pages/GuidedRun'
import Report from './pages/Report'
import Tarefas from './pages/Tarefas'

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <Layout>
                  <Home />
                </Layout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <Dashboard />
                </Layout>
              }
            />
            <Route
              path="/epic/:id"
              element={
                <Layout>
                  <EpicPage />
                </Layout>
              }
            />
            <Route path="/epic/:id/run" element={<GuidedRun />} />
            <Route
              path="/report"
              element={
                <Layout>
                  <Report />
                </Layout>
              }
            />
            <Route
              path="/tarefas"
              element={
                <Layout>
                  <Tarefas />
                </Layout>
              }
            />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  )
}
