import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),       // YYYY-MM-DD
  time: text('time').notNull(),       // HH:MM
  category: text('category').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull().default('pending_approval'),
  // pending_approval | approved | rejected | posted | failed
  threadsId: text('threads_id'),
  threadParts: text('thread_parts'), // JSON: string[] — ツリー投稿の2件目以降
  likes: integer('likes'),
  replies: integer('replies'),
  views: integer('views'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export type Setting = typeof settings.$inferSelect

export const knowledge = sqliteTable('knowledge', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

export type Knowledge = typeof knowledge.$inferSelect

export const followerHistory = sqliteTable('follower_history', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD
  count: integer('count').notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

export type FollowerHistory = typeof followerHistory.$inferSelect
