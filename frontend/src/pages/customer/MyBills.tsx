import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Droplets,
  IndianRupee,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { PageLoader } from '@/components/ui/loading-spinner'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

const statusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600', icon: Clock },
  generated: { label: 'Generated', color: 'bg-blue-100 text-blue-700', icon: FileText },
  finalized: { label: 'Finalized', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  closed: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  overdue: { label: 'Overdue', color: 'bg-red-100 text-red-600', icon: AlertTriangle },
}

export default function MyBills() {
  const { user } = useAuth()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['customer-bills', user?.customerId],
    queryFn: async () => {
      const res = await api.get(`/bills?customerId=${user?.customerId}&limit=24`)
      return res.data.data?.bills || []
    },
    enabled: !!user?.customerId,
  })

  if (isLoading) return <PageLoader />

  const bills = data || []

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-lg font-bold text-gray-800">मेरे बिल</h1>
        <p className="text-xs text-gray-500">My Monthly Bills</p>
      </div>

      {bills.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
          <FileText className="w-14 h-14 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">कोई बिल नहीं</p>
          <p className="text-gray-400 text-sm mt-1">No bills found yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill: any, i: number) => {
            const cfg = statusConfig[bill.status as keyof typeof statusConfig] || statusConfig.draft
            const StatusIcon = cfg.icon
            const isExpanded = expandedId === bill._id
            const balance = bill.finalBalance || 0

            return (
              <motion.div
                key={bill._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Bill header */}
                <button
                  className="w-full px-4 py-4 flex items-center justify-between"
                  onClick={() => setExpandedId(isExpanded ? null : bill._id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-xs font-bold text-emerald-700">
                        {MONTHS[bill.month - 1]?.slice(0, 3)}
                      </span>
                      <span className="text-xs text-emerald-500">{bill.year}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-sm">
                        {MONTHS[bill.month - 1]} {bill.year}
                      </p>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold text-sm ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {formatCurrency(Math.abs(balance))}
                      </p>
                      <p className="text-xs text-gray-400">
                        {balance > 0 ? 'बकाया' : balance < 0 ? 'अग्रिम' : 'पूर्ण'}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100"
                  >
                    <div className="px-4 py-4 space-y-3">
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-emerald-50 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Droplets className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs text-emerald-600 font-medium">कुल दूध</span>
                          </div>
                          <p className="text-lg font-bold text-emerald-700">
                            {(bill.totalQuantity || 0).toFixed(1)} L
                          </p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <IndianRupee className="w-4 h-4 text-blue-500" />
                            <span className="text-xs text-blue-600 font-medium">दूध राशि</span>
                          </div>
                          <p className="text-lg font-bold text-blue-700">
                            {formatCurrency(bill.milkCharges || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Breakdown */}
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <BillRow label="पिछला बकाया" value={bill.previousBalance || 0} />
                        <BillRow label="दूध राशि" value={bill.milkCharges || 0} />
                        <BillRow label="भुगतान" value={-(bill.payments || 0)} highlight="green" />
                        {(bill.adjustments || 0) !== 0 && (
                          <BillRow label="समायोजन" value={bill.adjustments || 0} />
                        )}
                        <div className="border-t border-gray-200 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-800">अंतिम बकाया</span>
                            <span className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-emerald-600' : 'text-green-600'}`}>
                              {formatCurrency(balance)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Download action */}
                      <button
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
                        onClick={() => {
                          // PDF download is handled via BillDetail page
                          window.location.href = `/admin/bills/${bill._id}`
                        }}
                      >
                        <Download className="w-4 h-4" />
                        बिल डाउनलोड करें
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BillRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: 'green' | 'red'
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-600">{label}</span>
      <span
        className={`text-xs font-semibold ${
          highlight === 'green'
            ? 'text-emerald-600'
            : highlight === 'red'
            ? 'text-red-600'
            : 'text-gray-800'
        }`}
      >
        {formatCurrency(Math.abs(value))}
      </span>
    </div>
  )
}
