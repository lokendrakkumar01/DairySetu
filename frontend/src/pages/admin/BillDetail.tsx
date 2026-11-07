import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, MessageSquare, CheckCircle, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/loading-spinner'
import { formatCurrency, formatDate, getMonthName, generateWhatsAppMessage } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useRef } from 'react'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'

export default function BillDetail() {
  const { id } = useParams<{ id: string }>()
  const { dairy } = useAuth()
  const qc = useQueryClient()
  const billRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['bill', id],
    queryFn: () => api.get(`/api/bills/${id}/pdf-data`).then(r => r.data.data),
  })

  const finalizeMutation = useMutation({
    mutationFn: () => api.post(`/api/bills/${id}/finalize`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bill', id] }); toast.success('Bill finalized!') },
  })

  const downloadPng = async () => {
    if (!billRef.current) return
    try {
      const dataUrl = await toPng(billRef.current, { quality: 0.95, pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `bill-${bill?.billNumber || id}.png`
      link.href = dataUrl
      link.click()
      toast.success('Bill downloaded!')
    } catch { toast.error('Download failed') }
  }

  const downloadPdf = async () => {
    if (!billRef.current) return
    try {
      const dataUrl = await toPng(billRef.current, { quality: 0.95, pixelRatio: 2 })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
      const imgWidth = 210
      const imgHeight = (billRef.current.offsetHeight / billRef.current.offsetWidth) * imgWidth
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`bill-${bill?.billNumber || id}.pdf`)
      toast.success('PDF downloaded!')
    } catch { toast.error('PDF failed') }
  }

  if (isLoading) return <PageLoader />

  const { bill, customer, payments } = data || {}

  if (!bill) return <div className="p-6 text-center text-gray-500">Bill not found</div>

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/admin/bills"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{getMonthName(bill.billMonth)} {bill.billYear} Bill</h1>
          <p className="text-sm text-gray-500">{customer?.fullName} · {bill.billNumber}</p>
        </div>
        <Badge variant={bill.status === 'finalized' ? 'success' : bill.status === 'closed' ? 'neutral' : 'warning'}>
          {bill.status}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <Button onClick={downloadPng} variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> PNG</Button>
        <Button onClick={downloadPdf} variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> PDF</Button>
        {customer && (
          <a href={generateWhatsAppMessage(bill, customer, dairy?.dairyName || 'DairySetu', dairy?.whatsappNumber)} target="_blank" rel="noreferrer">
            <Button variant="success" size="sm"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</Button>
          </a>
        )}
        {bill.status === 'draft' && (
          <Button size="sm" onClick={() => finalizeMutation.mutate()} loading={finalizeMutation.isPending}>
            <CheckCircle className="w-3.5 h-3.5" /> Finalize
          </Button>
        )}
      </div>

      {/* Bill Preview — this div gets captured as image */}
      <div ref={billRef} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {/* Bill Header */}
        <div className="text-center border-b border-gray-100 pb-4 mb-4">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center mx-auto mb-2">
            <span className="text-white font-bold text-lg">DS</span>
          </div>
          <h2 className="text-xl font-bold text-brand-700">DairySetu</h2>
          <p className="text-sm font-semibold text-gray-800">{dairy?.dairyName}</p>
          <p className="text-xs text-gray-400">Monthly Milk Statement</p>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-4">
          {[
            ['ग्राहक', customer?.fullName],
            ['Customer ID', customer?.customerId],
            ['Mobile', customer?.mobile],
            ['Bill No.', bill.billNumber],
            ['माह', `${getMonthName(bill.billMonth)} ${bill.billYear}`],
            ['Status', bill.status],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-500">{k}:</span>
              <span className="font-medium text-gray-800">{v}</span>
            </div>
          ))}
        </div>

        {/* Daily Breakdown */}
        {bill.dailySnapshot?.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">दैनिक विवरण</h3>
            <div className="max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="py-1.5 px-2 text-left">दिनांक</th>
                    <th className="py-1.5 px-2 text-center">सुबह</th>
                    <th className="py-1.5 px-2 text-center">शाम</th>
                    <th className="py-1.5 px-2 text-center">कुल</th>
                    <th className="py-1.5 px-2 text-right">राशि</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.dailySnapshot.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-1.5 px-2">{formatDate(row.date)}</td>
                      <td className="py-1.5 px-2 text-center">{row.morning}L</td>
                      <td className="py-1.5 px-2 text-center">{row.evening}L</td>
                      <td className="py-1.5 px-2 text-center font-medium">{row.total}L</td>
                      <td className="py-1.5 px-2 text-right">₹{row.amount.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Summary */}
        <div className="bg-brand-50 rounded-xl p-4">
          <h3 className="text-xs font-bold text-brand-800 uppercase tracking-wide mb-3">मासिक सारांश</h3>
          {[
            ['कुल दूध', `${bill.totalQuantity.toFixed(1)} L`],
            ['दूध की राशि', `₹${bill.milkCharges.toLocaleString('en-IN')}`],
            ['पिछला बकाया', `₹${bill.previousBalance.toLocaleString('en-IN')}`],
            ['भुगतान प्राप्त', `-₹${bill.paymentsReceived.toLocaleString('en-IN')}`],
            ['समायोजन', `₹${bill.adjustments.toLocaleString('en-IN')}`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-1 text-xs">
              <span className="text-gray-600">{k}</span>
              <span className="font-medium">{v}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 mt-2 border-t border-brand-200">
            <span className="text-sm font-bold text-brand-800">कुल बकाया</span>
            <span className={`text-sm font-bold ${bill.finalBalance > 0 ? 'text-red-600' : 'text-brand-700'}`}>
              ₹{bill.finalBalance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          🙏 Thank you for being our valued customer. — {dairy?.dairyName}
        </p>
        <p className="text-center text-[10px] text-gray-300 mt-1">Generated by DairySetu · हर बूंद का हिसाब</p>
      </div>

      {/* Payments */}
      {payments?.length > 0 && (
        <Card className="mt-5">
          <CardHeader><CardTitle>भुगतान इतिहास</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {payments.map((p: any) => (
              <div key={p._id} className="flex justify-between py-2 border-b border-gray-50 last:border-0 text-sm">
                <div>
                  <p className="font-medium">{formatDate(p.paymentDate)}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.paymentMethod} · {p.receiptNumber}</p>
                </div>
                <span className="font-bold text-brand-700">₹{p.amount.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
