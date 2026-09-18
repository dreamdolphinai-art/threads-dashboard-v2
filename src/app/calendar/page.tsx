'use client'

import { useState, useEffect } from 'react'
import type { LuckyType } from '@/lib/lucky-days'

type DayInfo = {
  date: string
  types: LuckyType[]
  level: 'super' | 'great' | 'good' | 'normal' | 'none'
  description: string
  kanshi: string
}

const LEVEL_BG: Record<string, string> = {
  super:  'bg-red-50 border-red-300',
  great:  'bg-amber-50 border-amber-300',
  good:   'bg-green-50 border-green-300',
  normal: 'bg-sky-50 border-sky-200',
  none:   'bg-white border-gray-100',
}

const LEVEL_TEXT: Record<string, string> = {
  super:  'text-red-700',
  great:  'text-amber-700',
  good:   'text-green-700',
  normal: 'text-sky-700',
  none:   'text-gray-400',
}

// 吉日バッジの色分け
const BADGE_STYLE: Record<LuckyType, string> = {
  '天赦日':    'bg-red-100 text-red-700 font-bold',
  '己巳の日':  'bg-purple-100 text-purple-700 font-bold',
  '甲子の日':  'bg-violet-100 text-violet-700',
  '一粒万倍日':'bg-amber-100 text-amber-800',
  '大安':      'bg-green-100 text-green-700',
  '大明日':    'bg-teal-100 text-teal-700',
  '神吉日':    'bg-indigo-100 text-indigo-700',
  '寅の日':    'bg-orange-100 text-orange-700',
  '巳の日':    'bg-pink-100 text-pink-700',
  '辰の日':    'bg-cyan-100 text-cyan-700',
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const d = new Date(year, month, 1)
  while (d.getMonth() === month) {
    days.push(new Date(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [dayInfos, setDayInfos] = useState<Record<string, DayInfo>>({})
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<DayInfo | null>(null)

  const days = getDaysInMonth(year, month)

  useEffect(() => {
    setLoading(true)
    const dateStrs = days.map((d) => d.toISOString().split('T')[0])
    Promise.all(
      dateStrs.map((d) => fetch(`/api/lucky?date=${d}`).then((r) => r.json()) as Promise<DayInfo>)
    ).then((results) => {
      const map: Record<string, DayInfo> = {}
      results.forEach((r) => { map[r.date] = r })
      setDayInfos(map)
      setLoading(false)
    })
  }, [year, month]) // eslint-disable-line react-hooks/exhaustive-deps

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // カレンダーの先頭を日曜日に合わせるための空白
  const firstDow = days[0]?.getDay() ?? 0
  const blanks = Array.from({ length: firstDow })

  const luckyDays = Object.values(dayInfos).filter((d) => d.types.length > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">吉日カレンダー</h1>

      {/* ランク凡例 */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="text-gray-500 shrink-0">ランク:</span>
          {[
            { level: 'super',  label: '★★★ 最強' },
            { level: 'great',  label: '★★  大吉' },
            { level: 'good',   label: '★   吉' },
            { level: 'normal', label: '◎  縁起日' },
          ].map((r) => (
            <span key={r.level} className={`px-2 py-0.5 rounded border ${LEVEL_BG[r.level]} ${LEVEL_TEXT[r.level]}`}>
              {r.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {(Object.entries(BADGE_STYLE) as [LuckyType, string][]).map(([t, s]) => (
            <span key={t} className={`px-2 py-0.5 rounded ${s}`}>{t}</span>
          ))}
        </div>
        <p className="text-xs text-gray-400">※大安は近似値。重要な日は別途ご確認ください。</p>
      </div>

      {/* 月ナビ */}
      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">←</button>
        <span className="text-base font-semibold w-28 text-center">{year}年 {month + 1}月</span>
        <button onClick={nextMonth} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">→</button>
        <button
          onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}
          className="text-xs text-gray-500 underline ml-2"
        >
          今月
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`text-center text-xs py-2 font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        {loading ? (
          <div className="h-64 flex items-center justify-center text-sm text-gray-400">読み込み中...</div>
        ) : (
          <div className="grid grid-cols-7">
            {blanks.map((_, i) => <div key={`b${i}`} className="min-h-[80px] border-r border-b border-gray-100" />)}
            {days.map((d) => {
              const dateStr = d.toISOString().split('T')[0]
              const info = dayInfos[dateStr]
              const dow = d.getDay()
              const isToday = dateStr === now.toISOString().split('T')[0]

              return (
                <div
                  key={dateStr}
                  onClick={() => info && setSelected(info)}
                  className={`min-h-[80px] p-1.5 border-r border-b border-gray-100 cursor-pointer hover:opacity-80 transition-opacity
                    ${info ? LEVEL_BG[info.level] : 'bg-white'}
                    ${info?.types.length ? 'border-l-2' : ''}
                    ${info?.level === 'super' ? 'border-l-red-400' : info?.level === 'great' ? 'border-l-amber-400' : info?.level === 'good' ? 'border-l-green-400' : ''}
                  `}
                >
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'bg-black text-white rounded-full w-5 h-5 flex items-center justify-center' : dow === 0 ? 'text-red-500' : dow === 6 ? 'text-blue-500' : 'text-gray-700'}`}>
                    {d.getDate()}
                  </div>
                  <div className="flex flex-wrap gap-0.5">
                    {info?.types.map((t) => (
                      <span key={t} className={`text-[9px] px-1 rounded ${BADGE_STYLE[t]}`}>{t}</span>
                    ))}
                  </div>
                  {info && info.types.length === 0 && (
                    <p className="text-[9px] text-gray-300">{info.kanshi}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 今月の吉日まとめ */}
      {luckyDays.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">{month + 1}月の吉日まとめ</h2>
          <div className="space-y-2">
            {luckyDays.map((d) => (
              <div
                key={d.date}
                onClick={() => setSelected(d)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:opacity-80 ${LEVEL_BG[d.level]}`}
              >
                <div className="w-20 shrink-0">
                  <p className={`text-sm font-bold ${LEVEL_TEXT[d.level]}`}>
                    {new Date(d.date).getDate()}日（{WEEKDAYS[new Date(d.date).getDay()]}）
                  </p>
                  <p className="text-xs text-gray-400">{d.kanshi}</p>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-1 mb-1">
                    {d.types.map((t) => (
                      <span key={t} className={`text-xs px-2 py-0.5 rounded ${BADGE_STYLE[t]}`}>{t}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600">{d.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 詳細ポップアップ */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl p-5 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-1">{selected.date}</h3>
            <p className="text-xs text-gray-400 mb-3">干支: {selected.kanshi}</p>
            {selected.types.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selected.types.map((t) => (
                    <span key={t} className={`text-sm px-3 py-1 rounded-full ${BADGE_STYLE[t]}`}>{t}</span>
                  ))}
                </div>
                <p className="text-sm text-gray-700">{selected.description}</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">通常の日です</p>
            )}
            <button
              onClick={() => setSelected(null)}
              className="mt-4 w-full text-sm py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
