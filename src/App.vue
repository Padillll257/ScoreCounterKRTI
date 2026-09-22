<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const isHome = computed(() => route.name === 'home')
const logoError = ref(false)
</script>

<template>
  <div class="app-shell" :class="{ 'is-home': isHome }">
    <header class="topbar" :class="{ 'is-home': isHome }">
      <router-link to="/" class="brand">
        <span class="logo-slot">
          <img
            v-if="!logoError"
            src="/soeromiber.png"
            alt="Logo Soeromiber"
            @error="logoError = true"
          />
          <span v-else class="logo-fallback">Logo</span>
        </span>
        <span class="brand-text"><b>Soeromiber</b> Juara 1</span>
      </router-link>

      <button v-if="!isHome" class="back-btn" @click="router.push('/')">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M11 6l-6 6 6 6" />
        </svg>
        Kembali
      </button>
    </header>

    <main class="page">
      <!-- keep-alive: halaman tidak dibuang saat ditinggalkan,
           jadi form & stopwatch di Regional tetap utuh -->
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Background hanya untuk halaman home */
.app-shell.is-home {
  background:
    linear-gradient(180deg, rgba(4, 10, 24, 0.55) 0%, rgba(4, 10, 24, 0.88) 100%),
    url('/background.png') center / cover no-repeat fixed;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 28px;
  background: rgba(15, 17, 21, 0.92);
  border-bottom: 1px solid #2a2e38;
  backdrop-filter: blur(8px);
}
.topbar.is-home {
  background: transparent;
  border-bottom-color: transparent;
  backdrop-filter: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: #fff;
}
.logo-slot {
  display: grid;
  place-items: center;
  min-width: 60px;
  height: 60px;
}
.logo-slot img {
  height: 60px;
  width: auto;
  display: block;
}
.logo-fallback {
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border: 1px dashed rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.55);
}
.brand-text {
  font-size: 26px;
  font-weight: 700;
}
.brand-text b {
  color: #3b8cff;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.06);
  color: #e6edf7;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.back-btn:hover {
  background: rgba(59, 140, 255, 0.25);
  border-color: #3b8cff;
}

.page {
  flex: 1;
}

.topbar {
  flex-shrink: 0;
}

@media (max-width: 600px) {
  .topbar {
    padding: 10px 16px;
  }
  .brand {
    gap: 10px;
  }
  .logo-slot {
    min-width: 48px;
    height: 48px;
  }
  .logo-slot img {
    height: 48px;
  }
  .logo-fallback {
    width: 48px;
    height: 48px;
  }
  .brand-text {
    font-size: 20px;
  }
}
</style>