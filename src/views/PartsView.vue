<template>
  <div class="page-center">
    <div class="parts-container">
      <h2>PC Parts Picker</h2>
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
      <SpecsTable :parts="parts" :currency="currency" @remove="removePart" @update="updatePart" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import SpecsTable from '../components/SpecsTable.vue'
// Pure localStorage for parts and currency
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

const STORAGE_KEY = 'pcpicker.parts'
const CURRENCY_KEY = 'pcpicker.currency'

function loadFromStorage() {
  try {
    const storedParts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (Array.isArray(storedParts)) {
      // migrate old schema without component -> set to 'Other'
      parts.value = storedParts.map(
        (p: { component?: string; name?: unknown; amount?: unknown }) => ({
          component: typeof p.component === 'string' ? p.component : 'Other',
          name: typeof p.name === 'string' ? p.name : String(p.name ?? ''),
          amount: typeof p.amount === 'number' ? p.amount : Number(p.amount ?? 0),
        }),
      )
    }
    if (parts.value.length === 0) {
      // seed defaults for common PC parts with no selected part name yet
      parts.value = [
        { component: 'CPU', name: '', amount: 0 },
        { component: 'GPU', name: '', amount: 0 },
        { component: 'Motherboard', name: '', amount: 0 },
        { component: 'RAM', name: '', amount: 0 },
        { component: 'Storage', name: '', amount: 0 },
        { component: 'Power Supply', name: '', amount: 0 },
        { component: 'Case', name: '', amount: 0 },
        { component: 'CPU Cooler', name: '', amount: 0 },
      ]
    }
    // Force currency to PHP as requested
    currency.value = 'PHP'
    saveToStorage()
  } catch {
    parts.value = []
    currency.value = 'PHP'
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parts.value))
  localStorage.setItem(CURRENCY_KEY, currency.value)
}

onMounted(loadFromStorage)
watch(parts, saveToStorage, { deep: true })
watch(currency, saveToStorage)

function addPart() {
  // parse from formatted input into number
  partAmount.value = parseAmount(amountInput.value)
  if (!partName.value || partAmount.value === null) return
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
  partName.value = ''
  partAmount.value = null
  amountInput.value = ''
  // move dropdown to next unfilled component
  componentType.value = getNextUnfilledComponent(componentType.value) || componentType.value
}

function removePart(index: number) {
  parts.value = parts.value.filter((_, i) => i !== index)
}

function updatePart(index: number, payload: { name: string; amount: number }) {
  const next = [...parts.value]
  const existing = next[index]
  if (!existing) return
  next[index] = { ...existing, name: payload.name, amount: payload.amount }
  parts.value = next
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
  padding: 32px;
  background: var(--parts-bg, #222);
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
  color: #fff;
  display: flex;
  flex-direction: column;
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
</style>
