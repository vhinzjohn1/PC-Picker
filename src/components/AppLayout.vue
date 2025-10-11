<template>
  <div class="page-center">
    <div class="main-container">
      <div class="header">
        <h2>{{ title }}</h2>
        <div class="user-actions">
          <template v-if="userEmailLoading">
            <span class="user-info skeleton" style="width: 120px; height: 22px"></span>
            <button class="logout-btn skeleton" style="width: 64px; height: 36px"></button>
          </template>
          <template v-else>
            <span class="user-info">{{ userEmail }}</span>
            <button v-if="logoutHandler" @click="logoutHandler" class="logout-btn">Logout</button>
          </template>
        </div>
      </div>
      <div class="navigation" v-if="showNav">
        <router-link :to="'/'" class="nav-link" :class="{ active: isActive('/') }">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          Parts Builder
        </router-link>
        <router-link :to="'/setups'" class="nav-link" :class="{ active: isActive('/setups') }">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="currentColor"
              d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
            />
          </svg>
          My Setups
        </router-link>
      </div>
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useRoute } from 'vue-router'
export default defineComponent({
  name: 'AppLayout',
  props: {
    title: { type: String, required: true },
    userEmail: String,
    userEmailLoading: Boolean,
    logoutHandler: Function,
    showNav: { type: Boolean, default: true },
  },
  setup(props) {
    const route = useRoute()
    function isActive(path: string) {
      return path === route.path
    }
    return { ...props, isActive }
  },
})
</script>

<style scoped>
.page-center {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 0;
}
.main-container {
  width: 100%;
  max-width: 1200px;
  background: #222;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: #fff;
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #333;
}
.header h2 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #4f8cff, #00d4ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.user-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 200px;
  min-height: 36px;
}
.user-info {
  color: #ccc;
  font-size: 0.9rem;
  min-width: 120px;
}
.logout-btn {
  padding: 8px 16px;
  background: #ff4f4f;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
  min-width: 64px;
}
.logout-btn:hover {
  background: #ff3333;
  transform: translateY(-1px);
}
.navigation {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  padding: 16px;
  background: #2a2a2a;
  border-radius: 12px;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  color: #ccc;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s ease;
  font-weight: 500;
}
.nav-link:hover {
  background: #333;
  color: #fff;
}
.nav-link.active {
  background: #4f8cff;
  color: #fff;
}
.skeleton {
  background: linear-gradient(90deg, #333 25%, #444 40%, #333 60%);
  background-size: 400% 100%;
  border-radius: 4px;
  animation: skeleton-shimmer 1.2s linear infinite;
  color: transparent !important;
  pointer-events: none;
  border: 0;
}
@keyframes skeleton-shimmer {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
@media (max-width: 768px) {
  .main-container {
    width: 100%;
    max-width: none;
    padding: 20px;
    border-radius: 0;
    min-height: 100vh;
  }
  .header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  .header h2 {
    font-size: 1.5rem;
  }
  .user-actions {
    width: 100%;
    justify-content: space-between;
  }
  .navigation {
    flex-direction: column;
    gap: 8px;
  }
}
@media (max-width: 480px) {
  .main-container {
    padding: 12px;
  }
  .header h2 {
    font-size: 1.2rem;
  }
}
</style>
