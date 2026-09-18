import { NextResponse } from 'next/server'
import { callClaude } from '@/lib/claude'
import { ensureDb } from '@/lib/db'
import { posts } from '@/lib/schema'
import { newId } from '@/lib/ids'
import { getSettings } from '@/lib/settings'

export async function POST(req: Request) {
  const body = await req.json() as {
    competitorPost: string
    date: string
    time: string
    category: string
  }

  const s = await getSettings()

  const system = `
あなたは日本のSNSマーケティングに精通したThreadsライターです。
競合の投稿を参考に、以下のプロフィールの発信者スタイルでリライトします。

=== 発信者プロフィール ===
名前: ${s.accountName || '（未設定）'}
ビジネス概要: ${s.businessDescription}
商品・サービス: ${s.products || '（未設定）'}
実績・数字: ${s.achievements || '（未設定）'}
ターゲット読者: ${s.targetAudience}
投稿スタイル: ${s.postingStyle}

ルール:
- 文字数: 150〜400文字
- 元の投稿の構成・フック・価値観は参考にしつつ、発信者の言葉・実績・スタイルに置き換える
- パクリではなく「インスピレーションを得たオリジナル」にする
- 最終行に行動促進（フォロー・保存・コメントのいずれか1つ）
- 禁止: 根拠なき「絶対」「必ず」「100%」「保証」
- 本文のみ出力（説明・コメント不要）
`.trim()

  const prompt = `以下の投稿をリライトしてください:\n\n${body.competitorPost}`

  const content = await callClaude(system, prompt)

  const db = await ensureDb()
  const post = {
    id: newId(),
    date: body.date,
    time: body.time,
    category: body.category,
    content: content.trim(),
    status: 'pending_approval' as const,
  }
  await db.insert(posts).values(post)

  return NextResponse.json(post, { status: 201 })
}
