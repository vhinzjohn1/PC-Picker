<template>
  <div class="profile-container">
    <h2>Profile Settings</h2>
    <form @submit.prevent="saveCurrency">
      <label for="currency">Currency:</label>
      <select v-model="currency" id="currency">
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="JPY">JPY</option>
        <option value="PHP">PHP</option>
      </select>
      <button type="submit">Save</button>
    </form>
    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// Use localStorage for user and currency

const currency = ref('USD')
const message = ref('')
type User = {
  id: string
  username: string
  password: string
  currency: string
  parts: { name: string; amount: number }[]
}
const user = ref<User | null>(null)

function getUsers(): User[] {
  return JSON.parse(localStorage.getItem('users') || '[]')
}
function saveUsers(users: User[]) {
  localStorage.setItem('users', JSON.stringify(users))
}
function loadUser() {
  const stored = localStorage.getItem('user')
  if (stored) {
    const u = JSON.parse(stored)
    const users = getUsers()
    user.value = users.find((x) => x.id === u.id) || null
    currency.value = user.value?.currency || 'USD'
  }
}
loadUser()

function saveCurrency() {
  if (!user.value) return
  user.value.currency = currency.value
  const users = getUsers()
  const idx = users.findIndex((x) => x.id === user.value!.id)
  if (idx !== -1) users[idx] = user.value
  saveUsers(users)
  message.value = 'Currency updated!'
}
</script>

<style scoped>
.profile-container {
  max-width: 350px;
  margin: 60px auto;
  padding: 32px;
  background: var(--profile-bg, #222);
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
  color: #fff;
}
label {
  display: block;
  margin-bottom: 8px;
}
select {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #333;
  color: #fff;
  margin-bottom: 16px;
}
button {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: none;
  background: #4f8cff;
  color: #fff;
  font-weight: bold;
  cursor: pointer;
}
.message {
  color: #4f8cff;
  margin-top: 10px;
  text-align: center;
}
</style>
