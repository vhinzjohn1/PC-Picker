<template>
  <div class="page-center">
    <div class="parts-container">
      <div class="header">
        <h2>PC Parts Picker</h2>
        <div class="user-actions">
          <span class="user-info">{{ userEmail }}</span>
          <button @click="handleLogout" class="logout-btn">Logout</button>
        </div>
      </div>

      <!-- Navigation -->
      <div class="navigation">
        <router-link to="/" class="nav-link active">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Parts Builder
        </router-link>
        <router-link to="/setups" class="nav-link">
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

      <!-- Loading state -->
      <div v-if="loading" class="loading-message">Loading your parts...</div>

      <!-- Main content -->
      <div v-else>
        <form @submit.prevent="addPart">
          <select v-model="componentType">
            <option v-for="opt in componentOptions" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input v-model="partName" placeholder="Part Name (e.g., Ryzen 5 5600)" required />
          <input
            v-model="amountInput"
            type="text"
            inputmode="decimal"
            placeholder="Amount"
            @input="onAmountInput"
            @blur="onAmountBlur"
            required
          />
          <button type="submit">Add Part</button>
        </form>
        <SpecsTable
          :parts="parts"
          :currency="currency"
          @remove="removePart"
          @update="updatePart"
          @reorder="reorderParts"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import SpecsTable from '../components/SpecsTable.vue'
import { db } from '../lib/database'
import { supabase } from '../lib/supabase'

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

const componentOptions = [
  'CPU',
  'GPU',
  'Motherboard',
  'RAM',
  'Storage',
  'Power Supply',
  'Case',
  'CPU Cooler',
  'Monitor',
  'Other',
]

const componentType = ref<string>('CPU')
const partName = ref('')
const partAmount = ref<number | null>(null)
const amountInput = ref('')
const parts = ref<Array<{ component: string; name: string; amount: number }>>([])
const currency = ref('PHP')
const loading = ref(true)
const error = ref<string | null>(null)

async function loadFromDatabase() {
  try {
    loading.value = true
    error.value = null

    // Get user email
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userEmail.value = user?.email || 'Anonymous User'

    // Load parts and currency from Supabase
    const [dbParts, dbCurrency] = await Promise.all([db.getParts(), db.getCurrency()])

    // Convert database parts to local format
    parts.value = dbParts.map((p) => ({
      component: p.component,
      name: p.name === 'EMPTY' ? '' : p.name,
      amount: p.amount,
    }))

    currency.value = dbCurrency

    // If no parts exist, seed defaults
    if (dbParts.length === 0) {
      await db.seedDefaultParts()
      // Reload after seeding
      const seededParts = await db.getParts()
      parts.value = seededParts.map((p) => ({
        component: p.component,
        name: p.name === 'EMPTY' ? '' : p.name,
        amount: p.amount,
      }))
    }
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = 'Failed to load data. Please refresh the page.'
    // Fallback to empty state
    parts.value = []
    currency.value = 'PHP'
  } finally {
    loading.value = false
  }
}

async function saveToDatabase() {
  try {
    // Update currency if it changed
    await db.updateCurrency(currency.value)
  } catch (err) {
    console.error('Error saving currency:', err)
  }
}

onMounted(loadFromDatabase)
watch(currency, saveToDatabase)

async function addPart() {
  // parse from formatted input into number
  partAmount.value = parseAmount(amountInput.value)
  if (!partName.value || partAmount.value === null) return

  try {
    // Save to database
    const savedPart = await db.savePart(componentType.value, partName.value, partAmount.value)

    if (savedPart) {
      // Update local state
      const idx = parts.value.findIndex((p) => p.component === componentType.value)
      const newEntry = {
        component: componentType.value,
        name: partName.value,
        amount: partAmount.value,
      }

      if (idx !== -1) {
        // Replace existing entry for this component
        const next = [...parts.value]
        next[idx] = newEntry
        parts.value = next
      } else {
        parts.value = [...parts.value, newEntry]
      }

      // Clear form
      partName.value = ''
      partAmount.value = null
      amountInput.value = ''

      // move dropdown to next unfilled component
      componentType.value = getNextUnfilledComponent(componentType.value) || componentType.value
    }
  } catch (err) {
    console.error('Error adding part:', err)
    error.value = 'Failed to save part. Please try again.'
  }
}

async function removePart(index: number) {
  try {
    const partToRemove = parts.value[index]
    if (!partToRemove) return

    // Find the database part ID
    const dbParts = await db.getParts()
    const dbPart = dbParts.find(
      (p) =>
        p.component === partToRemove.component &&
        p.name === partToRemove.name &&
        p.amount === partToRemove.amount,
    )

    if (dbPart) {
      const success = await db.deletePart(dbPart.id)
      if (success) {
        // Update local state
        parts.value = parts.value.filter((_, i) => i !== index)
      }
    }
  } catch (err) {
    console.error('Error removing part:', err)
    error.value = 'Failed to remove part. Please try again.'
  }
}

async function updatePart(index: number, payload: { name: string; amount: number }) {
  try {
    const existing = parts.value[index]
    if (!existing) return

    // Save to database
    const savedPart = await db.savePart(existing.component, payload.name, payload.amount)

    if (savedPart) {
      // Update local state
      const next = [...parts.value]
      next[index] = { ...existing, name: payload.name, amount: payload.amount }
      parts.value = next
    }
  } catch (err) {
    console.error('Error updating part:', err)
    error.value = 'Failed to update part. Please try again.'
  }
}

function reorderParts(from: number, to: number) {
  if (from === to) return
  const next = [...parts.value]
  const removed = next.splice(from, 1)
  const moved = removed[0]
  if (!moved) return
  next.splice(to, 0, moved)
  parts.value = next

  // Note: Reordering is handled locally for now
  // In a full implementation, you might want to add an 'order' field to the database
}

// Formatting helpers for amount input
function parseAmount(input: string): number {
  const cleaned = String(input).replace(/[^0-9.]/g, '')
  const [intPartRaw, ...rest] = cleaned.split('.')
  const intPart = intPartRaw || '0'
  const decimals = rest.join('')
  const normalized = decimals ? `${intPart}.${decimals.slice(0, 2)}` : intPart
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

// Find the next component that has no selected name or zero amount
function getNextUnfilledComponent(current: string): string | undefined {
  // Priority 1: empty name
  for (const opt of componentOptions) {
    const entry = parts.value.find((p) => p.component === opt)
    if (!entry || !entry.name) return opt
  }
  // Priority 2: zero amount
  for (const opt of componentOptions) {
    const entry = parts.value.find((p) => p.component === opt)
    if (!entry || entry.amount === 0) return opt
  }
  // Fallback: next option cyclically after current
  const idx = componentOptions.indexOf(current)
  if (idx === -1) return componentOptions[0]
  return componentOptions[(idx + 1) % componentOptions.length]
}

function formatAmountStringFromString(input: string): string {
  const cleaned = String(input).replace(/[^0-9.]/g, '')
  const [intPartRaw, ...rest] = cleaned.split('.')
  const intPart = intPartRaw || '0'
  const decimals = rest.join('')
  const intFormatted = Number(intPart).toLocaleString('en-PH')
  return decimals ? `${intFormatted}.${decimals.slice(0, 2)}` : intFormatted
}

function onAmountInput() {
  amountInput.value = formatAmountStringFromString(amountInput.value)
}
function onAmountBlur() {
  const n = parseAmount(amountInput.value)
  const [i, d] = n.toFixed(2).split('.')
  amountInput.value = `${Number(i).toLocaleString('en-PH')}.${d}`
}
</script>

<style scoped>
.page-center {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.parts-container {
  width: 900px;
  max-width: 100%;
  padding: 32px;
  background: var(--parts-bg, #222);
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
  color: #fff;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .parts-container {
    width: 100%;
    padding: 20px;
    border-radius: 12px;
    margin: 0 16px;
  }

  .page-center {
    padding: 16px;
  }
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.header h2 {
  margin: 0;
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  color: #ccc;
  font-size: 0.9rem;
}

.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background-color 0.2s;
}

.logout-btn:hover {
  background: #c82333;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header h2 {
    font-size: 1.5rem;
  }

  .user-actions {
    width: 100%;
    justify-content: space-between;
  }

  .user-info {
    font-size: 0.8rem;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .logout-btn {
    padding: 10px 16px;
    font-size: 0.9rem;
  }
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

h2 {
  text-align: center;
  margin-bottom: 18px;
}
form {
  display: grid;
  grid-template-columns: 160px 1fr 160px 120px;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
}

@media (max-width: 768px) {
  .navigation {
    flex-direction: column;
    gap: 8px;
  }

  form {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  form select,
  form input,
  form button {
    width: 100%;
    padding: 12px;
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
select {
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #333;
  color: #fff;
}
input {
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #333;
  color: #fff;
}
button {
  padding: 12px 18px;
  border-radius: 8px;
  border: none;
  background: #4f8cff;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.2s ease;
}
button:hover {
  background: #3766b6;
}

.error-message {
  background: #ff4444;
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-close {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-close:hover {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.loading-message {
  text-align: center;
  padding: 40px;
  color: #888;
  font-size: 18px;
}
</style>
