import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Search, Sun, Moon, Save, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatQuantity, formatDate } from '@/lib/utils'
import { format } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

function today() { return format(new Date(), 'yyyy-MM-dd') }

async function fetchCustomers() {
  const res = await api.get('/api/customers', { params: { status: 'active', limit: 100 } })
  return res.data.data || []
}

async function fetchRates() {
  const res = await api.get('/api/milk-rates')
  return res.data.data || []
}

async function fetchTodayRecords(date: string) {
  const res = await api.get('/api/milk-records', { params: { date, limit: 200 } })
  return res.data.data || []
}

export default function MilkEntry() {
  const qc = useQueryClient()
  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [morningQty, setMorningQty] = useState('')
  const [eveningQty, setEveningQty] = useState('')
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'quick' | 'bulk'>('quick')

  const { data: customers = [] } = useQuery({ queryKey: ['customers-active'], queryFn: fetchCustomers })
  const { data: rates = [] } = useQuery({ queryKey: ['rates'], queryFn: fetchRates })
  const { data: todayRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['milk-records', selectedDate],
    queryFn: () => fetchTodayRecords(selectedDate),
  })

  const [bulkEntries, setBulkEntries] = useState<Record<string, { morning: string; evening: string }>>({})

  const getRate = useCallback((customer: any) => {
    if (!customer) return 0
    const r = rates.find((r: any) => r.milkType === customer.milkType && !r.customerId)
    return r?.ratePerLitre || 0
  }, [rates])

  const getExistingRecord = useCallback((customerId: string) => {
    return todayRecords.find((r: any) => {
      const cid = typeof r.customerId === 'object' ? r.customerId._id : r.customerId
      return cid === customerId
    })
  }, [todayRecords])

  useEffect(() => {
    if (selectedCustomer) {
      const rec = getExistingRecord(selectedCustomer._id)
      if (rec) {
        setMorningQty(rec.morningQty.toString())
        setEveningQty(rec.eveningQty.toString())
      } else {
        setMorningQty(selectedCustomer.defaultMorningQty?.toString() || '0')
        setEveningQty(selectedCustomer.defaultEveningQty?.toString() || '0')
      }
    }
  }, [selectedCustomer, todayRecords, getExistingRecord])

  const saveMutation = useMutation({
    mutationFn: (body: any) => api.post('/api/milk-records', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milk-records'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('✅ एंट्री सेव हुई!')
      setMorningQty(''); setEveningQty(''); setSelectedCustomer(null)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error saving'),
  })

  const bulkSaveMutation = useMutation({
    mutationFn: (entries: any[]) => api.post('/api/milk-records/bulk', entries),
    onSuccess: (res) => {
      const { successCount, totalCount } = res.data.data
      toast.success(`${successCount}/${totalCount} entries saved!`)
      qc.invalidateQueries({ queryKey: ['milk-records'] })
      setBulkEntries({})
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  })

  const handleQuickSave = () => {
    if (!selectedCustomer) { toast.error('ग्राहक चुनें'); return }
    const mq = parseFloat(morningQty) || 0
    const eq = parseFloat(eveningQty) || 0
    saveMutation.mutate({
      customerId: selectedCustomer._id,
      date: selectedDate,
      morningQty: mq,
      eveningQty: eq,
      milkType: selectedCustomer.milkType,
    })
  }

  const handleBulkSave = () => {
    const entries = Object.entries(bulkEntries)
      .filter(([, v]) => parseFloat(v.morning) > 0 || parseFloat(v.evening) > 0)
      .map(([customerId, v]) => {
        const customer = customers.find((c: any) => c._id === customerId)
        return {
          customerId,
          date: selectedDate,
          morningQty: parseFloat(v.morning) || 0,
          eveningQty: parseFloat(v.evening) || 0,
          milkType: customer?.milkType || 'mixed',
        }
      })
    if (!entries.length) { toast.error('कोई एंट्री नहीं'); return }
    bulkSaveMutation.mutate(entries)
  }

  const filteredCustomers = customers.filter((c: any) =>
    c.fullName.toLowerCase().includes(search.toLowerCase()) ||
    c.customerId.toLowerCase().includes(search.toLowerCase())
  )

  const rate = selectedCustomer ? getRate(selectedCustomer) : 0
  const totalQty = (parseFloat(morningQty) || 0) + (parseFloat(eveningQty) || 0)
  const amount = totalQty * rate

  const goDate = (days: number) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">दूध की एंट्री</h1>
          <p className="text-sm text-gray-500">दैनिक दूध रिकॉर्ड करें</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setMode('quick')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'quick' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}>
            Quick
          </button>
          <button onClick={() => setMode('bulk')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mode === 'bulk' ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}>
            Bulk
          </button>
        </div>
      </div>

      {/* Date Selector */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => goDate(-1)} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input
          type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          max={today()}
          className="flex-1 h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button onClick={() => goDate(1)} disabled={selectedDate >= today()} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => setSelectedDate(today())} className="p-2 rounded-xl border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {mode === 'quick' ? (
        <div className="space-y-4">
          {/* Customer Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ग्राहक खोजें..."
              className="w-full h-11 pl-9 pr-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Customer List */}
          {search && !selectedCustomer && (
            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              {filteredCustomers.slice(0, 8).map((c: any) => {
                const existing = getExistingRecord(c._id)
                return (
                  <button key={c._id} onClick={() => { setSelectedCustomer(c); setSearch('') }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-brand-50 text-left border-b border-gray-50 last:border-0 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.fullName}</p>
                      <p className="text-xs text-gray-400">{c.customerId} · {c.milkType}</p>
                    </div>
                    {existing ? (
                      <Badge variant="success">{existing.totalQty}L ✓</Badge>
                    ) : (
                      <span className="text-xs text-gray-400">↑ {c.defaultMorningQty}L ↓ {c.defaultEveningQty}L</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Entry Form */}
          {selectedCustomer && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-brand-200">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{selectedCustomer.fullName}</p>
                      <p className="text-xs text-gray-400">{selectedCustomer.customerId} · दर: ₹{rate}/L</p>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-xs text-gray-400 hover:text-gray-600 underline">बदलें</button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-orange-600 mb-2">
                        <Sun className="w-4 h-4" /> सुबह (L)
                      </label>
                      <input
                        type="number" step="0.5" min="0" value={morningQty}
                        onChange={e => setMorningQty(e.target.value)}
                        className="w-full h-14 text-center text-2xl font-bold border-2 border-orange-200 rounded-xl focus:outline-none focus:border-orange-400 bg-orange-50"
                      />
                    </div>
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-indigo-600 mb-2">
                        <Moon className="w-4 h-4" /> शाम (L)
                      </label>
                      <input
                        type="number" step="0.5" min="0" value={eveningQty}
                        onChange={e => setEveningQty(e.target.value)}
                        className="w-full h-14 text-center text-2xl font-bold border-2 border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-400 bg-indigo-50"
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-brand-50 rounded-xl p-3 flex justify-between text-sm">
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">कुल दूध</p>
                      <p className="font-bold text-brand-700">{totalQty.toFixed(1)} L</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">दर</p>
                      <p className="font-bold">₹{rate}/L</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-500 text-xs">राशि</p>
                      <p className="font-bold text-brand-700">₹{amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <Button onClick={handleQuickSave} loading={saveMutation.isPending} className="w-full h-12 text-base">
                    <Save className="w-4 h-4" /> एंट्री सेव करें
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Today's Records */}
          <Card>
            <CardHeader>
              <CardTitle>आज की एंट्री ({todayRecords.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {recordsLoading ? <PageLoader /> : !todayRecords.length ? (
                <p className="text-sm text-gray-400 text-center py-4">कोई एंट्री नहीं</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {todayRecords.map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{(r.customerId as any)?.fullName || '—'}</p>
                        <p className="text-xs text-gray-400">☀️ {r.morningQty}L  🌙 {r.eveningQty}L</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand-700">{r.totalQty.toFixed(1)}L</p>
                        <p className="text-xs text-gray-400">₹{r.amount.toFixed(0)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* BULK MODE */
        <div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">ग्राहक</th>
                      <th className="px-3 py-3 text-center font-semibold text-orange-600">☀️ सुबह</th>
                      <th className="px-3 py-3 text-center font-semibold text-indigo-600">🌙 शाम</th>
                      <th className="px-3 py-3 text-right font-semibold text-brand-600">राशि</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c: any) => {
                      const entry = bulkEntries[c._id] || { morning: c.defaultMorningQty?.toString() || '0', evening: c.defaultEveningQty?.toString() || '0' }
                      const r = getRate(c)
                      const qty = (parseFloat(entry.morning) || 0) + (parseFloat(entry.evening) || 0)
                      const amt = qty * r
                      const hasRecord = !!getExistingRecord(c._id)
                      return (
                        <tr key={c._id} className={`border-b border-gray-50 ${hasRecord ? 'bg-green-50' : ''}`}>
                          <td className="px-4 py-2">
                            <p className="font-medium text-gray-800">{c.fullName}</p>
                            <p className="text-xs text-gray-400">{c.customerId} {hasRecord && '✓'}</p>
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" step="0.5" min="0" value={entry.morning}
                              onChange={e => setBulkEntries(p => ({ ...p, [c._id]: { ...entry, morning: e.target.value } }))}
                              className="w-16 h-9 text-center text-sm border border-orange-200 rounded-lg focus:outline-none focus:border-orange-400"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" step="0.5" min="0" value={entry.evening}
                              onChange={e => setBulkEntries(p => ({ ...p, [c._id]: { ...entry, evening: e.target.value } }))}
                              className="w-16 h-9 text-center text-sm border border-indigo-200 rounded-lg focus:outline-none focus:border-indigo-400"
                            />
                          </td>
                          <td className="px-4 py-2 text-right">
                            <span className="text-sm font-semibold text-brand-700">₹{amt.toFixed(0)}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-gray-100">
                <Button onClick={handleBulkSave} loading={bulkSaveMutation.isPending} className="w-full">
                  <Save className="w-4 h-4" /> सभी सेव करें ({Object.keys(bulkEntries).length} entries)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
