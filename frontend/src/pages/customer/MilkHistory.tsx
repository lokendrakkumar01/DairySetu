import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Sun, Moon, Droplets, CalendarDays } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { PageLoader } from '@/components/ui/loading-spinner'

const MONTHS = [
  'जनवरी','फ़रवरी','मार्च','अप्रैल','मई','जून',
  'जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर',
]
const DAYS = ['रवि','सोम','मंगल','बुध','गुरु','शुक्र','शनि']

export default function MilkHistory() {
  const { user } = useAuth()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [view, setView] = useState<'calendar' | 'table'>('calendar')

  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: records, isLoading } = useQuery({
    queryKey: ['milk-history', user?.customerId, month, year],
    queryFn: async () => {
      const res = await api.get(
        `/milk-records?customerId=${user?.customerId}&startDate=${startDate}&endDate=${endDate}&limit=31`
      )
      return res.data.data?.records || []
    },
    enabled: !!user?.customerId,
  })

  const goBack = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const goForward = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  if (isLoading) return <PageLoader />

  const recordMap: Record<number, any> = {}
  ;(records || []).forEach((r: any) => {
    const day = new Date(r.date).getDate()
    recordMap[day] = r
  })

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const totalMorning = (records || []).reduce((s: number, r: any) => s + (r.morning || 0), 0)
  const totalEvening = (records || []).reduce((s: number, r: any) => s + (r.evening || 0), 0)
  const totalQty = totalMorning + totalEvening
  const totalAmt = (records || []).reduce(
    (s: number, r: any) => s + ((r.morning || 0) + (r.evening || 0)) * (r.rate || 0),
    0
  )

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">दूध इतिहास</h1>
          <p className="text-xs text-gray-500">Milk History</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              view === 'calendar' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            📅 कैलेंडर
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              view === 'table' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            📋 तालिका
          </button>
        </div>
      </div>

      {/* Month Selector */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <button
            onClick={goBack}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-xl font-bold">{MONTHS[month - 1]}</p>
            <p className="text-emerald-200 text-sm">{year}</p>
          </div>
          <button
            onClick={goForward}
            className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            disabled={month === now.getMonth() + 1 && year === now.getFullYear()}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <Droplets className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-800">{totalQty.toFixed(1)}L</p>
          <p className="text-xs text-gray-500">कुल दूध</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <Sun className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-800">{totalMorning.toFixed(1)}L</p>
          <p className="text-xs text-gray-500">सुबह</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <Moon className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-800">{totalEvening.toFixed(1)}L</p>
          <p className="text-xs text-gray-500">शाम</p>
        </div>
      </div>

      {view === 'calendar' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                {d}
              </div>
            ))}
          </div>
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const rec = recordMap[day]
              const total = rec ? (rec.morning || 0) + (rec.evening || 0) : 0
              const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()
              return (
                <div
                  key={day}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center transition-colors ${
                    isToday
                      ? 'bg-emerald-600 text-white'
                      : rec
                      ? 'bg-emerald-50 border border-emerald-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <span
                    className={`text-xs font-bold ${
                      isToday ? 'text-white' : rec ? 'text-emerald-800' : 'text-gray-400'
                    }`}
                  >
                    {day}
                  </span>
                  {rec && (
                    <span
                      className={`text-[9px] font-medium mt-0.5 ${
                        isToday ? 'text-emerald-100' : 'text-emerald-600'
                      }`}
                    >
                      {total}L
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {/* Legend */}
          <div className="flex gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200" />
              <span className="text-xs text-gray-500">दूध था</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-50" />
              <span className="text-xs text-gray-500">कोई एंट्री नहीं</span>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="bg-emerald-50 px-4 py-2 grid grid-cols-5 text-xs font-semibold text-emerald-700 border-b border-emerald-100">
            <span>दिनांक</span>
            <span className="text-center">सुबह</span>
            <span className="text-center">शाम</span>
            <span className="text-center">कुल</span>
            <span className="text-right">राशि</span>
          </div>
          <div className="divide-y divide-gray-50">
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const rec = recordMap[day]
              const total = rec ? (rec.morning || 0) + (rec.evening || 0) : 0
              const amt = rec ? total * (rec.rate || 0) : 0
              const date = new Date(year, month - 1, day)
              if (!rec) return null
              return (
                <div key={day} className="px-4 py-2.5 grid grid-cols-5 text-sm items-center">
                  <div>
                    <p className="font-medium text-gray-800 text-xs">{day}</p>
                    <p className="text-xs text-gray-400">
                      {date.toLocaleDateString('hi-IN', { weekday: 'short' })}
                    </p>
                  </div>
                  <span className="text-center text-amber-600 text-xs font-medium">
                    {rec.morning || 0}L
                  </span>
                  <span className="text-center text-indigo-600 text-xs font-medium">
                    {rec.evening || 0}L
                  </span>
                  <span className="text-center font-semibold text-gray-800 text-xs">
                    {total}L
                  </span>
                  <span className="text-right text-emerald-600 text-xs font-medium">
                    {formatCurrency(amt)}
                  </span>
                </div>
              )
            }).filter(Boolean)}
            {records?.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>इस महीने कोई एंट्री नहीं</p>
                <p className="text-xs mt-1">No entries this month</p>
              </div>
            )}
          </div>
          {totalQty > 0 && (
            <div className="bg-emerald-50 px-4 py-2.5 grid grid-cols-5 text-xs font-bold text-emerald-800 border-t border-emerald-100">
              <span>कुल</span>
              <span className="text-center">{totalMorning.toFixed(1)}L</span>
              <span className="text-center">{totalEvening.toFixed(1)}L</span>
              <span className="text-center">{totalQty.toFixed(1)}L</span>
              <span className="text-right">{formatCurrency(totalAmt)}</span>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
