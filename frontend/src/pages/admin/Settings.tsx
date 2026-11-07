import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageLoader } from '@/components/ui/loading-spinner'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import toast from 'react-hot-toast'

export default function Settings() {
  const { dairy, updateDairy } = useAuth()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'profile' | 'billing'>('profile')
  const [form, setForm] = useState({
    dairyName: dairy?.dairyName || '',
    ownerName: dairy?.ownerName || '',
    address: dairy?.address || '',
    village: dairy?.village || '',
    whatsappNumber: dairy?.whatsappNumber || '',
    language: dairy?.language || 'hi',
  })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const updateMutation = useMutation({
    mutationFn: (body: any) => api.put('/api/admin/profile', body),
    onSuccess: (res) => {
      updateDairy(res.data.data)
      toast.success('Profile updated!')
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  })

  const pwMutation = useMutation({
    mutationFn: (body: any) => api.post('/api/auth/admin/change-password', body),
    onSuccess: () => {
      toast.success('Password changed!')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Error'),
  })

  const handlePwChange = () => {
    if (!pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error('Passwords do not match'); return
    }
    pwMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">डेयरी प्रोफाइल और सेटिंग्स</p>
      </div>

      {/* Tab */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1 w-fit">
        {(['profile', 'billing'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white shadow-sm text-brand-700' : 'text-gray-500'}`}>
            {t === 'profile' ? '👤 Profile' : '⚙️ Security'}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <Card>
          <CardHeader><CardTitle>डेयरी प्रोफाइल</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'डेयरी का नाम', key: 'dairyName', placeholder: 'Shree Gau Dairy' },
                { label: 'मालिक का नाम', key: 'ownerName', placeholder: 'Ramesh Kumar' },
                { label: 'गाँव / शहर', key: 'village', placeholder: 'Ramnagar' },
                { label: 'WhatsApp Number', key: 'whatsappNumber', placeholder: '9876543210' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">पता (Address)</label>
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="Main Road, Near Temple"
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">भाषा (Language)</label>
                <select value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
                  <option value="hi">हिंदी</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <Button onClick={() => updateMutation.mutate(form)} loading={updateMutation.isPending} className="mt-2">
              Profile Save करें ✓
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === 'billing' && (
        <Card>
          <CardHeader><CardTitle>Password Change</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Current Password', key: 'currentPassword', placeholder: '••••••' },
              { label: 'New Password', key: 'newPassword', placeholder: '••••••' },
              { label: 'Confirm Password', key: 'confirmPassword', placeholder: '••••••' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                <input type="password" value={(pwForm as any)[f.key]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full h-10 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            ))}
            <Button onClick={handlePwChange} loading={pwMutation.isPending}>Password Change करें</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
