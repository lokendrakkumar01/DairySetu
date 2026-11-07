import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Milk, FileText, CreditCard,
  BarChart3, Settings, LogOut, Menu, X, ChevronRight, Droplets
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard', labelHi: 'डैशबोर्ड' },
  { to: '/admin/milk-entry', icon: Milk, label: 'Milk Entry', labelHi: 'दूध एंट्री' },
  { to: '/admin/customers', icon: Users, label: 'Customers', labelHi: 'ग्राहक' },
  { to: '/admin/bills', icon: FileText, label: 'Bills', labelHi: 'बिल' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments', labelHi: 'भुगतान' },
  { to: '/admin/analytics', icon: BarChart3, label: 'Analytics', labelHi: 'रिपोर्ट' },
  { to: '/admin/rates', icon: Droplets, label: 'Rates', labelHi: 'दर' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', labelHi: 'सेटिंग' },
]

const bottomNavItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/admin/milk-entry', icon: Milk, label: 'Entry' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
  { to: '/admin/bills', icon: FileText, label: 'Bills' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
]

export default function AdminLayout() {
  const { logout, dairy, user } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-100 shadow-sm">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">DairySetu</p>
              <p className="text-xs text-gray-400 truncate max-w-[140px]">{dairy?.dairyName || 'Admin Panel'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all duration-150 group
                ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-brand-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info & logout */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-gray-50 mb-2">
            <div className="w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {dairy?.ownerName?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{dairy?.ownerName || user?.username}</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-72 bg-white z-50 lg:hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">DairySetu</p>
                    <p className="text-xs text-gray-400 truncate max-w-[130px]">{dairy?.dairyName}</p>
                  </div>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto py-3 px-3">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-sm font-medium transition-all
                      ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'}`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.labelHi}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="p-3 border-t border-gray-100">
                <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-3 text-sm text-red-500 hover:bg-red-50 rounded-xl">
                  <LogOut className="w-4 h-4" /> Logout / बाहर निकलें
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header (mobile) */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-sm text-gray-800">{dairy?.dairyName || 'DairySetu'}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 safe-area">
          <div className="flex items-center justify-around px-2 py-1">
            {bottomNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl min-w-[56px] transition-colors
                  ${isActive ? 'text-brand-600' : 'text-gray-400'}`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  )
}
