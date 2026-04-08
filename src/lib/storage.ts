import { AppState } from '../types'

const STORAGE_KEY = 'pxqa_v1'
const DB_NAME = 'pxqa_images'
const STORE_NAME = 'images'

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

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    return { ...defaultState, ...JSON.parse(raw) }
  } catch { return defaultState }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// IndexedDB helpers
let db: IDBDatabase | null = null

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return }
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e) => {
      const d = (e.target as IDBOpenDBRequest).result
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    req.onsuccess = (e) => { db = (e.target as IDBOpenDBRequest).result; resolve(db) }
    req.onerror = () => reject(req.error)
  })
}

export async function saveImage(key: string, data: string): Promise<void> {
  const d = await openDB()
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ key, data })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadImage(key: string): Promise<string | null> {
  const d = await openDB()
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    req.onsuccess = () => resolve(req.result?.data ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteImagesByPrefix(prefix: string): Promise<void> {
  const d = await openDB()
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.openCursor()
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result
      if (cursor) {
        if ((cursor.key as string).startsWith(prefix)) cursor.delete()
        cursor.continue()
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
