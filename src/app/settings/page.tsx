'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AppSettings } from '@/lib/settings'

type TestResult = { ok: boolean; message: string }
type UsageStats = { month: string; inputTokens: number; outputTokens: number; costUSD: number; costJPY: number }

const SECTION = 'text-sm font-semibold text-gray-700 mb-3 mt-6 pb-1 border-b border-gray-200'
const LABEL = 'text-xs text-gray-600 block mb-1'
const HINT = 'text-xs text-gray-400 mt-1'

export default function SettingsPage() {
  const [form, setForm] = useState<Partial<AppSettings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, TestResult> | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then((data: AppSettings) => {
      setForm(data)
      setLoading(false)
    })
    fetch('/api/usage').then((r) => r.json()).then(setUsage)
  }, [])

  async function resetUsage() {
    setResetting(true)
    await fetch('/api/usage', { method: 'DELETE' })
    const data = await fetch('/api/usage').then((r) => r.json()) as UsageStats
    setUsage(data)
    setResetting(false)
  }

  function set(key: keyof AppSettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setJsonList(key: keyof AppSettings, raw: string) {
    // 改行区切りのテキストをJSON配列に変換
    const arr = raw.split('\n').map((s) => s.trim()).filter(Boolean)
    set(key, JSON.stringify(arr))
  }

  function getList(key: keyof AppSettings): string {
    try { return (JSON.parse(form[key] as string ?? '[]') as string[]).join('\n') } catch { return '' }
  }

  async function save() {
    setSaving(true)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function test() {
    setTesting(true)
    setTestResults(null)
    // 未保存の変更を先に保存してからテスト
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const res = await fetch('/api/settings/test', { method: 'POST' })
    const data = await res.json() as Record<string, TestResult>
    setTestResults(data)
    setTesting(false)
  }

  if (loading) return <p className="text-sm text-gray-500">読み込み中...</p>

  return (
    <div className="max-w-2xl space-y-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">設定</h1>
        <Button onClick={save} disabled={saving}>
          {saving ? '保存中...' : saved ? '✓ 保存しました' : '保存する'}
        </Button>
      </div>

      {/* API設定 */}
      <p className={SECTION}>API 設定（必須）</p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Threads アクセストークン</label>
            <Input
              type="password"
              placeholder="EAAxxxx..."
              value={form.threadsAccessToken ?? ''}
              onChange={(e) => set('threadsAccessToken', e.target.value)}
            />
            <p className={HINT}>Meta Developer から取得</p>
          </div>
          <div>
            <label className={LABEL}>Threads ユーザーID</label>
            <Input
              placeholder="123456789"
              value={form.threadsUserId ?? ''}
              onChange={(e) => set('threadsUserId', e.target.value)}
            />
            <p className={HINT}>数字のID（アカウント名ではなく）</p>
          </div>
        </div>

        <div>
          <label className={LABEL}>Anthropic API キー（Claude）</label>
          <Input
            type="password"
            placeholder="sk-ant-..."
            value={form.anthropicApiKey ?? ''}
            onChange={(e) => set('anthropicApiKey', e.target.value)}
          />
          <p className={HINT}>console.anthropic.com から取得</p>
        </div>

        <div>
          <label className={LABEL}>Cron Secret</label>
          <Input
            placeholder="例: mysecret123"
            value={form.cronSecret ?? ''}
            onChange={(e) => set('cronSecret', e.target.value)}
          />
          <p className={HINT}>cron-job.org の Authorization ヘッダーに設定する値</p>
        </div>

        {/* 接続テスト */}
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={test} disabled={testing}>
            {testing ? 'テスト中...' : '接続テスト'}
          </Button>
          {testResults && (
            <div className="flex gap-3 text-xs">
              {Object.entries(testResults).map(([k, r]) => (
                <span
                  key={k}
                  className={`px-2 py-1 rounded ${r.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                  {k === 'threads' ? 'Threads' : 'Claude'}: {r.message}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* プロフィール設定 */}
      <p className={SECTION}>プロフィール設定（AI生成に反映されます）</p>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>発信者名</label>
            <Input
              placeholder="例: ぞうさん"
              value={form.accountName ?? ''}
              onChange={(e) => set('accountName', e.target.value)}
            />
          </div>
          <div>
            <label className={LABEL}>ビジネス概要</label>
            <Input
              placeholder="例: 占いスピを使ったコンテンツ販売"
              value={form.businessDescription ?? ''}
              onChange={(e) => set('businessDescription', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>商品・サービス（価格も含めて）</label>
          <Input
            placeholder="例: 占いスピ2.0（128,000円）、二刀流（228,000円）"
            value={form.products ?? ''}
            onChange={(e) => set('products', e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>実績・数字（AIが積極的に使います）</label>
          <Input
            placeholder="例: 開始4ヶ月で月収120万円、教え子50人が月10万円達成"
            value={form.achievements ?? ''}
            onChange={(e) => set('achievements', e.target.value)}
          />
          <p className={HINT}>具体的な数字が入るほど投稿の説得力が上がります</p>
        </div>

        <div>
          <label className={LABEL}>ターゲット読者</label>
          <Input
            placeholder="例: 占いが好きで副業・独立を目指す30〜40代女性"
            value={form.targetAudience ?? ''}
            onChange={(e) => set('targetAudience', e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>投稿スタイル</label>
          <Textarea
            rows={3}
            placeholder="例: 絵文字は控えめ。友達に話しかけるような口語体。「！」は多用しない。"
            value={form.postingStyle ?? ''}
            onChange={(e) => set('postingStyle', e.target.value)}
          />
        </div>
      </div>

      {/* 投稿設定 */}
      <p className={SECTION}>投稿スケジュール設定</p>

      <div className="space-y-4">
        <div>
          <label className={LABEL}>投稿カテゴリ（1行に1つ）</label>
          <Textarea
            rows={6}
            placeholder={'占いスピで稼ぐ方法\nコンテンツ販売のノウハウ\nQ&A・Tips\n実績・事例\nマインドセット'}
            value={getList('categories')}
            onChange={(e) => setJsonList('categories', e.target.value)}
          />
          <p className={HINT}>投稿生成時にこの順番で繰り返し使われます</p>
        </div>

        <div>
          <label className={LABEL}>投稿時間（1行に1つ、HH:MM形式）</label>
          <Textarea
            rows={5}
            placeholder={'07:00\n10:00\n12:00\n15:00\n18:00\n20:00\n22:00'}
            value={getList('postTimes')}
            onChange={(e) => setJsonList('postTimes', e.target.value)}
          />
          <p className={HINT}>Vercel Cron はこの時間に自動投稿します（JST）</p>
        </div>
      </div>

      {/* API使用量 */}
      <p className={SECTION}>Anthropic API 使用量</p>
      {usage ? (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{usage.month || '未計測'} の使用量</p>
            <Button variant="outline" size="sm" onClick={resetUsage} disabled={resetting}>
              {resetting ? 'リセット中...' : 'リセット'}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded border border-gray-100 p-3">
              <p className="text-xs text-gray-400 mb-1">入力トークン</p>
              <p className="text-lg font-semibold">{usage.inputTokens.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded border border-gray-100 p-3">
              <p className="text-xs text-gray-400 mb-1">出力トークン</p>
              <p className="text-lg font-semibold">{usage.outputTokens.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-blue-50 rounded border border-blue-100 p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-500 mb-0.5">推定コスト（今月）</p>
              <p className="text-xl font-bold text-blue-700">約 ¥{usage.costJPY.toLocaleString()}</p>
            </div>
            <p className="text-xs text-blue-400">${usage.costUSD} USD</p>
          </div>
          <p className="text-xs text-gray-400">claude-sonnet-4-6 の料金をもとに算出（入力 $3 / 出力 $15 per 1M tokens）</p>
        </div>
      ) : (
        <p className="text-sm text-gray-400">読み込み中...</p>
      )}

      <div className="pt-4">
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? '保存中...' : saved ? '✓ 保存しました' : 'すべて保存する'}
        </Button>
      </div>
    </div>
  )
}
