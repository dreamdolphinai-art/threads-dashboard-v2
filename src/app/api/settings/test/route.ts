import { NextResponse } from 'next/server'
import { getSettings } from '@/lib/settings'
import { getFollowerCount } from '@/lib/threads'
import Anthropic from '@anthropic-ai/sdk'

export async function POST() {
  const s = await getSettings()
  const results: Record<string, { ok: boolean; message: string }> = {}

  // Threads API テスト
  if (s.threadsAccessToken && s.threadsUserId) {
    try {
      const count = await getFollowerCount()
      results.threads = { ok: true, message: `接続成功！フォロワー数: ${count.toLocaleString()}` }
    } catch (e) {
      results.threads = { ok: false, message: `エラー: ${String(e)}` }
    }
  } else {
    results.threads = { ok: false, message: 'アクセストークンまたはユーザーIDが未設定です' }
  }

  // Claude API テスト
  if (s.anthropicApiKey) {
    try {
      const client = new Anthropic({ apiKey: s.anthropicApiKey })
      await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'hi' }],
      })
      results.claude = { ok: true, message: '接続成功！' }
    } catch (e) {
      results.claude = { ok: false, message: `エラー: ${String(e)}` }
    }
  } else {
    results.claude = { ok: false, message: 'APIキーが未設定です' }
  }

  return NextResponse.json(results)
}
