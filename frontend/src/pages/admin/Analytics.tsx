import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { PageLoader } from '@/components/ui/loading-spinner'
import { formatCurrency, getMonthName } from '@/lib/utils'
import { TrendingUp, Users, Droplets, IndianRupee } from 'lucide-react'
import api from '@/lib/api'

const subDays = (date: Date, days: number) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
const subMonths = (date: Date, months: number) => {
  const d = new Date(date)
  d.setMonth(d.getMonth() - months)
  return d
}

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']

export default function Analytics() {
  const [range, setRange] = useState('30')

  const startDate = range === '7' ? subDays(new Date(), 7)
    : range === '30' ? subDays(new Date(), 30)
    : subMonths(new Date(), 3)

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', range],
    queryFn: () => api.get('/api/reports/analytics', {
      params: { startDate: startDate.toISOString(), endDate: new Date().toISOString() }
    }).then(r => r.data.data),
  })

  const { data: dashData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/admin/dashboard').then(r => r.data.data),
  })

  const { data: outstanding } = useQuery({
    queryKey: ['outstanding'],
    queryFn: () => api.get('/api/reports/outstanding').then(r => r.data.data),
  })

  if (isLoading) return <PageLoader />

  const milkDist = [
    { name: 'गाय (Cow)', value: data?.milkTypeDistribution?.cow || 0 },
    { name: 'भैंस (Buffalo)', value: data?.milkTypeDistribution?.buffalo || 0 },
    { name: 'मिश्रित', value: data?.milkTypeDistribution?.mixed || 0 },
  ].filter(d => d.value > 0)

  const revenueTrend = (data?.monthlyRevenueTrend || []).map((r: any) => ({
    name: r.month,
    revenue: r.revenue,
    collected: r.collected,
  }))

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics & Reports</h1>
          <p className="text-sm text-gray-500">बिज़नेस की पूरी जानकारी</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[{ v: '7', l: '7D' }, { v: '30', l: '30D' }, { v: '90', l: '3M' }].map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${range === r.v ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}>
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard title="कुल ग्राहक" value={dashData?.totalCustomers || 0} icon={<Users className="w-5 h-5" />} color="green" />
        <StatCard title="मासिक आमदनी" value={dashData?.monthlyRevenue || 0} prefix="₹" icon={<IndianRupee className="w-5 h-5" />} color="purple" />
        <StatCard title="कुल बकाया" value={dashData?.totalOutstanding || 0} prefix="₹" icon={<TrendingUp className="w-5 h-5" />} color="amber" />
        <StatCard title="आज का दूध" value={dashData?.todayMilkTotal || 0} suffix="L" icon={<Droplets className="w-5 h-5" />} color="blue" />
      </div>

      {/* Daily Milk Trend */}
      {data?.dailyMilkTrend?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>दैनिक दूध (लीटर)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.dailyMilkTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: any) => [`${v} L`]} />
                <Line type="monotone" dataKey="morning" stroke="#f59e0b" name="सुबह" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="evening" stroke="#818cf8" name="शाम" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="total" stroke="#10b981" name="कुल" strokeWidth={2.5} dot={{ r: 2 }} />
                <Legend iconType="circle" iconSize={8} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Revenue vs Collection */}
        {revenueTrend.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Revenue vs Collection</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: any) => [`₹${v.toLocaleString('en-IN')}`]} />
                  <Bar dataKey="revenue" fill="#10b981" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" fill="#34d399" name="Collected" radius={[4, 4, 0, 0]} />
                  <Legend iconType="circle" iconSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Milk Type Distribution */}
        {milkDist.length > 0 && (
          <Card>
            <CardHeader><CardTitle>दूध प्रकार वितरण</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={milkDist} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {milkDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v.toFixed(1)} L`]} />
                  <Legend iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Customers */}
      {data?.topCustomers?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top Customers (by milk)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.topCustomers.slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="fullName" type="category" tick={{ fontSize: 10 }} width={80} />
                <Tooltip formatter={(v: any) => [`${v.toFixed(1)} L`]} />
                <Bar dataKey="totalQuantity" fill="#10b981" radius={[0, 4, 4, 0]} name="दूध" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Outstanding Customers */}
      {outstanding?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>बकाया ग्राहक सूची</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {outstanding.map((c: any) => (
                <div key={c._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.fullName}</p>
                    <p className="text-xs text-gray-400">{c.customerId} · {c.village}</p>
                  </div>
                  <span className="text-sm font-bold text-red-500">₹{c.currentBalance.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
