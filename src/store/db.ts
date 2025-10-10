// Simple local JSON database using lowdb for user and parts data
import { Low, JSONFile } from 'lowdb'

export type User = {
  id: string;
  username: string;
  password: string;
  currency: string;
  parts: Array<{ name: string; amount: number }>;
}

export type Data = {
  users: User[];
}

const adapter = new JSONFile<Data>('db.json')
const db = new Low<Data>(adapter)

export async function initDB() {
  await db.read()
  db.data ||= { users: [] }
  await db.write()
}

export { db }