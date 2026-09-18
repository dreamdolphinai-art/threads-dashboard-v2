import { NextResponse } from 'next/server'
import { ensureDb } from '@/lib/db'
import { posts } from '@/lib/schema'
import { eq, and, gte } from 'drizzle-orm'

export async function GET() {
  const db = await ensureDb()

  // 直近7日間の投稿済み投稿（インサイトあり）
  const since = new Date()
  since.setDate(since.getDate() - 7)
  const sinceStr = since.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  const recentPosted = await db.select().from(posts)
    .where(and(eq(posts.status, 'posted'), gte(posts.date, sinceStr)))

  // views でソートしてトップ5
  const top5 = [...recentPosted]
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, 5)

  // 集計
  const totalViews = recentPosted.reduce((s, p) => s + (p.views ?? 0), 0)
  const totalLikes = recentPosted.reduce((s, p) => s + (p.likes ?? 0), 0)
  const totalReplies = recentPosted.reduce((s, p) => s + (p.replies ?? 0), 0)
  const avgEngagement = recentPosted.length > 0
    ? Math.round(((totalLikes + totalReplies) / recentPosted.length) * 10) / 10
    : 0

  return NextResponse.json({
    period: { from: sinceStr, postCount: recentPosted.length },
    summary: { totalViews, totalLikes, totalReplies, avgEngagement },
    top5,
  })
}
