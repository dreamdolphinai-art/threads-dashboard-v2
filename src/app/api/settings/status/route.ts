import { NextResponse } from 'next/server'
import { getSettings, isConfigured } from '@/lib/settings'

export async function GET() {
  const s = await getSettings()
  return NextResponse.json({ configured: isConfigured(s) })
}
