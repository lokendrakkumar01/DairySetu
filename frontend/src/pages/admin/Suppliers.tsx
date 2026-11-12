import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight, MapPin, Milk, Pencil, Plus, Search, UserRound, Users, Wallet } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type Supplier = { _id: string; supplierCode: string; fullName: string; mobile: string; address?: string; village?: string; milkTypes: ('cow' | 'buffalo')[]; upiId?: string; bankName?: string; accountNumber?: string; ifscCode?: string; status: 'active' | 'inactive'; registeredAt: string }
type SupplierForm = Omit<Supplier, '_id' | 'supplierCode' | 'registeredAt'>
const emptyForm: SupplierForm = { fullName: '', mobile: '', village: '', address: '', milkTypes: ['cow'], upiId: '', bankName: '', accountNumber: '', ifscCode: '', status: 'active' }

export default function Suppliers() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [profile, setProfile] = useState<Supplier | null>(null)
  const [form, setForm] = useState<SupplierForm>(emptyForm)
  const { data: suppliers = [], isLoading, isError } = useQuery<Supplier[]>({
    queryKey: ['suppliers', statusFilter],
    queryFn: async () => (await api.get('/api/suppliers', { params: { status: statusFilter === 'all' ? undefined : statusFilter, limit: 100 } })).data.data,
  })
  const { data: history } = useQuery({
    queryKey: ['supplier-profile', profile?._id],
    enabled: !!profile,
    queryFn: async () => (await api.get(`/api/suppliers/${profile!._id}`)).data.data,
  })
  const visible = useMemo(() => suppliers.filter(supplier =>
    `${supplier.fullName} ${supplier.supplierCode} ${supplier.mobile} ${supplier.village || ''}`.toLowerCase().includes(search.toLowerCase())
  ), [suppliers, search])

  const save = useMutation({
    mutationFn: async () => editing ? api.put(`/api/suppliers/${editing._id}`, form) : api.post('/api/suppliers', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success(editing ? 'Farmer profile updated' : 'Farmer registered')
      setOpen(false); setEditing(null); setForm(emptyForm)
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Could not save farmer'),
  })

  function startEdit(supplier: Supplier) {
    setEditing(supplier)
    setForm({ fullName: supplier.fullName, mobile: supplier.mobile, village: supplier.village || '', address: supplier.address || '', milkTypes: supplier.milkTypes, upiId: supplier.upiId || '', bankName: supplier.bankName || '', accountNumber: supplier.accountNumber || '', ifscCode: supplier.ifscCode || '', status: supplier.status })
    setOpen(true)
  }
  function toggleMilkType(type: 'cow' | 'buffalo') {
    setForm(current => ({ ...current, milkTypes: current.milkTypes.includes(type) ? current.milkTypes.filter(value => value !== type) : [...current.milkTypes, type] }))
  }
  function submit() {
    if (form.fullName.trim().length < 2 || form.mobile.replace(/\D/g, '').length < 10 || !form.milkTypes.length) {
      toast.error('Enter farmer name, a valid mobile number and at least one milk type'); return
    }
    save.mutate()
  }

  return <div className="min-h-full bg-slate-50/70 p-4 pb-8 sm:p-6 lg:p-8">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Milk suppliers</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Farmers</h1><p className="mt-1 text-sm text-slate-500">Manage milk suppliers, contact details and payment information.</p></div>
        <Button onClick={() => { setEditing(null); setForm(emptyForm); setOpen(true) }} className="h-11 rounded-xl bg-emerald-700 hover:bg-emerald-800"><Plus className="h-4 w-4" />Register farmer</Button>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Summary label="Registered farmers" value={suppliers.length} icon={<Users className="h-4 w-4" />} />
        <Summary label="Active suppliers" value={suppliers.filter(item => item.status === 'active').length} icon={<Milk className="h-4 w-4" />} />
        <Summary label="Cow & buffalo" value={suppliers.filter(item => item.milkTypes.length === 2).length} icon={<Milk className="h-4 w-4" />} hideMobile />
      </div>
      <Card className="border-slate-200 shadow-sm"><CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, farmer ID, mobile or village" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></div>
          <div className="flex rounded-xl bg-slate-100 p-1">{(['active', 'inactive', 'all'] as const).map(status => <button key={status} onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${statusFilter === status ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}>{status}</button>)}</div>
        </div>
        <div className="mt-4">
          {isLoading ? <p className="p-10 text-center text-sm text-slate-500">Loading farmer register…</p> : isError ? <p className="p-10 text-center text-sm text-rose-600">Farmer list could not be loaded.</p> : visible.length === 0 ? <div className="p-10 text-center"><Users className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">No farmers found</p><p className="mt-1 text-xs text-slate-500">Register your first milk supplier to start daily collection.</p></div> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visible.map(supplier => <article key={supplier._id} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-emerald-200 hover:shadow-sm sm:p-5">
              <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-slate-900">{supplier.fullName}</h2><p className="mt-0.5 text-xs text-slate-500">{supplier.supplierCode} · {supplier.mobile}</p></div></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${supplier.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{supplier.status}</span></div>
              <div className="mt-4 flex flex-wrap gap-1.5">{supplier.milkTypes.map(type => <span key={type} className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-600">{type} milk</span>)}</div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5 text-slate-400" />{supplier.village || supplier.address || 'Address not added'}</div>
              {(supplier.upiId || supplier.bankName) && <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><Wallet className="h-3.5 w-3.5 text-slate-400" />{supplier.upiId || supplier.bankName}</div>}
              <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3"><Button size="sm" variant="outline" className="flex-1" onClick={() => setProfile(supplier)}>Collection history<ChevronRight className="h-3.5 w-3.5" /></Button><Button size="sm" variant="ghost" aria-label="Edit farmer" onClick={() => startEdit(supplier)}><Pencil className="h-4 w-4" /></Button></div>
            </article>)}
          </div>}
        </div>
      </CardContent></Card>
    </div>

    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { setEditing(null); setForm(emptyForm) } }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl p-5 sm:p-6">
        <DialogHeader><DialogTitle>{editing ? 'Update farmer profile' : 'Register a farmer'}</DialogTitle><DialogDescription>Farmer details are kept private to this dairy.</DialogDescription></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Farmer name *"><input autoFocus value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} placeholder="Full name" className={fieldClass} /></FormField>
          <FormField label="Mobile number *"><input inputMode="tel" value={form.mobile} onChange={event => setForm({ ...form, mobile: event.target.value })} placeholder="10 digit mobile" className={fieldClass} /></FormField>
          <FormField label="Village"><input value={form.village} onChange={event => setForm({ ...form, village: event.target.value })} placeholder="Village / area" className={fieldClass} /></FormField>
          <FormField label="Milk supplied *"><div className="flex h-11 gap-2">{(['cow', 'buffalo'] as const).map(type => <button key={type} type="button" onClick={() => toggleMilkType(type)} className={`flex-1 rounded-xl border text-sm font-medium capitalize ${form.milkTypes.includes(type) ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'}`}>{type}</button>)}</div></FormField>
          <FormField label="Full address"><input value={form.address} onChange={event => setForm({ ...form, address: event.target.value })} placeholder="Street, village" className={fieldClass} /></FormField>
          <FormField label="UPI ID"><input value={form.upiId} onChange={event => setForm({ ...form, upiId: event.target.value })} placeholder="name@bank" className={fieldClass} /></FormField>
          <FormField label="Bank name"><input value={form.bankName} onChange={event => setForm({ ...form, bankName: event.target.value })} placeholder="Bank name" className={fieldClass} /></FormField>
          <FormField label="Account number"><input inputMode="numeric" value={form.accountNumber} onChange={event => setForm({ ...form, accountNumber: event.target.value })} placeholder="Account number" className={fieldClass} /></FormField>
          <FormField label="IFSC code"><input value={form.ifscCode} onChange={event => setForm({ ...form, ifscCode: event.target.value.toUpperCase() })} placeholder="ABCD0123456" className={fieldClass} /></FormField>
          {editing && <FormField label="Supplier status"><select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as SupplierForm['status'] })} className={fieldClass}><option value="active">Active</option><option value="inactive">Inactive</option></select></FormField>}
        </div>
        <DialogFooter className="gap-2 pt-1"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button loading={save.isPending} onClick={submit} className="bg-emerald-700 hover:bg-emerald-800">{editing ? 'Save changes' : 'Register farmer'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!profile} onOpenChange={value => !value && setProfile(null)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl p-5 sm:p-6">
        <DialogHeader><DialogTitle>{profile?.fullName}</DialogTitle><DialogDescription>{profile?.supplierCode} · {profile?.mobile} · Supplier collection history</DialogDescription></DialogHeader>
        <div className="grid grid-cols-3 gap-2"><HistoryMetric label="Total milk" value={`${Number(history?.summary?.litres || 0).toFixed(1)} L`} /><HistoryMetric label="Payable" value={formatCurrency(Number(history?.summary?.payable || 0))} /><HistoryMetric label="Entries" value={String(history?.summary?.collections || 0)} /></div>
        <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100">{history?.recent?.length ? history.recent.map((record: any) => <div key={record._id} className="flex items-center justify-between gap-3 px-3 py-3"><div><p className="text-sm font-medium capitalize text-slate-800">{record.milkType} · {record.session}</p><p className="text-xs text-slate-500">{new Date(record.collectionDate).toLocaleDateString('en-IN')} · Fat {record.fatPercent}% · SNF {record.snfPercent}%</p></div><div className="text-right"><p className="text-sm font-semibold text-slate-800">{record.quantityKg} kg</p><p className="text-xs text-emerald-700">{formatCurrency(record.amount)}</p></div></div>) : <p className="p-6 text-center text-sm text-slate-500">No collection history yet.</p>}</div>
      </DialogContent>
    </Dialog>
  </div>
}

const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
function FormField({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>{children}</label> }
function Summary({ label, value, icon, hideMobile }: { label: string; value: number; icon: React.ReactNode; hideMobile?: boolean }) { return <Card className={`${hideMobile ? 'hidden sm:block' : ''} border-slate-200 shadow-sm`}><CardContent className="p-4 sm:p-5"><div className="flex items-center gap-2 text-emerald-700"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">{icon}</span><span className="text-xs text-slate-500">{label}</span></div><p className="mt-3 text-2xl font-bold text-slate-900">{value}</p></CardContent></Card> }
function HistoryMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-900">{value}</p></div> }
