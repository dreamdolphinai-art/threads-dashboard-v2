import Anthropic from '@anthropic-ai/sdk'
import { getSettings, saveSetting } from './settings'

export async function callClaude(system: string, user: string): Promise<string> {
  const s = await getSettings()
  const client = new Anthropic({ apiKey: s.anthropicApiKey })
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system,
    messages: [{ role: 'user', content: user }],
  })
  const block = msg.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type')

  try {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const sameMonth = s.usageMonth === currentMonth
    const prevInput = sameMonth ? Number(s.usageInputTokens) : 0
    const prevOutput = sameMonth ? Number(s.usageOutputTokens) : 0
    await Promise.all([
      saveSetting('usageMonth', currentMonth),
      saveSetting('usageInputTokens', String(prevInput + msg.usage.input_tokens)),
      saveSetting('usageOutputTokens', String(prevOutput + msg.usage.output_tokens)),
    ])
  } catch { /* usage tracking failure should not break generation */ }

  return block.text
}
