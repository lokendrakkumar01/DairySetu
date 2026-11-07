import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, CalendarDays, FileText, CreditCard, User, Droplets, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const bottomNavItems = [
  { to: '/customer/dashboard', icon: Home, label: 'Home', labelHi: 'होम' },
  { to: '/customer/milk-history', icon: CalendarDays, label: 'Milk', labelHi: 'दूध' },
  { to: '/customer/bills', icon: FileText, label: 'Bills', labelHi: 'बिल' },
  { to: '/customer/payments', icon: CreditCard, label: 'Payments', labelHi: 'भुगतान' },
  { to: '/customer/profile', icon: User, label: 'Profile', labelHi: 'प्रोफाइल' },
]

export default function CustomerLayout() {
  const { logout, user, dairy } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-brand-600 text-white px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <Droplets className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{dairy?.dairyName || 'DairySetu'}</p>
              <p className="text-[10px] text-brand-200 leading-tight">{dairy?.ownerName || ''}</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/customer/login') }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-around px-2 py-1">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors
                ${isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                  <span className="text-[10px] font-medium">{item.labelHi}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
