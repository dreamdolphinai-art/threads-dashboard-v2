import { NextResponse } from 'next/server'
import { ensureDb } from '@/lib/db'
import { knowledge } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export async function GET() {
  const db = await ensureDb()
  const files = await db.select({
    id: knowledge.id,
    name: knowledge.name,
    size: knowledge.size,
    updatedAt: knowledge.updatedAt,
  }).from(knowledge).orderBy(knowledge.updatedAt)
  return NextResponse.json(files)
}

export async function POST(req: Request) {
  const db = await ensureDb()
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 })

  const allowed = ['.txt', '.md', '.csv']
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!allowed.includes(ext)) {
    return NextResponse.json({ error: '対応形式: txt, md, csv' }, { status: 400 })
  }

  const content = await file.text()
  const now = new Date().toISOString()

  const existing = await db.select().from(knowledge).where(eq(knowledge.name, file.name)).limit(1)
  if (existing[0]) {
    await db.update(knowledge)
      .set({ content, size: content.length, updatedAt: now })
      .where(eq(knowledge.name, file.name))
  } else {
    await db.insert(knowledge).values({
      id: nanoid(),
      name: file.name,
      content,
      size: content.length,
      createdAt: now,
      updatedAt: now,
    })
  }
  return NextResponse.json({ ok: true, name: file.name })
}

export async function DELETE(req: Request) {
  const db = await ensureDb()
  const { name } = await req.json() as { name: string }
  await db.delete(knowledge).where(eq(knowledge.name, name))
  return NextResponse.json({ ok: true })
}
