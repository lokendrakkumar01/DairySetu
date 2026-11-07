import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Droplets, ArrowRight, ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const step1Schema = z.object({
  ownerName: z.string().min(2, 'Name must be at least 2 characters'),
  mobile: z.string().min(10, 'Enter valid mobile number').max(15),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
})
const step2Schema = z.object({
  dairyName: z.string().min(2, 'Dairy name required'),
  village: z.string().optional(),
  address: z.string().optional(),
})
const step3Schema = z.object({
  password: z.string().min(6, 'Min 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>
type Step3 = z.infer<typeof step3Schema>

const steps = [
  { title: 'Personal Info', titleHi: 'व्यक्तिगत जानकारी' },
  { title: 'Dairy Details', titleHi: 'डेयरी की जानकारी' },
  { title: 'Set Password', titleHi: 'पासवर्ड बनाएं' },
]

export default function AdminRegister() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<Partial<Step1 & Step2 & Step3>>({})
  const [loading, setLoading] = useState(false)

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema) })
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) })
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema) })

  const handleStep1 = (data: Step1) => { setFormData(p => ({ ...p, ...data })); setStep(1) }
  const handleStep2 = (data: Step2) => { setFormData(p => ({ ...p, ...data })); setStep(2) }

  const handleStep3 = async (data: Step3) => {
    setLoading(true)
    const payload = { ...formData, ...data }
    try {
      const res = await api.post('/api/auth/admin/register', payload)
      const { accessToken, refreshToken, user, dairy } = res.data.data
      login({ accessToken, refreshToken }, user, dairy)
      toast.success('Account created! Welcome to DairySetu 🥛')
      navigate('/admin/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl">
            <Droplets className="w-7 h-7 text-brand-600" />
          </div>
          <h1 className="text-xl font-bold text-white">DairySetu</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${i < step ? 'bg-brand-500 text-white' : i === step ? 'bg-brand-100 text-brand-700 border-2 border-brand-500' : 'bg-gray-100 text-gray-400'}`}>
                  {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-brand-500' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>

          <h2 className="text-base font-bold text-gray-900 mb-4">{steps[step].titleHi}</h2>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.form key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={form1.handleSubmit(handleStep1)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">आपका नाम *</label>
                  <input {...form1.register('ownerName')} placeholder="Ramesh Kumar" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  {form1.formState.errors.ownerName && <p className="text-xs text-red-500 mt-1">{form1.formState.errors.ownerName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number *</label>
                  <input {...form1.register('mobile')} placeholder="9876543210" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  {form1.formState.errors.mobile && <p className="text-xs text-red-500 mt-1">{form1.formState.errors.mobile.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input {...form1.register('email')} placeholder="email@example.com" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <Button type="submit" className="w-full">आगे बढ़ें <ArrowRight className="w-4 h-4" /></Button>
              </motion.form>
            )}
            {step === 1 && (
              <motion.form key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={form2.handleSubmit(handleStep2)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">डेयरी का नाम *</label>
                  <input {...form2.register('dairyName')} placeholder="Shree Gau Dairy" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  {form2.formState.errors.dairyName && <p className="text-xs text-red-500 mt-1">{form2.formState.errors.dairyName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">गाँव / शहर</label>
                  <input {...form2.register('village')} placeholder="Ramnagar" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">पता (Address)</label>
                  <input {...form2.register('address')} placeholder="Main Road, Near Temple" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(0)}><ArrowLeft className="w-4 h-4" /></Button>
                  <Button type="submit" className="flex-1">आगे बढ़ें <ArrowRight className="w-4 h-4" /></Button>
                </div>
              </motion.form>
            )}
            {step === 2 && (
              <motion.form key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                onSubmit={form3.handleSubmit(handleStep3)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input {...form3.register('password')} type="password" placeholder="Min 6 characters" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  {form3.formState.errors.password && <p className="text-xs text-red-500 mt-1">{form3.formState.errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <input {...form3.register('confirmPassword')} type="password" placeholder="Re-enter password" className="w-full h-10 px-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  {form3.formState.errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{form3.formState.errors.confirmPassword.message}</p>}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /></Button>
                  <Button type="submit" loading={loading} className="flex-1">Account बनाएं ✓</Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have account?{' '}
            <Link to="/admin/login" className="text-brand-600 font-medium hover:underline">Login करें</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
