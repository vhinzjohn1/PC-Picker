<template>
  <div class="specs-table">
    <table>
      <thead>
        <tr>
          <th>Component</th>
          <th>Part Name</th>
          <th class="amount-col">Amount ({{ currency }})</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(part, idx) in parts" :key="idx">
          <td>{{ part.component || 'Other' }}</td>
          <td>
            <template v-if="editIndex === idx">
              <input v-model="editName" placeholder="Select a specific model..." />
            </template>
            <template v-else>
              <span v-if="part.name">{{ part.name }}</span>
              <span v-else class="placeholder">Not selected yet</span>
            </template>
          </td>
          <td>
            <template v-if="editIndex === idx">
              <input
                v-model="editAmountInput"
                type="text"
                inputmode="decimal"
                @input="onInlineAmountInput"
                @blur="onInlineAmountBlur"
              />
            </template>
            <template v-else>
              {{ formatAmount(part.amount) }}
            </template>
          </td>
          <td class="actions">
            <template v-if="editIndex === idx">
              <button
                class="icon-btn success"
                @click="saveEdit(idx)"
                aria-label="Save"
                title="Save"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M20 6L9 17l-5-5"
                  />
                </svg>
              </button>
              <button
                class="icon-btn danger"
                @click="cancelEdit"
                aria-label="Cancel"
                title="Cancel"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M6 6l12 12M18 6L6 18"
                  />
                </svg>
              </button>
            </template>
            <template v-else>
              <button
                class="icon-btn"
                @click="startEdit(idx, part.name, part.amount)"
                aria-label="Edit"
                title="Edit"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 20h9M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
                  />
                </svg>
              </button>
              <button
                class="icon-btn danger"
                @click="$emit('remove', idx)"
                aria-label="Remove"
                title="Remove"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M3 6h18M8 6l1-2h6l1 2m-1 0l-1 14H10L9 6"
                  />
                </svg>
              </button>
            </template>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2"><strong>Total</strong></td>
          <td colspan="2" class="total-cell">
            <strong>{{ formatAmount(total) }}</strong>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { ref } from 'vue'
const props = defineProps<{
  parts: { component?: string; name: string; amount: number }[]
  currency: string
}>()
const total = computed(() => props.parts.reduce((sum, p) => sum + p.amount, 0))
const formatter = computed(
  () => new Intl.NumberFormat('en-PH', { style: 'currency', currency: props.currency }),
)
function formatAmount(value: number) {
  return formatter.value.format(value)
}

const editIndex = ref<number | null>(null)
const editName = ref('')
const editAmount = ref<number | null>(null)
const editAmountInput = ref('')

function startEdit(index: number, name: string, amount: number) {
  editIndex.value = index
  editName.value = name
  editAmount.value = amount
  const [i, d] = amount.toFixed(2).split('.')
  editAmountInput.value = `${Number(i).toLocaleString('en-PH')}.${d}`
}
function cancelEdit() {
  editIndex.value = null
  editName.value = ''
  editAmount.value = null
  editAmountInput.value = ''
}
function saveEdit(index: number) {
  if (editIndex.value !== index || editAmount.value === null) return
  const payload = { name: editName.value, amount: editAmount.value }
  // emit update to parent
  emit('update', index, payload)
  cancelEdit()
}
// inline amount formatting helpers
function parseAmount(input: string): number {
  const cleaned = String(input).replace(/[^0-9.]/g, '')
  const [intPartRaw, ...rest] = cleaned.split('.')
  const intPart = intPartRaw || '0'
  const decimals = rest.join('')
  const normalized = decimals ? `${intPart}.${decimals.slice(0, 2)}` : intPart
  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}
function formatAmountStringFromString(input: string): string {
  const cleaned = String(input).replace(/[^0-9.]/g, '')
  const [intPartRaw, ...rest] = cleaned.split('.')
  const intPart = intPartRaw || '0'
  const decimals = rest.join('')
  const intFormatted = Number(intPart).toLocaleString('en-PH')
  return decimals ? `${intFormatted}.${decimals.slice(0, 2)}` : intFormatted
}
function onInlineAmountInput() {
  editAmountInput.value = formatAmountStringFromString(editAmountInput.value)
  editAmount.value = parseAmount(editAmountInput.value)
}
function onInlineAmountBlur() {
  const n = parseAmount(editAmountInput.value)
  const [i, d] = n.toFixed(2).split('.')
  editAmountInput.value = `${Number(i).toLocaleString('en-PH')}.${d}`
  editAmount.value = n
}

const emit = defineEmits<{
  (e: 'remove', index: number): void
  (e: 'update', index: number, payload: { name: string; amount: number }): void
}>()
</script>

<script lang="ts">
export default {
  name: 'SpecsTable',
}
</script>

<style scoped>
.specs-table {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
table {
  width: 90%;
  border-collapse: collapse;
  background: #222;
  color: #fff;
}
th,
td {
  padding: 10px;
  border-bottom: 1px solid #444;
}
th {
  background: #333;
}
tfoot td.total-cell {
  text-align: right;
}
.amount-col,
tbody td:nth-child(3) {
  text-align: right;
}
tfoot td {
  background: #333;
  font-size: 1.1em;
}
.actions {
  width: 160px;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
}
.icon-btn {
  padding: 6px 12px;
  border-radius: 6px;
  border: none;
  background: transparent;
  border: 1px solid #4f8cff;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease;
}
.icon-btn:hover {
  background: rgba(79, 140, 255, 0.15);
}
.icon-btn.danger {
  border-color: #ff4f4f;
}
.icon-btn.danger:hover {
  background: rgba(255, 79, 79, 0.15);
}
td input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: #2a2a2a;
  color: #fff;
}
.placeholder {
  color: #9aa0a6;
  font-style: italic;
}
</style>
