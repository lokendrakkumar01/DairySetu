import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Check, ChevronLeft, ChevronRight, Clock3, Droplets, FlaskConical, Pencil, RefreshCw, Search, Thermometer, Trash2, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import api from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

type Customer = { _id: string; customerId: string; fullName: string; mobile: string; village?: string; milkType: 'cow' | 'buffalo' | 'mixed' }
type Procurement = {
  _id: string; customerId?: Customer | string; supplierId?: { _id: string; supplierCode: string; fullName: string; mobile: string; village?: string } | string; collectionDate: string; session: 'morning' | 'evening'; milkType: 'cow' | 'buffalo';
  quantityKg: number; fatPercent: number; snfPercent: number; temperatureC?: number; ratePerKg: number; amount: number; qualityStatus: 'accepted' | 'rejected'; receiptNumber: string
}
type FormState = { customerId: string; collectionDate: string; session: 'morning' | 'evening'; milkType: 'cow' | 'buffalo'; quantityKg: string; fatPercent: string; snfPercent: string; temperatureC: string; ratePerKg: string; qualityStatus: 'accepted' | 'rejected'; notes: string }

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const blankForm = (): FormState => ({ customerId: '', collectionDate: today(), session: new Date().getHours() < 12 ? 'morning' : 'evening', milkType: 'cow', quantityKg: '', fatPercent: '', snfPercent: '', temperatureC: '', ratePerKg: '', qualityStatus: 'accepted', notes: '' })
const numberValue = (value: string) => value === '' ? 0 : Number(value)

export default function MilkCollection() {
  const qc = useQueryClient()
  const [date, setDate] = useState(today())
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<FormState>(blankForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [customerOpen, setCustomerOpen] = useState(false)

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['customers', 'active', 'milk-collection'],
    queryFn: async () => (await api.get('/api/customers', { params: { status: 'active', limit: 200 } })).data.data,
  })
  const { data: purchaseRates = [] } = useQuery<any[]>({
    queryKey: ['rates', 'purchase', form.customerId, form.milkType, form.collectionDate],
    enabled: !!form.customerId,
    queryFn: async () => (await api.get('/api/milk-rates', { params: { customerId: form.customerId, rateUnit: 'kg', asOf: form.collectionDate } })).data.data,
  })
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['milk-procurement', date],
    queryFn: async () => {
      const response = await api.get('/api/milk-procurement', { params: { date, limit: 200 } })
      return { records: response.data.data as Procurement[], summary: response.data.pagination?.summary }
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        quantityKg: Number(form.quantityKg),
        fatPercent: Number(form.fatPercent),
        snfPercent: Number(form.snfPercent),
        temperatureC: form.temperatureC ? Number(form.temperatureC) : undefined,
        ratePerKg: Number(form.ratePerKg),
      }
      return editingId
        ? api.put(`/api/milk-procurement/${editingId}`, payload)
        : api.post('/api/milk-procurement', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milk-procurement'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(editingId ? 'Collection record updated' : 'Milk collection saved')
      clearForm()
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Could not save collection'),
  })

  const remove = useMutation({
    mutationFn: (record: Procurement) => api.delete(`/api/milk-procurement/${record._id}`),
    onSuccess: (_response, record) => {
      qc.invalidateQueries({ queryKey: ['milk-procurement'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      if (editingId === record._id) clearForm()
      toast.success('Collection entry deleted')
    },
    onError: (error: any) => toast.error(error.response?.data?.message || 'Could not delete collection'),
  })

  const records = data?.records || []
  const summary = data?.summary || { totalKg: 0, acceptedKg: 0, rejectedKg: 0, payable: 0, averageFat: 0, averageSnf: 0 }
  const selectedCustomer = customers.find(customer => customer._id === form.customerId)
  const filteredCustomers = useMemo(() => customers.filter(customer =>
    `${customer.fullName} ${customer.customerId} ${customer.mobile} ${customer.village || ''}`.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8), [customers, search])
  const configuredPurchaseRate = useMemo(() => {
    if (!form.customerId) return null
    const customerRateFor = (type: string) => purchaseRates.find(rate => {
      const rateCustomerId = typeof rate.customerId === 'string' ? rate.customerId : rate.customerId?._id
      return rateCustomerId === form.customerId && rate.milkType === type
    })
    const dairyRateFor = (type: string) => purchaseRates.find(rate => !rate.customerId && rate.milkType === type)
    const rate = customerRateFor(form.milkType) || customerRateFor('mixed') || dairyRateFor(form.milkType) || dairyRateFor('mixed')
    return rate ? Number(rate.ratePerLitre) : null
  }, [purchaseRates, form.customerId, form.milkType])
  const amount = form.qualityStatus === 'accepted' ? numberValue(form.quantityKg) * numberValue(form.ratePerKg) : 0

  useEffect(() => {
    if (!editingId && configuredPurchaseRate !== null) {
      setForm(current => ({ ...current, ratePerKg: String(configuredPurchaseRate) }))
    }
  }, [configuredPurchaseRate, editingId])

  function clearForm() {
    setForm(blankForm())
    setSearch('')
    setEditingId(null)
    setCustomerOpen(false)
  }

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(current => ({ ...current, [key]: value, ...(!editingId && (key === 'collectionDate' || key === 'milkType') ? { ratePerKg: '' } : {}) }))
    if (key === 'collectionDate') setDate(value as string)
  }

  function editRecord(record: Procurement) {
    const customerId = record.customerId ? (typeof record.customerId === 'string' ? record.customerId : record.customerId._id) : ''
    setForm({
      customerId,
      collectionDate: record.collectionDate.slice(0, 10),
      session: record.session,
      milkType: record.milkType,
      quantityKg: String(record.quantityKg),
      fatPercent: String(record.fatPercent),
      snfPercent: String(record.snfPercent),
      temperatureC: record.temperatureC == null ? '' : String(record.temperatureC),
      ratePerKg: String(record.ratePerKg),
      qualityStatus: record.qualityStatus,
      notes: '',
    })
    setEditingId(record._id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function submit() {
    if (!form.customerId) { toast.error('Select a registered customer first'); return }
    if (!form.quantityKg || !form.fatPercent || !form.snfPercent || !form.ratePerKg) {
      toast.error('Enter quantity, fat, SNF and purchase rate'); return
    }
    if (selectedCustomer && selectedCustomer.milkType !== 'mixed' && selectedCustomer.milkType !== form.milkType) {
      toast.error(`This customer is not registered for ${form.milkType} milk`); return
    }
    save.mutate()
  }

  function shiftDate(days: number) {
    const selected = new Date(`${date}T12:00:00`)
    selected.setDate(selected.getDate() + days)
    const nextDate = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`
    setDate(nextDate)
    setForm(current => ({ ...current, collectionDate: nextDate }))
  }

  return (
    <div className="min-h-full bg-slate-50/70 p-4 pb-8 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Milk procurement · Customer register</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Milk collection</h1>
            <p className="mt-1 text-sm text-slate-500">Record machine weight, fat and SNF for a registered customer.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white p-1 sm:self-auto">
            <Button variant="ghost" size="icon" aria-label="Previous day" onClick={() => shiftDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <input aria-label="Collection register date" type="date" value={date} max={today()} onChange={event => { setDate(event.target.value); change('collectionDate', event.target.value) }} className="h-10 min-w-0 rounded-lg border-0 bg-transparent px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            <Button variant="ghost" size="icon" aria-label="Next day" disabled={date >= today()} onClick={() => shiftDate(1)}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Today" onClick={() => { setDate(today()); setForm(current => ({ ...current, collectionDate: today() })) }}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric icon={<Droplets className="h-4 w-4" />} label="Milk received" value={`${Number(summary.totalKg).toFixed(1)} kg`} detail={`${Number(summary.acceptedKg).toFixed(1)} kg accepted`} />
          <Metric icon={<Activity className="h-4 w-4" />} label="Avg. fat / SNF" value={`${Number(summary.averageFat).toFixed(1)}% / ${Number(summary.averageSnf).toFixed(1)}%`} detail="Analyzer readings" />
          <Metric icon={<Check className="h-4 w-4" />} label="Purchase payable" value={formatCurrency(Number(summary.payable))} detail={`${records.length} collection entries`} />
          <Metric icon={<X className="h-4 w-4" />} label="Rejected milk" value={`${Number(summary.rejectedKg).toFixed(1)} kg`} detail="Kept for quality records" />
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.84fr)]">
          <Card className="overflow-visible border-slate-200 shadow-sm">
            <CardContent className="space-y-5 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{editingId ? 'Edit collection' : 'New collection entry'}</p>
                  <p className="mt-1 text-xs text-slate-500">Fat and SNF should match the milk analyzer display.</p>
                </div>
                {editingId && <Button variant="ghost" size="sm" onClick={clearForm}>Cancel edit</Button>}
              </div>

              <div className="relative">
                <label className="mb-1.5 block text-xs font-semibold text-slate-600">Customer *</label>
                <button type="button" onClick={() => setCustomerOpen(value => !value)} className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                  <UserRound className="h-4 w-4 shrink-0 text-emerald-700" />
                  <span className={selectedCustomer ? 'min-w-0 flex-1 truncate text-sm font-medium text-slate-800' : 'min-w-0 flex-1 text-sm text-slate-400'}>{selectedCustomer ? `${selectedCustomer.fullName} · ${selectedCustomer.customerId}` : 'Choose registered customer'}</span>
                  <ChevronRight className="h-4 w-4 rotate-90 text-slate-400" />
                </button>
                {customerOpen && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="relative border-b border-slate-100 p-2">
                      <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, ID, mobile or village" className="h-10 w-full rounded-lg bg-slate-50 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-emerald-100" />
                    </div>
                    <div className="max-h-56 overflow-y-auto p-1">
                      {customersLoading ? <p className="p-4 text-center text-sm text-slate-500">Loading customers…</p> : filteredCustomers.length ? filteredCustomers.map(customer => (
                        <button key={customer._id} type="button" onClick={() => { setForm(current => ({ ...current, customerId: customer._id, ratePerKg: '' })); setCustomerOpen(false); setSearch('') }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-emerald-50">
                          <span><span className="block text-sm font-medium text-slate-800">{customer.fullName}</span><span className="text-xs text-slate-500">{customer.customerId} · {customer.mobile}{customer.village ? ` · ${customer.village}` : ''}</span></span>
                          <span className="text-[10px] uppercase text-slate-400">{customer.milkType}</span>
                        </button>
                      )) : <p className="p-4 text-center text-sm text-slate-500">No customers found. Register a customer first.</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Collection date"><input type="date" value={form.collectionDate} max={today()} onChange={event => change('collectionDate', event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></Field>
                <Field label="Collection session">
                  <div className="grid grid-cols-2 gap-2">
                    {(['morning', 'evening'] as const).map(session => <Choice key={session} active={form.session === session} onClick={() => change('session', session)}>{session === 'morning' ? '☀ Morning' : '☾ Evening'}</Choice>)}
                  </div>
                </Field>
                <Field label="Milk type">
                  <div className="grid grid-cols-2 gap-2">
                    {(['cow', 'buffalo'] as const).map(type => <Choice key={type} active={form.milkType === type} disabled={!!selectedCustomer && selectedCustomer.milkType !== 'mixed' && selectedCustomer.milkType !== type} onClick={() => change('milkType', type)}>{type === 'cow' ? 'Cow' : 'Buffalo'}</Choice>)}
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Field label="Machine weight (kg)" icon={<Droplets className="h-3.5 w-3.5" />}><NumericInput value={form.quantityKg} min="0.01" step="0.01" onChange={value => change('quantityKg', value)} placeholder="0.000" /></Field>
                <Field label="Fat (%)" icon={<FlaskConical className="h-3.5 w-3.5" />}><NumericInput value={form.fatPercent} min="0" max="20" step="0.1" onChange={value => change('fatPercent', value)} placeholder="e.g. 4.2" /></Field>
                <Field label="SNF (%)" icon={<Activity className="h-3.5 w-3.5" />}><NumericInput value={form.snfPercent} min="0" max="20" step="0.1" onChange={value => change('snfPercent', value)} placeholder="e.g. 8.5" /></Field>
                <Field label="Purchase rate (₹/kg)"><NumericInput value={form.ratePerKg} min="0" step="0.01" readOnly={configuredPurchaseRate !== null && !editingId} onChange={value => change('ratePerKg', value)} placeholder={configuredPurchaseRate === null ? 'Set rate in Rates or enter here' : `Dairy rate · ₹${configuredPurchaseRate}/kg`} /><span className="mt-1 block text-[10px] text-slate-400">{editingId ? 'This saved collection rate can be corrected here.' : configuredPurchaseRate !== null ? 'Configured for this dairy; applied automatically.' : 'No purchase rate is configured; enter this collection’s rate.'}</span></Field>
                <Field label="Temperature (°C) · optional" icon={<Thermometer className="h-3.5 w-3.5" />}><NumericInput value={form.temperatureC} min="0" max="100" step="0.1" onChange={value => change('temperatureC', value)} placeholder="Optional" /></Field>
                <Field label="Quality check">
                  <select value={form.qualityStatus} onChange={event => change('qualityStatus', event.target.value as FormState['qualityStatus'])} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="accepted">Accepted</option><option value="rejected">Rejected</option></select>
                </Field>
              </div>

              <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${form.qualityStatus === 'accepted' ? 'border-emerald-100 bg-emerald-50/80' : 'border-rose-100 bg-rose-50'}`}>
                <div><p className="text-xs font-medium text-slate-500">Milk collection payable</p><p className="mt-0.5 text-xs text-slate-400">Weight × purchase rate {form.qualityStatus === 'rejected' && '· rejected milk is not payable'}</p></div>
                <p className={`text-xl font-bold ${form.qualityStatus === 'accepted' ? 'text-emerald-800' : 'text-rose-700'}`}>{formatCurrency(amount)}</p>
              </div>
              <Field label="Notes · optional"><textarea value={form.notes} onChange={event => change('notes', event.target.value)} rows={2} maxLength={500} placeholder="Machine reference, can number or quality note" className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></Field>
              <Button onClick={submit} loading={save.isPending} className="h-12 w-full rounded-xl bg-emerald-700 text-base hover:bg-emerald-800"><Check className="h-4 w-4" />{editingId ? 'Update collection' : 'Save collection'}</Button>
            </CardContent>
          </Card>

          <Card className="min-w-0 border-slate-200 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                <div><h2 className="font-semibold text-slate-900">Collection register</h2><p className="mt-0.5 text-xs text-slate-500">{new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                <Button variant="outline" size="icon" aria-label="Refresh collection records" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
              </div>
              {isLoading ? <div className="p-8 text-center text-sm text-slate-500">Loading collection register…</div> : isError ? <div className="p-8 text-center"><p className="text-sm text-rose-600">Could not load collection records.</p><Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button></div> : !records.length ? (
                <div className="p-10 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Droplets className="h-6 w-6" /></div><p className="mt-3 text-sm font-medium text-slate-800">No collection recorded</p><p className="mt-1 text-xs text-slate-500">Choose a registered customer and record the analyzer reading.</p></div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {records.map(record => {
                    const customer = typeof record.customerId === 'string' ? null : record.customerId
                    const legacySupplier = typeof record.supplierId === 'string' ? null : record.supplierId
                    return <article key={record._id} className="p-4 transition hover:bg-slate-50/70 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{customer?.fullName || legacySupplier?.fullName || 'Customer'} <span className="ml-1 text-xs font-normal text-slate-400">{customer?.customerId || legacySupplier?.supplierCode}</span></p><p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{record.session === 'morning' ? 'Morning' : 'Evening'} · {record.milkType} milk · {record.receiptNumber}</p></div>
                        <div className="flex shrink-0 gap-1">
                          {record.customerId && <Button variant="ghost" size="icon" aria-label="Edit collection" onClick={() => editRecord(record)}><Pencil className="h-4 w-4" /></Button>}
                          <Button variant="ghost" size="icon" aria-label="Delete collection" disabled={remove.isPending} className="text-rose-600 hover:bg-rose-50" onClick={() => { if (window.confirm(`Delete ${customer?.fullName || legacySupplier?.fullName || 'this'} milk collection entry (${record.quantityKg.toFixed(2)} kg, ${record.receiptNumber})? This cannot be undone.`)) remove.mutate(record) }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                        <Reading label="Quantity" value={`${record.quantityKg.toFixed(2)} kg`} />
                        <Reading label="Fat" value={`${record.fatPercent.toFixed(1)}%`} />
                        <Reading label="SNF" value={`${record.snfPercent.toFixed(1)}%`} />
                        <Reading label="Rate / Amount" value={`${formatCurrency(record.ratePerKg)}/kg`} sub={formatCurrency(record.amount)} />
                      </div>
                      <div className="mt-3 flex items-center justify-between"><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${record.qualityStatus === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{record.qualityStatus === 'accepted' ? 'Accepted' : 'Rejected'}</span><span className="text-xs text-slate-400">{customer?.village || customer?.mobile || legacySupplier?.mobile || ''}</span></div>
                    </article>
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return <Card className="border-slate-200 shadow-sm"><CardContent className="p-4 sm:p-5"><div className="flex items-center gap-2 text-emerald-700"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">{icon}</span><span className="text-xs font-medium text-slate-500">{label}</span></div><p className="mt-3 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] text-slate-400">{detail}</p></CardContent></Card>
}
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">{icon && <span className="text-emerald-700">{icon}</span>}{label}</span>{children}</label>
}
function NumericInput({ value, onChange, ...props }: { value: string; onChange: (value: string) => void; min?: string; max?: string; step?: string; placeholder?: string; readOnly?: boolean }) {
  return <input type="number" inputMode="decimal" value={value} onChange={event => onChange(event.target.value)} {...props} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm tabular-nums outline-none transition placeholder:text-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 read-only:bg-slate-50 read-only:text-slate-500" />
}
function Choice({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className={`min-h-10 rounded-xl border px-2 text-xs font-semibold transition ${disabled ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300' : active ? 'border-emerald-600 bg-emerald-700 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-800'}`}>{children}</button>
}
function Reading({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-800">{value}</p>{sub && <p className="text-xs text-emerald-700">{sub}</p>}</div>
}
