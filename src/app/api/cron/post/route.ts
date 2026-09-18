import { NextResponse } from 'next/server'
import { ensureDb } from '@/lib/db'
import { posts } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { publishThread } from '@/lib/threads'
import { getSettings } from '@/lib/settings'

export async function GET(req: Request) {
  const { cronSecret } = await getSettings()
  if (cronSecret) {
    const secret = req.headers.get('authorization')
    if (secret !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const now = new Date()
  const jstDate = now.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const jstHour = String(now.toLocaleString('en-US', {
    hour: 'numeric', hour12: false, timeZone: 'Asia/Tokyo',
  })).padStart(2, '0')
  const jstTime = `${jstHour}:00`

  const db = await ensureDb()
  const pending = await db.select().from(posts)
    .where(and(
      eq(posts.date, jstDate),
      eq(posts.time, jstTime),
      eq(posts.status, 'approved')
    ))
    .limit(1)

  if (!pending[0]) {
    return NextResponse.json({ ok: true, posted: false })
  }

  const post = pending[0]

  try {
    const parts = post.threadParts ? [post.content, ...(JSON.parse(post.threadParts) as string[])] : [post.content]
  const threadsId = await publishThread(parts)
    await db.update(posts)
      .set({ status: 'posted', threadsId, updatedAt: new Date().toISOString() })
      .where(eq(posts.id, post.id))
    return NextResponse.json({ ok: true, posted: true, threadsId })
  } catch (err) {
    await db.update(posts)
      .set({ status: 'failed', updatedAt: new Date().toISOString() })
      .where(eq(posts.id, post.id))
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
