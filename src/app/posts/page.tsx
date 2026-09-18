'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { Post } from '@/lib/schema'
import { Suspense } from 'react'

const STATUS_LABEL: Record<string, string> = {
  pending_approval: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
  posted: '投稿済み',
  failed: '失敗',
}

const STATUS_COLOR: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-gray-100 text-gray-600',
  posted: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
}

const TABS = [
  { value: '', label: 'すべて' },
  { value: 'pending_approval', label: '承認待ち' },
  { value: 'approved', label: '承認済み' },
  { value: 'posted', label: '投稿済み' },
  { value: 'failed', label: '失敗' },
]

function PostsContent() {
  const searchParams = useSearchParams()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('status') ?? '')
  const [editing, setEditing] = useState<Post | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editThreadParts, setEditThreadParts] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const url = activeTab ? `/api/posts?status=${activeTab}` : '/api/posts'
    const data: Post[] = await fetch(url).then((r) => r.json())
    setPosts(data)
    setLoading(false)
  }, [activeTab])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/posts/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function deletePost(id: string) {
    if (!confirm('この投稿を削除しますか？')) return
    await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    load()
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    await fetch(`/api/posts/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: editContent,
        date: editDate,
        time: editTime,
        threadParts: editThreadParts.length > 0 ? JSON.stringify(editThreadParts) : null,
      }),
    })
    setSaving(false)
    setEditing(null)
    load()
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">投稿管理</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === t.value
                ? 'border-black text-black'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">読み込み中...</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-gray-400">投稿がありません</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {posts.map((p) => (
            <div key={p.id} className="p-4 flex items-start gap-3">
              <div className="text-xs text-gray-500 w-28 shrink-0 pt-0.5">
                {p.date}<br />{p.time}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">{p.category}</p>
                <p className="text-sm whitespace-pre-wrap">{p.content}</p>
                {p.views != null && (
                  <p className="text-xs text-gray-400 mt-1">
                    表示: {p.views} / いいね: {p.likes ?? 0} / 返信: {p.replies ?? 0}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[p.status]}`}>
                  {STATUS_LABEL[p.status]}
                </span>
                <div className="flex gap-1">
                  {p.status === 'pending_approval' && (
                    <>
                      <button
                        onClick={() => updateStatus(p.id, 'approved')}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => updateStatus(p.id, 'rejected')}
                        className="text-xs px-2 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                      >
                        却下
                      </button>
                    </>
                  )}
                  {p.status === 'failed' && (
                    <button
                      onClick={() => updateStatus(p.id, 'approved')}
                      className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      再試行
                    </button>
                  )}
                  <button
                    onClick={() => {
      setEditing(p)
      setEditContent(p.content)
      setEditDate(p.date)
      setEditTime(p.time)
      setEditThreadParts(p.threadParts ? JSON.parse(p.threadParts) as string[] : [])
    }}
                    className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => deletePost(p.id)}
                    className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>投稿を編集</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 overflow-y-auto max-h-[70vh] pr-1">
              <p className="text-xs text-gray-500">{editing.category}</p>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 flex-1"
                />
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="text-sm border border-gray-300 rounded px-2 py-1 w-28"
                />
              </div>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={8}
                className="text-sm"
              />
              <p className="text-xs text-gray-400 text-right">{editContent.length} 文字</p>

              {/* ツリー投稿パーツ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-600">ツリー投稿（返信チェーン）</p>
                  <button
                    onClick={() => setEditThreadParts((prev) => [...prev, ''])}
                    className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    + 追加
                  </button>
                </div>
                {editThreadParts.map((part, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-400">投稿 {i + 2}</p>
                      <button
                        onClick={() => setEditThreadParts((prev) => prev.filter((_, j) => j !== i))}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        削除
                      </button>
                    </div>
                    <Textarea
                      value={part}
                      onChange={(e) => setEditThreadParts((prev) => prev.map((p, j) => j === i ? e.target.value : p))}
                      rows={4}
                      className="text-sm"
                    />
                    <p className="text-xs text-gray-400 text-right">{part.length} 文字</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>キャンセル</Button>
                <Button onClick={saveEdit} disabled={saving}>
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function PostsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-gray-500">読み込み中...</p>}>
      <PostsContent />
    </Suspense>
  )
}
