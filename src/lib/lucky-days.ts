import kyurekiData from './kyureki-data.json'

/**
 * 吉日計算ライブラリ
 * 干支サイクル基準: 2023/1/1 = 壬子 = index 48
 */

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

const REF_DATE_STR = '2023-01-01'
const REF_IDX = 55 // 壬子

function toJSTDateStr(date: Date): string {
  return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}

export function getKanshi(date: Date) {
  const refMs = new Date(REF_DATE_STR).getTime()
  const targetMs = new Date(toJSTDateStr(date)).getTime()
  const days = Math.round((targetMs - refMs) / 86400000)
  const index = ((REF_IDX + days) % 60 + 60) % 60
  const stem = index % 10
  const branch = index % 12
  return { index, stem, branch, name: STEMS[stem] + BRANCHES[branch] }
}

// ── 一粒万倍日: 月ごとの対応地支 ──
const ICHIRYUU: Record<number, number[]> = {
  1: [1,6],
  2: [2,9],
  3: [0,3],
  4: [3,4],
  5: [5,6],
  6: [6,9],
  7: [0,7],
  8: [3,8],
  9: [6,9],
  10: [9,10],
  11: [11,0],
  12: [0,3],
}
const SEKKI_PARAMS: Record<number, [number, number]> = {
  1: [6.3811, 0.242778],
  2: [4.8693, 0.242713],
  3: [6.3968, 0.242512],
  4: [5.6280, 0.242231],
  5: [6.3771, 0.241945],
  6: [6.5733, 0.241731],
  7: [8.0091, 0.241642],
  8: [8.4102, 0.241703],
  9: [8.5186, 0.241898],
  10: [9.1414, 0.242179],
  11: [8.2396, 0.242469],
  12: [7.9152, 0.242689],
}

function getSekkiStartDay(year: number, month: number): number {
  const [d, a] = SEKKI_PARAMS[month]
  const y = month <= 2 ? year - 1 : year
  return Math.floor(d + a * (y - 1900) - Math.floor((y - 1900) / 4))
}

function getSekkiMonth(date: Date): number {
  const [year, month, day] = toJSTDateStr(date).split('-').map(Number)
  const startDay = getSekkiStartDay(year, month)
  const current = month === 1 ? 12 : month - 1
  const previous = current === 1 ? 12 : current - 1
  return day >= startDay ? current : previous
}
// ── 大明日: 60日サイクル中の23干支 ──
// 甲子(0),乙丑(1),丙寅(2),丁卯(3),戊辰(4),己巳(5),庚午(6),辛未(7),壬申(8),癸酉(9),
// 丙子(12),甲申(20),乙酉(21),甲午(30),乙未(31),丁酉(33),戊戌(34),己亥(35),庚子(36),壬寅(38),癸卯(39),丙午(42),丁未(43)
const DAIMYO = new Set([
  5,6,7,8,9,13,15,18,20,23,28,31,38,
  40,41,42,43,45,46,47,52,54,55,56,57
])

// ── 神吉日: 60日サイクル中の35干支 ──
// 大明日23日 + 追加12日（甲戌,乙亥,丙申,丁亥,戊午,己丑,庚寅,辛卯,壬辰,癸巳,甲辰,壬子）
const KAMIYOSHI = new Set([
  1,3,5,6,8,9,13,15,18,20,21,24,27,30,32,33,35,
  36,37,39,41,42,43,44,45,47,48,51,54,55,56,57,59
 ])
// ── 六曜（大安）: 日本の旧暦データから算出 ──
// 0=先勝 1=友引 2=先負 3=仏滅 4=大安 5=赤口

const DAY_MS = 24 * 60 * 60 * 1000

function isoToDayNumber(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS)
}

function dateToJstDayNumber(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value)
  const day = Number(parts.find((p) => p.type === 'day')?.value)

  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS)
}

function getRokuyo(date: Date): number {
  const targetDay = dateToJstDayNumber(date)
  const years = kyurekiData.years

  for (let i = 0; i < years.length; i++) {
    const yearInfo = years[i]
    const startDay = isoToDayNumber(yearInfo.start)
    const nextStartDay =
      i + 1 < years.length
        ? isoToDayNumber(years[i + 1].start)
        : Number.POSITIVE_INFINITY

    if (targetDay < startDay || targetDay >= nextStartDay) continue

    let remaining = targetDay - startDay

    for (let monthIndex = 0; monthIndex < yearInfo.sizeInfo.length; monthIndex++) {
      const monthDays = yearInfo.sizeInfo[monthIndex] === '1' ? 30 : 29

      if (remaining < monthDays) {
        const lunarDay = remaining + 1

        let lunarMonth: number

        if (yearInfo.leapMonth === -1) {
          lunarMonth = monthIndex + 1
        } else if (monthIndex <= yearInfo.leapMonth) {
          lunarMonth = monthIndex + 1
        } else if (monthIndex === yearInfo.leapMonth + 1) {
          lunarMonth = yearInfo.leapMonth + 1
        } else {
          lunarMonth = monthIndex
        }

        const raw = (lunarMonth + lunarDay) % 6
        return (raw + 4) % 6
      }

      remaining -= monthDays
    }
  }

  return -1
}

// ─────────────────────────────────────────

export type LuckyType =
  | '天赦日'
  | '一粒万倍日'
  | '大明日'
  | '神吉日'
  | '大安'
  | '己巳の日'
  | '甲子の日'
  | '寅の日'
  | '巳の日'
  | '辰の日'

export function getLuckyTypes(date: Date): LuckyType[] {
  const { index, branch } = getKanshi(date)
  const month = new Date(toJSTDateStr(date)).getMonth() + 1
  const sekkiMonth = getSekkiMonth(date)
  const types: LuckyType[] = []

  // ── 最強クラス ──

  // 天赦日（季節ごとに年6回前後）
  const isSpring = month >= 3 && month <= 5
  const isSummer = month >= 6 && month <= 8
  const isAutumn = month >= 9 && month <= 11
  if      (isSpring && index === 14) types.push('天赦日')   // 戊寅
  else if (isSummer && index === 30) types.push('天赦日')   // 甲午
  else if (isAutumn && index === 44) types.push('天赦日')   // 戊申
  else if (!isSpring && !isSummer && !isAutumn && index === 0) types.push('天赦日') // 甲子

  // 己巳の日（60日に1度・弁財天縁日）
  if (index === 5) types.push('己巳の日')

  // 甲子の日（60日に1度・新始動日）
  if (index === 0) types.push('甲子の日')

  // ── 吉日クラス ──

  // 一粒万倍日
  if ((ICHIRYUU[sekkiMonth] ?? []).includes(branch)) types.push('一粒万倍日')

  // 大安（六曜・近似）
  if (getRokuyo(date) === 4) types.push('大安')

  // 大明日
  if (DAIMYO.has(index)) types.push('大明日')

  // 神吉日
  if (KAMIYOSHI.has(index)) types.push('神吉日')

  // ── 縁起日クラス ──

  // 寅の日（12日に1度・金運拡大）
  if (branch === 2) types.push('寅の日')

  // 巳の日（12日に1度・弁財天縁日）
  if (branch === 5) types.push('巳の日')

  // 辰の日（12日に1度・龍神縁日）
  if (branch === 4) types.push('辰の日')

  return types
}

export type LuckyLevel = 'super' | 'great' | 'good' | 'normal' | 'none'

export function getLuckyLevel(types: LuckyType[]): LuckyLevel {
  if (types.includes('天赦日')) return 'super'
  if (
    types.includes('己巳の日') ||
    types.includes('甲子の日') ||
    (types.includes('一粒万倍日') && types.includes('大安'))
  ) return 'great'
  if (
    types.includes('一粒万倍日') ||
    types.includes('大安') ||
    types.includes('大明日')
  ) return 'good'
  if (types.length > 0) return 'normal'
  return 'none'
}

const DESCRIPTIONS: Record<LuckyType, string> = {
  '天赦日':    '年に数回の最強開運日。あらゆる行動・始動・お祓いに最吉',
  '己巳の日':  '60日に1度の弁財天最大縁日。金運・財運・縁分に最吉',
  '甲子の日':  '60日に1度の新始動吉日。夢の実現・事業開始に吉',
  '一粒万倍日':'種まきが万倍になる吉日。発信・新規スタート・申込みに最適',
  '大安':      '六曜最吉日。何事も成就しやすい縁起のよい日',
  '大明日':    '太陽が輝く如く明るい吉日。入籍・開業・契約・新規事業に吉',
  '神吉日':    '神様との縁が深まる日。神社参拝・祈願・感謝に最適',
  '寅の日':    '12日に1度の金運拡大日。投資・財布の新調・金銭行動に吉',
  '巳の日':    '12日に1度の弁財天縁日。金運・縁・芸術・知恵に吉',
  '辰の日':    '12日に1度の龍神縁日。上昇運・財運・龍神祈願に吉',
}

export function getLuckyDescription(types: LuckyType[]): string {
  return types.map((t) => DESCRIPTIONS[t]).join(' / ')
}

export function getLuckyInfo(date: Date) {
  const types = getLuckyTypes(date)
  const level = getLuckyLevel(types)
  const description = getLuckyDescription(types)
  const kanshi = getKanshi(date)
  return { types, level, description, kanshi: kanshi.name }
}
