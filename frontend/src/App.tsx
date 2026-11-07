import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import AdminLayout from '@/layouts/AdminLayout'
import CustomerLayout from '@/layouts/CustomerLayout'
import AdminLogin from '@/pages/auth/AdminLogin'
import AdminRegister from '@/pages/auth/AdminRegister'
import CustomerLogin from '@/pages/auth/CustomerLogin'
import Dashboard from '@/pages/admin/Dashboard'
import Customers from '@/pages/admin/Customers'
import CustomerDetail from '@/pages/admin/CustomerDetail'
import MilkEntry from '@/pages/admin/MilkEntry'
import Bills from '@/pages/admin/Bills'
import BillDetail from '@/pages/admin/BillDetail'
import Payments from '@/pages/admin/Payments'
import Analytics from '@/pages/admin/Analytics'
import Rates from '@/pages/admin/Rates'
import Settings from '@/pages/admin/Settings'
import CustomerDashboard from '@/pages/customer/CustomerDashboard'
import MilkHistory from '@/pages/customer/MilkHistory'
import MyBills from '@/pages/customer/MyBills'
import MyPayments from '@/pages/customer/MyPayments'
import MyProfile from '@/pages/customer/MyProfile'
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
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
        <Route path="milk-entry" element={<MilkEntry />} />
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
  )
}
