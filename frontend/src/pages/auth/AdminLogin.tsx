import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Droplets, Eye, EyeOff, Lock, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  identifier: z.string().min(1, 'Username/Mobile is required'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function AdminLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/api/auth/admin/login', data)
      const { accessToken, refreshToken, user, dairy } = res.data.data
      login({ accessToken, refreshToken }, user, dairy)
      toast.success(`स्वागत है, ${dairy?.ownerName || user.username}!`)
      navigate('/admin/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 flex items-center justify-center p-4">
      {/* Background decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-32 -translate-x-32" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm"
      >
        {/* Logo Card */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"
          >
            <Droplets className="w-8 h-8 text-brand-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white">DairySetu</h1>
          <p className="text-brand-200 text-sm mt-1">हर बूंद का हिसाब, अब डिजिटल अंदाज़ में।</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Admin Login</h2>
          <p className="text-sm text-gray-500 mb-6">अपने डेयरी खाते में लॉगिन करें</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile / Username</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('identifier')}
                  placeholder="9876543210"
                  className="w-full h-11 pl-10 pr-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {errors.identifier && <p className="text-xs text-red-500 mt-1">{errors.identifier.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full h-11 pl-10 pr-10 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full h-11 text-base font-semibold rounded-xl">
              Login करें
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            नया खाता?{' '}
            <Link to="/admin/register" className="text-brand-600 font-medium hover:underline">
              रजिस्ट्रेशन करें
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-brand-200 mt-6">
          Customer Login?{' '}
          <Link to="/customer/login" className="text-white font-medium hover:underline">Click here</Link>
        </p>
      </motion.div>
    </div>
  )
}
