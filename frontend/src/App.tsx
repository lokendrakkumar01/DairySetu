import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const CustomerLayout = lazy(() => import('@/layouts/CustomerLayout'))
const AdminLogin = lazy(() => import('@/pages/auth/AdminLogin'))
const AdminRegister = lazy(() => import('@/pages/auth/AdminRegister'))
const CustomerLogin = lazy(() => import('@/pages/auth/CustomerLogin'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const Customers = lazy(() => import('@/pages/admin/Customers'))
const CustomerDetail = lazy(() => import('@/pages/admin/CustomerDetail'))
const CustomerMilkEntry = lazy(() => import('@/pages/admin/MilkEntry'))
const MilkCollection = lazy(() => import('@/pages/admin/MilkCollection'))
const Bills = lazy(() => import('@/pages/admin/Bills'))
const BillDetail = lazy(() => import('@/pages/admin/BillDetail'))
const Payments = lazy(() => import('@/pages/admin/Payments'))
const Analytics = lazy(() => import('@/pages/admin/Analytics'))
const Rates = lazy(() => import('@/pages/admin/Rates'))
const Settings = lazy(() => import('@/pages/admin/Settings'))
const CustomerDashboard = lazy(() => import('@/pages/customer/CustomerDashboard'))
const MilkHistory = lazy(() => import('@/pages/customer/MilkHistory'))
const MyBills = lazy(() => import('@/pages/customer/MyBills'))
const MyPayments = lazy(() => import('@/pages/customer/MyPayments'))
const MyProfile = lazy(() => import('@/pages/customer/MyProfile'))
import { PageLoader } from '@/components/ui/loading-spinner'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  if (!isAdmin) return <Navigate to="/customer/dashboard" replace />
  return <>{children}</>
}

function CustomerGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isCustomer, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/customer/login" replace />
  if (!isCustomer) return <Navigate to="/admin/dashboard" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { isAuthenticated, isAdmin, isCustomer } = useAuth()
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin/dashboard' : isCustomer ? '/customer/dashboard' : '/admin/login'} replace />
  return <Navigate to="/admin/login" replace />
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/register" element={<AdminRegister />} />
      <Route path="/customer/login" element={<CustomerLogin />} />

      {/* Admin Portal */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="milk-entry" element={<MilkCollection />} />
        <Route path="customer-supply" element={<CustomerMilkEntry />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/:id" element={<BillDetail />} />
        <Route path="payments" element={<Payments />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="rates" element={<Rates />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Customer Portal */}
      <Route
        path="/customer"
        element={
          <CustomerGuard>
            <CustomerLayout />
          </CustomerGuard>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="milk-history" element={<MilkHistory />} />
        <Route path="bills" element={<MyBills />} />
        <Route path="payments" element={<MyPayments />} />
        <Route path="profile" element={<MyProfile />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
    </Suspense>
  )
}
