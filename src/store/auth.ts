// Authentication logic for login/register
import { db, initDB, User } from './db'
import { nanoid } from 'nanoid'

export async function register(username: string, password: string) {
  await initDB()
  if (db.data!.users.find(u => u.username === username)) {
    throw new Error('Username already exists')
  }
  const user: User = {
    id: nanoid(),
    username,
    password,
    currency: 'USD',
    parts: []
  }
  db.data!.users.push(user)
  await db.write()
  return user
}

export async function login(username: string, password: string) {
  await initDB()
  const user = db.data!.users.find(u => u.username === username && u.password === password)
  if (!user) throw new Error('Invalid credentials')
  return user
}
