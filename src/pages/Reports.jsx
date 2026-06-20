import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { money } from '../lib/format'
import { Card, EmptyState, Spinner, Badge } from '../components/ui'

export default function Reports() {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState({ sales: 0, billCount: 0, collected: 0, payCount: 0, pending: [] })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const start = `${month}-01`
      const endDate = new Date(`${month}-01T00:00:00`)
      endDate.setMonth(endDate.getMonth() + 1)
      const end = endDate.toISOString().slice(0, 10)

      const [bills, pays, pending] = await Promise.all([
        supabase.from('bills').select('bill_amount').gte('bill_date', start).lt('bill_date', end),
        supabase.from('payments').select('amount').gte('paid_on', start).lt('paid_on', end),
        supabase.from('v_pending_merchants').select('*'),
      ])
      const sales = (bills.data ?? []).reduce((s, b) => s + Number(b.bill_amount), 0)
      const collected = (pays.data ?? []).reduce((s, p) => s + Number(p.amount), 0)
      setReport({
        sales,
        billCount: (bills.data ?? []).length,
        collected,
        payCount: (pays.data ?? []).length,
        pending: pending.data ?? [],
      })
      setLoading(false)
    }
    load()
  }, [month])

  const pendingTotal = report.pending.reduce((s, m) => s + Number(m.balance), 0)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">📊 {t('reports')}</h1>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-medium text-gray-600">{t('monthlySales')}</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-1 text-sm"
          />
        </div>
        {loading ? (
          <Spinner />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-brand-50 p-3">
              <div className="text-xs text-gray-400">{t('dailySales')} ({t('totalSales')})</div>
              <div className="text-xl font-semibold text-brand-700">{money(report.sales)}</div>
              <div className="text-xs text-gray-400">{report.billCount} {t('bills').toLowerCase()}</div>
            </div>
            <div className="rounded-2xl bg-leaf-600/10 p-3">
              <div className="text-xs text-gray-400">{t('paymentCollection')}</div>
              <div className="text-xl font-semibold text-leaf-600">{money(report.collected)}</div>
              <div className="text-xs text-gray-400">{report.payCount} {t('payments').toLowerCase()}</div>
            </div>
          </div>
        )}
      </Card>

      {/* who hasn't paid */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="font-medium text-gray-600">{t('pendingPayments')}</h2>
          <Badge color="red">{money(pendingTotal)}</Badge>
        </div>
        {report.pending.length === 0 ? (
          <EmptyState icon="✅" text={lang === 'ta' ? 'அனைவரும் கட்டிவிட்டனர்' : 'Everyone has paid'} />
        ) : (
          <div className="space-y-2">
            {report.pending.map((m) => (
              <Card key={m.id} className="flex items-center gap-3 p-3" onClick={() => navigate(`/merchants/${m.id}`)}>
                <span className="text-lg">🧑‍🌾</span>
                <div className="flex-1">
                  <div className="font-medium text-gray-800 ta">{m.name}</div>
                  <div className="text-xs text-gray-400">
                    {lang === 'ta' ? m.place_ta || m.place_en : m.place_en}
                  </div>
                </div>
                <Badge color="red">{money(m.balance)}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
