import { reactive, watch } from 'vue'

const STORAGE_KEY = 'krti-national-data-v2'

export const GROUP_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export const CHECKPOINTS = [
  { key: 'gate1', label: 'Gate 1', points: 0 },
  { key: 'gate2', label: 'Gate 2', points: 10 },
  { key: 'gate3', label: 'Gate 3', points: 15 },
  { key: 'gate4', label: 'Gate 4', points: 20 },
  { key: 'gate5', label: 'Gate 5', points: 15 },
  { key: 'landing', label: 'Landing', points: 15 },
]

export const PAYLOAD_OPTIONS = [
  { key: 'box', label: 'Tepat Box Merah', points: 25 },
  { key: 'area', label: 'Jatuh di area sekitar', points: 10 },
  { key: 'gagal', label: 'Gagal / di luar toleransi', points: 0 },
]

export const KO_ROUNDS = [
  { key: 'r16', nama: 'Babak 16 Besar', jumlahMatch: 8 },
  { key: 'qf', nama: 'Perempat Final', jumlahMatch: 4 },
  { key: 'sf', nama: 'Semifinal', jumlahMatch: 2 },
  { key: 'final', nama: 'Final', jumlahMatch: 1 },
]

// Pasangan grup untuk seeding 16 besar: [grup rank-1, grup rank-2]
const R16_PAIRS = [
  ['A', 'B'], ['B', 'A'], ['C', 'D'], ['D', 'C'],
  ['E', 'F'], ['F', 'E'], ['G', 'H'], ['H', 'G'],
]

// Pasangan round-robin (indeks ke array tim[3]): AB, AC, BC
const ROUND_ROBIN_PAIRS = [[0, 1], [0, 2], [1, 2]]

function buatTim() {
  return { id: crypto.randomUUID(), nama: '' }
}

function buatHasilTim() {
  return {
    checkpointIdx: 0,
    checkpointTimes: [],
    payload: null,
    status: 'belum', // belum | jalan | nilai-payload | selesai
    dq: false,
    manualScore: null,
    manualTime: null,
  }
}

function buatGroupMatch(teamAId, teamBId, idx) {
  return { id: `gm-${idx}`, teamAId, teamBId, hasil: {} }
}

function buatGroup(id) {
  const tim = [buatTim(), buatTim(), buatTim()]
  const matches = ROUND_ROBIN_PAIRS.map(([a, b], idx) => buatGroupMatch(tim[a].id, tim[b].id, idx))
  return { id, tim, matches, manualQualifiers: null }
}

function buatKnockout() {
  const rounds = {}
  KO_ROUNDS.forEach((r) => {
    rounds[r.key] = Array.from({ length: r.jumlahMatch }, (_, i) => ({
      id: `${r.key}-${i}`,
      manualA: null,
      manualB: null,
      hasil: {},
      manualWinner: null,
    }))
  })
  return rounds
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    // abaikan, pakai data kosong
  }
  return { groups: GROUP_IDS.map(buatGroup), knockout: buatKnockout() }
}

export const state = reactive(load())
watch(state, (v) => localStorage.setItem(STORAGE_KEY, JSON.stringify(v)), { deep: true })

// ---------- Skor & waktu (dengan override manual) ----------
export function skorHasil(h) {
  if (!h) return 0
  if (h.manualScore !== null && h.manualScore !== undefined) return h.manualScore
  let s = 0
  for (let i = 0; i < h.checkpointIdx; i++) s += CHECKPOINTS[i].points
  if (h.payload) s += PAYLOAD_OPTIONS.find((p) => p.key === h.payload)?.points || 0
  return s
}

export function waktuHasil(h) {
  if (!h) return Infinity
  if (h.manualTime !== null && h.manualTime !== undefined) return h.manualTime
  if (h.checkpointTimes.length === 0) return Infinity
  return h.checkpointTimes[h.checkpointTimes.length - 1].ms
}

export function formatStopwatch(ms) {
  if (ms === Infinity || ms == null) return '-'
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const msec = Math.floor(ms % 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(msec).padStart(3, '0')}`
}

// Terima format "mm:ss" atau "mm:ss.mmm" untuk input waktu manual
export function parseWaktuManual(str) {
  const match = /^(\d+):(\d{1,2})(?:\.(\d{1,3}))?$/.exec(str.trim())
  if (!match) return null
  const m = Number(match[1])
  const s = Number(match[2])
  const ms = Number((match[3] || '0').padEnd(3, '0'))
  return m * 60000 + s * 1000 + ms
}

// ---------- Nama tim ----------
export function namaTim(id) {
  if (!id) return null
  for (const g of state.groups) {
    const t = g.tim.find((t) => t.id === id)
    if (t) return t.nama || '(Tanpa nama)'
  }
  return '(Tanpa nama)'
}

// ---------- Round-robin per grup ----------
export function labelMatchGrup(group, matchIdx) {
  const m = group.matches[matchIdx]
  return `${namaTim(m.teamAId)} vs ${namaTim(m.teamBId)}`
}

export function statistikGrup(group) {
  return group.tim.map((t) => {
    const matches = group.matches.filter((m) => m.teamAId === t.id || m.teamBId === t.id)
    const skorList = matches.map((m) => skorHasil(m.hasil[t.id]))
    const waktuList = matches.map((m) => waktuHasil(m.hasil[t.id])).filter((w) => w !== Infinity)
    const avgSkor = skorList.length ? skorList.reduce((a, b) => a + b, 0) / skorList.length : 0
    const avgWaktu = waktuList.length ? waktuList.reduce((a, b) => a + b, 0) / waktuList.length : Infinity
    return { id: t.id, nama: t.nama || '(Tanpa nama)', avgSkor, avgWaktu }
  })
}

export function rankingGrup(group) {
  return [...statistikGrup(group)].sort((a, b) => b.avgSkor - a.avgSkor || a.avgWaktu - b.avgWaktu)
}

export function kualifikasiGrup(group) {
  if (group.manualQualifiers) return group.manualQualifiers
  const rank = rankingGrup(group)
  return [rank[0]?.id || null, rank[1]?.id || null]
}

function slotR16(matchIdx, sisi) {
  const groupId = R16_PAIRS[matchIdx][sisi]
  const group = state.groups.find((g) => g.id === groupId)
  return kualifikasiGrup(group)[sisi === 0 ? 0 : 1]
}

export function timSlot(roundKey, matchIdx, sisi) {
  const match = state.knockout[roundKey][matchIdx]
  const manual = sisi === 0 ? match.manualA : match.manualB
  if (manual) return manual
  if (roundKey === 'r16') return slotR16(matchIdx, sisi)
  const idx = KO_ROUNDS.findIndex((r) => r.key === roundKey)
  const prevKey = KO_ROUNDS[idx - 1].key
  const prevMatchIdx = matchIdx * 2 + sisi
  return pemenangMatch(prevKey, prevMatchIdx)
}

export function pemenangMatch(roundKey, matchIdx) {
  const match = state.knockout[roundKey][matchIdx]
  if (match.manualWinner) return match.manualWinner
  const aId = timSlot(roundKey, matchIdx, 0)
  const bId = timSlot(roundKey, matchIdx, 1)
  if (!aId || !bId) return null
  const hasilA = match.hasil[aId]
  const hasilB = match.hasil[bId]
  const sA = skorHasil(hasilA)
  const sB = skorHasil(hasilB)
  if (sA === 0 && sB === 0 && !hasilA && !hasilB) return null
  if (sA !== sB) return sA > sB ? aId : bId
  return waktuHasil(hasilA) <= waktuHasil(hasilB) ? aId : bId
}

// ---------- Aksi penilaian ----------
export function tapTim(hasilContainer, teamId, elapsedMs) {
  if (!hasilContainer[teamId]) hasilContainer[teamId] = buatHasilTim()
  const h = hasilContainer[teamId]
  if (h.status === 'selesai' || h.status === 'nilai-payload' || h.dq) return
  if (h.checkpointIdx === 0) h.status = 'jalan'
  const cp = CHECKPOINTS[h.checkpointIdx]
  if (!cp) return
  h.checkpointTimes.push({ key: cp.key, label: cp.label, ms: elapsedMs })
  h.checkpointIdx++
  if (cp.key === 'landing') h.status = 'nilai-payload'
}

export function pilihPayload(hasilContainer, teamId, key) {
  const h = hasilContainer[teamId]
  if (!h) return
  h.payload = key
  h.status = 'selesai'
}

export function emergencyStop(hasilContainer, teamId) {
  const h = hasilContainer[teamId] || (hasilContainer[teamId] = buatHasilTim())
  h.dq = true
  h.status = 'selesai'
}

export function resetHasilTim(hasilContainer, teamId) {
  hasilContainer[teamId] = buatHasilTim()
}

export function setManualScore(hasilContainer, teamId, value) {
  if (!hasilContainer[teamId]) hasilContainer[teamId] = buatHasilTim()
  hasilContainer[teamId].manualScore = value
}
export function setManualTime(hasilContainer, teamId, ms) {
  if (!hasilContainer[teamId]) hasilContainer[teamId] = buatHasilTim()
  hasilContainer[teamId].manualTime = ms
}
export function clearManualOverride(hasilContainer, teamId) {
  const h = hasilContainer[teamId]
  if (!h) return
  h.manualScore = null
  h.manualTime = null
}

// ---------- Slot manual babak gugur (independen dari hasil grup) ----------
export function setManualSlot(roundKey, matchIdx, sisi, teamId) {
  const match = state.knockout[roundKey][matchIdx]
  if (sisi === 0) match.manualA = teamId || null
  else match.manualB = teamId || null
}

export function semuaTim() {
  const list = []
  state.groups.forEach((g) => {
    g.tim.forEach((t) => list.push({ id: t.id, nama: `${t.nama || '(Tanpa nama)'} (Grup ${g.id})` }))
  })
  return list
}

export function exportState() {
  return JSON.parse(JSON.stringify({ groups: state.groups, knockout: state.knockout }))
}

export function restoreState(data) {
  if (!data || !Array.isArray(data.groups) || !data.knockout) {
    throw new Error('Format data tidak valid')
  }
  state.groups = data.groups
  state.knockout = data.knockout
}