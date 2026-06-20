import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { money, round2 } from '../lib/format'
import { Card, Spinner } from '../components/ui'

export default function Home() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    outstanding: 0,
    pendingCount: 0,
    billsCount: 0,
    totalPayments: 0,
  })

  useEffect(() => {
    async function load() {
      const [merchants, bills, payments] = await Promise.all([
        supabase.from('merchants').select('balance'),
        supabase.from('bills').select('id'),
        supabase.from('payments').select('amount'),
      ])
      const mRows = merchants.data ?? []
      const outstanding = round2(mRows.reduce((s, m) => s + Math.max(Number(m.balance), 0), 0))
      const pendingCount = mRows.filter((m) => Number(m.balance) > 0).length
      const totalPayments = round2((payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0))
      setStats({
        outstanding,
        pendingCount,
        billsCount: (bills.data ?? []).length,
        totalPayments,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner />

  const metrics = [
    { label: t('totalOutstanding'), value: money(stats.outstanding), color: 'text-red-600', to: '/reports' },
    { label: t('pendingMerchants'), value: stats.pendingCount, color: 'text-brand-700', to: '/reports' },
    { label: t('billsGenerated'), value: stats.billsCount, color: 'text-gray-700', to: '/places' },
    { label: t('paymentsReceived'), value: money(stats.totalPayments), color: 'text-leaf-600', to: '/reports' },
  ]

  const tiles = [
    { key: 'bill', icon: '🧾', label: t('newBill'), sub: t('selectMerchant'), to: '/billing', color: 'bg-brand-100 text-brand-700' },
    { key: 'received', icon: '💰', label: t('receivePayment'), sub: t('amountReceived'), to: '/received', color: 'bg-green-100 text-green-700' },
    { key: 'places', icon: '📍', label: t('places'), sub: t('merchants'), to: '/places', color: 'bg-brand-100 text-brand-700' },
    { key: 'reports', icon: '📊', label: t('reports'), sub: t('monthlySales'), to: '/reports', color: 'bg-amber-100 text-amber-700' },
    { key: 'flowers', icon: '🌸', label: t('flowers'), sub: t('add'), to: '/flowers', color: 'bg-leaf-50 text-leaf-700' },
    { key: 'settings', icon: '⚙️', label: t('settings'), sub: t('shopDetails'), to: '/settings', color: 'bg-gray-100 text-gray-600' },
  ]

  return (
    <div className="space-y-4">
      {/* dashboard metrics */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((mtr) => (
          <Card key={mtr.label} className="p-4" onClick={() => navigate(mtr.to)}>
            <div className="text-xs text-gray-400">{mtr.label}</div>
            <div className={`mt-1 text-2xl font-semibold ${mtr.color}`}>{mtr.value}</div>
            <div className="text-xs text-brand-500">›</div>
          </Card>
        ))}
      </div>

      {/* actions */}
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <Card key={tile.key} className="p-5 text-center" onClick={() => navigate(tile.to)}>
            <div className={`mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl ${tile.color}`}>
              {tile.icon}
            </div>
            <div className="font-medium text-gray-800">{tile.label}</div>
            <div className="text-xs text-gray-400">{tile.sub}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
