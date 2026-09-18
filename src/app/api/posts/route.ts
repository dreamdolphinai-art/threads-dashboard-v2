import { NextResponse } from 'next/server'
import { ensureDb } from '@/lib/db'
import { posts } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { newId } from '@/lib/ids'

export async function GET(req: Request) {
  const db = await ensureDb()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const query = status
    ? db.select().from(posts).where(eq(posts.status, status)).orderBy(desc(posts.date), desc(posts.time))
    : db.select().from(posts).orderBy(desc(posts.date), desc(posts.time))

  const all = await query
  return NextResponse.json(all)
}

export async function POST(req: Request) {
  const db = await ensureDb()
  const body = await req.json() as { date: string; time: string; category: string; content: string }
  const post = {
    id: newId(),
    date: body.date,
    time: body.time,
    category: body.category,
    content: body.content,
    status: 'pending_approval',
  }
  await db.insert(posts).values(post)
  return NextResponse.json(post, { status: 201 })
}
