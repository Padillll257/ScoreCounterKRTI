<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import {
  state, GROUP_IDS, CHECKPOINTS, PAYLOAD_OPTIONS, KO_ROUNDS,
  namaTim, skorHasil, waktuHasil, timSlot, labelMatchGrup, kualifikasiGrup, pemenangMatch,
  tapTim, pilihPayload, emergencyStop, resetHasilTim, formatStopwatch, parseWaktuManual,
  setManualScore, setManualTime, clearManualOverride,
  matchGrupBerikutnya, matchGugurBerikutnya,
} from './store'

const sw = reactive({ running: false, startedAt: 0, elapsedMs: 0 })
let swTimer = null

function mulaiMisi() {
  if (sw.running) return
  sw.running = true
  sw.startedAt = Date.now() - sw.elapsedMs
  swTimer = setInterval(() => { sw.elapsedMs = Date.now() - sw.startedAt }, 31)
}
function jedaMisi() {
  sw.running = false
  clearInterval(swTimer)
}
function resetMisi() {
  jedaMisi()
  sw.elapsedMs = 0
}
onBeforeUnmount(() => clearInterval(swTimer))

const fase = ref('grup')
const selectedGroupId = ref('A')
const selectedGroupMatchIdx = ref(0)
const selectedRound = ref('r16')
const selectedMatchIdx = ref(0)

function gantiRound(key) {
  selectedRound.value = key
  selectedMatchIdx.value = 0
}
const jumlahMatchRound = computed(
  () => KO_ROUNDS.find((r) => r.key === selectedRound.value)?.jumlahMatch || 1
)

const grupAktif = computed(() => state.groups.find((g) => g.id === selectedGroupId.value))
const groupMatchAktif = computed(() => grupAktif.value?.matches[selectedGroupMatchIdx.value])
const koMatchAktif = computed(() => state.knockout[selectedRound.value][selectedMatchIdx.value])

const hasilContainer = computed(() =>
  fase.value === 'grup' ? groupMatchAktif.value?.hasil : koMatchAktif.value?.hasil
)

const pesertaAktif = computed(() => {
  if (fase.value === 'grup') {
    const m = groupMatchAktif.value
    if (!m) return [null, null]
    return [
      { id: m.teamAId, nama: namaTim(m.teamAId) },
      { id: m.teamBId, nama: namaTim(m.teamBId) },
    ]
  }
  const a = timSlot(selectedRound.value, selectedMatchIdx.value, 0)
  const b = timSlot(selectedRound.value, selectedMatchIdx.value, 1)
  return [a, b].map((id) => (id ? { id, nama: namaTim(id) } : null))
})

function hasilTim(teamId) {
  return hasilContainer.value?.[teamId]
}
function tap(teamId) {
  if (!sw.running) { alert('Tekan Mulai Misi dulu di kotak kiri'); return }
  if (hasilContainer.value) tapTim(hasilContainer.value, teamId, sw.elapsedMs)
}
function pilihPayloadTim(teamId, key) {
  if (hasilContainer.value) pilihPayload(hasilContainer.value, teamId, key)
}
function stopTim(teamId) {
  if (!confirm('Hentikan misi tim ini (dianggap gagal)?')) return
  emergencyStop(hasilContainer.value, teamId)
}
function resetTim(teamId) {
  if (!confirm('Reset progres tim ini?')) return
  resetHasilTim(hasilContainer.value, teamId)
}
function labelCheckpointBerikutnya(idx) {
  return CHECKPOINTS[idx]?.label || 'Selesai'
}

// ---- Auto-stop timer saat misi kedua tim berakhir ----
function misiTimSudahBerakhir(teamId) {
  const h = hasilTim(teamId)
  return !!h && (h.dq || h.status === 'nilai-payload' || h.status === 'selesai')
}
const keduaMisiBerakhir = computed(() => {
  const [a, b] = pesertaAktif.value
  if (!a || !b) return false
  return misiTimSudahBerakhir(a.id) && misiTimSudahBerakhir(b.id)
})

// Payload tetap harus dinilai sebelum bisa lanjut ke match berikutnya.
function timSudahBerhenti(teamId) {
  const h = hasilTim(teamId)
  return !!h && (h.dq || h.status === 'selesai')
}
const keduanyaBerhenti = computed(() => {
  const [a, b] = pesertaAktif.value
  if (!a || !b) return false
  return timSudahBerhenti(a.id) && timSudahBerhenti(b.id)
})
watch(keduaMisiBerakhir, (selesai) => {
  if (selesai && sw.running) jedaMisi()
})

// ---- Lanjut ke match berikutnya ----
function lanjutMatch() {
  if (fase.value === 'grup') {
    const next = matchGrupBerikutnya(selectedGroupId.value, selectedGroupMatchIdx.value)
    if (!next) { alert('Ini match terakhir di urutan grup.'); return }
    selectedGroupId.value = next.groupId
    selectedGroupMatchIdx.value = next.matchIdx
  } else {
    const next = matchGugurBerikutnya(selectedRound.value, selectedMatchIdx.value)
    if (!next) { alert('Ini match terakhir di bracket.'); return }
    selectedRound.value = next.roundKey
    selectedMatchIdx.value = next.matchIdx
  }
  resetMisi()
}

// ---- Edit manual skor & waktu ----
const editManualId = ref(null)
const manualSkorInput = ref('')
const manualWaktuInput = ref('')

function bukaEditManual(teamId) {
  const h = hasilTim(teamId)
  editManualId.value = teamId
  manualSkorInput.value = h?.manualScore ?? ''
  manualWaktuInput.value = h?.manualTime != null ? formatStopwatch(h.manualTime) : ''
}
function terapkanManual(teamId) {
  if (!hasilContainer.value) return
  if (manualSkorInput.value !== '') {
    setManualScore(hasilContainer.value, teamId, Number(manualSkorInput.value))
  }
  if (manualWaktuInput.value !== '') {
    const ms = parseWaktuManual(manualWaktuInput.value)
    if (ms === null) { alert('Format waktu salah, gunakan mm:ss.mmm'); return }
    setManualTime(hasilContainer.value, teamId, ms)
  }
  editManualId.value = null
}
function kembaliOtomatis(teamId) {
  if (hasilContainer.value) clearManualOverride(hasilContainer.value, teamId)
  editManualId.value = null
}

// ---- Kualifikasi grup & pemenang match gugur ----
const kualifikasi = computed(() => (grupAktif.value ? kualifikasiGrup(grupAktif.value) : [null, null]))
function setManualQualifiers(idx, teamId) {
  const g = grupAktif.value
  if (!g) return
  const cur = g.manualQualifiers ? [...g.manualQualifiers] : [...kualifikasiGrup(g)]
  cur[idx] = teamId
  g.manualQualifiers = cur
}
function resetManualQualifiers() {
  if (grupAktif.value) grupAktif.value.manualQualifiers = null
}

const pemenangKoAktif = computed(() => pemenangMatch(selectedRound.value, selectedMatchIdx.value))
function setManualWinner(teamId) {
  koMatchAktif.value.manualWinner = teamId || null
}
</script>

<template>
  <div class="nc-wrap">
    <div class="nc-left">
      <div class="nc-stopwatch-box">
        <div class="nc-sw-label">Waktu Misi</div>
        <div class="nc-sw-display">{{ formatStopwatch(sw.elapsedMs) }}</div>
        <div class="nc-sw-btns">
          <button v-if="!sw.running" class="nc-btn nc-btn-primary nc-btn-lg" @click="mulaiMisi">▶ Mulai Misi</button>
          <button v-else class="nc-btn nc-btn-lg" @click="jedaMisi">⏸ Jeda</button>
          <button class="nc-btn" @click="resetMisi">↺ Reset Waktu</button>
          <button v-if="keduanyaBerhenti" class="nc-btn nc-btn-primary" @click="lanjutMatch">
            Lanjut ke Match Berikutnya →
          </button>
        </div>
      </div>
    </div>

    <div class="nc-right">
      <div class="nc-selector">
        <div class="nc-fase-toggle">
          <button :class="['nc-btn', fase === 'grup' && 'nc-btn-active']" @click="fase = 'grup'">Fase Grup</button>
          <button :class="['nc-btn', fase === 'gugur' && 'nc-btn-active']" @click="fase = 'gugur'">Babak Gugur</button>
        </div>

        <div v-if="fase === 'grup'" class="nc-select-row">
          <label>Grup</label>
          <select v-model="selectedGroupId" class="nc-select">
            <option v-for="gid in GROUP_IDS" :key="gid" :value="gid">Grup {{ gid }}</option>
          </select>
          <label>Game</label>
          <select v-model.number="selectedGroupMatchIdx" class="nc-select">
            <option v-for="(m, i) in grupAktif?.matches" :key="m.id" :value="i">
              {{ labelMatchGrup(grupAktif, i) }}
            </option>
          </select>
        </div>
        <div v-else class="nc-select-row">
          <label>Babak</label>
          <select :value="selectedRound" @change="gantiRound($event.target.value)" class="nc-select">
            <option v-for="r in KO_ROUNDS" :key="r.key" :value="r.key">{{ r.nama }}</option>
          </select>
          <label>Match</label>
          <select v-model.number="selectedMatchIdx" class="nc-select">
            <option v-for="i in jumlahMatchRound" :key="i - 1" :value="i - 1">Match {{ i }}</option>
          </select>
        </div>
      </div>

      <div class="nc-teams">
        <div v-for="(p, pi) in pesertaAktif" :key="p ? p.id : 'kosong-' + pi" class="nc-team-box">
          <template v-if="p">
            <div class="nc-team-box-tap" @click="hasilTim(p.id)?.status !== 'nilai-payload' && tap(p.id)">
              <div class="nc-team-head">
                <strong>{{ p.nama }}</strong>
                <span class="nc-team-score">{{ skorHasil(hasilTim(p.id)) }} pts</span>
              </div>
              <div class="nc-progress-bar">
                <div v-for="(cp, i) in CHECKPOINTS" :key="cp.key" class="nc-progress-seg"
                     :class="{ done: (hasilTim(p.id)?.checkpointIdx || 0) > i }"></div>
              </div>
              <div class="nc-team-status" v-if="hasilTim(p.id)?.dq">Dihentikan / Gagal</div>
              <div class="nc-team-status" v-else-if="hasilTim(p.id)?.status === 'selesai'">
                Selesai · {{ formatStopwatch(waktuHasil(hasilTim(p.id))) }}
              </div>
              <div class="nc-team-status" v-else-if="(hasilTim(p.id)?.checkpointIdx || 0) < CHECKPOINTS.length">
                Ketuk untuk: {{ labelCheckpointBerikutnya(hasilTim(p.id)?.checkpointIdx || 0) }}
              </div>
            </div>

            <div v-if="hasilTim(p.id)?.status === 'nilai-payload'" class="nc-payload-picker">
              <p>Hasil dropping payload:</p>
              <button v-for="opt in PAYLOAD_OPTIONS" :key="opt.key" class="nc-btn nc-btn-sm"
                      @click="pilihPayloadTim(p.id, opt.key)">
                {{ opt.label }} (+{{ opt.points }})
              </button>
            </div>

            <div v-if="hasilTim(p.id)?.checkpointTimes.length" class="nc-checkpoint-list">
              <div v-for="c in hasilTim(p.id).checkpointTimes" :key="c.key" class="nc-checkpoint-row">
                <span>{{ c.label }}</span>
                <span>{{ formatStopwatch(c.ms) }}</span>
              </div>
            </div>

            <div v-if="editManualId === p.id" class="nc-manual-panel">
              <div class="nc-manual-row">
                <label>Skor manual</label>
                <input type="number" v-model="manualSkorInput" placeholder="mis. 75" />
              </div>
              <div class="nc-manual-row">
                <label>Waktu manual</label>
                <input type="text" v-model="manualWaktuInput" placeholder="mm:ss.mmm" />
              </div>
              <div class="nc-manual-btns">
                <button class="nc-btn nc-btn-sm nc-btn-primary" @click="terapkanManual(p.id)">Terapkan</button>
                <button class="nc-btn nc-btn-sm" @click="kembaliOtomatis(p.id)">Kembali Otomatis</button>
                <button class="nc-btn nc-btn-sm" @click="editManualId = null">Batal</button>
              </div>
            </div>

            <div class="nc-team-footer">
              <button class="nc-btn nc-btn-sm" @click="bukaEditManual(p.id)">Edit Manual</button>
              <button class="nc-btn nc-btn-sm nc-btn-danger" @click="stopTim(p.id)">Stop</button>
              <button class="nc-btn nc-btn-sm" @click="resetTim(p.id)">Reset</button>
            </div>
          </template>
          <template v-else>
            <div class="nc-team-empty">Menunggu tim dari babak sebelumnya…</div>
          </template>
        </div>
      </div>

      <div v-if="fase === 'grup'" class="nc-qualify-box">
        <p>Maju otomatis ke babak gugur (rerata skor lalu rerata waktu):</p>
        <div class="nc-qualify-row">
          <span>1st:</span>
          <select :value="kualifikasi[0]" @change="setManualQualifiers(0, $event.target.value)" class="nc-select">
            <option v-for="t in grupAktif?.tim" :key="t.id" :value="t.id">{{ t.nama || '(Tanpa nama)' }}</option>
          </select>
          <span>2nd:</span>
          <select :value="kualifikasi[1]" @change="setManualQualifiers(1, $event.target.value)" class="nc-select">
            <option v-for="t in grupAktif?.tim" :key="t.id" :value="t.id">{{ t.nama || '(Tanpa nama)' }}</option>
          </select>
          <button v-if="grupAktif?.manualQualifiers" class="nc-btn nc-btn-sm" @click="resetManualQualifiers">↺ Otomatis</button>
        </div>
      </div>

      <div v-else class="nc-qualify-box">
        <p>Pemenang match ini: <strong>{{ namaTim(pemenangKoAktif) || 'Belum ditentukan' }}</strong></p>
        <div class="nc-qualify-row">
          <select :value="koMatchAktif.manualWinner || ''" @change="setManualWinner($event.target.value)" class="nc-select">
            <option value="">Otomatis (skor lalu waktu)</option>
            <option v-for="p in pesertaAktif.filter(Boolean)" :key="p.id" :value="p.id">Manual: {{ p.nama }}</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>
