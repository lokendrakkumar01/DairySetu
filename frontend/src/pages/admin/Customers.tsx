import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Phone, MapPin, Wallet, Edit2, MoreVertical, UserCheck, UserX, Key } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { formatCurrency, formatDate } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const customerSchema = z.object({
  fullName: z.string().min(2, 'Name required'),
  mobile: z.string().min(10, 'Valid mobile required'),
  village: z.string().optional(),
  address: z.string().optional(),
  milkType: z.enum(['cow', 'buffalo', 'mixed']).default('mixed'),
  defaultMorningQty: z.coerce.number().min(0).default(0),
  defaultEveningQty: z.coerce.number().min(0).default(0),
})
type CustomerForm = z.infer<typeof customerSchema>

function fetchCustomers(search: string, status: string) {
  return api.get('/api/customers', { params: { search, status, limit: 50 } }).then(r => r.data)
}

export default function Customers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string; customerId: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, status],
    queryFn: () => fetchCustomers(search, status),
    staleTime: 10000,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema)
  })

  const createMutation = useMutation({
    mutationFn: (body: CustomerForm) => api.post('/api/customers', body),
    onSuccess: (res) => {
      const d = res.data.data
      setCreatedCreds({ username: d.username, password: d.tempPassword, customerId: d.customerId })
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('ग्राहक जोड़ा गया!')
      reset()
      setShowAdd(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const customers = data?.data || []

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ग्राहक सूची</h1>
          <p className="text-sm text-gray-500">{customers.length} ग्राहक</p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm">
          <Plus className="w-4 h-4" /> नया ग्राहक
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="नाम, मोबाइल या ID से खोजें..."
            className="w-full h-10 pl-9 pr-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
          <option value="">सभी</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Customer List */}
      {isLoading ? <PageLoader /> : !customers.length ? (
        <EmptyState title="कोई ग्राहक नहीं" description="पहला ग्राहक जोड़ें" action={{ label: 'ग्राहक जोड़ें', onClick: () => setShowAdd(true) }} />
      ) : (
        <div className="space-y-3">
          {customers.map((c: any) => (
            <motion.div key={c._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <Link to={`/admin/customers/${c._id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                        {c.fullName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm">{c.fullName}</p>
                          <Badge variant={c.isActive ? 'success' : 'neutral'} className="text-[10px]">
                            {c.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{c.customerId}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="w-3 h-3" /> {c.mobile}
                          </span>
                          {c.village && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" /> {c.village}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-col items-end gap-1 ml-2">
                      <span className={`text-sm font-bold ${c.currentBalance > 0 ? 'text-red-500' : 'text-brand-600'}`}>
                        {c.currentBalance > 0 ? `₹${c.currentBalance.toLocaleString('en-IN')} बकाया` : '✓ क्लियर'}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{c.milkType} milk</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">नया ग्राहक जोड़ें</h2>
              </div>
              <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">पूरा नाम *</label>
                    <input {...register('fullName')} placeholder="Rahul Kumar" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile *</label>
                    <input {...register('mobile')} placeholder="9876543210" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    {errors.mobile && <p className="text-xs text-red-500 mt-1">{errors.mobile.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">गाँव</label>
                    <input {...register('village')} placeholder="Ramnagar" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">दूध प्रकार</label>
                    <select {...register('milkType')} className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                      <option value="cow">गाय (Cow)</option>
                      <option value="buffalo">भैंस (Buffalo)</option>
                      <option value="mixed">मिश्रित (Mixed)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">सुबह (L)</label>
                    <input {...register('defaultMorningQty')} type="number" step="0.5" placeholder="0" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">शाम (L)</label>
                    <input {...register('defaultEveningQty')} type="number" step="0.5" placeholder="0" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setShowAdd(false); reset() }} className="flex-1">रद्द करें</Button>
                  <Button type="submit" loading={isSubmitting} className="flex-1">जोड़ें ✓</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credentials Modal */}
      <AnimatePresence>
        {createdCreds && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6">
              <div className="text-center mb-4">
                <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Key className="w-6 h-6 text-brand-600" />
                </div>
                <h2 className="font-bold text-gray-900">Login Credentials</h2>
                <p className="text-sm text-gray-500">ग्राहक को यह credentials दें</p>
              </div>
              <div className="bg-brand-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer ID:</span>
                  <span className="font-mono font-bold text-brand-700">{createdCreds.customerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Username:</span>
                  <span className="font-mono font-bold">{createdCreds.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-mono font-bold text-orange-600">{createdCreds.password}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">ग्राहक पहली बार login करके password बदल सकते हैं</p>
              <Button className="w-full mt-4" onClick={() => setCreatedCreds(null)}>ठीक है</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
