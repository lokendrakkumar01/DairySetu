import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, MapPin, KeyRound, ShieldCheck, Check, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import toast from 'react-hot-toast'

export default function MyProfile() {
  const { user } = useAuth()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword || !newPassword) {
      toast.error('कृपया सभी फ़ील्ड भरें (Please fill all fields)')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('नया पासवर्ड मेल नहीं खाता (Passwords do not match)')
      return
    }
    if (newPassword.length < 6) {
      toast.error('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए (Min 6 characters)')
      return
    }

    try {
      setLoading(true)
      await api.post('/auth/admin/change-password', {
        currentPassword: oldPassword,
        newPassword,
      })
      toast.success('पासवर्ड सफलतापूर्वक बदल गया! (Password updated successfully)')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'पासवर्ड बदलने में विफल (Failed to change password)')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-5 max-w-xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-800">मेरी प्रोफ़ाइल</h1>
        <p className="text-xs text-gray-500">My Profile & Account Settings</p>
      </div>

      {/* Customer Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4"
      >
        <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center font-bold text-xl">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{user?.name}</h2>
            <p className="text-xs text-emerald-600 font-medium">ग्राहक आईडी: {user?.customerId || 'N/A'}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              सक्रिय ग्राहक (Active)
            </span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-gray-600">
            <Phone className="w-4 h-4 text-gray-400" />
            <span>मोबाइल: <strong className="text-gray-800 font-semibold">{user?.mobile || 'N/A'}</strong></span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <User className="w-4 h-4 text-gray-400" />
            <span>यूज़रनेम: <strong className="text-gray-800 font-semibold">{user?.username || user?.mobile}</strong></span>
          </div>
          <div className="flex items-center gap-3 text-gray-600">
            <ShieldCheck className="w-4 h-4 text-gray-400" />
            <span>डेयरी कोड: <strong className="text-gray-800 font-semibold">{user?.dairyId?.dairyCode || 'DS'}</strong></span>
          </div>
        </div>
      </motion.div>

      {/* Change Password Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
          <KeyRound className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-800">पासवर्ड बदलें (Change Password)</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">वर्तमान पासवर्ड (Current Password)</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">नया पासवर्ड (New Password)</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="नया पासवर्ड दर्ज करें"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">नया पासवर्ड दोबारा लिखें (Confirm New Password)</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="दोबारा दर्ज करें"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition shadow-sm shadow-emerald-200"
          >
            {loading ? 'बदल रहे हैं...' : 'पासवर्ड अपडेट करें (Update Password)'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
