import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, Plus, Download, MessageSquare, ChevronDown, Eye, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatQuantity, getMonthName, generateWhatsAppMessage } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import toast from 'react-hot-toast'

function statusBadge(s: string) {
  if (s === 'finalized') return <Badge variant="success">Finalized</Badge>
  if (s === 'closed') return <Badge variant="neutral">Closed</Badge>
  return <Badge variant="warning">Draft</Badge>
}

export default function Bills() {
  const { dairy } = useAuth()
  const qc = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [customerId, setCustomerId] = useState('')
  const [showGenerate, setShowGenerate] = useState(false)

  const { data: billsData, isLoading } = useQuery({
    queryKey: ['bills', month, year, customerId],
    queryFn: () => api.get('/api/bills', { params: { month, year, customerId } }).then(r => r.data),
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-active'],
    queryFn: () => api.get('/api/customers', { params: { status: 'active', limit: 100 } }).then(r => r.data),
  })

  const generateMutation = useMutation({
    mutationFn: ({ cid }: { cid: string }) => api.post('/api/bills/generate', { customerId: cid, month, year }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); toast.success('बिल बनाया गया!'); setShowGenerate(false) },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  })

  const finalizeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/bills/${id}/finalize`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bills'] }); toast.success('Bill finalized!') },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  })

  const bills = billsData?.data || []
  const customers = customersData?.data || []

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: getMonthName(i + 1) }))

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">मासिक बिल</h1>
          <p className="text-sm text-gray-500">{bills.length} बिल</p>
        </div>
        <Button onClick={() => setShowGenerate(true)} size="sm">
          <Plus className="w-4 h-4" /> बिल बनाएं
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={month} onChange={e => setMonth(+e.target.value)}
          className="h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={customerId} onChange={e => setCustomerId(e.target.value)}
          className="h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white flex-1">
          <option value="">सभी ग्राहक</option>
          {customers.map((c: any) => <option key={c._id} value={c._id}>{c.fullName}</option>)}
        </select>
      </div>

      {isLoading ? <PageLoader /> : !bills.length ? (
        <EmptyState
          title="कोई बिल नहीं"
          description={`${getMonthName(month)} ${year} के लिए कोई बिल नहीं मिला`}
          action={{ label: 'बिल बनाएं', onClick: () => setShowGenerate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {bills.map((bill: any) => {
            const customer = typeof bill.customerId === 'object' ? bill.customerId : null
            return (
              <motion.div key={bill._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{customer?.fullName || '—'}</p>
                          {statusBadge(bill.status)}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{bill.billNumber} · {getMonthName(bill.billMonth)} {bill.billYear}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${bill.finalBalance > 0 ? 'text-red-500' : 'text-brand-600'}`}>
                          ₹{bill.finalBalance.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-gray-400">बकाया</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3 text-center text-xs mb-3">
                      <div>
                        <p className="text-gray-500">दूध</p>
                        <p className="font-semibold text-gray-800">{bill.totalQuantity.toFixed(1)} L</p>
                      </div>
                      <div>
                        <p className="text-gray-500">राशि</p>
                        <p className="font-semibold text-gray-800">₹{bill.milkCharges.toLocaleString('en-IN')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">भुगतान</p>
                        <p className="font-semibold text-brand-700">₹{bill.paymentsReceived.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/admin/bills/${bill._id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="w-3.5 h-3.5" /> देखें
                        </Button>
                      </Link>
                      {bill.status === 'draft' && (
                        <Button size="sm" onClick={() => finalizeMutation.mutate(bill._id)} loading={finalizeMutation.isPending}>
                          <CheckCircle className="w-3.5 h-3.5" /> Finalize
                        </Button>
                      )}
                      {customer && (
                        <a href={generateWhatsAppMessage(bill, customer, dairy?.dairyName || 'DairySetu', dairy?.whatsappNumber)} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="success">
                            <MessageSquare className="w-3.5 h-3.5" /> WA
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Generate Bill Modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">बिल बनाएं</h2>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ग्राहक</label>
                <select
                  onChange={e => generateMutation.mutate({ cid: e.target.value })}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">ग्राहक चुनें...</option>
                  {customers.map((c: any) => <option key={c._id} value={c._id}>{c.fullName}</option>)}
                </select>
              </div>
              <p className="text-xs text-gray-500">बिल माह: {getMonthName(month)} {year}</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowGenerate(false)}>बंद करें</Button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
