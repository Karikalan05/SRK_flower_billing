import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { money, todayISO, round2, balanceParts } from '../lib/format'
import { Card, Button, Field, Input, Select, Spinner } from '../components/ui'

// STEP 2 — Receive Payment (independent of bills).
export default function ReceivePayment() {
  const { merchantId } = useParams()
  const { t } = useLang()
  const navigate = useNavigate()
  const [merchant, setMerchant] = useState(null)
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(todayISO())
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('merchants').select('*').eq('id', merchantId).single()
      setMerchant(data)
    }
    load()
  }, [merchantId])

  if (!merchant) return <Spinner />

  const outstanding = round2(merchant.balance)
  const remaining = round2(outstanding - Number(amount || 0))
  const remParts = balanceParts(remaining)

  async function save() {
    if (!Number(amount)) return
    setBusy(true)
    const { error } = await supabase.rpc('record_payment', {
      p_merchant_id: merchantId,
      p_amount: Number(amount),
      p_paid_on: paidOn,
      p_method: method,
      p_note: note.trim(),
    })
    setBusy(false)
    if (error) {
      alert(error.message)
      return
    }
    navigate(`/merchants/${merchantId}`, { replace: true })
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-400">
        ‹ {t('back')}
      </button>
      <div>
        <h1 className="text-xl font-semibold text-gray-800">💰 {t('receivePayment')}</h1>
        <p className="text-sm text-gray-400 ta">{merchant.name}</p>
      </div>

      {/* current outstanding */}
      <Card className="flex items-center justify-between p-4">
        <span className="text-sm text-gray-500">{t('outstanding')} / நிலுவை</span>
        <span className="text-xl font-semibold text-red-600">{money(Math.max(outstanding, 0))}</span>
      </Card>

      <Field label={`${t('amountReceived')} / கொடுத்த தொகை`}>
        <Input type="number" inputMode="decimal" value={amount} autoFocus
          onChange={(e) => setAmount(e.target.value)} placeholder="0" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={`${t('date')} / தேதி`}>
          <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
        <Field label={`${t('paymentMethod')} / முறை`}>
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash / பணம்</option>
            <option value="upi">UPI / கூகுள்பே</option>
            <option value="bank">Bank / வங்கி</option>
          </Select>
        </Field>
      </div>

      <Field label={`${t('notes')} / குறிப்பு`}>
        <Input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>

      {/* remaining updates instantly */}
      <Card className="flex items-center justify-between p-4">
        <span className="text-sm text-gray-500">{t('remainingBalance')} / மீதி பாக்கி</span>
        <span className={`text-xl font-semibold ${remParts.kind === 'advance' ? 'text-leaf-600' : 'text-brand-700'}`}>
          {remParts.kind === 'advance' ? `${t('advance')} ${money(remParts.value)}` : money(remParts.value)}
        </span>
      </Card>

      <Button size="lg" onClick={save} disabled={busy || !Number(amount)}>
        {busy ? t('loading') : t('save')}
      </Button>
    </div>
  )
}
