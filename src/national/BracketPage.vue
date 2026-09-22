<script setup>
import { ref } from 'vue'
import {
  state, KO_ROUNDS, namaTim, timSlot, pemenangMatch, kualifikasiGrup,
  semuaTim, setManualSlot, exportState, restoreState, resetSemuaHasil, resetTotal,
} from './store'

function setManualQualifiers(group, idx, teamId) {
  const cur = group.manualQualifiers ? [...group.manualQualifiers] : [...kualifikasiGrup(group)]
  cur[idx] = teamId
  group.manualQualifiers = cur
}
function resetManualQualifiers(group) {
  group.manualQualifiers = null
}
function setManualWinner(match, teamId) {
  match.manualWinner = teamId || null
}

const daftarSemuaTim = semuaTim

function downloadBackup() {
  const data = exportState()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `krti-national-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const fileInput = ref(null)
function pilihFileBackup() {
  fileInput.value?.click()
}
function uploadBackup(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      if (!confirm('Ini akan menimpa semua data bracket & ranking yang ada saat ini. Lanjutkan?')) return
      restoreState(data)
    } catch (err) {
      alert('File backup tidak valid: ' + err.message)
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}
function konfirmasiResetHasil() {
  if (!confirm('Hapus semua skor & waktu (nama tim & bracket tetap ada)? Cocok buat bersih-bersih data testing.')) return
  resetSemuaHasil()
}
function konfirmasiResetTotal() {
  if (!confirm('Hapus SEMUA data termasuk nama tim dan susunan bracket? Tidak bisa dibatalkan.')) return
  if (!confirm('Yakin? Ini mengosongkan semuanya dari awal.')) return
  resetTotal()
}
</script>

<template>
  <div class="nb-wrap">
    <div class="nb-backup-bar">
      <button class="nc-btn nc-btn-sm" @click="downloadBackup">⬇ Download Backup</button>
      <button class="nc-btn nc-btn-sm" @click="pilihFileBackup">⬆ Upload Backup</button>
      <input ref="fileInput" type="file" accept="application/json" hidden @change="uploadBackup" />
    </div>

    <div class="nb-danger-bar">
      <button class="nc-btn nc-btn-sm nc-btn-danger" @click="konfirmasiResetHasil">↺ Reset Semua Hasil (Testing)</button>
      <button class="nc-btn nc-btn-sm nc-btn-danger" @click="konfirmasiResetTotal">🗑 Reset Total (Semua Data)</button>
    </div>

    <h2 class="nb-title">Fase Grup</h2>
    <div class="nb-groups">
      <div v-for="g in state.groups" :key="g.id" class="nb-group-card">
        <h3>Grup {{ g.id }}</h3>
        <div v-for="(t, i) in g.tim" :key="t.id" class="nb-team-input">
          <label>Tim {{ i + 1 }}</label>
          <input v-model="t.nama" placeholder="Nama tim" />
        </div>
        <div class="nb-qualify-mini">
          <label>Lolos 1st</label>
          <select :value="kualifikasiGrup(g)[0]" @change="setManualQualifiers(g, 0, $event.target.value)" class="nc-select">
            <option v-for="t in g.tim" :key="t.id" :value="t.id">{{ t.nama || '(Tanpa nama)' }}</option>
          </select>
          <label>Lolos 2nd</label>
          <select :value="kualifikasiGrup(g)[1]" @change="setManualQualifiers(g, 1, $event.target.value)" class="nc-select">
            <option v-for="t in g.tim" :key="t.id" :value="t.id">{{ t.nama || '(Tanpa nama)' }}</option>
          </select>
          <button v-if="g.manualQualifiers" class="nc-btn nc-btn-sm" @click="resetManualQualifiers(g)">↺ Otomatis</button>
        </div>
      </div>
    </div>

    <h2 class="nb-title">Babak Gugur</h2>
    <div class="nb-ko-scroll">
      <div class="nb-ko">
        <div v-for="round in KO_ROUNDS" :key="round.key" class="nb-round-col">
          <h4>{{ round.nama }}</h4>
          <div v-for="(match, i) in state.knockout[round.key]" :key="match.id" class="nb-match-card">
            <div class="nb-match-team" :class="{ menang: pemenangMatch(round.key, i) === timSlot(round.key, i, 0) }">
              {{ namaTim(timSlot(round.key, i, 0)) || 'TBD' }}
            </div>
            <select class="nc-select nb-slot-select" :value="match.manualA || ''"
                    @change="setManualSlot(round.key, i, 0, $event.target.value)">
              <option value="">Otomatis (dari babak sebelumnya)</option>
              <option v-for="t in daftarSemuaTim()" :key="t.id" :value="t.id">{{ t.nama }}</option>
            </select>

            <div class="nb-match-vs">vs</div>

            <div class="nb-match-team" :class="{ menang: pemenangMatch(round.key, i) === timSlot(round.key, i, 1) }">
              {{ namaTim(timSlot(round.key, i, 1)) || 'TBD' }}
            </div>
            <select class="nc-select nb-slot-select" :value="match.manualB || ''"
                    @change="setManualSlot(round.key, i, 1, $event.target.value)">
              <option value="">Otomatis (dari babak sebelumnya)</option>
              <option v-for="t in daftarSemuaTim()" :key="t.id" :value="t.id">{{ t.nama }}</option>
            </select>

            <select :value="match.manualWinner || ''" @change="setManualWinner(match, $event.target.value)" class="nc-select nb-manual-select">
              <option value="">Pemenang: Otomatis</option>
              <option v-if="timSlot(round.key, i, 0)" :value="timSlot(round.key, i, 0)">Manual: {{ namaTim(timSlot(round.key, i, 0)) }}</option>
              <option v-if="timSlot(round.key, i, 1)" :value="timSlot(round.key, i, 1)">Manual: {{ namaTim(timSlot(round.key, i, 1)) }}</option>
            </select>
            <div v-if="match.manualWinner" class="nb-manual-badge">Manual</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>