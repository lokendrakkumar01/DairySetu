import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function format(date: Date | string, pattern?: string): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  if (pattern === 'yyyy-MM-dd') return `${yyyy}-${mm}-${dd}`
  return `${dd}-${mm}-${yyyy}`
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '—'
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return '—'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  } catch {
    return '—'
  }
}

export function formatDateLong(date: string | Date | undefined | null): string {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

export function formatQuantity(qty: number): string {
  return `${parseFloat(qty.toFixed(1))} L`
}

export function getMonthName(month: number): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return months[(month - 1) % 12]
}

export function getMonthNameHindi(month: number): string {
  const months = ['जनवरी','फरवरी','मार्च','अप्रैल','मई','जून','जुलाई','अगस्त','सितंबर','अक्टूबर','नवंबर','दिसंबर']
  return months[(month - 1) % 12]
}

export function generateWhatsAppMessage(bill: any, customer: any, dairyName: string, whatsapp?: string): string {
  const monthName = getMonthName(bill.billMonth)
  const msg = `🥛 *${dairyName}*\n\nनमस्ते ${customer.fullName} जी,\n\nआपका ${monthName} ${bill.billYear} का दूध बिल तैयार है।\n\n📊 *मासिक विवरण:*\n🥛 कुल दूध: ${bill.totalQuantity} लीटर\n💰 दूध की राशि: ₹${bill.milkCharges}\n✅ भुगतान प्राप्त: ₹${bill.paymentsReceived}\n⚠️ बकाया राशि: ₹${bill.finalBalance}\n\nDairySetu - हर बूंद का हिसाब 🌿`
  const phone = whatsapp || customer.mobile || ''
  const cleanPhone = phone.replace(/\D/g, '')
  const indiaPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`
  return `https://wa.me/${indiaPhone}?text=${encodeURIComponent(msg)}`
}

export function generatePaymentReminderWhatsApp(customer: any, dairyName: string): string {
  const msg = `🥛 *${dairyName}*\n\nनमस्ते ${customer.fullName} जी,\n\nआपकी बकाया राशि: ₹${customer.currentBalance} है।\n\nकृपया जल्द भुगतान करें।\n\nधन्यवाद 🙏`
  const phone = (customer.mobile || '').replace(/\D/g, '')
  const indiaPhone = phone.startsWith('91') ? phone : `91${phone}`
  return `https://wa.me/${indiaPhone}?text=${encodeURIComponent(msg)}`
}
