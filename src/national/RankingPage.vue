<script setup>
import { ref, computed } from 'vue'
import {
  state, GROUP_IDS, KO_ROUNDS, namaTim, skorHasil, waktuHasil,
  timSlot, rankingGrup, formatStopwatch, hapusHasilTim,
} from './store'

const fase = ref('grup')
const selectedGroupId = ref('A')
const selectedRound = ref('r16')
const selectedMatchIdx = ref(0)
const expandedTeam = ref(null)

const jumlahMatchRound = computed(
  () => KO_ROUNDS.find((r) => r.key === selectedRound.value)?.jumlahMatch || 1
)
function gantiRound(key) {
  selectedRound.value = key
  selectedMatchIdx.value = 0
}

const grupAktif = computed(() => state.groups.find((g) => g.id === selectedGroupId.value))
const matchAktif = computed(() => state.knockout[selectedRound.value][selectedMatchIdx.value])

const rankingGrupAktif = computed(() => (grupAktif.value ? rankingGrup(grupAktif.value) : []))

function detailMatchTim(teamId) {
  if (!grupAktif.value) return []
  return grupAktif.value.matches
    .filter((m) => (m.teamAId === teamId || m.teamBId === teamId) && m.hasil[teamId])
    .map((m) => {
      const lawanId = m.teamAId === teamId ? m.teamBId : m.teamAId
      const h = m.hasil[teamId]
      return {
        lawan: namaTim(lawanId),
        skor: skorHasil(h),
        waktu: waktuHasil(h),
        checkpointTimes: h?.checkpointTimes || [],
        payload: h?.payload,
        match: m,
      }
    })
}

function hapusRiwayatGrup(match, teamId) {
  if (!confirm(`Hapus riwayat pertandingan ${namaTim(teamId)} pada match ini?`)) return
  hapusHasilTim(match.hasil, teamId)
}

function hapusRiwayatGugur(teamId) {
  if (!confirm(`Hapus riwayat pertandingan ${namaTim(teamId)} pada match ini?`)) return
  hapusHasilTim(matchAktif.value.hasil, teamId)
}

const pesertaGugur = computed(() => {
  const a = timSlot(selectedRound.value, selectedMatchIdx.value, 0)
  const b = timSlot(selectedRound.value, selectedMatchIdx.value, 1)
  return [a, b].filter(Boolean).map((id) => ({
    id,
    nama: namaTim(id),
    hasil: matchAktif.value.hasil[id],
  }))
})
const rankingGugur = computed(() =>
  [...pesertaGugur.value]
    .map((t) => ({ ...t, skor: skorHasil(t.hasil), waktu: waktuHasil(t.hasil) }))
    .sort((a, b) => b.skor - a.skor || a.waktu - b.waktu)
)

function toggleExpand(id) {
  expandedTeam.value = expandedTeam.value === id ? null : id
}
function labelPayload(key) {
  return key === 'box' ? 'Tepat Box Merah' : key === 'area' ? 'Area sekitar' : key === 'gagal' ? 'Gagal' : '-'
}
</script>

<template>
  <div class="nr-wrap">
    <div class="nr-selector">
      <div class="nc-fase-toggle">
        <button :class="['nc-btn', fase === 'grup' && 'nc-btn-active']" @click="fase = 'grup'">Fase Grup</button>
        <button :class="['nc-btn', fase === 'gugur' && 'nc-btn-active']" @click="fase = 'gugur'">Babak Gugur</button>
      </div>
      <div v-if="fase === 'grup'" class="nc-select-row">
        <label>Grup</label>
        <select v-model="selectedGroupId" class="nc-select">
          <option v-for="gid in GROUP_IDS" :key="gid" :value="gid">Grup {{ gid }}</option>
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

    <div v-if="fase === 'grup'" class="nr-list">
      <p v-if="!rankingGrupAktif.length" class="nr-empty">Belum ada tim.</p>
      <div v-for="(t, i) in rankingGrupAktif" :key="t.id" class="nr-item" :class="{ juara: i < 2 }">
        <div class="nr-row" @click="toggleExpand(t.id)">
          <span class="nr-rank">#{{ i + 1 }}</span>
          <span class="nr-name">{{ t.nama }}</span>
          <span class="nr-score">rerata {{ t.avgSkor.toFixed(1) }} pts</span>
          <span class="nr-time">rerata {{ formatStopwatch(t.avgWaktu) }}</span>
          <button class="nr-menu-btn">☰</button>
        </div>
        <div v-if="expandedTeam === t.id" class="nr-detail">
          <div v-if="!detailMatchTim(t.id).length" class="nr-empty-detail">Belum ada pertandingan.</div>
          <div v-for="(m, mi) in detailMatchTim(t.id)" :key="mi" class="nr-match-detail">
            <div class="nr-match-detail-head">
              <div>
                <strong>vs {{ m.lawan }}</strong>
                <span>{{ m.skor }} pts · {{ formatStopwatch(m.waktu) }}</span>
              </div>
              <button class="nc-btn nc-btn-sm nc-btn-danger" @click="hapusRiwayatGrup(m.match, t.id)">
                Hapus
              </button>
            </div>
            <div v-if="m.checkpointTimes.length" class="nr-checkpoint-list">
              <div v-for="c in m.checkpointTimes" :key="c.key" class="nr-detail-row">
                <span>{{ c.label }}</span>
                <span>{{ formatStopwatch(c.ms) }}</span>
              </div>
              <div v-if="m.payload" class="nr-detail-row">
                <span>Payload</span>
                <span>{{ labelPayload(m.payload) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="nr-list">
      <p v-if="!rankingGugur.length" class="nr-empty">Tim belum tersedia untuk match ini.</p>
      <div v-for="(t, i) in rankingGugur" :key="t.id" class="nr-item" :class="{ juara: i === 0 }">
        <div class="nr-row" @click="toggleExpand(t.id)">
          <span class="nr-rank">#{{ i + 1 }}</span>
          <span class="nr-name">{{ t.nama }}</span>
          <span class="nr-score">{{ t.skor }} pts</span>
          <span class="nr-time">{{ formatStopwatch(t.waktu) }}</span>
          <button class="nr-menu-btn">☰</button>
        </div>
        <div v-if="expandedTeam === t.id" class="nr-detail">
          <div v-if="t.hasil" class="nr-detail-actions">
            <button class="nc-btn nc-btn-sm nc-btn-danger" @click="hapusRiwayatGugur(t.id)">
              Hapus riwayat match
            </button>
          </div>
          <div v-if="!t.hasil?.checkpointTimes.length" class="nr-empty-detail">Belum ada data checkpoint.</div>
          <div v-for="c in t.hasil?.checkpointTimes || []" :key="c.key" class="nr-detail-row">
            <span>{{ c.label }}</span>
            <span>{{ formatStopwatch(c.ms) }}</span>
          </div>
          <div v-if="t.hasil?.payload" class="nr-detail-row">
            <span>Payload</span>
            <span>{{ labelPayload(t.hasil.payload) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
