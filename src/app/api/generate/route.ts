import { NextResponse } from 'next/server'
import { callClaude } from '@/lib/claude'
import { ensureDb } from '@/lib/db'
import { posts, knowledge as knowledgeTable } from '@/lib/schema'
import { newId } from '@/lib/ids'
import { getLuckyInfo } from '@/lib/lucky-days'
import { getSettings } from '@/lib/settings'

const MAX_CHARS = 30000

async function loadKnowledge(): Promise<string> {
  try {
    const db = await ensureDb()
    const rows = await db.select().from(knowledgeTable)
    const parts: string[] = []
    let total = 0
    for (const row of rows) {
      if (total >= MAX_CHARS) break
      const chunk = row.content.slice(0, 8000)
      parts.push(`--- ${row.name} ---\n${chunk}`)
      total += chunk.length
    }
    return parts.join('\n\n')
  } catch {
    return ''
  }
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function buildSchedule(categories: string[], times: string[], count: number) {
  return Array.from({ length: count }, (_, i) => ({
    time: times[i % times.length],
    category: categories[i % categories.length],
  }))
}

function buildSystemPrompt(knowledge: string, s: Awaited<ReturnType<typeof getSettings>>): string {
  return `
あなたは日本のSNSマーケティングとコピーライティングに精通したThreadsライターです。
占いスピリチュアルでコンテンツ販売を行うビジネスの投稿を生成します。

=== 発信者プロフィール（必ず完全に反映する） ===
名前: ${s.accountName || '（未設定）'}
ビジネス概要: ${s.businessDescription}
商品・サービス: ${s.products || '（未設定）'}
実績・数字: ${s.achievements || '（未設定）'}
ターゲット読者: ${s.targetAudience}
投稿スタイル: ${s.postingStyle}

${knowledge ? `=== 学習済み参考資料 ===\n${knowledge}\n\n` : ''}
ルール:
母の手帳・記録に実際に書かれていない発言・思想・相談内容・出来事・筆跡・行動などを事実として創作せず、確認できない内容は母に帰属させず、娘自身の考えや一般的な表現として書く
}

export async function POST(req: Request) {
  const body = await req.json() as { startDate: string; days: number; postsPerDay?: number; theme?: string }
  const { startDate, days, theme } = body
  const postsPerDay = Math.min(Math.max(body.postsPerDay ?? 3, 1), 10)

  const [knowledge, appSettings] = await Promise.all([loadKnowledge(), getSettings()])
  const categories: string[] = JSON.parse(appSettings.categories)
  const times: string[] = JSON.parse(appSettings.postTimes)
  const systemPrompt = buildSystemPrompt(knowledge, appSettings)
  const schedule = buildSchedule(categories, times, postsPerDay)

  const db = await ensureDb()
  const allPosts = []

  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i)
    const dateObj = new Date(date)

    // 吉日情報を取得
    const lucky = getLuckyInfo(dateObj)
   const luckyNote = lucky.types.length > 0
  ? `\n【この日の吉日情報】${lucky.types.join('・')}（${lucky.description}）\n`
  : ''
    

    const scheduleText = schedule.map((s, idx) => `${idx + 1}. ${s.time} [${s.category}]`).join('\n')

    const prompt = `
${date}（干支: ${lucky.kanshi}）の${postsPerDay}件のThreads投稿を生成してください。
各投稿は「===番号===」で区切ってください。
${luckyNote}
${theme ? `\nテーマ: ${theme}` : ''}

${scheduleText}

出力形式（説明なし）:
===1===
本文
===2===
本文
（以下同様）
`

    const raw = await callClaude(systemPrompt, prompt)

    for (let j = 0; j < schedule.length; j++) {
      const start = raw.indexOf(`===${j + 1}===`)
      const end = j + 1 < schedule.length ? raw.indexOf(`===${j + 2}===`) : raw.length
      if (start === -1) continue

      const content = raw.slice(start + `===${j + 1}===`.length, end).trim()
      allPosts.push({
        id: newId(),
        date,
        time: schedule[j].time,
        category: schedule[j].category,
        content,
        status: 'pending_approval' as const,
      })
    }
  }

  if (allPosts.length > 0) {
    await db.insert(posts).values(allPosts)
  }

  return NextResponse.json(allPosts)
}
