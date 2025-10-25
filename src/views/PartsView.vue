<template>
  <AppLayout
    title="PC Parts Picker"
    :userEmail="userEmail"
    :userEmailLoading="userEmailLoading"
    :logoutHandler="handleLogout"
    :showNav="true"
  >
    <!-- Error message -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button @click="error = null" class="error-close">×</button>
    </div>
    <!-- Loading state with skeleton -->
    <template v-if="loading">
      <div class="skeleton-form-row">
        <div class="skeleton skeleton-input" style="width: 160px; height: 46px"></div>
        <div class="skeleton skeleton-input" style="flex: 1; height: 46px"></div>
        <div class="skeleton skeleton-input" style="width: 160px; height: 46px"></div>
        <div class="skeleton skeleton-btn" style="width: 120px; height: 46px"></div>
      </div>
      <div class="skeleton-list">
        <div v-for="n in 3" :key="n" class="skeleton-row">
          <div class="skeleton skeleton-cell" style="width: 130px; height: 32px"></div>
          <div class="skeleton skeleton-cell" style="flex: 1; height: 32px"></div>
          <div class="skeleton skeleton-cell" style="width: 120px; height: 32px"></div>
          <div class="skeleton skeleton-cell" style="width: 100px; height: 32px"></div>
        </div>
      </div>
    </template>
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
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import SpecsTable from '../components/SpecsTable.vue'
import { db } from '../lib/database'
import { supabase } from '../lib/supabase'
import AppLayout from '../components/AppLayout.vue'

// --- CACHE KEYS ---
const LS_PARTS = 'pcPartsV1'
const LS_CURRENCY = 'partsCurrencyV1'
const LS_EMAIL = 'userEmailV1'

const router = useRouter()
const userEmail = ref('')
const userEmailLoading = ref(true)
const loading = ref(true)
const error = ref<string | null>(null)

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

/**
 * Restore cached values to refs for instant UI.
 */
function restoreCache() {
  const email = localStorage.getItem(LS_EMAIL)
  if (email) userEmail.value = email

  const partsJson = localStorage.getItem(LS_PARTS)
  if (partsJson) {
    try {
      parts.value = JSON.parse(partsJson)
    } catch {}
  }
  const currencyCache = localStorage.getItem(LS_CURRENCY)
  if (currencyCache) currency.value = currencyCache
}

/**
 * Save current data to localStorage cache.
 */
function updateCache() {
  localStorage.setItem(LS_EMAIL, userEmail.value || '')
  localStorage.setItem(LS_PARTS, JSON.stringify(parts.value))
  localStorage.setItem(LS_CURRENCY, currency.value)
}

async function backgroundFetchUserAndParts() {
  try {
    loading.value = true
    userEmailLoading.value = true
    error.value = null
    const {
      data: { user },
    } = await supabase.auth.getUser()
    userEmail.value = user?.email || 'Anonymous User'
    userEmailLoading.value = false
    //--- parts/currency
    const [dbParts, dbCurrency] = await Promise.all([db.getParts(), db.getCurrency()])
    parts.value = dbParts.map((p) => ({
      component: p.component,
      name: p.name === 'EMPTY' ? '' : p.name,
      amount: p.amount,
    }))
    currency.value = dbCurrency
    // If no parts exist, seed defaults
    if (dbParts.length === 0) {
      await db.seedDefaultParts()
      const seededParts = await db.getParts()
      parts.value = seededParts.map((p) => ({
        component: p.component,
        name: p.name === 'EMPTY' ? '' : p.name,
        amount: p.amount,
      }))
    }
    updateCache() // Save latest to cache after any successful fetch
  } catch (err) {
    console.error('Error loading data:', err)
    error.value = 'Failed to load data. Please refresh the page.'
    // Don't clear cache, keep showing whatever's there (good offline)
  } finally {
    loading.value = false
    userEmailLoading.value = false
  }
}

onMounted(() => {
  restoreCache() // So UI is instant
  backgroundFetchUserAndParts() // Will update cache and state in background
})

watch(currency, updateCache)
watch(parts, updateCache, { deep: true })
watch(userEmail, updateCache)

async function handleLogout() {
  try {
    await supabase.auth.signOut()
    router.push('/login')
    // Optionally clear user cache (depends on your app's UX needs)
    localStorage.removeItem(LS_EMAIL)
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

async function addPart() {
  partAmount.value = parseAmount(amountInput.value)
  if (!partName.value || partAmount.value === null) return
  try {
    const savedPart = await db.savePart(
      componentType.value,
      partName.value,
      partAmount.value,
      parts.value.length,
    )
    if (savedPart) {
      const idx = parts.value.findIndex((p) => p.component === componentType.value)
      const newEntry = {
        ...savedPart, // Must include id and sort_order for correct future ordering!
      }
      if (idx !== -1) {
        const next = [...parts.value]
        next[idx] = newEntry
        parts.value = next
      } else {
        parts.value = [...parts.value, newEntry]
      }
      partName.value = ''
      partAmount.value = null
      amountInput.value = ''
      componentType.value = getNextUnfilledComponent(componentType.value) || componentType.value
      updateCache()
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
        parts.value = parts.value.filter((_, i) => i !== index)
        updateCache()
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
    const savedPart = await db.savePart(existing.component, payload.name, payload.amount)
    if (savedPart) {
      const next = [...parts.value]
      next[index] = { ...existing, name: payload.name, amount: payload.amount }
      parts.value = next
      updateCache()
    }
  } catch (err) {
    console.error('Error updating part:', err)
    error.value = 'Failed to update part. Please try again.'
  }
}

async function reorderParts(from: number, to: number) {
  if (from === to) return
  const next = [...parts.value]
  const removed = next.splice(from, 1)
  const moved = removed[0]
  if (!moved) return
  next.splice(to, 0, moved)
  // Set correct sort_order for each part
  const toSave = next.map((p, idx) => ({ id: (p as any).id, sort_order: idx }))
  const ok = await db.updatePartOrders(toSave)
  if (ok) {
    parts.value = next
    updateCache()
  } else {
    error.value = 'Failed to save new order. Try again!'
  }
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
function getNextUnfilledComponent(current: string): string | undefined {
  for (const opt of componentOptions) {
    const entry = parts.value.find((p) => p.component === opt)
    if (!entry || !entry.name) return opt
  }
  for (const opt of componentOptions) {
    const entry = parts.value.find((p) => p.component === opt)
    if (!entry || entry.amount === 0) return opt
  }
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
/* Remove layout/container/header/nav styles -- handled by AppLayout */
.skeleton-form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
}
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.skeleton-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.skeleton-input,
.skeleton-btn,
.skeleton-cell {
  border-radius: 8px;
}
form {
  display: grid;
  grid-template-columns: 160px 1fr 160px 120px;
  gap: 12px;
  margin-bottom: 24px;
  align-items: center;
}
@media (max-width: 768px) {
  .skeleton-form-row {
    flex-direction: column;
  }
  .skeleton-row {
    flex-direction: column;
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
    font-size: 16px;
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
  min-height: 60px;
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
</style>
