import { NextResponse } from 'next/server'
import { ensureDb } from '@/lib/db'
import { posts } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await ensureDb()
  const { id } = await params
  const body = await req.json() as Partial<{ status: string; content: string }>
  await db.update(posts)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(posts.id, id))
  const updated = await db.select().from(posts).where(eq(posts.id, id))
  return NextResponse.json(updated[0])
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const db = await ensureDb()
  const { id } = await params
  await db.delete(posts).where(eq(posts.id, id))
  return NextResponse.json({ ok: true })
}
