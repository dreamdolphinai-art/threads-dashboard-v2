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
  1:[1,2], 2:[4,5], 3:[7,8], 4:[10,11],
  5:[1,2], 6:[4,5], 7:[7,8], 8:[10,11],
  9:[1,2], 10:[4,5], 11:[7,8], 12:[10,11],
}

// ── 大明日: 60日サイクル中の23干支 ──
// 甲子(0),乙丑(1),丙寅(2),丁卯(3),戊辰(4),己巳(5),庚午(6),辛未(7),壬申(8),癸酉(9),
// 丙子(12),甲申(20),乙酉(21),甲午(30),乙未(31),丁酉(33),戊戌(34),己亥(35),庚子(36),壬寅(38),癸卯(39),丙午(42),丁未(43)
const DAIMYO = new Set([0,1,2,3,4,5,6,7,8,9,12,20,21,30,31,33,34,35,36,38,39,42,43])

// ── 神吉日: 60日サイクル中の35干支 ──
// 大明日23日 + 追加12日（甲戌,乙亥,丙申,丁亥,戊午,己丑,庚寅,辛卯,壬辰,癸巳,甲辰,壬子）
const KAMIYOSHI = new Set([
  ...DAIMYO,
  10, // 甲戌
  11, // 乙亥
  25, // 己丑
  26, // 庚寅
  27, // 辛卯
  28, // 壬辰
  29, // 癸巳
  32, // 丙申
  40, // 甲辰
  48, // 壬子
  50, // 甲寅
  54, // 戊午
])

// ── 六曜（大安）: 旧暦ベースの近似計算 ──
// 年ごとの補正オフセット（1/1の六曜インデックスから逆算）
// 0=先勝 1=友引 2=先負 3=仏滅 4=大安 5=赤口
const ROKUYO_OFFSETS: Record<number, number> = {
  2024: 5, // 2024/1/1 ≈ 友引
  2025: 2, // 2025/1/1 ≈ 大安
  2026: 5, // 2026/1/1 推定
  2027: 2, // 2027/1/1 推定
}

function getRokuyo(date: Date): number {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const offset = ROKUYO_OFFSETS[year] ?? 0
  return (month + day + offset) % 6
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
  if ((ICHIRYUU[month] ?? []).includes(branch)) types.push('一粒万倍日')

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
