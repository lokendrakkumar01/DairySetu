// Shared TypeScript types for DairySetu frontend

export type MilkType = 'cow' | 'buffalo' | 'mixed'
export type UserRole = 'admin' | 'customer'
export type BillStatus = 'draft' | 'finalized' | 'closed'
export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'other'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface User {
  id: string
  username: string
  role: UserRole
  dairyId: any
  customerId?: string
  name?: string
  mobile?: string
}

export interface Dairy {
  _id: string
  dairyName: string
  ownerName: string
  mobile: string
  email?: string
  address?: string
  village?: string
  logoUrl?: string
  whatsappNumber?: string
  language: 'en' | 'hi'
  currency: string
}

export interface Customer {
  _id: string
  customerId: string
  fullName: string
  mobile: string
  address?: string
  village?: string
  joinDate: string
  milkType: MilkType
  defaultMorningQty: number
  defaultEveningQty: number
  currentBalance: number
  isActive: boolean
}

export interface MilkRecord {
  _id: string
  customerId: string | Customer
  date: string
  morningQty: number
  eveningQty: number
  totalQty: number
  milkType: MilkType
  rateApplied: number
  amount: number
  remarks?: string
  isHoliday: boolean
}

export interface MilkRate {
  _id: string
  customerId?: string
  milkType: MilkType
  ratePerLitre: number
  effectiveFrom: string
  effectiveTo?: string
}

export interface DailySnapshot {
  date: string
  morning: number
  evening: number
  total: number
  rate: number
  amount: number
}

export interface MonthlyBill {
  _id: string
  customerId: string | Customer
  billMonth: number
  billYear: number
  billNumber: string
  totalQuantity: number
  milkCharges: number
  previousBalance: number
  paymentsReceived: number
  adjustments: number
  finalBalance: number
  status: BillStatus
  dailySnapshot: DailySnapshot[]
  finalizedAt?: string
}

export interface Payment {
  _id: string
  customerId: string | Customer
  amount: number
  paymentMethod: PaymentMethod
  paymentDate: string
  reference?: string
  notes?: string
  receiptNumber: string
  isReversed: boolean
}

export interface DashboardData {
  totalCustomers: number
  activeCustomers: number
  todayMilkTotal: number
  morningTotal: number
  eveningTotal: number
  monthlyRevenue: number
  totalOutstanding: number
  paymentsThisMonth: number
  recentEntries: MilkRecord[]
  topDebtors: Customer[]
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
  pagination?: {
    total: number
    page: number
    limit: number
    pages: number
  }
}
