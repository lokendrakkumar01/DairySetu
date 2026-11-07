import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Droplets, Eye, EyeOff, User, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
})
type FormData = z.infer<typeof schema>

export default function CustomerLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/api/auth/customer/login', data)
      const { accessToken, refreshToken, user } = res.data.data
      login({ accessToken, refreshToken }, user)
      toast.success('Welcome! स्वागत है 🥛')
      navigate('/customer/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-800 to-brand-500 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Droplets className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">DairySetu</h1>
          <p className="text-brand-100 text-sm mt-1">ग्राहक पोर्टल</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Customer Login</h2>
          <p className="text-sm text-gray-500 mb-6">अपने Customer ID और Password से लॉगिन करें</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID / Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('username')}
                  placeholder="ds001"
                  className="w-full h-11 pl-10 pr-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
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
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPass ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <Button type="submit" loading={isSubmitting} className="w-full h-11 text-base font-semibold rounded-xl">
              Login करें
            </Button>
          </form>

          <div className="mt-5 p-3 bg-brand-50 rounded-xl">
            <p className="text-xs text-brand-700 font-medium">💡 नोट:</p>
            <p className="text-xs text-brand-600 mt-1">आपका Customer ID और Password आपके मिल्कमैन से प्राप्त करें।</p>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Admin?{' '}
            <Link to="/admin/login" className="text-brand-600 font-medium hover:underline">Admin Login</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
