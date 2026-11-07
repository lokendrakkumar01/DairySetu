import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, CreditCard, Banknote, Smartphone, ArrowDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const methodIcons: Record<string, any> = {
  cash: Banknote, upi: Smartphone, bank: CreditCard, other: CreditCard
}

export default function Payments() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ customerId: '', amount: '', paymentMethod: 'cash', paymentDate: format(new Date(), 'yyyy-MM-dd'), reference: '', notes: '' })

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/api/payments', { params: { limit: 50 } }).then(r => r.data),
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-active'],
    queryFn: () => api.get('/api/customers', { params: { status: 'active', limit: 100 } }).then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (body: any) => api.post('/api/payments', { ...body, amount: parseFloat(body.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('✅ भुगतान दर्ज किया गया!')
      setShowAdd(false)
      setForm({ customerId: '', amount: '', paymentMethod: 'cash', paymentDate: format(new Date(), 'yyyy-MM-dd'), reference: '', notes: '' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  })

  const payments = paymentsData?.data || []
  const customers = customersData?.data || []

  const totalToday = payments
    .filter((p: any) => format(new Date(p.paymentDate), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
    .reduce((s: number, p: any) => s + p.amount, 0)

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">भुगतान</h1>
          <p className="text-sm text-gray-500">आज: {formatCurrency(totalToday)}</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4" /> भुगतान दर्ज
        </Button>
      </div>

      {isLoading ? <PageLoader /> : !payments.length ? (
        <EmptyState title="कोई भुगतान नहीं" description="पहला भुगतान दर्ज करें" action={{ label: 'भुगतान दर्ज करें', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="space-y-3">
          {payments.map((p: any) => {
            const Icon = methodIcons[p.paymentMethod] || CreditCard
            const customer = typeof p.customerId === 'object' ? p.customerId : null
            return (
              <motion.div key={p._id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{customer?.fullName || '—'}</p>
                        <p className="text-xs text-gray-400">{formatDate(p.paymentDate)} · {p.receiptNumber}</p>
                        {p.reference && <p className="text-xs text-gray-400">Ref: {p.reference}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-brand-700">₹{p.amount.toLocaleString('en-IN')}</p>
                        <Badge variant="success" className="text-[10px] capitalize">{p.paymentMethod}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Add Payment Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">भुगतान दर्ज करें</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ग्राहक *</label>
                <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">ग्राहक चुनें...</option>
                  {customers.map((c: any) => (
                    <option key={c._id} value={c._id}>
                      {c.fullName} {c.currentBalance > 0 ? `(₹${c.currentBalance} बकाया)` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">राशि (₹) *</label>
                  <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">दिनांक *</label>
                  <input type="date" value={form.paymentDate} onChange={e => setForm(p => ({ ...p, paymentDate: e.target.value }))}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">भुगतान विधि</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['cash', 'upi', 'bank', 'other'] as const).map(m => (
                    <button key={m} onClick={() => setForm(p => ({ ...p, paymentMethod: m }))}
                      className={`py-2 text-xs rounded-lg border font-medium transition-all ${form.paymentMethod === m ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {m === 'cash' ? '💵' : m === 'upi' ? '📱' : m === 'bank' ? '🏦' : '📄'} {m.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (Optional)</label>
                <input value={form.reference} onChange={e => setForm(p => ({ ...p, reference: e.target.value }))}
                  placeholder="UPI transaction ID, etc." className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>रद्द</Button>
              <Button className="flex-1" loading={saveMutation.isPending}
                onClick={() => { if (!form.customerId || !form.amount) { toast.error('ग्राहक और राशि जरूरी है'); return } saveMutation.mutate(form) }}>
                सेव करें ✓
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
