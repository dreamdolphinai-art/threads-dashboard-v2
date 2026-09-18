import { NextResponse } from 'next/server'
import { getSettings, saveSettings, type AppSettings } from '@/lib/settings'

export async function GET() {
  const s = await getSettings()
  // APIキーはマスクして返す
  return NextResponse.json({
    ...s,
    threadsAccessToken: s.threadsAccessToken ? '••••••••' + s.threadsAccessToken.slice(-4) : '',
    anthropicApiKey: s.anthropicApiKey ? '••••••••' + s.anthropicApiKey.slice(-4) : '',
  })
}

export async function PATCH(req: Request) {
  const body = await req.json() as Partial<AppSettings>
  // マスク済みの値は保存しない
  const clean = Object.fromEntries(
    Object.entries(body).filter(([, v]) => !String(v).startsWith('••••••••'))
  ) as Partial<AppSettings>
  await saveSettings(clean)
  return NextResponse.json({ ok: true })
}
