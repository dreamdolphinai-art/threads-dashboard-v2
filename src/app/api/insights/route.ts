import { NextResponse } from 'next/server'
import { ensureDb } from '@/lib/db'
import { posts } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { getInsights } from '@/lib/threads'

export async function POST() {
  const db = await ensureDb()
  const postedPosts = await db.select().from(posts)
    .where(and(eq(posts.status, 'posted')))

  let updated = 0
  for (const post of postedPosts) {
    if (!post.threadsId) continue
    try {
      const { likes, replies, views } = await getInsights(post.threadsId)
      await db.update(posts)
        .set({ likes, replies, views, updatedAt: new Date().toISOString() })
        .where(eq(posts.id, post.id))
      updated++
    } catch {
      // 個別失敗は無視して続行
    }
  }

  return NextResponse.json({ ok: true, updated })
}
