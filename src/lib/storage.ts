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

const BUCKET = 'screenshots'

// ─── State persistence (Supabase) ────────────────────────────────────────────

export async function loadState(): Promise<AppState> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 1)
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
    await supabase
      .from('app_state')
      .upsert({ id: 1, data: state })
  }, 800)
}

// ─── Image helpers (Supabase Storage) ────────────────────────────────────────

function dataURLToBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',')
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function saveImage(key: string, dataURL: string): Promise<void> {
  const blob = dataURLToBlob(dataURL)
  await supabase.storage.from(BUCKET).upload(key, blob, {
    upsert: true,
    contentType: blob.type
  })
}

export async function loadImage(key: string): Promise<string | null> {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key)
  return data.publicUrl
}

export async function deleteImagesByPrefix(prefix: string): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET).list('', {
    search: prefix
  })
  if (data && data.length > 0) {
    await supabase.storage.from(BUCKET).remove(data.map(f => f.name))
  }
}
