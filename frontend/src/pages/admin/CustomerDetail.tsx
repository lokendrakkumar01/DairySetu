import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ArrowLeft, Phone, MapPin, Milk, Wallet, KeyRound, Copy, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading-spinner'
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const { dairy } = useAuth()
  const queryClient = useQueryClient()
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const resetPassword = useMutation({
    mutationFn: async () => (await api.post(`/api/customers/${id}/reset-password`)).data.data as { temporaryPassword: string; username: string },
    onSuccess: credentials => { setTemporaryPassword(`${credentials.username}\n${credentials.temporaryPassword}`); setSharing(true); toast.success('New temporary password created') },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Could not reset password'),
  })

  const { data: customerData, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => api.get(`/api/customers/${id}`).then(r => r.data.data),
  })

  const { data: statementData } = useQuery({
    queryKey: ['statement', id],
    queryFn: () => api.get(`/api/customers/${id}/statement`).then(r => r.data.data),
  })

  const { data: billsData } = useQuery({
    queryKey: ['bills-customer', id],
    queryFn: () => api.get('/api/bills', { params: { customerId: id, limit: 6 } }).then(r => r.data.data),
  })

  if (isLoading) return <PageLoader />
  if (!customerData) return <div className="p-6 text-center text-gray-500">Customer not found</div>

  const c = customerData
  const summary = statementData?.summary
  const bills = billsData || []

  return (
    <div className="p-4 lg:p-6 space-y-4">
      {/* Back */}
      <div className="flex items-center gap-2">
        <Link to="/admin/customers"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-lg font-bold text-gray-900">Customer Profile</h1>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center text-brand-700 font-bold text-2xl flex-shrink-0">
              {c.fullName[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{c.fullName}</h2>
                <Badge variant={c.isActive ? 'success' : 'neutral'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-sm text-gray-500">{c.customerId}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.mobile}</span>
                {c.village && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.village}</span>}
                <span className="flex items-center gap-1"><Milk className="w-3 h-3" />{c.milkType} milk</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-gray-900">Customer app access</p><p className="mt-1 text-xs text-gray-500">Reset creates a new password and signs out the old customer session.</p></div>
          <Button variant="outline" loading={resetPassword.isPending} onClick={() => resetPassword.mutate()} className="shrink-0"><KeyRound className="h-4 w-4" />Create new password</Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">इस माह दूध</p>
            <p className="text-xl font-bold text-brand-700">{formatQuantity(summary?.totalQuantity || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">दूध की राशि</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(summary?.milkCharges || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">भुगतान</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary?.totalPaid || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">बकाया</p>
            <p className={`text-xl font-bold ${c.currentBalance > 0 ? 'text-red-500' : 'text-brand-600'}`}>
              {formatCurrency(c.currentBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Default Quantities */}
      <Card>
        <CardHeader><CardTitle>Default Quantities</CardTitle></CardHeader>
        <CardContent>
          <div className="flex justify-around text-center">
            <div>
              <p className="text-xs text-gray-500">☀️ सुबह</p>
              <p className="text-lg font-bold text-orange-600">{c.defaultMorningQty} L</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">🌙 शाम</p>
              <p className="text-lg font-bold text-indigo-600">{c.defaultEveningQty} L</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">📅 Join Date</p>
              <p className="text-sm font-semibold">{formatDate(c.joinDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bills */}
      {bills.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Bills</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bills.map((b: any) => (
              <Link key={b._id} to={`/admin/bills/${b._id}`}>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-lg px-2 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{b.billNumber}</p>
                    <p className="text-xs text-gray-400">{b.billMonth}/{b.billYear} · {b.totalQuantity.toFixed(1)}L</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${b.finalBalance > 0 ? 'text-red-500' : 'text-brand-600'}`}>
                      ₹{b.finalBalance.toLocaleString('en-IN')}
                    </p>
                    <Badge variant={b.status === 'finalized' ? 'success' : b.status === 'closed' ? 'neutral' : 'warning'} className="text-[10px]">
                      {b.status}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {sharing && temporaryPassword && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
          <div className="mb-4 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><KeyRound className="h-6 w-6" /></div><h2 className="font-bold text-gray-900">Share customer login</h2><p className="mt-1 text-xs text-gray-500">Send this new password directly to {c.fullName}.</p></div>
          <div className="space-y-2 rounded-xl bg-emerald-50 p-4 text-sm"><p>Customer ID: <strong>{c.customerId}</strong></p><p>Username: <strong>{temporaryPassword.split('\n')[0]}</strong></p><p>Temporary password: <strong className="font-mono text-orange-700">{temporaryPassword.split('\n')[1]}</strong></p></div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(`Customer ID: ${c.customerId}\nUsername: ${temporaryPassword.split('\n')[0]}\nPassword: ${temporaryPassword.split('\n')[1]}`); toast.success('Credentials copied') } catch { toast.error('Copy is unavailable in this browser') } }}><Copy className="h-4 w-4" />Copy</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => { const digits = c.mobile.replace(/\D/g, ''); const localNumber = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits; const phone = localNumber.length === 10 ? `91${localNumber}` : localNumber; const message = `Namaste ${c.fullName}! ${dairy?.dairyName || 'DairySetu'} customer portal login:\nCustomer ID: ${c.customerId}\nUsername: ${temporaryPassword.split('\n')[0]}\nPassword: ${temporaryPassword.split('\n')[1]}\nLogin: ${window.location.origin}/customer/login`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer') }}><MessageCircle className="h-4 w-4" />WhatsApp</Button>
          </div>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => { setSharing(false); setTemporaryPassword(null); queryClient.invalidateQueries({ queryKey: ['customer', id] }) }}>Done</Button>
        </div>
      </div>}
    </div>
  )
}
