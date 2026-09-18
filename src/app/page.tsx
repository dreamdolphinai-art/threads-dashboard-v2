'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import type { Post, FollowerHistory } from '@/lib/schema'

function SetupBanner() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  useEffect(() => {
    fetch('/api/settings/status').then((r) => r.json()).then((d: { configured: boolean }) => setConfigured(d.configured))
  }, [])
  if (configured !== false) return null
  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-amber-800">初期設定が完了していません</p>
        <p className="text-xs text-amber-700 mt-0.5">APIキーとプロフィールを設定すると投稿生成・自動投稿が使えます</p>
      </div>
      <Link href="/settings" className="shrink-0 text-xs px-3 py-1.5 bg-amber-600 text-white rounded-md hover:bg-amber-700">
        設定する
      </Link>
    </div>
  )
}

type DashboardData = {
  period: { from: string; postCount: number }
  summary: { totalViews: number; totalLikes: number; totalReplies: number; avgEngagement: number }
  top5: Post[]
}

function calcStats(posts: Post[]) {
  return {
    pending: posts.filter((p) => p.status === 'pending_approval').length,
    approved: posts.filter((p) => p.status === 'approved').length,
    posted: posts.filter((p) => p.status === 'posted').length,
    failed: posts.filter((p) => p.status === 'failed').length,
  }
}

const STATUS_COLOR: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-600',
  posted: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
}

const STATUS_LABEL: Record<string, string> = {
  pending_approval: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
  posted: '投稿済み',
  failed: '失敗',
}

export default function DashboardPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [followers, setFollowers] = useState<FollowerHistory[]>([])
  const [dashData, setDashData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)

  async function load() {
    const [postsData, followerData, dash] = await Promise.all([
      fetch('/api/posts').then((r) => r.json()) as Promise<Post[]>,
      fetch('/api/followers').then((r) => r.json()) as Promise<FollowerHistory[]>,
      fetch('/api/dashboard').then((r) => r.json()) as Promise<DashboardData>,
    ])
    setPosts(postsData)
    setFollowers(followerData)
    setDashData(dash)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function recordFollowers() {
    setRecording(true)
    await fetch('/api/followers', { method: 'POST' })
    await load()
    setRecording(false)
  }

  const stats = calcStats(posts)
  const today = new Date().toISOString().split('T')[0]
  const upcoming = posts
    .filter((p) => p.status === 'approved' && p.date >= today)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .slice(0, 10)

  // フォロワー増減
  const followerGrowth = followers.length >= 2
    ? followers[followers.length - 1].count - followers[0].count
    : null

  if (loading) return <p className="text-sm text-gray-500">読み込み中...</p>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">ダッシュボード</h1>

      <SetupBanner />

      {/* 投稿ステータス */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: '承認待ち', value: stats.pending, color: 'text-yellow-600' },
          { label: '承認済み', value: stats.approved, color: 'text-green-600' },
          { label: '投稿済み', value: stats.posted, color: 'text-blue-600' },
          { label: '失敗', value: stats.failed, color: 'text-red-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-gray-500">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* フォロワー増加グラフ */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold">フォロワー推移</h2>
            {followerGrowth !== null && (
              <p className="text-xs text-gray-500 mt-0.5">
                期間増減:{' '}
                <span className={followerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {followerGrowth >= 0 ? '+' : ''}{followerGrowth.toLocaleString()}
                </span>
              </p>
            )}
          </div>
          <button
            onClick={recordFollowers}
            disabled={recording}
            className="text-xs px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {recording ? '記録中...' : '今日のフォロワーを記録'}
          </button>
        </div>
        {followers.length < 2 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            2日以上記録するとグラフが表示されます
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={followers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={['auto', 'auto']}
                tickFormatter={(v: number) => v.toLocaleString()}
              />
              <Tooltip
                formatter={(v) => [Number(v).toLocaleString(), 'フォロワー']}
                labelFormatter={(l) => String(l)}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#000"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* 直近7日間インサイト */}
      {dashData && dashData.period.postCount > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-semibold">直近7日間のインサイト</h2>

          {/* サマリー */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '合計表示', value: dashData.summary.totalViews.toLocaleString() },
              { label: '合計いいね', value: dashData.summary.totalLikes.toLocaleString() },
              { label: '合計返信', value: dashData.summary.totalReplies.toLocaleString() },
              { label: '平均エンゲージ', value: dashData.summary.avgEngagement.toString() },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-xl font-bold mt-1">{s.value}</p>
              </div>
            ))}
          </div>

          {/* トップ投稿 */}
          {dashData.top5.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 mb-2">表示数トップ投稿</h3>
              <div className="divide-y divide-gray-100">
                {dashData.top5.map((p, i) => (
                  <div key={p.id} className="py-2 flex items-start gap-3">
                    <span className="text-xs text-gray-400 w-4 shrink-0 pt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400">{p.date} {p.time}</p>
                      <p className="text-sm line-clamp-2">{p.content}</p>
                    </div>
                    <div className="text-xs text-gray-500 text-right shrink-0">
                      <p>{(p.views ?? 0).toLocaleString()} 表示</p>
                      <p>{p.likes ?? 0} いいね</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* クイックアクション */}
      <div className="flex gap-3">
        <Link
          href="/generate"
          className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 transition-colors"
        >
          AI で投稿生成
        </Link>
        <Link
          href="/posts"
          className="px-4 py-2 border border-gray-300 text-sm rounded-md hover:bg-gray-50 transition-colors"
        >
          投稿一覧を見る
        </Link>
      </div>

      {/* 承認済み予定 */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-gray-700">承認済み・今後の投稿</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400">承認済みの投稿がありません</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {upcoming.map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-start gap-3">
                <div className="text-xs text-gray-500 w-28 shrink-0 pt-0.5">
                  {p.date}<br />{p.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{p.category}</p>
                  <p className="text-sm line-clamp-2">{p.content}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLOR[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {stats.failed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          投稿失敗が {stats.failed} 件あります。
          <Link href="/posts?status=failed" className="ml-1 underline">確認する</Link>
        </div>
      )}
    </div>
  )
}
