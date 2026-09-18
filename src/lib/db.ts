import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { posts, followerHistory, settings, knowledge } from './schema'

let client: ReturnType<typeof createClient> | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null
let initialized = false

function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
  }
  return client
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = drizzle(getClient(), { schema: { posts, followerHistory, settings, knowledge } })
  }
  return dbInstance
}

export async function ensureDb() {
  const db = getDb()
  if (!initialized) {
    await getClient().executeMultiple(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        category TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending_approval',
        threads_id TEXT,
        likes INTEGER,
        replies INTEGER,
        views INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS knowledge (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS follower_history (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        count INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
    try {
      await getClient().execute('ALTER TABLE posts ADD COLUMN thread_parts TEXT')
    } catch { /* already exists */ }
    initialized = true
  }
  return db
}
