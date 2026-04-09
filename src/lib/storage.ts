import { AppState } from '../types'
import { supabase } from './supabase'

export const defaultState: AppState = {
  epics: [],
  tasks: [],
  scenarios: [],
  bugs: [],
  nextEpicId: 1,
  nextTaskId: 1,
  nextScenarioId: 1,
  nextBugId: 1,
  nextExecId: 1,
  settings: { userName: '', reportPeriodDays: 14 }
}

// When VITE_SUPABASE_URL is absent (Docker build), use the local API instead.
const IS_LOCAL = !import.meta.env.VITE_SUPABASE_URL

const BUCKET = 'screenshots'

// ─── State persistence ────────────────────────────────────────────────────────

export async function loadState(): Promise<AppState> {
  try {
    if (IS_LOCAL) {
      const res = await fetch('/api/state')
      if (!res.ok) return defaultState
      const data = await res.json()
      return data ? { ...defaultState, ...data } : defaultState
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return defaultState

    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('user_id', user.id)
      .single()

    if (error || !data) return defaultState
    return { ...defaultState, ...data.data }
  } catch {
    return defaultState
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function saveState(state: AppState): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    if (IS_LOCAL) {
      await fetch('/api/state', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('app_state')
      .upsert({ user_id: user.id, data: state })
  }, 800)
}

// ─── Image helpers ────────────────────────────────────────────────────────────

function dataURLToBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function saveImage(key: string, dataURL: string): Promise<void> {
  if (IS_LOCAL) {
    await fetch(`/api/images/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataURL }),
    })
    return
  }

  const blob = dataURLToBlob(dataURL)
  const { error } = await supabase.storage.from(BUCKET).upload(key, blob, {
    upsert: true,
    contentType: blob.type
  })
  if (error) throw new Error(`Falha ao salvar imagem: ${error.message}`)
}

export async function loadImage(key: string): Promise<string | null> {
  if (IS_LOCAL) {
    // Return URL served as binary by the backend
    return `/api/images/${key}`
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key)
  return data.publicUrl
}

export async function deleteImagesByPrefix(prefix: string): Promise<void> {
  if (IS_LOCAL) {
    await fetch(`/api/images?prefix=${encodeURIComponent(prefix)}`, { method: 'DELETE' })
    return
  }

  const { data } = await supabase.storage.from(BUCKET).list('', {
    search: prefix
  })
  if (data && data.length > 0) {
    await supabase.storage.from(BUCKET).remove(data.map(f => f.name))
  }
}
