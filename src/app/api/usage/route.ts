import { NextResponse } from 'next/server'
import { getSettings, saveSetting } from '@/lib/settings'

// claude-sonnet-4-6 pricing
const INPUT_PRICE_PER_M = 3.0   // USD per 1M input tokens
const OUTPUT_PRICE_PER_M = 15.0  // USD per 1M output tokens
const USD_TO_JPY = 155

export async function GET() {
  const s = await getSettings()
  const inputTokens = Number(s.usageInputTokens)
  const outputTokens = Number(s.usageOutputTokens)
  const costUSD = (inputTokens / 1_000_000) * INPUT_PRICE_PER_M
                + (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M
  const costJPY = Math.round(costUSD * USD_TO_JPY)
  return NextResponse.json({
    month: s.usageMonth,
    inputTokens,
    outputTokens,
    costUSD: Math.round(costUSD * 100) / 100,
    costJPY,
  })
}

export async function DELETE() {
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  await Promise.all([
    saveSetting('usageMonth', currentMonth),
    saveSetting('usageInputTokens', '0'),
    saveSetting('usageOutputTokens', '0'),
  ])
  return NextResponse.json({ ok: true })
}
