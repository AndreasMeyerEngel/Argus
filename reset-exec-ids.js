// ─── Reset IDs de execução para começar em #0001 ──────────────────────────────
// Cole no Console do DevTools com o app aberto e recarregue (F5).

(async () => {
  const KEY = 'pxqa_v1'
  const DB_NAME = 'pxqa_images'
  const STORE = 'images'

  const raw = localStorage.getItem(KEY)
  if (!raw) { console.error('❌ Estado não encontrado.'); return }
  const state = JSON.parse(raw)

  // ── 1. Coleta todas as execuções existentes em ordem de ID ───────────────
  const allExecs = []
  for (const scenario of state.scenarios) {
    for (const exec of (scenario.executions ?? [])) {
      allExecs.push({ scenarioId: scenario.id, exec })
    }
  }

  if (allExecs.length === 0) {
    // Apenas reseta o contador
    state.nextExecId = 1
    localStorage.setItem(KEY, JSON.stringify(state))
    console.log('✅ Nenhuma execução existente. nextExecId resetado para 1.')
    return
  }

  // Ordena pelo ID antigo para manter a ordem cronológica
  allExecs.sort((a, b) => a.exec.id.localeCompare(b.exec.id))
  console.log(`📋 ${allExecs.length} execução(ões) encontradas. Renumerando...`)

  // ── 2. Abre IndexedDB ─────────────────────────────────────────────────────
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = e => {
      const d = e.target.result
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'key' })
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })

  const idbGet = (key) => new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => res(req.result?.data ?? null)
    req.onerror = () => rej(req.error)
  })

  const idbPut = (key, data) => new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ key, data })
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })

  const idbDelete = (key) => new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => res()
    tx.onerror = () => rej(tx.error)
  })

  // ── 3. Renumera cada execução e remapeia imagens ──────────────────────────
  let counter = 1
  const idMap = {} // oldId → newId

  for (const { exec } of allExecs) {
    const oldId = exec.id
    const newId = String(counter++).padStart(4, '0')
    idMap[oldId] = newId

    // Remapeia imagens no IndexedDB
    for (let i = 0; i < (exec.imgCount ?? 0); i++) {
      const oldKey = `exec_${oldId}_img_${i}`
      const newKey = `exec_${newId}_img_${i}`
      const data = await idbGet(oldKey)
      if (data) {
        await idbPut(newKey, data)
        await idbDelete(oldKey)
        console.log(`  🖼️  ${oldKey} → ${newKey}`)
      }
    }

    console.log(`  #${oldId} → #${newId} (${exec.result})`)
  }

  // ── 4. Atualiza IDs no state ──────────────────────────────────────────────
  for (const scenario of state.scenarios) {
    scenario.executions = (scenario.executions ?? []).map(exec => ({
      ...exec,
      id: idMap[exec.id] ?? exec.id
    }))
  }

  state.nextExecId = counter

  // ── 5. Salva ──────────────────────────────────────────────────────────────
  localStorage.setItem(KEY, JSON.stringify(state))
  console.log(`✅ Renumeração concluída. IDs: #0001 → #${String(counter - 1).padStart(4, '0')}. nextExecId = ${counter}`)
  console.log('Recarregue a página (F5).')
})()
