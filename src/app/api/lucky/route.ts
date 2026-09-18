import { NextResponse } from 'next/server'
import { getLuckyInfo } from '@/lib/lucky-days'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date')
  if (!dateStr) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const date = new Date(dateStr)
  const info = getLuckyInfo(date)
  return NextResponse.json({ date: dateStr, ...info })
}
