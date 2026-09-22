<template>
  <section class="home">
    <h1 class="title">
      <span class="main">Score Counter For KRTI or smth  </span>
    </h1>

    <div class="cards">
      <!-- REGIONAL -->
      <article class="card regional">
        <div class="icon">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </div>
        <h2>Regional</h2>
        <p>Seleksi tingkat regional.</p>
        <router-link to="/regional" class="cta">
          Masuk Regional
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </router-link>
      </article>

      <!-- NATIONAL -->
      <article class="card national">
        <div class="icon">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor"
               stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
            <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
          </svg>
        </div>
        <h2>National</h2>
        <p>Babak final tingkat nasional.</p>
        <router-link to="/national" class="cta">
          Masuk Nasional
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
               stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </router-link>
      </article>
    </div>
  </section>
</template>

<style scoped>
.home {
  min-height: calc(100vh - 90px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 20px 40px;
  text-align: center;
  color: #fff;
}

.title {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
  margin: 0;
}
.kicker {
  font-size: clamp(36px, 6vw, 52px);
  font-weight: 800;
  color: #2f80ff;
}
.main {
  font-size: clamp(40px, 7vw, 62px);
  font-weight: 800;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 340px));
  justify-content: center;
  gap: 24px;
  width: 100%;
  max-width: 760px;
  margin-top: 44px;
}

.card {
  --accent: #2f80ff;
  --accent-soft: rgba(47, 128, 255, 0.2);
  --icon: #5cc8ff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 24px 28px;
  border-radius: 20px;
  border: 1.5px solid var(--accent);
  background: linear-gradient(160deg, rgba(20, 40, 90, 0.65), rgba(8, 16, 40, 0.78));
  backdrop-filter: blur(6px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;
}
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 28px var(--accent-soft), 0 16px 44px rgba(0, 0, 0, 0.45);
}
.card.national {
  --accent: #8b5cf6;
  --accent-soft: rgba(139, 92, 246, 0.25);
  --icon: #c4a5ff;
  background: linear-gradient(160deg, rgba(50, 25, 100, 0.65), rgba(18, 10, 40, 0.78));
}

.icon {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--icon);
}
.card h2 {
  margin: 6px 0 0;
  font-size: 28px;
}
.card p {
  margin: 0 0 14px;
  min-height: 44px;
  color: rgba(220, 228, 245, 0.85);
  font-size: 15px;
  line-height: 1.5;
}

.cta {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  transition: filter 0.15s;
}
.cta:hover {
  filter: brightness(1.12);
}
@media (max-width: 600px) {
  .home {
    min-height: calc(100vh - 68px);
    justify-content: flex-start;
    padding: 56px 20px 48px;
  }
  .cards {
    margin-top: 36px;
  }
}
</style>