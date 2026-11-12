import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Droplets, TrendingUp, AlertCircle, Milk, Moon, Sun, ArrowRight, FlaskConical, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatQuantity, formatDate } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

async function fetchDashboard() {
  // Render may need time to wake the API after a period with no traffic.
  const res = await api.get('/api/admin/dashboard', { timeout: 60000 })
  return res.data.data
}

async function fetchAnalytics() {
  const start = new Date(); start.setDate(start.getDate() - 7)
  const res = await api.get('/api/reports/analytics', {
    params: { startDate: start.toISOString(), endDate: new Date().toISOString() }
  })
  return res.data.data
}

async function fetchProcurementToday() {
  const date = new Date()
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const collections = await api.get('/api/milk-procurement', { params: { date: today, limit: 1 } })
  return { summary: collections.data.pagination?.summary || {} }
}

export default function Dashboard() {
  const { dairy, user } = useAuth()
  const [showingLoadHint, setShowingLoadHint] = useState(false)

  const { data: dash, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60000,
    retry: 0,
  })

  useEffect(() => {
    if (!isLoading) { setShowingLoadHint(false); return }
    const timer = window.setTimeout(() => setShowingLoadHint(true), 8000)
    return () => window.clearTimeout(timer)
  }, [isLoading])

  const { data: analytics } = useQuery({
    queryKey: ['analytics-7d'],
    queryFn: fetchAnalytics,
  })
  const { data: procurement } = useQuery({
    queryKey: ['procurement-dashboard-today'],
    queryFn: fetchProcurementToday,
    refetchInterval: 60000,
  })

  if (isLoading) return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-5 text-center">
      <LoadingSpinner size="lg" />
      <p className="mt-3 text-sm font-medium text-slate-600">Dashboard लोड हो रहा है…</p>
      <p className="mt-1 max-w-sm text-xs text-slate-400">{showingLoadHint ? 'Server कुछ समय से बंद था तो उसे शुरू होने में एक मिनट लग सकता है। कृपया यह पेज खुला रखें।' : 'आपका आज का सारांश तैयार हो रहा है।'}</p>
    </div>
  )

  if (isError && !dash) return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center px-5 text-center">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600"><RefreshCw className="h-5 w-5" /></div>
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Dashboard अभी लोड नहीं हुआ</h1>
        <p className="mt-2 text-sm text-slate-500">Internet check करें और दोबारा कोशिश करें। Server को शुरू होने में समय लगा हो सकता है।</p>
        <Button className="mt-5" loading={isFetching} onClick={() => refetch()}><RefreshCw className="h-4 w-4" /> फिर कोशिश करें</Button>
      </div>
    </div>
  )

  const milkTrend = analytics?.dailyMilkTrend?.slice(-7) || []

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            नमस्ते, {dairy?.ownerName?.split(' ')[0] || user?.username} जी! 🙏
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{dairy?.dairyName} · आज का सारांश</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString('hi-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard title="आज का दूध संग्रह" value={Number(procurement?.summary?.acceptedLitres || 0)} suffix="L" icon={<FlaskConical className="w-5 h-5" />} color="green" subtitle={`${Number(procurement?.summary?.rejectedLitres || 0).toFixed(1)} L rejected`} />
        <StatCard title="आज किसान देय" value={Number(procurement?.summary?.payable || 0)} prefix="₹" icon={<TrendingUp className="w-5 h-5" />} color="purple" subtitle="Accepted collections" />
        <StatCard title="Active customers" value={dash?.activeCustomers || 0} icon={<Users className="w-5 h-5" />} color="blue" subtitle="Registered milk suppliers" />
        <StatCard title="कुल ग्राहक" value={dash?.totalCustomers || 0} icon={<Users className="w-5 h-5" />} color="green" subtitle={`${dash?.activeCustomers || 0} active`} />
        <StatCard title="Customer supply" value={dash?.todayMilkTotal || 0} suffix="L" icon={<Droplets className="w-5 h-5" />} color="blue" subtitle={`☀️ ${(dash?.morningTotal||0).toFixed(1)}L  🌙 ${(dash?.eveningTotal||0).toFixed(1)}L`} />
        <StatCard title="Monthly sales" value={dash?.monthlyRevenue || 0} prefix="₹" icon={<AlertCircle className="w-5 h-5" />} color="amber" subtitle={`Outstanding ₹${(dash?.totalOutstanding || 0).toLocaleString('en-IN')}`} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { to: '/admin/milk-entry', icon: Milk, label: 'दूध एंट्री', color: 'bg-brand-500' },
          { to: '/admin/customers', icon: Users, label: 'ग्राहक जोड़ें', color: 'bg-blue-500' },
          { to: '/admin/payments', icon: TrendingUp, label: 'भुगतान दर्ज', color: 'bg-purple-500' },
        ].map((item) => (
          <Link key={item.to} to={item.to}>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className={`${item.color} rounded-2xl p-4 text-white text-center shadow-sm`}>
              <item.icon className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs font-semibold">{item.label}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      {/* Milk Trend Chart */}
      {milkTrend.length > 0 && (
        <Card>
          <CardHeader><CardTitle>दूध की प्रवृत्ति (पिछले 7 दिन)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={milkTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${v} L`]} />
                <Line type="monotone" dataKey="morning" stroke="#34d399" name="सुबह" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="evening" stroke="#818cf8" name="शाम" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total" stroke="#10b981" name="कुल" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top Debtors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>बकाया ग्राहक</CardTitle>
              <Link to="/admin/customers" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                सभी देखें <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!dash?.topDebtors?.length ? (
              <p className="text-sm text-gray-400 text-center py-4">🎉 कोई बकाया नहीं!</p>
            ) : (
              dash.topDebtors.map((c: any) => (
                <Link key={c._id} to={`/admin/customers/${c._id}`}>
                  <div className="flex items-center justify-between py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-xs font-bold">
                        {c.fullName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{c.fullName}</p>
                        <p className="text-xs text-gray-400">{c.customerId}</p>
                      </div>
                    </div>
                    <Badge variant="danger">₹{c.currentBalance.toLocaleString('en-IN')}</Badge>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Entries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>हाल की एंट्री</CardTitle>
              <Link to="/admin/milk-entry" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                एंट्री करें <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {!dash?.recentEntries?.length ? (
              <EmptyState title="कोई एंट्री नहीं" description="आज की दूध एंट्री शुरू करें" action={{ label: 'एंट्री करें', onClick: () => {} }} />
            ) : (
              dash.recentEntries.map((r: any) => (
                <div key={r._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                      <Milk className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{(r.customerId as any)?.fullName || '—'}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-700">{formatQuantity(r.totalQty)}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(r.amount)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
