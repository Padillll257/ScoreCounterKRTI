import { watch } from 'vue'
import { state, exportState, restoreState } from './store'

export const syncStatus = { value: 'idle' } // idle | syncing | synced | error

let pushTimer = null

async function pushSekarang() {
  syncStatus.value = 'syncing'
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportState()),
    })
    if (!res.ok) throw new Error('Gagal menyimpan ke server')
    syncStatus.value = 'synced'
  } catch (e) {
    syncStatus.value = 'error'
  }
}

export function pushDebounced() {
  clearTimeout(pushTimer)
  pushTimer = setTimeout(pushSekarang, 1500)
}

export async function pullDariCloud() {
  syncStatus.value = 'syncing'
  try {
    const res = await fetch('/api/state')
    if (!res.ok) throw new Error('Gagal mengambil data')
    const { data } = await res.json()
    if (data) restoreState(data)
    syncStatus.value = 'synced'
    return true
  } catch (e) {
    syncStatus.value = 'error'
    return false
  }
}

let watchStarted = false
export function mulaiAutoSync() {
  if (watchStarted) return
  watchStarted = true
  watch(state, () => pushDebounced(), { deep: true })
}

export function pushManual() {
  pushSekarang()
}