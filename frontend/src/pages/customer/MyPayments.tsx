import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Wallet, Banknote, Smartphone, Building2, CreditCard, Receipt } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { PageLoader } from '@/components/ui/loading-spinner'

const methodIcons: Record<string, any> = {
  cash: { icon: Banknote, label: 'नकद / Cash', color: 'bg-green-100 text-green-700' },
  upi: { icon: Smartphone, label: 'UPI', color: 'bg-purple-100 text-purple-700' },
  bank_transfer: { icon: Building2, label: 'Bank Transfer', color: 'bg-blue-100 text-blue-700' },
  other: { icon: CreditCard, label: 'Other', color: 'bg-gray-100 text-gray-700' },
}

export default function MyPayments() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['customer-payments', user?.customerId],
    queryFn: async () => {
      const res = await api.get(`/payments?customerId=${user?.customerId}&limit=50`)
      return res.data.data?.payments || []
    },
    enabled: !!user?.customerId,
  })

  if (isLoading) return <PageLoader />

  const payments = data || []
  const total = payments.reduce((s: number, p: any) => s + (p.amount || 0), 0)

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-gray-800">भुगतान इतिहास</h1>
        <p className="text-xs text-gray-500">Payment History</p>
      </div>

      {/* Total paid card */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-4 text-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-emerald-200 text-sm">कुल भुगतान किया</p>
            <p className="text-2xl font-bold">{formatCurrency(total)}</p>
            <p className="text-emerald-200 text-xs mt-0.5">{payments.length} transactions</p>
          </div>
        </div>
      </motion.div>

      {/* Payments list */}
      {payments.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <Receipt className="w-14 h-14 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">कोई भुगतान नहीं</p>
          <p className="text-gray-400 text-sm mt-1">No payments found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p: any, i: number) => {
            const methodCfg = methodIcons[p.paymentMethod] || methodIcons.other
            const MethodIcon = methodCfg.icon
            const date = new Date(p.paymentDate || p.createdAt)

            return (
              <motion.div
                key={p._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${methodCfg.color}`}
                >
                  <MethodIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{methodCfg.label}</p>
                  {p.referenceNumber && (
                    <p className="text-xs text-gray-400 truncate">Ref: {p.referenceNumber}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-medium text-gray-700">
                    {date.getDate()}{' '}
                    {date.toLocaleString('default', { month: 'short' })}
                  </p>
                  <p className="text-xs text-gray-400">{date.getFullYear()}</p>
                  {p.receiptNumber && (
                    <p className="text-xs text-emerald-600 font-medium">#{p.receiptNumber}</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
