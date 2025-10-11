import { createRouter, createWebHistory } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'parts',
      component: () => import('../views/PartsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/setups',
      name: 'setups',
      component: () => import('../views/SetupsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { requiresGuest: true },
    },
  ],
})

// Navigation guard
router.beforeEach(async (to, from, next) => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (to.meta.requiresAuth && !user) {
    // Redirect to login if route requires auth and user is not logged in
    next('/login')
  } else if (to.meta.requiresGuest && user) {
    // Redirect to home if user is logged in and trying to access guest-only pages
    next('/')
  } else {
    next()
  }
})

export default router
