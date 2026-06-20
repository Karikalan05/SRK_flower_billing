import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { money, num, todayISO, round2 } from '../lib/format'
import { Card, Button, Field, Input, Select, Spinner } from '../components/ui'

export default function NewBill() {
  const { merchantId } = useParams()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState(null)
  const [flowers, setFlowers] = useState([])
  const [billDate, setBillDate] = useState(todayISO())
  const [luggage, setLuggage] = useState('')
  const [commission, setCommission] = useState('')
  const [lines, setLines] = useState([emptyLine()])
  const [busy, setBusy] = useState(false)

  function emptyLine() {
    return { flower_id: '', name_en: '', name_ta: '', kilo: '', rate: '' }
  }

  useEffect(() => {
    async function load() {
      const [{ data: m }, { data: f }] = await Promise.all([
        supabase.from('merchants').select('*').eq('id', merchantId).single(),
        supabase.from('flowers').select('*').eq('active', true).order('name_en'),
      ])
      setMerchant(m)
      setFlowers(f ?? [])
      // pre-fill this merchant's usual commission % (admin can change or clear it)
      if (m?.default_commission) setCommission(String(m.default_commission))
    }
    load()
  }, [merchantId])

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  function pickFlower(idx, flowerId) {
    const f = flowers.find((x) => x.id === flowerId)
    if (!f) {
      updateLine(idx, { flower_id: '', name_en: '', name_ta: '' })
      return
    }
    // keep a rate the user already typed; otherwise use the flower's default rate
    updateLine(idx, {
      flower_id: f.id,
      name_en: f.name_en,
      name_ta: f.name_ta,
      rate: lines[idx]?.rate ? lines[idx].rate : f.default_rate || '',
    })
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()])
  }
  function removeLine(idx) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)))
  }

  // every step rounded to 2 decimals so totals are always exact
  const itemsTotal = round2(
    lines.reduce((s, l) => s + round2(Number(l.kilo || 0) * Number(l.rate || 0)), 0),
  )
  const commissionAmount = round2((itemsTotal * Number(commission || 0)) / 100)
  const todaysBill = round2(itemsTotal + commissionAmount + Number(luggage || 0))
  const previousBalance = round2(merchant?.balance || 0)
  const totalPayable = round2(previousBalance + todaysBill)

  async function saveBill() {
    const validLines = lines.filter((l) => Number(l.kilo) > 0 && Number(l.rate) > 0)
    if (validLines.length === 0) {
      alert(lang === 'ta' ? 'குறைந்தது ஒரு மலர் சேர்க்கவும்' : 'Add at least one flower line')
      return
    }
    setBusy(true)
    const items = validLines.map((l) => ({
      flower_id: l.flower_id || null,
      flower_name_en: l.name_en,
      flower_name_ta: l.name_ta,
      kilo: Number(l.kilo),
      rate: Number(l.rate),
    }))
    const { data, error } = await supabase.rpc('create_bill', {
      p_merchant_id: merchantId,
      p_bill_date: billDate,
      p_luggage: Number(luggage || 0),
      p_commission_percent: Number(commission || 0),
      p_items: items,
    })
    setBusy(false)
    if (error) {
      alert(error.message)
      return
    }
    navigate(`/bills/${data}`, { replace: true })
  }

  if (!merchant) return <Spinner />

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400">
        ‹ {t('back')}
      </button>
      <div>
        <h1 className="text-xl font-semibold text-gray-800">{t('newBill')}</h1>
        <p className="text-sm text-gray-400 ta">{merchant.name}</p>
      </div>

      <Field label={t('date')}>
        <Input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
      </Field>

      {/* flower lines */}
      <div className="space-y-3">
        {lines.map((line, idx) => {
          const amount = round2(Number(line.kilo || 0) * Number(line.rate || 0))
          return (
            <Card key={idx} className="space-y-2 p-3">
              <div className="flex items-center gap-2">
                <Select
                  className="flex-1"
                  value={line.flower_id}
                  onChange={(e) => pickFlower(idx, e.target.value)}
                >
                  <option value="">{t('flower')}…</option>
                  {flowers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name_en} / {f.name_ta}
                    </option>
                  ))}
                </Select>
                {lines.length > 1 && (
                  <button onClick={() => removeLine(idx)} className="px-2 text-xl text-gray-300 hover:text-red-500">
                    ✕
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Field label={`${t('kilo')} / கிலோ`}>
                  <Input type="number" inputMode="decimal" value={line.kilo}
                    onChange={(e) => updateLine(idx, { kilo: e.target.value })} placeholder="0" />
                </Field>
                <Field label={`${t('rate')} / விலை`}>
                  <Input type="number" inputMode="decimal" value={line.rate}
                    onChange={(e) => updateLine(idx, { rate: e.target.value })} placeholder="0" />
                </Field>
                <Field label={`${t('total')} / மொத்தம்`}>
                  <div className="rounded-2xl bg-brand-50 px-3 py-3 text-right font-medium text-brand-700">
                    {num(amount)}
                  </div>
                </Field>
              </div>
            </Card>
          )
        })}
      </div>

      <Button variant="outline" onClick={addLine} className="w-full">
        + {t('addFlower')}
      </Button>

      <div className="grid grid-cols-2 gap-2">
        <Field label={`${t('luggage')} / லக்கேஜ்`}>
          <Input type="number" inputMode="decimal" value={luggage}
            onChange={(e) => setLuggage(e.target.value)} placeholder="0" />
        </Field>
        <Field label={`${t('commissionPercent')} / கமிஷன் %`} hint={t('addCommission')}>
          <Input type="number" inputMode="decimal" value={commission}
            onChange={(e) => setCommission(e.target.value)} placeholder="0" />
        </Field>
      </div>

      {/* totals summary — bill is a charge only, no payment here */}
      <Card className="space-y-2 p-4">
        <Row label={`${t('totalAmount')} / மொத்தம்`} value={money(itemsTotal)} />
        {commissionAmount > 0 && (
          <Row label={`${t('commission')} (${num(commission)}%) / கமிஷன்`} value={money(commissionAmount)} />
        )}
        <Row label={`${t('luggage')} / லக்கேஜ்`} value={money(Number(luggage || 0))} />
        <div className="my-1 border-t border-dashed border-brand-200" />
        <Row label={`${t('todaysBill')} / இன்றைய பில்`} value={money(todaysBill)} />
        {previousBalance > 0 && (
          <Row label={`${t('previousBalance')} / பழைய பாக்கி`} value={money(previousBalance)} red />
        )}
        <Row label={`${t('totalPayable')} / மொத்த பாக்கி`} value={money(totalPayable)} big />
      </Card>

      <Button size="lg" onClick={saveBill} disabled={busy}>
        {busy ? t('loading') : t('saveBill')}
      </Button>
      <p className="pb-2 text-center text-xs text-gray-400">
        {t('receivePayment')} → 💰 {t('received')}
      </p>
    </div>
  )
}

function Row({ label, value, big, red, green }) {
  const valueColor = big
    ? 'text-lg font-semibold text-brand-700'
    : red
      ? 'text-red-600'
      : green
        ? 'text-leaf-600'
        : 'text-gray-700'
  return (
    <div className="flex items-center justify-between">
      <span className={`${big ? 'font-medium text-gray-700' : 'text-sm text-gray-500'}`}>{label}</span>
      <span className={valueColor}>{value}</span>
    </div>
  )
}
