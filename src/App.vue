<script setup>
import { reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

// ---------- Skor default sesuai tabel rubrik (dipakai sebagai nilai awal, tapi bisa diedit juri) ----------
const SKOR_DEFAULT = {
  misi1: 10,
  misi2_wp2: 15,
  misi2_dropBox: 25,
  misi2_dropArea: 10,
  misi3: 20,
  finish: 10,
}
const SKOR_MAKS = {
  misi1: 10,
  misi2: 40, // wp2 + drop
  misi3: 20,
  finish: 10,
}
const TOTAL_MAKSIMAL = 80

// ---------- State tim tersimpan ----------
const STORAGE_KEY = 'seleksi-drone-scorer-data'

function buatTimBaru() {
  return {
    id: crypto.randomUUID(),
    namaTim: '',
    waktu: '', // format mm:ss, hasil final (manual atau dari stopwatch)
    misi1: null,        // true/false
    misi2_wp2: null,    // true/false
    misi2_drop: null,   // 'box' | 'area' | 'gagal'
    misi3: null,        // true/false
    finish: null,        // true/false
    skor: {
      misi1: 0,
      misi2_wp2: 0,
      misi2_drop: 0,
      misi3: 0,
      finish: 0,
    },
    catatan: '',
  }
}

const teams = reactive(loadFromStorage())

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    return []
  }
}

watch(teams, (val) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
}, { deep: true })

// ---------- 2 SLOT INPUT PARALEL (Tim A & Tim B dinilai bersamaan) ----------
function buatSlot(label) {
  return {
    label,               // "Tim A" / "Tim B" (label slot, bukan nama tim)
    form: buatTimBaru(),
    editingId: null,
    waktuMode: 'manual', // 'manual' | 'stopwatch'
    stopwatch: { running: false, startedAt: 0, elapsedMs: 0 },
  }
}

const slots = reactive([buatSlot('Tim A'), buatSlot('Tim B')])
const stopwatchTimers = [null, null] // interval id per slot, di luar reactive (bukan data)

// Auto-isi skor default tiap status berubah, per slot
slots.forEach((slot, idx) => {
  watch(() => slot.form.misi1, (v) => {
    slot.form.skor.misi1 = v === true ? SKOR_DEFAULT.misi1 : v === false ? 0 : slot.form.skor.misi1
  })
  watch(() => slot.form.misi2_wp2, (v) => {
    slot.form.skor.misi2_wp2 = v === true ? SKOR_DEFAULT.misi2_wp2 : v === false ? 0 : slot.form.skor.misi2_wp2
  })
  watch(() => slot.form.misi2_drop, (v) => {
    slot.form.skor.misi2_drop = v === 'box' ? SKOR_DEFAULT.misi2_dropBox
      : v === 'area' ? SKOR_DEFAULT.misi2_dropArea
      : v === 'gagal' ? 0 : slot.form.skor.misi2_drop
  })
  watch(() => slot.form.misi3, (v) => {
    slot.form.skor.misi3 = v === true ? SKOR_DEFAULT.misi3 : v === false ? 0 : slot.form.skor.misi3
  })
  watch(() => slot.form.finish, (v) => {
    slot.form.skor.finish = v === true ? SKOR_DEFAULT.finish : v === false ? 0 : slot.form.skor.finish
  })
})

function resetSkorItem(idx, key) {
  const f = slots[idx].form
  if (key === 'misi1') f.skor.misi1 = f.misi1 ? SKOR_DEFAULT.misi1 : 0
  if (key === 'misi2_wp2') f.skor.misi2_wp2 = f.misi2_wp2 ? SKOR_DEFAULT.misi2_wp2 : 0
  if (key === 'misi2_drop') {
    f.skor.misi2_drop = f.misi2_drop === 'box' ? SKOR_DEFAULT.misi2_dropBox
      : f.misi2_drop === 'area' ? SKOR_DEFAULT.misi2_dropArea : 0
  }
  if (key === 'misi3') f.skor.misi3 = f.misi3 ? SKOR_DEFAULT.misi3 : 0
  if (key === 'finish') f.skor.finish = f.finish ? SKOR_DEFAULT.finish : 0
}

function hitungSkor(t) {
  const s = t.skor || {}
  return (Number(s.misi1) || 0) + (Number(s.misi2_wp2) || 0) + (Number(s.misi2_drop) || 0) +
    (Number(s.misi3) || 0) + (Number(s.finish) || 0)
}

function waktuKeDetik(waktuStr) {
  if (!waktuStr) return Infinity
  const parts = waktuStr.split(':').map(Number)
  if (parts.some(isNaN)) return Infinity
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 1) return parts[0]
  return Infinity
}

function simpanTim(idx) {
  const slot = slots[idx]
  if (!slot.form.namaTim.trim()) {
    alert(`Nama tim wajib diisi (${slot.label})`)
    return
  }
  if (slot.editingId) {
    const i = teams.findIndex(t => t.id === slot.editingId)
    if (i !== -1) teams[i] = JSON.parse(JSON.stringify(slot.form))
    slot.editingId = null
  } else {
    teams.push({ ...JSON.parse(JSON.stringify(slot.form)), id: crypto.randomUUID() })
  }
  slot.form = buatTimBaru()
  resetStopwatch(idx)
}

function editTim(t, idx) {
  const slot = slots[idx]
  slot.form = JSON.parse(JSON.stringify(t))
  slot.editingId = t.id
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function hapusTim(id) {
  if (!confirm('Hapus data tim ini?')) return
  const i = teams.findIndex(t => t.id === id)
  if (i !== -1) teams.splice(i, 1)
}

function batalEdit(idx) {
  const slot = slots[idx]
  slot.form = buatTimBaru()
  slot.editingId = null
}

// ---------- Stopwatch per slot ----------
function formatMs(ms) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function stopwatchDisplay(idx) {
  return formatMs(slots[idx].stopwatch.elapsedMs)
}

function startStopwatch(idx) {
  const sw = slots[idx].stopwatch
  if (sw.running) return
  sw.running = true
  sw.startedAt = Date.now() - sw.elapsedMs
  stopwatchTimers[idx] = setInterval(() => {
    sw.elapsedMs = Date.now() - sw.startedAt
  }, 200)
}
function pauseStopwatch(idx) {
  slots[idx].stopwatch.running = false
  clearInterval(stopwatchTimers[idx])
}
function resetStopwatch(idx) {
  pauseStopwatch(idx)
  slots[idx].stopwatch.elapsedMs = 0
}
function gunakanWaktuStopwatch(idx) {
  slots[idx].form.waktu = stopwatchDisplay(idx)
}
onBeforeUnmount(() => stopwatchTimers.forEach(t => clearInterval(t)))

// ---------- Ranking: skor tertinggi menang, kalau seri waktu tercepat menang ----------
const ranking = computed(() => {
  return [...teams]
    .map(t => ({ ...t, totalSkor: hitungSkor(t) }))
    .sort((a, b) => {
      if (b.totalSkor !== a.totalSkor) return b.totalSkor - a.totalSkor
      return waktuKeDetik(a.waktu) - waktuKeDetik(b.waktu)
    })
})

// ---------- Teks keterangan per elemen (mengikuti format tabel rubrik) ----------
function ketMisi1(t) {
  if (t.misi1 === true) return 'Berhasil lepas landas & melewati Gate 1 & 2'
  if (t.misi1 === false) return 'Tidak berhasil'
  return 'Belum dinilai'
}
function ketMisi2(t) {
  const wp2 = t.misi2_wp2 === true ? 'mencapai area WP2' : t.misi2_wp2 === false ? 'tidak mencapai WP2' : 'WP2 belum dinilai'
  const drop = t.misi2_drop === 'box' ? 'paket tepat masuk Box Merah'
    : t.misi2_drop === 'area' ? 'paket jatuh di area WP2 (tidak masuk box)'
    : t.misi2_drop === 'gagal' ? 'gagal dropping paket'
    : 'dropping belum dinilai'
  return `${wp2.charAt(0).toUpperCase() + wp2.slice(1)}; ${drop}`
}
function ketMisi3(t) {
  if (t.misi3 === true) return 'Melintasi Triple Gate secara utuh'
  if (t.misi3 === false) return 'Tidak berhasil melintasi Triple Gate'
  return 'Belum dinilai'
}
function ketFinish(t) {
  if (t.finish === true) return 'Landing stabil & berhenti sempurna \u22653 detik di WP3'
  if (t.finish === false) return 'Tidak landing stabil / tidak berhenti \u22653 detik'
  return 'Belum dinilai'
}

function buatRincianMisi(t) {
  const skorMisi2 = (Number(t.skor?.misi2_wp2) || 0) + (Number(t.skor?.misi2_drop) || 0)
  return [
    { no: 1, tahapan: 'Misi 1 (Manual)', elemen: 'Lepas landas & Melewati Gate 1 & 2', skorMaksimal: SKOR_MAKS.misi1, skorDidapat: Number(t.skor?.misi1) || 0, keterangan: ketMisi1(t) },
    { no: 2, tahapan: 'Misi 2 (Otonom)', elemen: 'Navigasi ke WP2 & Dropping Paket', skorMaksimal: SKOR_MAKS.misi2, skorDidapat: skorMisi2, keterangan: ketMisi2(t) },
    { no: 3, tahapan: 'Misi 3 (Otonom)', elemen: 'Melintasi Triple Gate (Lorong 2m)', skorMaksimal: SKOR_MAKS.misi3, skorDidapat: Number(t.skor?.misi3) || 0, keterangan: ketMisi3(t) },
    { no: 4, tahapan: 'Finish Seleksi', elemen: 'Landing di WP3 & Waktu Berhenti', skorMaksimal: SKOR_MAKS.finish, skorDidapat: Number(t.skor?.finish) || 0, keterangan: ketFinish(t) },
  ]
}

// ---------- Export ----------
function downloadFile(content, filename, mime) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportJSON() {
  const data = ranking.value.map((t, i) => ({
    peringkat: i + 1,
    namaTim: t.namaTim,
    waktu: t.waktu || '-',
    totalSkor: t.totalSkor,
    totalMaksimal: TOTAL_MAKSIMAL,
    rincianMisi: buatRincianMisi(t),
    catatanJuri: t.catatan || '',
  }))
  downloadFile(JSON.stringify(data, null, 2), 'hasil-seleksi-drone.json', 'application/json')
}

function exportCSV() {
  const header = [
    'Peringkat', 'Nama Tim', 'Waktu', 'No', 'Tahapan Misi', 'Elemen Penilaian',
    'Skor Maksimal', 'Skor Didapat', 'Keterangan', 'Catatan Juri'
  ]
  const rows = []
  ranking.value.forEach((t, i) => {
    const rincian = buatRincianMisi(t)
    rincian.forEach((r, idx) => {
      rows.push([
        i + 1, t.namaTim, t.waktu || '-', r.no, r.tahapan, r.elemen,
        r.skorMaksimal, r.skorDidapat, r.keterangan,
        idx === 0 ? (t.catatan || '').replace(/,/g, ';') : '',
      ])
    })
    rows.push([i + 1, t.namaTim, t.waktu || '-', '', 'TOTAL SKOR', '', TOTAL_MAKSIMAL, t.totalSkor, '', ''])
  })
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  downloadFile('\uFEFF' + csv, 'hasil-seleksi-drone.csv', 'text/csv;charset=utf-8')
}

// Ubah 1 entri hasil export (format rincianMisi) jadi 1 objek tim internal.
// Dipakai baik oleh Import JSON manual maupun oleh auto-load dari file public/.
function konversiEntriExport(d) {
  const cari = (no) => (d.rincianMisi || []).find(r => r.no === no) || {}
  const m1 = cari(1), m2 = cari(2), m3 = cari(3), m4 = cari(4)
  return {
    id: crypto.randomUUID(),
    namaTim: d.namaTim,
    waktu: d.waktu === '-' ? '' : d.waktu,
    misi1: null,
    misi2_wp2: null,
    misi2_drop: null,
    misi3: null,
    finish: null,
    skor: {
      misi1: Number(m1.skorDidapat) || 0,
      misi2_wp2: 0,
      misi2_drop: Number(m2.skorDidapat) || 0,
      misi3: Number(m3.skorDidapat) || 0,
      finish: Number(m4.skorDidapat) || 0,
    },
    catatan: d.catatanJuri || '',
  }
}

function importJSONFile(e) {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      data.forEach(d => teams.push(konversiEntriExport(d)))
    } catch (err) {
      alert('File JSON tidak valid')
    }
  }
  reader.readAsText(file)
  e.target.value = ''
}

// ---------- Auto-load hasil dari file JSON yang di-bundle di folder public/ ----------
// File ini ikut ter-deploy ke Vercel sebagai aset statis, jadi SEMUA device yang buka
// URL Vercel-nya akan fetch file yang sama dan lihat hasil yang identik —
// gak lagi bergantung pada localStorage tiap browser.
const PUBLIC_JSON_URL = '/Day-2.json'
const publicDataStatus = reactive({ loading: false, loadedCount: 0, error: '' })

async function muatDariFilePublik(timpaSemua = false) {
  publicDataStatus.loading = true
  publicDataStatus.error = ''
  try {
    const res = await fetch(PUBLIC_JSON_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error('File tidak ditemukan di ' + PUBLIC_JSON_URL)
    const data = await res.json()
    if (timpaSemua) teams.splice(0, teams.length)
    data.forEach(d => teams.push(konversiEntriExport(d)))
    publicDataStatus.loadedCount = data.length
  } catch (err) {
    publicDataStatus.error = err.message
  } finally {
    publicDataStatus.loading = false
  }
}

onMounted(() => {
  // Hanya auto-isi kalau localStorage device ini masih kosong (kunjungan pertama),
  // supaya gak menimpa perubahan yang sedang diedit juri di device itu.
  if (teams.length === 0) {
    muatDariFilePublik(false)
  }
})
</script>

<template>
  <div class="wrap">
    <h1>🚁 Nilai tim lawan KRTI wilayah</h1>
    <p class="subtitle">Total skor maksimal per tim: <strong>{{ TOTAL_MAKSIMAL }}</strong> — input 2 tim sekaligus</p>

    <!-- DUA SLOT INPUT PARALEL -->
    <div class="dual-input">
      <div v-for="(slot, idx) in slots" :key="idx" class="card">
        <h2>{{ slot.label }} — {{ slot.editingId ? 'Edit Data Tim' : 'Input Penilaian' }}</h2>

        <div class="row">
          <label>Nama Tim</label>
          <input v-model="slot.form.namaTim" :placeholder="`Contoh: Tim Garuda (${slot.label})`" />
        </div>

        <div class="row">
          <label>Waktu</label>
          <div class="mode-toggle">
            <button :class="{ active: slot.waktuMode === 'manual' }" @click="slot.waktuMode = 'manual'">Input Manual</button>
            <button :class="{ active: slot.waktuMode === 'stopwatch' }" @click="slot.waktuMode = 'stopwatch'">Stopwatch</button>
          </div>

          <input v-if="slot.waktuMode === 'manual'" v-model="slot.form.waktu" placeholder="mm:ss, contoh: 03:45" />

          <div v-else class="stopwatch-box">
            <div class="stopwatch-display">{{ stopwatchDisplay(idx) }}</div>
            <div class="stopwatch-btns">
              <button v-if="!slot.stopwatch.running" class="primary" @click="startStopwatch(idx)">Mulai</button>
              <button v-else @click="pauseStopwatch(idx)">Jeda</button>
              <button @click="resetStopwatch(idx)">Reset</button>
              <button @click="gunakanWaktuStopwatch(idx)">Gunakan Waktu Ini →</button>
            </div>
            <input v-model="slot.form.waktu" placeholder="Waktu final (mm:ss)" class="waktu-final" />
          </div>
        </div>

        <hr />

        <div class="misi-block">
          <div class="misi-head">
            <h3>Misi 1 (Manual) — Lepas landas & lewati Gate 1 & 2</h3>
            <span class="skor">Maks {{ SKOR_MAKS.misi1 }}</span>
          </div>
          <div class="yn">
            <label><input type="radio" :name="`misi1-${idx}`" :value="true" v-model="slot.form.misi1" /> Ya</label>
            <label><input type="radio" :name="`misi1-${idx}`" :value="false" v-model="slot.form.misi1" /> Tidak</label>
          </div>
          <div class="skor-edit">
            <label>Skor:</label>
            <input type="number" v-model.number="slot.form.skor.misi1" min="0" :max="SKOR_MAKS.misi1" />
            <button class="mini" @click="resetSkorItem(idx, 'misi1')">Reset</button>
          </div>
        </div>

        <div class="misi-block">
          <div class="misi-head">
            <h3>Misi 2 (Otonom) — Navigasi ke WP2 & Dropping Paket</h3>
            <span class="skor">Maks {{ SKOR_MAKS.misi2 }}</span>
          </div>
          <p class="label-kecil">Mencapai area WP2 (15 poin)</p>
          <div class="yn">
            <label><input type="radio" :name="`misi2wp2-${idx}`" :value="true" v-model="slot.form.misi2_wp2" /> Ya</label>
            <label><input type="radio" :name="`misi2wp2-${idx}`" :value="false" v-model="slot.form.misi2_wp2" /> Tidak</label>
          </div>
          <div class="skor-edit">
            <label>Skor WP2:</label>
            <input type="number" v-model.number="slot.form.skor.misi2_wp2" min="0" max="15" />
            <button class="mini" @click="resetSkorItem(idx, 'misi2_wp2')">Reset</button>
          </div>

          <p class="label-kecil">Hasil dropping paket</p>
          <div class="yn">
            <label><input type="radio" :name="`misi2drop-${idx}`" value="box" v-model="slot.form.misi2_drop" /> Tepat Box Merah</label>
            <label><input type="radio" :name="`misi2drop-${idx}`" value="area" v-model="slot.form.misi2_drop" /> Jatuh di area</label>
            <label><input type="radio" :name="`misi2drop-${idx}`" value="gagal" v-model="slot.form.misi2_drop" /> Gagal</label>
          </div>
          <div class="skor-edit">
            <label>Skor dropping:</label>
            <input type="number" v-model.number="slot.form.skor.misi2_drop" min="0" max="25" />
            <button class="mini" @click="resetSkorItem(idx, 'misi2_drop')">Reset</button>
          </div>
        </div>

        <div class="misi-block">
          <div class="misi-head">
            <h3>Misi 3 (Otonom) — Triple Gate (Lorong 2m)</h3>
            <span class="skor">Maks {{ SKOR_MAKS.misi3 }}</span>
          </div>
          <div class="yn">
            <label><input type="radio" :name="`misi3-${idx}`" :value="true" v-model="slot.form.misi3" /> Ya, lolos utuh</label>
            <label><input type="radio" :name="`misi3-${idx}`" :value="false" v-model="slot.form.misi3" /> Tidak</label>
          </div>
          <div class="skor-edit">
            <label>Skor:</label>
            <input type="number" v-model.number="slot.form.skor.misi3" min="0" :max="SKOR_MAKS.misi3" />
            <button class="mini" @click="resetSkorItem(idx, 'misi3')">Reset</button>
          </div>
        </div>

        <div class="misi-block">
          <div class="misi-head">
            <h3>Finish — Landing di WP3 & Waktu Berhenti</h3>
            <span class="skor">Maks {{ SKOR_MAKS.finish }}</span>
          </div>
          <div class="yn">
            <label><input type="radio" :name="`finish-${idx}`" :value="true" v-model="slot.form.finish" /> Ya, stabil \u22653 dtk</label>
            <label><input type="radio" :name="`finish-${idx}`" :value="false" v-model="slot.form.finish" /> Tidak</label>
          </div>
          <div class="skor-edit">
            <label>Skor:</label>
            <input type="number" v-model.number="slot.form.skor.finish" min="0" :max="SKOR_MAKS.finish" />
            <button class="mini" @click="resetSkorItem(idx, 'finish')">Reset</button>
          </div>
        </div>

        <div class="row total-preview">
          Total sementara: <strong>{{ hitungSkor(slot.form) }} / {{ TOTAL_MAKSIMAL }}</strong>
        </div>

        <div class="row">
          <label>Catatan Juri</label>
          <textarea v-model="slot.form.catatan" rows="2" placeholder="Alasan pengurangan skor, dsb."></textarea>
        </div>

        <div class="actions">
          <button class="primary" @click="simpanTim(idx)">{{ slot.editingId ? 'Simpan Perubahan' : `Tambah ${slot.label}` }}</button>
          <button v-if="slot.editingId" @click="batalEdit(idx)">Batal</button>
        </div>
      </div>
    </div>

    <!-- HASIL / RANKING (FULL WIDTH) -->
    <div class="card results-full">
      <div class="header-row">
        <h2>Hasil & Perbandingan Antar Tim</h2>
        <div class="export-btns">
          <button @click="muatDariFilePublik(true)" :disabled="publicDataStatus.loading">
            {{ publicDataStatus.loading ? 'Memuat...' : '↻ Muat Ulang dari File' }}
          </button>
          <template v-if="ranking.length">
            <button @click="exportJSON">Export JSON</button>
            <button @click="exportCSV">Export CSV</button>
            <label class="import-btn">
              Import JSON
              <input type="file" accept="application/json" @change="importJSONFile" hidden />
            </label>
          </template>
        </div>
      </div>
      <p v-if="publicDataStatus.error" class="status-error">⚠ {{ publicDataStatus.error }} (file <code>public/hasil-seleksi-drone.json</code> belum ada / belum ke-deploy)</p>

      <p v-if="!ranking.length" class="empty-msg">Belum ada tim yang dinilai.</p>

      <div class="results-grid">
        <div v-for="(t, i) in ranking" :key="t.id" class="team-result" :class="{ juara: i === 0 }">
          <div class="team-result-head">
            <div>
              <span class="rank">#{{ i + 1 }}</span>
              <strong class="team-name">{{ t.namaTim }}</strong>
              <span class="team-time">⏱ {{ t.waktu || '-' }}</span>
            </div>
            <div class="team-score">{{ t.totalSkor }} / {{ TOTAL_MAKSIMAL }}</div>
          </div>

          <table class="detail-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tahapan Misi</th>
                <th>Skor</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in buatRincianMisi(t)" :key="r.no">
                <td>{{ r.no }}</td>
                <td>{{ r.tahapan }}</td>
                <td>{{ r.skorDidapat }} / {{ r.skorMaksimal }}</td>
                <td class="ket">{{ r.keterangan }}</td>
              </tr>
            </tbody>
          </table>

          <p v-if="t.catatan" class="catatan-tampil">📝 {{ t.catatan }}</p>

          <div class="row-actions">
            <button @click="editTim(t, 0)">Edit di Slot A</button>
            <button @click="editTim(t, 1)">Edit di Slot B</button>
            <button @click="hapusTim(t.id)" class="danger">Hapus</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* { box-sizing: border-box; }
body { margin: 0; background: #0f1115; color: #e6e6e6; font-family: 'Segoe UI', sans-serif; }
.wrap { max-width: 1400px; margin: 0 auto; padding: 24px 16px 60px; }
h1 { margin-bottom: 4px; }
.subtitle { color: #999; margin-top: 0; }

.dual-input { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; margin-bottom: 24px; }
@media (max-width: 900px) {
  .dual-input { grid-template-columns: 1fr; }
}

.card { background: #1a1d24; border: 1px solid #2a2e38; border-radius: 12px; padding: 20px; }
.results-full { max-width: 100%; }

.row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
.row label { font-size: 13px; color: #aaa; }
input[type=text], input[type=number], textarea,
input:not([type=radio]):not([type=checkbox]):not([type=file]) {
  background: #0f1115; border: 1px solid #333; color: #eee; padding: 8px 10px; border-radius: 8px; font-size: 14px; font-family: inherit;
}
textarea { resize: vertical; }
input[type=number] { width: 80px; }

.mode-toggle { display: flex; gap: 6px; margin-bottom: 8px; }
.mode-toggle button { flex: 1; }
.mode-toggle button.active { background: #3478f6; border-color: #3478f6; }

.stopwatch-box { background: #0f1115; border: 1px solid #2a2e38; border-radius: 8px; padding: 12px; }
.stopwatch-display { font-size: 32px; font-weight: bold; text-align: center; font-variant-numeric: tabular-nums; color: #5ac8fa; margin-bottom: 8px; }
.stopwatch-btns { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.stopwatch-btns button { flex: 1; min-width: 70px; }
.waktu-final { width: 100%; }

.misi-block { border-top: 1px solid #2a2e38; padding-top: 12px; margin-top: 12px; }
.misi-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.misi-block h3 { margin: 0 0 8px; font-size: 14px; }
.skor { color: #5ac8fa; font-weight: normal; font-size: 13px; white-space: nowrap; }
.label-kecil { font-size: 13px; color: #999; margin: 8px 0 4px; }
.yn { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 6px; }
.yn label { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
.skor-edit { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.skor-edit label { font-size: 13px; color: #aaa; }
button.mini { padding: 4px 8px; font-size: 12px; }

.total-preview { font-size: 15px; padding: 10px 0; border-top: 1px solid #2a2e38; border-bottom: 1px solid #2a2e38; margin: 12px 0; }

.actions { display: flex; gap: 10px; margin-top: 16px; }
button { background: #262a34; color: #eee; border: 1px solid #3a3f4b; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 14px; }
button:hover { background: #31363f; }
button.primary { background: #3478f6; border-color: #3478f6; }
button.primary:hover { background: #2a63cc; }
button.danger { border-color: #a33; }
button.danger:hover { background: #3a1c1c; }

.header-row { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.export-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.import-btn { background: #262a34; border: 1px solid #3a3f4b; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.import-btn:hover { background: #31363f; }

.empty-msg { color: #777; font-size: 14px; }
.status-error { color: #e07b7b; font-size: 13px; margin: 0 0 10px; }

.results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }

.team-result { border: 1px solid #2a2e38; border-radius: 10px; padding: 14px; }
.team-result.juara { border-color: #caa03a; background: rgba(255, 215, 0, 0.06); }
.team-result-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px; }
.rank { color: #5ac8fa; font-weight: bold; margin-right: 8px; }
.team-name { font-size: 16px; margin-right: 10px; }
.team-time { color: #999; font-size: 13px; }
.team-score { font-size: 18px; font-weight: bold; }

.detail-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 8px; }
.detail-table th, .detail-table td { border-bottom: 1px solid #2a2e38; padding: 6px; text-align: left; }
.detail-table th { color: #888; font-weight: 600; }
.detail-table .ket { color: #ccc; }

.catatan-tampil { font-size: 13px; color: #d8c17a; background: #23201533; padding: 6px 8px; border-radius: 6px; margin: 6px 0; }

.row-actions { display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
</style>