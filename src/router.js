import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from './HomeView.vue'
import RegionalView from './RegionalView.vue'
import NationalView from './NationalView.vue'

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/regional', name: 'regional', component: RegionalView },
    { path: '/national', name: 'national', component: NationalView },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})  