<script setup>
import { ref, onMounted } from 'vue'
import './national/national-ui.css'
import ScoreCounterPage from './national/ScoreCounterPage.vue'
import RankingPage from './national/RankingPage.vue'
import BracketPage from './national/BracketPage.vue'
import { syncStatus, pullDariCloud, mulaiAutoSync, pushManual } from './national/sync'

const drawerOpen = ref(false)
const tab = ref('score')

function pilihTab(t) {
  tab.value = t
  drawerOpen.value = false
}

onMounted(async () => {
  await pullDariCloud()
  mulaiAutoSync()
})

const statusLabel = {
  idle: '',
  syncing: 'Menyimpan…',
  synced: 'Tersimpan di cloud',
  error: 'Gagal sinkron — cek koneksi / pakai backup file',
}
</script>

<template>
  <div class="nv-wrap">
    <div class="nv-subheader">
      <button class="nv-burger" @click="drawerOpen = true" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
      <span class="nv-subheader-title">
        {{ tab === 'score' ? 'Score Counter' : tab === 'ranking' ? 'Ranking' : 'Bracket' }}
      </span>
      <span class="nv-sync-status" :class="'nv-sync-' + syncStatus.value">{{ statusLabel[syncStatus.value] }}</span>
      <button class="nv-btn-sync" @click="pushManual" title="Sinkron manual sekarang">↻</button>
    </div>

    <transition name="nv-fade">
      <div v-if="drawerOpen" class="nv-overlay" @click="drawerOpen = false"></div>
    </transition>
    <transition name="nv-slide">
      <nav v-if="drawerOpen" class="nv-drawer">
        <button class="nv-drawer-item" :class="{ active: tab === 'score' }" @click="pilihTab('score')">Score Counter</button>
        <button class="nv-drawer-item" :class="{ active: tab === 'ranking' }" @click="pilihTab('ranking')">Ranking</button>
        <button class="nv-drawer-item" :class="{ active: tab === 'bracket' }" @click="pilihTab('bracket')">Bracket</button>
      </nav>
    </transition>

    <div class="nv-content">
      <ScoreCounterPage v-if="tab === 'score'" />
      <RankingPage v-else-if="tab === 'ranking'" />
      <BracketPage v-else />
    </div>
  </div>
</template>