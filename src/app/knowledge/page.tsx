'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'

type KnowledgeFile = { name: string; size: number; updatedAt: string }

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function KnowledgePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function load() {
    const data: KnowledgeFile[] = await fetch('/api/knowledge').then((r) => r.json())
    setFiles(data)
  }

  useEffect(() => { load() }, [])

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/knowledge', { method: 'POST', body: form })
    if (!res.ok) {
      const j = await res.json() as { error: string }
      setError(j.error)
    } else {
      await load()
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function remove(name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return
    await fetch('/api/knowledge', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    load()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">ナレッジ管理</h1>
        <p className="text-sm text-gray-500 mt-1">
          アップロードしたファイルは AI 投稿生成の参考資料として使用されます。
          対応形式: txt / md / csv / pdf
        </p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label
          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={async (e) => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (!file) return
            setUploading(true)
            setError('')
            const form = new FormData()
            form.append('file', file)
            const res = await fetch('/api/knowledge', { method: 'POST', body: form })
            if (!res.ok) {
              const j = await res.json() as { error: string }
              setError(j.error)
            } else {
              await load()
            }
            setUploading(false)
          }}
        >
          <p className="text-sm text-gray-500">
            {uploading ? 'アップロード中...' : 'クリックまたはドラッグ&ドロップでファイルを追加'}
          </p>
          <p className="text-xs text-gray-400 mt-1">txt, md, csv, pdf</p>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.csv,.pdf"
            onChange={upload}
            disabled={uploading}
          />
        </label>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <p className="text-sm text-gray-400">ファイルがありません</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
          {files.map((f) => (
            <div key={f.name} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-xs text-gray-400">
                  {formatSize(f.size)} · {new Date(f.updatedAt).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <button
                onClick={() => remove(f.name)}
                className="text-xs text-red-500 hover:text-red-700 shrink-0"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        ヒント: 自分の過去の投稿、バズった他アカウントの投稿、マーケティング教材などを入れると生成品質が上がります。
      </div>
    </div>
  )
}
