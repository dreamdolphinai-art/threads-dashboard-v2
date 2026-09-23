import { getSettings } from './settings'

const BASE = 'https://graph.threads.net/v1.0'

async function createAndPublish(userId: string, token: string, text: string, replyToId?: string): Promise<string> {
   userId = userId.trim()
  token = token.trim()
  
  const body: Record<string, string> = { media_type: 'TEXT', text, access_token: token }
  if (replyToId) body.reply_to_id = replyToId

  const createRes = await fetch(`${BASE}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const { id: creationId, error: ce } = await createRes.json() as { id: string; error?: unknown }
  if (ce) throw new Error(`Threads create: ${JSON.stringify(ce)}`)
   
// Threads側で投稿コンテナの準備ができるまで待つ
await new Promise((resolve) => setTimeout(resolve, 30000))
   
  const publishRes = await fetch(`${BASE}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: creationId, access_token: token }),
  })
  const { id: postId, error: pe } = await publishRes.json() as { id: string; error?: unknown }
  if (pe) throw new Error(`Threads publish: ${JSON.stringify(pe)}`)

  return postId
}

export async function publishPost(text: string): Promise<string> {
  const s = await getSettings()
  return createAndPublish(s.threadsUserId, s.threadsAccessToken, text)
}

export async function publishThread(parts: string[]): Promise<string> {
  if (parts.length <= 1) return publishPost(parts[0])
  const s = await getSettings()
  const { threadsUserId: userId, threadsAccessToken: token } = s
  let prevId = await createAndPublish(userId, token, parts[0])
  const firstId = prevId
  for (const part of parts.slice(1)) {
    prevId = await createAndPublish(userId, token, part, prevId)
  }
  return firstId
}

export async function getInsights(postId: string) {
  const { threadsAccessToken: token } = await getSettings()
  const url = `${BASE}/${postId}/insights?metric=likes,replies,views&access_token=${token}`
  const res = await fetch(url)
  const data = await res.json() as { data?: Array<{ name: string; values: Array<{ value: number }> }> }
  const get = (name: string) => data.data?.find((m) => m.name === name)?.values?.[0]?.value ?? 0
  return { likes: get('likes'), replies: get('replies'), views: get('views') }
}

export async function getFollowerCount(): Promise<number> {
  const { threadsUserId: userId, threadsAccessToken: token } = await getSettings()
  const url = `${BASE}/${userId}?fields=followers_count&access_token=${token}`
  const res = await fetch(url)
  const data = await res.json() as { followers_count?: number }
  return data.followers_count ?? 0
}
