import { NextResponse } from 'next/server'
import { ensureDb } from '@/lib/db'
import { followerHistory } from '@/lib/schema'
import { desc } from 'drizzle-orm'
import { getFollowerCount } from '@/lib/threads'
import { newId } from '@/lib/ids'

export async function GET() {
  const db = await ensureDb()
  const history = await db.select().from(followerHistory).orderBy(desc(followerHistory.date)).limit(30)
  return NextResponse.json(history.reverse())
}

export async function POST() {
  const db = await ensureDb()
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  const count = await getFollowerCount()
  const record = { id: newId(), date: today, count }
  await db.insert(followerHistory).values(record).onConflictDoNothing()

  return NextResponse.json(record)
}
