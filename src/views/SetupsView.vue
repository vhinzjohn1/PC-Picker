<template>
  <div class="page-center">
    <div class="setups-container">
      <div class="header">
        <h2>PC Setups</h2>
        <div class="user-actions">
          <span class="user-info">{{ userEmail }}</span>
          <button @click="handleLogout" class="logout-btn">Logout</button>
        </div>
      </div>

      <!-- Navigation -->
      <div class="navigation">
        <router-link to="/" class="nav-link">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Parts Builder
        </router-link>
        <router-link to="/setups" class="nav-link active">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
          </svg>
          My Setups
        </router-link>
      </div>

      <!-- Error message -->
      <div v-if="error" class="error-message">
        {{ error }}
        <button @click="error = null" class="error-close">×</button>
      </div>

      <!-- Success message -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
        <button @click="successMessage = null" class="success-close">×</button>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading-message">Loading your setups...</div>

      <!-- Main content -->
      <div v-else>
        <!-- Save Current Setup Form -->
        <div class="save-setup-section">
          <h3>Save Current Setup</h3>
          <form @submit.prevent="saveCurrentSetup" class="save-form">
            <div class="form-row">
              <input
                v-model="newSetupName"
                placeholder="Setup name (e.g., Gaming PC, Workstation)"
                required
                class="setup-name-input"
              />
              <input
                v-model="newSetupDescription"
                placeholder="Description (optional)"
                class="setup-desc-input"
              />
              <button type="submit" class="save-btn" :disabled="!canSaveSetup">
                Save Setup
              </button>
            </div>
          </form>
        </div>

        <!-- Setups Grid -->
        <div v-if="setups.length > 0" class="setups-grid">
          <div
            v-for="setup in setups"
            :key="setup.id"
            class="setup-card"
          >
            <div class="setup-header">
              <h3 class="setup-name">{{ setup.name }}</h3>
              <div class="setup-actions">
                <button
                  @click="loadSetup(setup.id)"
                  class="action-btn load-btn"
                  title="Load this setup"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </button>
                <button
                  @click="deleteSetup(setup.id)"
                  class="action-btn delete-btn"
                  title="Delete setup"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M3 6h18M8 6l1-2h6l1 2m-1 0l-1 14H10L9 6"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="setup-info">
              <div class="setup-total">
                <span class="total-label">Total Cost</span>
                <span class="total-amount">{{ formatAmount(setup.total_amount) }}</span>
              </div>
              <div v-if="setup.description" class="setup-description">
                {{ setup.description }}
              </div>
              <div class="setup-date">
                Created {{ formatDate(setup.created_at) }}
              </div>
            </div>

            <!-- Expandable Parts List -->
            <div class="setup-parts">
              <button
                @click="toggleSetupDetails(setup.id)"
                class="toggle-details-btn"
              >
                <span>{{ expandedSetups.has(setup.id) ? 'Hide' : 'Show' }} Parts</span>
                <svg
                  :class="{ rotated: expandedSetups.has(setup.id) }"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                >
                  <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
              </button>

              <div
                v-if="expandedSetups.has(setup.id)"
                class="parts-details"
              >
                <div v-if="setupParts[setup.id]?.length > 0" class="parts-list">
                  <div
                    v-for="part in setupParts[setup.id]"
                    :key="part.id"
                    class="part-item"
                  >
                    <span class="part-component">{{ part.component }}</span>
                    <span class="part-name">{{ part.name || 'Not specified' }}</span>
                    <span class="part-amount">{{ formatAmount(part.amount) }}</span>
                  </div>
                </div>
                <div v-else class="no-parts">
                  No parts found for this setup
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="empty-state">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
          </div>
          <h3>No setups saved yet</h3>
          <p>Build your PC parts and save them as a setup to get started!</p>
          <router-link to="/" class="cta-btn">
            Go to Parts Builder
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../lib/database'
import { supabase, type PCSetup, type SetupPart } from '../lib/supabase'

const router = useRouter()
const userEmail = ref('')

const handleLogout = async () => {
  try {
    await supabase.auth.signOut()
    router.push('/login')
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

const setups = ref<PCSetup[]>([])
const setupParts = ref<Record<string, SetupPart[]>>({})
const expandedSetups = ref<Set<string>>(new Set())
const loading = ref(true)
const error = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const currency = ref('PHP')

// Form data
const newSetupName = ref('')
const newSetupDescription = ref('')

// Computed
const canSaveSetup = computed(() => {
  return newSetupName.value.trim().length > 0
})

// Formatters
const formatter = computed(
  () => new Intl.NumberFormat('en-PH', { style: 'currency', currency: currency.value }),
)

function formatAmount(value: number) {
  return formatter.value.format(value)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

// Load data
async function loadSetups() {
  try {
    loading.value = true
    error.value = null

    // Get user email
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userEmail.value = user?.email || 'Anonymous User'

    // Load setups and currency
    const [dbSetups, dbCurrency] = await Promise.all([
      db.getSetups(),
      db.getCurrency(),
    ])

    setups.value = dbSetups
    currency.value = dbCurrency
  } catch (err) {
    console.error('Error loading setups:', err)
    error.value = 'Failed to load setups. Please try again.'
  } finally {
    loading.value = false
  }
}

// Setup management
async function saveCurrentSetup() {
  try {
    // Get current parts
    const currentParts = await db.getParts()

    if (currentParts.length === 0) {
      error.value = 'No parts to save. Please add some parts first.'
      return
    }

    // Convert to the format expected by createSetup
    const partsData = currentParts.map(part => ({
      component: part.component,
      name: part.name === 'EMPTY' ? '' : part.name,
      amount: part.amount,
    }))

    const setup = await db.createSetup(
      newSetupName.value.trim(),
      newSetupDescription.value.trim(),
      partsData
    )

    if (setup) {
      successMessage.value = `Setup "${setup.name}" saved successfully!`
      newSetupName.value = ''
      newSetupDescription.value = ''
      await loadSetups()
    } else {
      error.value = 'Failed to save setup. Please try again.'
    }
  } catch (err) {
    console.error('Error saving setup:', err)
    error.value = 'Failed to save setup. Please try again.'
  }
}

async function loadSetup(setupId: string) {
  try {
    const success = await db.loadSetupToCurrentParts(setupId)

    if (success) {
      successMessage.value = 'Setup loaded successfully!'
      // Navigate to parts page
      router.push('/')
    } else {
      error.value = 'Failed to load setup. Please try again.'
    }
  } catch (err) {
    console.error('Error loading setup:', err)
    error.value = 'Failed to load setup. Please try again.'
  }
}

async function deleteSetup(setupId: string) {
  if (!confirm('Are you sure you want to delete this setup? This action cannot be undone.')) {
    return
  }

  try {
    const success = await db.deleteSetup(setupId)

    if (success) {
      successMessage.value = 'Setup deleted successfully!'
      await loadSetups()
      // Remove from expanded set if it was expanded
      expandedSetups.value.delete(setupId)
    } else {
      error.value = 'Failed to delete setup. Please try again.'
    }
  } catch (err) {
    console.error('Error deleting setup:', err)
    error.value = 'Failed to delete setup. Please try again.'
  }
}

// Toggle setup details
async function toggleSetupDetails(setupId: string) {
  if (expandedSetups.value.has(setupId)) {
    expandedSetups.value.delete(setupId)
  } else {
    expandedSetups.value.add(setupId)

    // Load parts if not already loaded
    if (!setupParts.value[setupId]) {
      try {
        const parts = await db.getSetupParts(setupId)
        setupParts.value[setupId] = parts
      } catch (err) {
        console.error('Error loading setup parts:', err)
        error.value = 'Failed to load setup parts.'
      }
    }
  }
}

// Lifecycle
onMounted(() => {
  loadSetups()
})
</script>

<style scoped>
.page-center {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.setups-container {
  width: 100%;
  max-width: 1200px;
  background: #222;
  border-radius: 16px;
  padding: 32px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: #fff;
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
}

.user-info {
  color: #ccc;
  font-size: 0.9rem;
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

.error-message,
.success-message {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message {
  background: rgba(255, 79, 79, 0.1);
  border: 1px solid #ff4f4f;
  color: #ff4f4f;
}

.success-message {
  background: rgba(40, 167, 69, 0.1);
  border: 1px solid #28a745;
  color: #28a745;
}

.error-close,
.success-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-message {
  text-align: center;
  padding: 40px;
  color: #ccc;
  font-size: 1.1rem;
}

.save-setup-section {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid #333;
}

.save-setup-section h3 {
  margin: 0 0 20px 0;
  color: #fff;
  font-size: 1.3rem;
}

.save-form {
  width: 100%;
}

.form-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
}

.setup-name-input,
.setup-desc-input {
  flex: 1;
  padding: 12px 16px;
  background: #333;
  border: 1px solid #555;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.setup-name-input:focus,
.setup-desc-input:focus {
  outline: none;
  border-color: #4f8cff;
}

.save-btn {
  padding: 12px 24px;
  background: #4f8cff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.save-btn:hover:not(:disabled) {
  background: #3a7bff;
  transform: translateY(-1px);
}

.save-btn:disabled {
  background: #555;
  cursor: not-allowed;
  opacity: 0.6;
}

.setups-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
}

.setup-card {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 24px;
  border: 1px solid #333;
  transition: all 0.2s ease;
}

.setup-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  border-color: #4f8cff;
}

.setup-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.setup-name {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
  flex: 1;
}

.setup-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.load-btn {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
  border: 1px solid #28a745;
}

.load-btn:hover {
  background: rgba(40, 167, 69, 0.3);
  transform: scale(1.05);
}

.delete-btn {
  background: rgba(255, 79, 79, 0.2);
  color: #ff4f4f;
  border: 1px solid #ff4f4f;
}

.delete-btn:hover {
  background: rgba(255, 79, 79, 0.3);
  transform: scale(1.05);
}

.setup-info {
  margin-bottom: 20px;
}

.setup-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.total-label {
  color: #ccc;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #4f8cff;
}

.setup-description {
  color: #ccc;
  font-size: 0.95rem;
  margin-bottom: 8px;
  line-height: 1.4;
}

.setup-date {
  color: #888;
  font-size: 0.85rem;
}

.setup-parts {
  border-top: 1px solid #333;
  padding-top: 16px;
}

.toggle-details-btn {
  width: 100%;
  padding: 12px;
  background: #333;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
  font-weight: 500;
}

.toggle-details-btn:hover {
  background: #3a3a3a;
}

.toggle-details-btn svg {
  transition: transform 0.2s ease;
}

.toggle-details-btn svg.rotated {
  transform: rotate(180deg);
}

.parts-details {
  margin-top: 16px;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.parts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.part-item {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: 12px;
  padding: 12px;
  background: #333;
  border-radius: 8px;
  align-items: center;
}

.part-component {
  font-weight: 600;
  color: #4f8cff;
  font-size: 0.9rem;
}

.part-name {
  color: #fff;
  font-size: 0.95rem;
}

.part-amount {
  text-align: right;
  color: #28a745;
  font-weight: 600;
  font-size: 0.9rem;
}

.no-parts {
  text-align: center;
  color: #888;
  padding: 20px;
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 12px 0;
  font-size: 1.5rem;
  color: #fff;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #ccc;
  font-size: 1.1rem;
}

.cta-btn {
  display: inline-block;
  padding: 12px 24px;
  background: #4f8cff;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.cta-btn:hover {
  background: #3a7bff;
  transform: translateY(-1px);
}

/* Responsive Design */
@media (max-width: 768px) {
  .page-center {
    padding: 16px;
  }

  .setups-container {
    padding: 20px;
  }

  .header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .navigation {
    flex-direction: column;
    gap: 8px;
  }

  .form-row {
    flex-direction: column;
    gap: 12px;
  }

  .setups-grid {
    grid-template-columns: 1fr;
  }

  .setup-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .setup-actions {
    align-self: flex-end;
  }

  .part-item {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }

  .part-amount {
    text-align: left;
  }
}

@media (max-width: 480px) {
  .setups-container {
    padding: 16px;
  }

  .header h2 {
    font-size: 1.5rem;
  }

  .setup-card {
    padding: 16px;
  }

  .setup-name {
    font-size: 1.2rem;
  }

  .total-amount {
    font-size: 1.3rem;
  }
}
</style>
