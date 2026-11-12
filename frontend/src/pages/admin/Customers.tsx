import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, Phone, MapPin, Edit2, Trash2, RotateCcw, Key, Copy, MessageCircle } from 'lucide-react'
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
import { useAuth } from '@/contexts/AuthContext'

const customerSchema = z.object({
  fullName: z.string().min(2, 'Name required'),
  mobile: z.string().min(10, 'Valid mobile required'),
  password: z.string().optional().refine(value => !value || value.length >= 6, 'Password must be at least 6 characters'),
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
  const { dairy } = useAuth()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [createdCreds, setCreatedCreds] = useState<{ username: string; password: string; customerId: string; mobile: string; dairyName: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, status],
    queryFn: () => fetchCustomers(search, status),
    staleTime: 10000,
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema)
  })

  const saveMutation = useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: CustomerForm }) => id ? api.put(`/api/customers/${id}`, body) : api.post('/api/customers', body),
    onSuccess: (res, variables) => {
      if (variables.id) {
        qc.invalidateQueries({ queryKey: ['customers'] })
        qc.invalidateQueries({ queryKey: ['customer', variables.id] })
        toast.success('ग्राहक की जानकारी अपडेट हुई')
        reset(); setShowAdd(false); setEditingCustomer(null)
        return
      }
      const d = res.data.data
      setCreatedCreds({ username: d.username, password: d.tempPassword, customerId: d.customerId, mobile: d.customer.mobile, dairyName: dairy?.dairyName || 'DairySetu' })
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success('ग्राहक जोड़ा गया!')
      reset()
      setShowAdd(false)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to save customer'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ customer, activate }: { customer: any; activate: boolean }) => activate
      ? api.put(`/api/customers/${customer._id}`, { isActive: true })
      : api.delete(`/api/customers/${customer._id}`),
    onSuccess: (_res, { customer, activate }) => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      toast.success(activate ? 'Customer account restored' : `${customer.fullName} deactivated; account history is preserved`)
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Could not update customer'),
  })

  const customers = data?.data || []

  const openEdit = (customer: any) => {
    setEditingCustomer(customer)
    reset({ fullName: customer.fullName, mobile: customer.mobile, password: '', village: customer.village || '', address: customer.address || '', milkType: customer.milkType, defaultMorningQty: customer.defaultMorningQty || 0, defaultEveningQty: customer.defaultEveningQty || 0 })
    setShowAdd(true)
  }
  const submitCustomer = (body: CustomerForm) => {
    if (!editingCustomer && !body.password) { toast.error('Customer login password required'); return }
    saveMutation.mutate({ id: editingCustomer?._id || null, body })
  }
  const closeCustomerForm = () => { setShowAdd(false); setEditingCustomer(null); reset() }

  const shareCredentials = async () => {
    if (!createdCreds) return
    const message = `Namaste! ${createdCreds.dairyName} ke customer portal par login karne ke liye:\nMobile: ${createdCreds.username}\nPassword: ${createdCreds.password}\nLogin: ${window.location.origin}/customer/login\n\nIs message ko surakshit rakhein.`
    const digits = createdCreds.mobile.replace(/\D/g, '')
    const localNumber = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits
    const phone = localNumber.length === 10 ? `91${localNumber}` : localNumber
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ग्राहक सूची</h1>
          <p className="text-sm text-gray-500">{customers.length} ग्राहक</p>
        </div>
        <Button onClick={() => { setEditingCustomer(null); reset(); setShowAdd(true) }} size="sm">
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
                    <div className="ml-2 flex shrink-0 flex-col items-end gap-1">
                      <span className={`hidden text-sm font-bold sm:inline ${c.currentBalance > 0 ? 'text-red-500' : 'text-brand-600'}`}>
                        {c.currentBalance > 0 ? `₹${c.currentBalance.toLocaleString('en-IN')} बकाया` : '✓ क्लियर'}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{c.milkType} milk</span>
                      <div className="mt-1 flex gap-1">
                        <Button type="button" size="sm" variant="outline" className="h-8 px-2" aria-label={`Edit ${c.fullName}`} onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Edit</span></Button>
                        {c.isActive ? <Button type="button" size="sm" variant="outline" className="h-8 px-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${c.fullName}`} disabled={statusMutation.isPending} onClick={() => { if (window.confirm(`Deactivate ${c.fullName}? Their milk and billing history will be preserved.`)) statusMutation.mutate({ customer: c, activate: false }) }}><Trash2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Delete</span></Button> : <Button type="button" size="sm" variant="outline" className="h-8 px-2" aria-label={`Restore ${c.fullName}`} disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ customer: c, activate: true })}><RotateCcw className="h-3.5 w-3.5" /><span className="hidden sm:inline">Restore</span></Button>}
                      </div>
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
                <h2 className="font-bold text-gray-900">{editingCustomer ? 'ग्राहक जानकारी बदलें' : 'नया ग्राहक जोड़ें'}</h2>
              </div>
              <form onSubmit={handleSubmit(submitCustomer)} className="p-5 space-y-4">
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
                  {!editingCustomer && <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer login password {editingCustomer ? '(leave blank to keep current)' : '*'}</label>
                    <input {...register('password')} type="password" autoComplete="new-password" placeholder="At least 6 characters" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
                  </div>}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">गाँव</label>
                    <input {...register('village')} placeholder="Ramnagar" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">पता</label>
                    <input {...register('address')} placeholder="पूरा पता (वैकल्पिक)" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
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
                  <Button type="button" variant="outline" onClick={closeCustomerForm} className="flex-1">रद्द करें</Button>
                  <Button type="submit" loading={isSubmitting || saveMutation.isPending} className="flex-1">{editingCustomer ? 'सेव करें' : 'जोड़ें ✓'}</Button>
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
                  <span className="text-gray-600">Mobile login:</span>
                  <span className="font-mono font-bold">{createdCreds.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Password:</span>
                  <span className="font-mono font-bold text-orange-600">{createdCreds.password}</span>
                </div>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">यह पासवर्ड सिर्फ़ अभी दिखेगा। इसे ग्राहक को भेजें; भूलने पर नया पासवर्ड बनाया जा सकता है।</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(`Mobile: ${createdCreds.username}\nPassword: ${createdCreds.password}`); toast.success('Credentials copied') } catch { toast.error('Copy is unavailable in this browser') } }}><Copy className="h-4 w-4" />Copy</Button>
                <Button onClick={shareCredentials} className="bg-green-600 hover:bg-green-700"><MessageCircle className="h-4 w-4" />WhatsApp</Button>
              </div>
              <Button className="w-full mt-2" variant="ghost" onClick={() => setCreatedCreds(null)}>ठीक है</Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
