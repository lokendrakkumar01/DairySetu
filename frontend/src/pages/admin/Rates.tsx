import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Droplets, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading-spinner'
import { formatDate } from '@/lib/utils'
import { format } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function Rates() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ milkType: 'cow', ratePerLitre: '', effectiveFrom: format(new Date(), 'yyyy-MM-dd'), customerId: '' })

  const { data: ratesData, isLoading } = useQuery({
    queryKey: ['rates'],
    queryFn: () => api.get('/api/milk-rates').then(r => r.data),
  })

  const { data: customersData } = useQuery({
    queryKey: ['customers-active'],
    queryFn: () => api.get('/api/customers', { params: { status: 'active', limit: 100 } }).then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: (body: any) => api.post('/api/milk-rates', { ...body, ratePerLitre: parseFloat(body.ratePerLitre) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rates'] })
      toast.success('दर सेट की गई!')
      setShowAdd(false)
      setForm({ milkType: 'cow', ratePerLitre: '', effectiveFrom: format(new Date(), 'yyyy-MM-dd'), customerId: '' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  })

  const rates = ratesData?.data || []
  const customers = customersData?.data || []

  const defaultRates = rates.filter((r: any) => !r.customerId)
  const customRates = rates.filter((r: any) => r.customerId)

  const milkTypeColor: Record<string, string> = {
    cow: 'bg-amber-100 text-amber-700',
    buffalo: 'bg-blue-100 text-blue-700',
    mixed: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">दूध दर</h1>
          <p className="text-sm text-gray-500">Milk rate management</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4" /> नई दर
        </Button>
      </div>

      {isLoading ? <PageLoader /> : (
        <>
          {/* Default Rates */}
          <Card>
            <CardHeader><CardTitle>Default Rates (सभी ग्राहक)</CardTitle></CardHeader>
            <CardContent>
              {!defaultRates.length ? (
                <p className="text-sm text-gray-400 text-center py-4">कोई default rate नहीं — Add करें</p>
              ) : (
                <div className="space-y-3">
                  {defaultRates.map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${milkTypeColor[r.milkType]}`}>{r.milkType}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">₹{r.ratePerLitre}/L</p>
                          <p className="text-xs text-gray-400">From: {formatDate(r.effectiveFrom)}</p>
                        </div>
                      </div>
                      <Badge variant="success">Current</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Rates */}
          {customRates.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Custom Rates (ग्राहक-विशिष्ट)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customRates.map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-lg text-xs font-semibold capitalize ${milkTypeColor[r.milkType]}`}>{r.milkType}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">₹{r.ratePerLitre}/L</p>
                          <p className="text-xs text-gray-400">Customer specific · {formatDate(r.effectiveFrom)}</p>
                        </div>
                      </div>
                      <span className="text-xs text-brand-600 font-medium">Custom</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add Rate Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">नई दर सेट करें</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">दूध प्रकार</label>
                <select value={form.milkType} onChange={e => setForm(p => ({ ...p, milkType: e.target.value }))}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="cow">गाय (Cow)</option>
                  <option value="buffalo">भैंस (Buffalo)</option>
                  <option value="mixed">मिश्रित (Mixed)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">दर प्रति लीटर (₹) *</label>
                <input type="number" step="0.5" value={form.ratePerLitre} onChange={e => setForm(p => ({ ...p, ratePerLitre: e.target.value }))}
                  placeholder="60" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">प्रभावी दिनांक से</label>
                <input type="date" value={form.effectiveFrom} onChange={e => setForm(p => ({ ...p, effectiveFrom: e.target.value }))}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ग्राहक (खाली = सभी के लिए)</label>
                <select value={form.customerId} onChange={e => setForm(p => ({ ...p, customerId: e.target.value }))}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="">सभी ग्राहक (Default)</option>
                  {customers.map((c: any) => <option key={c._id} value={c._id}>{c.fullName}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>रद्द</Button>
              <Button className="flex-1" loading={saveMutation.isPending}
                onClick={() => { if (!form.ratePerLitre) { toast.error('दर जरूरी है'); return } saveMutation.mutate(form) }}>
                सेव करें ✓
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
