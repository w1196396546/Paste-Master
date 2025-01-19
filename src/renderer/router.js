import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/Home.vue'),
    meta: {
      title: '剪贴板'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./views/Settings.vue'),
    meta: {
      title: '设置'
    }
  },
  {
    path: '/history',
    name: 'History',
    component: () => import('./views/History.vue'),
    meta: {
      title: '历史记录'
    }
  },
  {
    path: '/quick-access',
    name: 'QuickAccess',
    component: () => import('./views/QuickAccess.vue'),
    meta: {
      title: '快速访问'
    }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title} - Plate`
  next()
})

export default router 