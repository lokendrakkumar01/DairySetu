import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Droplets,
  IndianRupee,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Milk,
  Sun,
  Moon,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { formatCurrency, formatQuantity } from '@/lib/utils'
import { PageLoader } from '@/components/ui/loading-spinner'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4 },
  }),
}

export default function CustomerDashboard() {
  const { user } = useAuth()
  const now = new Date()
  const [month] = useState(now.getMonth() + 1)
  const [year] = useState(now.getFullYear())

  const { data: statement, isLoading: stmtLoading } = useQuery({
    queryKey: ['customer-statement', user?.customerId, month, year],
    queryFn: async () => {
      const res = await api.get(
        `/customers/${user?.customerId}/statement?month=${month}&year=${year}`
      )
      return res.data.data
    },
    enabled: !!user?.customerId,
  })

  const { data: recentRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['customer-recent-records', user?.customerId],
    queryFn: async () => {
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]
      const res = await api.get(
        `/milk-records?customerId=${user?.customerId}&startDate=${startDate}&endDate=${endDate}&limit=31`
      )
      return res.data.data?.records || []
    },
    enabled: !!user?.customerId,
  })

  if (stmtLoading || recordsLoading) return <PageLoader />

  const stats = statement || {}
  const records = recentRecords || []

  // Build daily chart data
  const daysInMonth = new Date(year, month, 0).getDate()
  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1
    const record = records.find((r: any) => new Date(r.date).getDate() === day)
    return {
      day: day.toString(),
      morning: record?.morning || 0,
      evening: record?.evening || 0,
      total: record ? (record.morning || 0) + (record.evening || 0) : 0,
    }
  })

  const monthNames = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ]

  const kpis = [
    {
      label: 'कुल दूध',
      sublabel: 'Total Milk',
      value: formatQuantity(stats.totalQuantity || 0),
      icon: Droplets,
      color: 'from-emerald-500 to-teal-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'बिल राशि',
      sublabel: 'Bill Amount',
      value: formatCurrency(stats.milkCharges || 0),
      icon: IndianRupee,
      color: 'from-blue-500 to-indigo-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'भुगतान',
      sublabel: 'Paid',
      value: formatCurrency(stats.payments || 0),
      icon: CheckCircle2,
      color: 'from-green-500 to-emerald-600',
      bg: 'bg-green-50',
    },
    {
      label: 'बकाया',
      sublabel: 'Pending Balance',
      value: formatCurrency(stats.finalBalance || 0),
      icon: Clock,
      color: 'from-orange-500 to-red-500',
      bg: 'bg-orange-50',
    },
  ]

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 text-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Milk className="w-6 h-6" />
          </div>
          <div>
            <p className="text-emerald-100 text-sm">नमस्ते 🙏</p>
            <h1 className="text-xl font-bold">{user?.name || 'Customer'}</h1>
            <p className="text-emerald-200 text-xs mt-0.5">{monthNames[month - 1]} {year}</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs text-gray-500">{kpi.sublabel}</p>
            <p className="text-xs text-gray-400 font-medium">{kpi.label}</p>
            <p className="text-lg font-bold text-gray-800 mt-1">{kpi.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Morning / Evening breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
      >
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Milk className="w-4 h-4 text-emerald-500" />
          दूध विवरण — Milk Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
            <Sun className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-xs text-amber-600 font-medium">सुबह / Morning</p>
              <p className="text-lg font-bold text-amber-700">
                {formatQuantity(stats.morningQuantity || 0)}
              </p>
            </div>
          </div>
          <div className="bg-indigo-50 rounded-xl p-3 flex items-center gap-3">
            <Moon className="w-8 h-8 text-indigo-500" />
            <div>
              <p className="text-xs text-indigo-600 font-medium">शाम / Evening</p>
              <p className="text-lg font-bold text-indigo-700">
                {formatQuantity(stats.eveningQuantity || 0)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Daily Chart */}
      {chartData.some((d) => d.total > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            दैनिक दूध — Daily Chart
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 9, fill: '#9ca3af' }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                formatter={(v: number) => [`${v} L`, '']}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="morning" fill="#f59e0b" radius={[2, 2, 0, 0]} name="सुबह" />
              <Bar dataKey="evening" fill="#6366f1" radius={[2, 2, 0, 0]} name="शाम" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Recent Entries */}
      {records.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
        >
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-500" />
            हाल की एंट्री — Recent Entries
          </h3>
          <div className="space-y-2">
            {records
              .slice(-7)
              .reverse()
              .map((r: any) => {
                const d = new Date(r.date)
                const total = (r.morning || 0) + (r.evening || 0)
                return (
                  <div
                    key={r._id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                        <span className="text-xs font-bold text-emerald-700">
                          {d.getDate()}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-800 font-medium">
                          {d.toLocaleDateString('hi-IN', { weekday: 'short' })}
                        </p>
                        <p className="text-xs text-gray-400">
                          <span className="text-amber-500">☀ {r.morning || 0}L</span>
                          {' · '}
                          <span className="text-indigo-500">🌙 {r.evening || 0}L</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{total} L</p>
                      <p className="text-xs text-emerald-600">
                        {formatCurrency(total * (r.rate || 0))}
                      </p>
                    </div>
                  </div>
                )
              })}
          </div>
        </motion.div>
      )}
    </div>
  )
}
