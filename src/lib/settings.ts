import { ensureDb } from './db'
import { settings } from './schema'
import { eq } from 'drizzle-orm'

export type AppSettings = {
  // API credentials
  threadsAccessToken: string
  threadsUserId: string
  anthropicApiKey: string
  cronSecret: string
  // Profile (used in AI prompt)
  accountName: string
  businessDescription: string
  products: string
  achievements: string
  targetAudience: string
  postingStyle: string
  // Post settings
  categories: string         // JSON: string[]
  postTimes: string          // JSON: string[]
  // Usage tracking
  usageMonth: string         // YYYY-MM
  usageInputTokens: string   // cumulative input tokens this month
  usageOutputTokens: string  // cumulative output tokens this month
}

export const DEFAULT_SETTINGS: AppSettings = {
  threadsAccessToken: '',
  threadsUserId: '',
  anthropicApiKey: '',
  cronSecret: '',
  accountName: '',
  businessDescription: '占いスピリチュアルを使ったコンテンツ販売',
  products: '',
  achievements: '',
  targetAudience: '占いやスピリチュアルに興味があり、副業・独立を目指している方',
  postingStyle: '親しみやすい口調。絵文字は控えめに使う。',
  categories: JSON.stringify(['占いスピで稼ぐ方法','コンテンツ販売のノウハウ','Q&A・Tips','実績・事例','マインドセット']),
  postTimes: JSON.stringify(['07:00','10:00','12:00','15:00','18:00','20:00','22:00']),
  usageMonth: '',
  usageInputTokens: '0',
  usageOutputTokens: '0',
}

export async function getSettings(): Promise<AppSettings> {
  const db = await ensureDb()
  const rows = await db.select().from(settings)
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))

  return {
    threadsAccessToken: map.threadsAccessToken ?? process.env.THREADS_ACCESS_TOKEN ?? DEFAULT_SETTINGS.threadsAccessToken,
    threadsUserId: map.threadsUserId ?? process.env.THREADS_USER_ID ?? DEFAULT_SETTINGS.threadsUserId,
    anthropicApiKey: map.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? DEFAULT_SETTINGS.anthropicApiKey,
    cronSecret: map.cronSecret ?? process.env.CRON_SECRET ?? DEFAULT_SETTINGS.cronSecret,
    accountName: map.accountName ?? DEFAULT_SETTINGS.accountName,
    businessDescription: map.businessDescription ?? DEFAULT_SETTINGS.businessDescription,
    products: map.products ?? DEFAULT_SETTINGS.products,
    achievements: map.achievements ?? DEFAULT_SETTINGS.achievements,
    targetAudience: map.targetAudience ?? DEFAULT_SETTINGS.targetAudience,
    postingStyle: map.postingStyle ?? DEFAULT_SETTINGS.postingStyle,
    categories: map.categories ?? DEFAULT_SETTINGS.categories,
    postTimes: map.postTimes ?? DEFAULT_SETTINGS.postTimes,
    usageMonth: map.usageMonth ?? DEFAULT_SETTINGS.usageMonth,
    usageInputTokens: map.usageInputTokens ?? DEFAULT_SETTINGS.usageInputTokens,
    usageOutputTokens: map.usageOutputTokens ?? DEFAULT_SETTINGS.usageOutputTokens,
  }
}

export async function saveSetting(key: keyof AppSettings, value: string) {
  const db = await ensureDb()
  await db.insert(settings).values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
}

export async function saveSettings(patch: Partial<AppSettings>) {
  await Promise.all(
    (Object.entries(patch) as [keyof AppSettings, string][]).map(([k, v]) => saveSetting(k, v))
  )
}

export function isConfigured(s: AppSettings): boolean {
  return !!(s.threadsAccessToken && s.threadsUserId && s.anthropicApiKey)
}
