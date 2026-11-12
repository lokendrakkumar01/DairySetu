import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Droplets } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const schema = z.object({
  ownerName: z.string().trim().min(2, 'Enter your name'),
  mobile: z.string().trim().regex(/^[0-9+()\-\s]{10,15}$/, 'Enter a valid mobile number'),
  email: z.union([z.string().email('Enter a valid email'), z.literal('')]).optional(),
  dairyName: z.string().trim().min(2, 'Enter your dairy name'),
  village: z.string().optional(),
  address: z.string().optional(),
  password: z.string().min(6, 'Use at least 6 characters').max(100),
  confirmPassword: z.string(),
}).refine(values => values.password === values.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

const inputClass = 'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'

export default function AdminRegister() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async ({ confirmPassword: _confirmPassword, ...values }: FormData) => {
    try {
      const payload = { ...values, email: values.email || undefined }
      const response = await api.post('/api/auth/admin/register', payload)
      const { accessToken, refreshToken, user, dairy } = response.data.data
      login({ accessToken, refreshToken }, user, dairy)
      toast.success('Dairy account ready!')
      navigate('/admin/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.')
    }
  }

  return <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 p-4 flex items-center justify-center">
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
      <div className="mb-5 text-center text-white"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg"><Droplets className="h-6 w-6 text-emerald-700" /></div><h1 className="text-xl font-bold">DairySetu</h1><p className="mt-1 text-sm text-emerald-100">Create your dairy account</p></div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
        <div><h2 className="text-lg font-bold text-gray-900">Start managing your dairy</h2><p className="mt-1 text-sm text-gray-500">Fill this once. Your account will stay signed in on this device.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Owner name *" error={errors.ownerName?.message}><input {...register('ownerName')} autoComplete="name" placeholder="Ramesh Kumar" className={inputClass} /></Field>
          <Field label="Mobile number *" error={errors.mobile?.message}><input {...register('mobile')} type="tel" inputMode="tel" autoComplete="tel" placeholder="9876543210" className={inputClass} /></Field>
          <Field label="Dairy name *" error={errors.dairyName?.message}><input {...register('dairyName')} autoComplete="organization" placeholder="Shree Gau Dairy" className={inputClass} /></Field>
          <Field label="Email (optional)" error={errors.email?.message}><input {...register('email')} type="email" autoComplete="email" placeholder="you@example.com" className={inputClass} /></Field>
          <Field label="Village / city"><input {...register('village')} autoComplete="address-level2" placeholder="Village name" className={inputClass} /></Field>
          <Field label="Address"><input {...register('address')} autoComplete="street-address" placeholder="Street or area" className={inputClass} /></Field>
          <Field label="Create password *" error={errors.password?.message}><input {...register('password')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 6 characters" className={inputClass} /></Field>
          <Field label="Confirm password *" error={errors.confirmPassword?.message}><input {...register('confirmPassword')} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Enter it again" className={inputClass} /></Field>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-500"><input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-emerald-700" />Show passwords</label>
        <Button type="submit" loading={isSubmitting} className="h-12 w-full rounded-xl bg-emerald-700 text-base hover:bg-emerald-800">Create account & continue</Button>
        <p className="text-center text-sm text-gray-500">Already registered? <Link to="/admin/login" className="font-semibold text-emerald-700 hover:underline">Sign in</Link></p>
      </form>
    </motion.div>
  </div>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-gray-600">{label}</span>{children}{error && <span className="mt-1 block text-xs text-red-600">{error}</span>}</label>
}
