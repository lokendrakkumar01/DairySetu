import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Phone, MapPin, Milk, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading-spinner'
import { formatCurrency, formatDate, formatQuantity } from '@/lib/utils'
import api from '@/lib/api'

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()

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
    </div>
  )
}
