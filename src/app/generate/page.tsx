'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Post } from '@/lib/schema'
import type { LuckyType } from '@/lib/lucky-days'

// 吉日情報はAPIから取得（クライアントで計算しない）
type DayLucky = { date: string; types: LuckyType[]; level: string; description: string }

const LEVEL_STYLE: Record<string, string> = {
  super: 'bg-red-100 text-red-700 border-red-200',
  great: 'bg-amber-100 text-amber-700 border-amber-200',
  good: 'bg-green-100 text-green-700 border-green-200',
  none: '',
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export default function GeneratePage() {
  const today = new Date().toISOString().split('T')[0]
  const [activeTab, setActiveTab] = useState<'generate' | 'rewrite'>('generate')

  // AI生成
  const [startDate, setStartDate] = useState(today)
  const [days, setDays] = useState(3)
  const [postsPerDay, setPostsPerDay] = useState(7)
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<Post[]>([])
  const [approving, setApproving] = useState<Record<string, boolean>>({})
  const [error, setError] = useState('')
  const [luckyPreviews, setLuckyPreviews] = useState<DayLucky[]>([])

  // リライト
  const [rwInput, setRwInput] = useState('')
  const [rwDate, setRwDate] = useState(today)
  const [rwTime, setRwTime] = useState('07:00')
  const [rwCategory, setRwCategory] = useState('占いスピで稼ぐ方法')
  const [rwLoading, setRwLoading] = useState(false)
  const [rwResult, setRwResult] = useState<Post | null>(null)
  const [rwApproved, setRwApproved] = useState(false)
  const [rwError, setRwError] = useState('')

  // 吉日プレビューを取得
  useEffect(() => {
    const dates = Array.from({ length: days }, (_, i) => addDays(startDate, i))
    Promise.all(
      dates.map((d) =>
        fetch(`/api/lucky?date=${d}`).then((r) => r.json()) as Promise<DayLucky>
      )
    ).then(setLuckyPreviews)
  }, [startDate, days])

  async function generate() {
    setLoading(true)
    setError('')
    setGenerated([])
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate, days, postsPerDay, theme }),
      })
      if (!res.ok) throw new Error('生成に失敗しました')
      const data: Post[] = await res.json()
      setGenerated(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  async function approve(id: string) {
    setApproving((prev) => ({ ...prev, [id]: true }))
    await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    setGenerated((prev) => prev.map((p) => p.id === id ? { ...p, status: 'approved' } : p))
    setApproving((prev) => ({ ...prev, [id]: false }))
  }

  async function approveAll() {
    const pending = generated.filter((p) => p.status === 'pending_approval')
    await Promise.all(pending.map((p) => approve(p.id)))
  }

  const pendingCount = generated.filter((p) => p.status === 'pending_approval').length
  const total = days * postsPerDay

  async function rewrite() {
    if (!rwInput.trim()) return
    setRwLoading(true)
    setRwError('')
    setRwResult(null)
    setRwApproved(false)
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorPost: rwInput, date: rwDate, time: rwTime, category: rwCategory }),
      })
      if (!res.ok) throw new Error('リライトに失敗しました')
      setRwResult(await res.json())
    } catch (e) {
      setRwError(String(e))
    } finally {
      setRwLoading(false)
    }
  }

  async function approveRw() {
    if (!rwResult) return
    await fetch(`/api/posts/${rwResult.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    setRwApproved(true)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">投稿生成</h1>

      {/* タブ */}
      <div className="flex gap-1 border-b border-gray-200">
        {([['generate', 'AI生成'], ['rewrite', 'リライト']] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setActiveTab(v)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === v ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'rewrite' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <div>
              <label className="text-xs text-gray-600 block mb-1">競合の投稿（貼り付け）</label>
              <Textarea
                value={rwInput}
                onChange={(e) => setRwInput(e.target.value)}
                rows={6}
                placeholder="参考にしたい投稿をここに貼り付けてください..."
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">投稿日</label>
                <Input type="date" value={rwDate} onChange={(e) => setRwDate(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">投稿時刻</label>
                <Input type="time" value={rwTime} onChange={(e) => setRwTime(e.target.value)} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">カテゴリー</label>
                <Input value={rwCategory} onChange={(e) => setRwCategory(e.target.value)} className="text-sm" />
              </div>
            </div>
            <Button onClick={rewrite} disabled={rwLoading || !rwInput.trim()}>
              {rwLoading ? 'リライト中...' : 'リライトする'}
            </Button>
            {rwError && <p className="text-sm text-red-600">{rwError}</p>}
          </div>

          {rwResult && (
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <p className="text-xs text-gray-500">{rwResult.date} {rwResult.time} / {rwResult.category}</p>
              <p className="text-sm whitespace-pre-wrap">{rwResult.content}</p>
              <p className="text-xs text-gray-400">{rwResult.content.length} 文字</p>
              <div className="flex justify-end">
                {rwApproved ? (
                  <span className="text-xs px-3 py-1 bg-green-100 text-green-800 rounded-full">承認済み</span>
                ) : (
                  <Button size="sm" onClick={approveRw}>承認する</Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'generate' && (<>

      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-600 block mb-1">開始日</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">日数（1〜14）</label>
            <Input
              type="number" min={1} max={14} value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(14, Number(e.target.value))))}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">1日の投稿数（1〜10）</label>
            <Input
              type="number" min={1} max={10} value={postsPerDay}
              onChange={(e) => setPostsPerDay(Math.max(1, Math.min(10, Number(e.target.value))))}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">テーマ（任意）</label>
            <Input
              placeholder="例: ローンチ前の教育..."
              value={theme} onChange={(e) => setTheme(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        {/* 吉日プレビュー */}
        {luckyPreviews.some((l) => l.types.length > 0) && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">期間内の吉日</p>
            <div className="flex flex-wrap gap-2">
              {luckyPreviews.filter((l) => l.types.length > 0).map((l) => (
                <span
                  key={l.date}
                  className={`text-xs px-2 py-1 rounded border ${LEVEL_STYLE[l.level] ?? ''}`}
                >
                  {l.date} {l.types.join('・')}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-400">上記の日は吉日情報を投稿内容に自動反映します</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={generate} disabled={loading}>
            {loading ? `生成中... (${total}件)` : `生成する (${total}件)`}
          </Button>
          {loading && (
            <p className="text-xs text-gray-500">
              約 {Math.ceil(days * 10)} 秒かかります...
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {generated.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{generated.length} 件生成しました</h2>
            {pendingCount > 0 && (
              <Button size="sm" onClick={approveAll}>すべて承認 ({pendingCount}件)</Button>
            )}
          </div>

          {Array.from(new Set(generated.map((p) => p.date))).sort().map((date) => {
            const lucky = luckyPreviews.find((l) => l.date === date)
            return (
              <div key={date}>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-gray-500">{date}</h3>
                  {lucky && lucky.types.length > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded border ${LEVEL_STYLE[lucky.level] ?? ''}`}>
                      {lucky.types.join('・')}
                    </span>
                  )}
                </div>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {generated.filter((p) => p.date === date).map((p) => (
                    <div key={p.id} className="p-3 flex items-start gap-3">
                      <div className="text-xs text-gray-500 w-12 shrink-0 pt-0.5">{p.time}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">{p.category}</p>
                        <p className="text-sm whitespace-pre-wrap">{p.content}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {p.status === 'approved' ? '承認済み' : '承認待ち'}
                        </span>
                        {p.status === 'pending_approval' && (
                          <button
                            onClick={() => approve(p.id)}
                            disabled={approving[p.id]}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            承認
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </>)}
    </div>
  )
}
