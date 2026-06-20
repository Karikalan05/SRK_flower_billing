import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { money, dateDMY, whatsappLink, round2, balanceParts } from '../lib/format'
import { Card, Button, Modal, Field, Spinner, EmptyState } from '../components/ui'
import MerchantStatement from '../components/MerchantStatement'
import { downloadBillPdf } from '../lib/billExport'

export default function MerchantDetail() {
  const { merchantId } = useParams()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState(null)
  const [bills, setBills] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)

  async function load() {
    const [{ data: m }, { data: b }, { data: p }] = await Promise.all([
      supabase.from('merchants').select('*, places(name_en, name_ta)').eq('id', merchantId).single(),
      supabase.from('bills').select('*').eq('merchant_id', merchantId).order('bill_date', { ascending: false }),
      supabase.from('payments').select('*').eq('merchant_id', merchantId).order('paid_on', { ascending: false }),
    ])
    setMerchant(m)
    setBills(b ?? [])
    setPayments(p ?? [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [merchantId])

  async function deletePayment(id) {
    if (!confirm(t('confirmDelete'))) return
    await supabase.rpc('delete_payment', { p_payment_id: id })
    load()
  }

  if (loading || !merchant) return <Spinner />

  const bal = balanceParts(merchant.balance)
  const totalBills = round2(bills.reduce((s, b) => s + Number(b.bill_amount), 0))
  const totalPayments = round2(payments.reduce((s, p) => s + Number(p.amount), 0))

  // merge bills + payments into one date-ordered ledger
  const ledger = [
    ...bills.map((b) => ({ key: 'b' + b.id, kind: 'bill', date: b.bill_date, created: b.created_at, ref: `#${b.bill_no}`, amount: Number(b.bill_amount), billId: b.id })),
    ...payments.map((p) => ({ key: 'p' + p.id, kind: 'payment', date: p.paid_on, created: p.created_at, ref: p.method, amount: Number(p.amount), paymentId: p.id })),
  ].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created).localeCompare(String(a.created)))

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400">
        ‹ {t('back')}
      </button>

      {/* header */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-xl">🧑‍🌾</span>
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-800 ta">{merchant.name}</div>
            <div className="text-sm text-gray-400">
              {merchant.phone} · 📍 {lang === 'ta' ? merchant.places?.name_ta || merchant.places?.name_en : merchant.places?.name_en}
            </div>
          </div>
        </div>

        {/* current outstanding highlighted */}
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-600 px-4 py-3 text-white">
          <span className="text-sm opacity-90">
            {bal.kind === 'advance' ? `${t('advance')} / முன்பணம்` : `${t('outstanding')} / நிலுவை`}
          </span>
          <span className="text-2xl font-semibold">{money(bal.value)}</span>
        </div>

        {/* totals */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-brand-50 px-3 py-2">
            <div className="text-xs text-gray-400">{t('totalBills')}</div>
            <div className="font-semibold text-gray-700">{money(totalBills)}</div>
          </div>
          <div className="rounded-2xl bg-green-50 px-3 py-2">
            <div className="text-xs text-gray-400">{t('paymentsReceived')}</div>
            <div className="font-semibold text-leaf-600">{money(totalPayments)}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {merchant.phone && (
            <a href={whatsappLink(merchant.phone, '')} target="_blank" rel="noreferrer">
              <Button variant="leaf" className="w-full">💬 {t('whatsapp')}</Button>
            </a>
          )}
          <Button variant="ghost" onClick={() => setReportOpen(true)} className={merchant.phone ? '' : 'col-span-2'}>
            📄 {t('ledger')}
          </Button>
        </div>
      </Card>

      {/* main actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={() => navigate(`/merchants/${merchantId}/new-bill`)}>
          🧾 {t('newBill')}
        </Button>
        <Button size="lg" variant="leaf" onClick={() => navigate(`/merchants/${merchantId}/receive`)}>
          💰 {t('receivePayment')}
        </Button>
      </div>

      {/* ledger / recent transactions */}
      <h2 className="px-1 pt-2 font-medium text-gray-600">{t('recentTransactions')}</h2>
      {ledger.length === 0 && <EmptyState icon="🧾" text={t('noData')} />}
      {ledger.map((e) =>
        e.kind === 'bill' ? (
          <Card key={e.key} className="flex items-center gap-3 p-3" onClick={() => navigate(`/bills/${e.billId}`)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm">🧾</span>
            <div className="flex-1">
              <div className="font-medium text-gray-800">{t('bill')} {e.ref}</div>
              <div className="text-xs text-gray-400">{dateDMY(e.date)}</div>
            </div>
            <span className="font-semibold text-red-600">+{money(e.amount)}</span>
            <span className="text-gray-300">›</span>
          </Card>
        ) : (
          <Card key={e.key} className="flex items-center gap-3 p-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm">💰</span>
            <div className="flex-1">
              <div className="font-medium text-gray-800">{t('received')} <span className="text-xs uppercase text-gray-400">{e.ref}</span></div>
              <div className="text-xs text-gray-400">{dateDMY(e.date)}</div>
            </div>
            <span className="font-semibold text-leaf-600">−{money(e.amount)}</span>
            <button onClick={() => deletePayment(e.paymentId)} className="px-1 text-gray-300 hover:text-red-500">✕</button>
          </Card>
        ),
      )}

      {reportOpen && <ReportModal merchant={merchant} onClose={() => setReportOpen(false)} />}
    </div>
  )
}

function ReportModal({ merchant, onClose }) {
  const { t, lang } = useLang()
  const paperRef = useRef(null)
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      setData(null)
      const start = `${month}-01`
      const end = new Date(`${month}-01T00:00:00`)
      end.setMonth(end.getMonth() + 1)
      const endISO = end.toISOString().slice(0, 10)

      const [{ data: bills }, { data: pays }, { data: shop }] = await Promise.all([
        supabase.from('bills').select('*').eq('merchant_id', merchant.id).gte('bill_date', start).lt('bill_date', endISO).order('bill_date'),
        supabase.from('payments').select('*').eq('merchant_id', merchant.id).gte('paid_on', start).lt('paid_on', endISO).order('paid_on'),
        supabase.from('shop_settings').select('*').eq('id', 1).single(),
      ])
      const b = bills ?? []
      const p = pays ?? []
      const totalBilled = round2(b.reduce((s, x) => s + Number(x.bill_amount), 0))
      const totalReceived = round2(p.reduce((s, x) => s + Number(x.amount), 0))
      // opening = balance before the first entry this month
      const opening = b.length ? round2(b[0].previous_balance) : round2(merchant.balance + totalReceived - totalBilled)
      const closing = round2(opening + totalBilled - totalReceived)
      // build date-ordered ledger rows
      const rows = [
        ...b.map((x) => ({ date: x.bill_date, created: x.created_at, type: 'bill', ref: `#${x.bill_no}`, amount: Number(x.bill_amount) })),
        ...p.map((x) => ({ date: x.paid_on, created: x.created_at, type: 'payment', ref: x.method, amount: Number(x.amount) })),
      ].sort((m, n) => String(m.date).localeCompare(String(n.date)) || String(m.created).localeCompare(String(n.created)))
      setData({ rows, shop, opening, totalBilled, totalReceived, closing })
    }
    load()
  }, [month, merchant])

  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-IN', {
    month: 'long',
    year: 'numeric',
  })

  async function download() {
    if (!paperRef.current) return
    setBusy(true)
    const filename = `${data.shop.shop_name}-${merchant.name}-${month}`.replace(/\s+/g, '_')
    await downloadBillPdf(paperRef.current, filename)
    setBusy(false)
  }

  return (
    <Modal open onClose={onClose} title={`${t('ledger')} · ${t('monthlyReport')}`}>
      <div className="space-y-3">
        <Field label={t('thisMonth')}>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3" />
        </Field>

        {!data ? (
          <Spinner />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Stat label={t('totalBills')} value={money(data.totalBilled)} />
              <Stat label={t('paymentsReceived')} value={money(data.totalReceived)} green />
              <Stat label={t('openingBalance')} value={money(data.opening)} />
              <Stat label={t('closingBalance')} value={money(data.closing)} red />
            </div>
            <Button onClick={download} disabled={busy} className="w-full">
              📄 {busy ? t('loading') : t('downloadReport')} (PDF)
            </Button>
          </>
        )}
        <Button variant="ghost" onClick={onClose} className="w-full">{t('close')}</Button>
      </div>

      {data && (
        <div style={{ position: 'fixed', left: -10000, top: 0 }} aria-hidden="true">
          <MerchantStatement ref={paperRef} shop={data.shop} merchant={merchant} monthLabel={monthLabel}
            rows={data.rows} opening={data.opening} totalBilled={data.totalBilled}
            totalReceived={data.totalReceived} closing={data.closing} />
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value, green, red }) {
  return (
    <div className="rounded-2xl bg-brand-50 px-3 py-2">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`font-semibold ${green ? 'text-leaf-600' : red ? 'text-red-600' : 'text-gray-700'}`}>{value}</div>
    </div>
  )
}
