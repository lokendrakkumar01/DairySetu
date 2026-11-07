export const APP_NAME = 'DairySetu'
export const APP_TAGLINE = 'हर बूंद का हिसाब 🌿'

export const MILK_TYPES = [
  { value: 'cow', label: 'Cow / गाय', labelHi: 'गाय' },
  { value: 'buffalo', label: 'Buffalo / भैंस', labelHi: 'भैंस' },
  { value: 'mixed', label: 'Mixed / मिश्रित', labelHi: 'मिश्रित' },
] as const

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash / नकद' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank Transfer' },
  { value: 'other', label: 'Other / अन्य' },
] as const

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const MONTH_NAMES_HI = [
  'जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर',
]

export const BILL_STATUS = {
  draft: { label: 'Draft', color: 'yellow' },
  finalized: { label: 'Finalized', color: 'blue' },
  closed: { label: 'Paid', color: 'green' },
} as const

export const ROUTES = {
  ADMIN_LOGIN: '/admin/login',
  ADMIN_REGISTER: '/admin/register',
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_CUSTOMERS: '/admin/customers',
  ADMIN_CUSTOMER_DETAIL: '/admin/customers/:id',
  ADMIN_MILK_ENTRY: '/admin/milk-entry',
  ADMIN_BULK_ENTRY: '/admin/bulk-entry',
  ADMIN_BILLS: '/admin/bills',
  ADMIN_BILL_DETAIL: '/admin/bills/:id',
  ADMIN_PAYMENTS: '/admin/payments',
  ADMIN_ANALYTICS: '/admin/analytics',
  ADMIN_RATES: '/admin/rates',
  ADMIN_SETTINGS: '/admin/settings',
  CUSTOMER_LOGIN: '/customer/login',
  CUSTOMER_DASHBOARD: '/customer/dashboard',
  CUSTOMER_MILK_HISTORY: '/customer/milk-history',
  CUSTOMER_BILLS: '/customer/bills',
  CUSTOMER_PAYMENTS: '/customer/payments',
  CUSTOMER_PROFILE: '/customer/profile',
} as const
