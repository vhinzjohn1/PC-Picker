<template>
  <div class="specs-table">
    <!-- Desktop Table View -->
    <table class="desktop-table">
      <thead>
        <tr>
          <th>Component</th>
          <th>Part Name</th>
          <th class="amount-col">Amount ({{ currency }})</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(part, idx) in parts"
          :key="part.id || idx"
          draggable="true"
          @dragstart="onDragStart(idx)"
          @dragover.prevent
          @drop="onDrop(idx)"
        >
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
              <button class="icon-btn" @click="cancelEdit" aria-label="Cancel" title="Cancel">
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

    <!-- Mobile Card View -->
    <div class="mobile-cards">
      <div
        v-for="(part, idx) in parts"
        :key="part.id || idx"
        class="part-card"
        draggable="true"
        @dragstart="onDragStart(idx)"
        @dragover.prevent
        @drop="onDrop(idx)"
      >
        <div class="card-header">
          <h3 class="component-name">{{ part.component || 'Other' }}</h3>
          <div class="card-actions">
            <template v-if="editIndex === idx">
              <button
                class="icon-btn success"
                @click="saveEdit(idx)"
                aria-label="Save"
                title="Save"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
              <button class="icon-btn" @click="cancelEdit" aria-label="Cancel" title="Cancel">
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
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
          </div>
        </div>

        <div class="card-content">
          <div class="part-name-section">
            <label class="field-label">Part Name</label>
            <template v-if="editIndex === idx">
              <input
                v-model="editName"
                placeholder="Select a specific model..."
                class="card-input"
              />
            </template>
            <template v-else>
              <span v-if="part.name" class="part-name">{{ part.name }}</span>
              <span v-else class="placeholder">Not selected yet</span>
            </template>
          </div>

          <div class="amount-section">
            <label class="field-label">Amount ({{ currency }})</label>
            <template v-if="editIndex === idx">
              <input
                v-model="editAmountInput"
                type="text"
                inputmode="decimal"
                @input="onInlineAmountInput"
                @blur="onInlineAmountBlur"
                class="card-input"
              />
            </template>
            <template v-else>
              <span class="amount-value">{{ formatAmount(part.amount) }}</span>
            </template>
          </div>
        </div>
      </div>

      <!-- Mobile Total -->
      <div class="total-card">
        <div class="total-content">
          <span class="total-label">Total</span>
          <span class="total-amount">{{ formatAmount(total) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, computed } from 'vue'
import { ref } from 'vue'
import type { Part } from '../lib/supabase'
const props = defineProps<{ parts: Part[]; currency: string }>()
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
const dragIndex = ref<number | null>(null)
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
  (e: 'reorder', from: number, to: number): void
}>()

function onDragStart(index: number) {
  dragIndex.value = index
}
function onDrop(targetIndex: number) {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  emit('reorder', dragIndex.value, targetIndex)
  dragIndex.value = null
}
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

/* Desktop Table Styles */
.desktop-table {
  width: 90%;
  border-collapse: collapse;
  background: #222;
  color: #fff;
  display: table;
}

.desktop-table th,
.desktop-table td {
  padding: 10px;
  border-bottom: 1px solid #444;
}

.desktop-table th {
  background: #333;
}

.desktop-table tfoot td.total-cell {
  text-align: right;
}

.desktop-table .amount-col,
.desktop-table tbody td:nth-child(3) {
  text-align: right;
}

.desktop-table tfoot td {
  background: #333;
  font-size: 1.1em;
}

.desktop-table .actions {
  width: 160px;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
}

.desktop-table td input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: none;
  background: #2a2a2a;
  color: #fff;
}

/* Mobile Card Styles */
.mobile-cards {
  display: none;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 500px;
}

.part-card {
  background: #2a2a2a;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #444;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.part-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #444;
}

.component-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.part-name-section,
.amount-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.part-name {
  font-size: 1rem;
  color: #fff;
  word-break: break-word;
}

.amount-value {
  font-size: 1.1rem;
  font-weight: 600;
  color: #4f8cff;
}

.card-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #555;
  background: #333;
  color: #fff;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.card-input:focus {
  outline: none;
  border-color: #4f8cff;
}

.total-card {
  background: #333;
  border-radius: 12px;
  padding: 20px;
  border: 2px solid #4f8cff;
  margin-top: 8px;
}

.total-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-label {
  font-size: 1.2rem;
  font-weight: 600;
  color: #fff;
}

.total-amount {
  font-size: 1.4rem;
  font-weight: 700;
  color: #4f8cff;
}

/* Icon Button Styles */
.icon-btn {
  padding: 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  border: 1px solid #4f8cff;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background: rgba(79, 140, 255, 0.15);
  transform: scale(1.05);
}

.icon-btn.success {
  border-color: #28a745;
}

.icon-btn.success:hover {
  background: rgba(40, 167, 69, 0.15);
}

.icon-btn.danger {
  border-color: #ff4f4f;
}

.icon-btn.danger:hover {
  background: rgba(255, 79, 79, 0.15);
}

.placeholder {
  color: #9aa0a6;
  font-style: italic;
}

/* Responsive Design */
@media (max-width: 768px) {
  .desktop-table {
    display: none;
  }

  .mobile-cards {
    display: flex;
  }

  .specs-table {
    padding: 0 16px;
  }
}

@media (max-width: 480px) {
  .part-card {
    padding: 12px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .card-actions {
    align-self: flex-end;
  }

  .component-name {
    font-size: 1rem;
  }

  .total-card {
    padding: 16px;
  }

  .total-label {
    font-size: 1.1rem;
  }

  .total-amount {
    font-size: 1.3rem;
  }
}
</style>
