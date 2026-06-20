import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { dateDMY } from '../lib/format'
import { Button, Spinner } from '../components/ui'
import BillPaper from '../components/BillPaper'
import {
  shareBillOnWhatsapp,
  openWhatsappChat,
  downloadBillPdf,
  downloadBillPng,
  billTextMessage,
} from '../lib/billExport'

export default function BillView() {
  const { billId } = useParams()
  const { t } = useLang()
  const navigate = useNavigate()
  const paperRef = useRef(null)
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    const { data: bill } = await supabase.from('bills').select('*').eq('id', billId).single()
    if (!bill) return setData(false)
    const [{ data: items }, { data: merchant }, { data: shop }] = await Promise.all([
      supabase.from('bill_items').select('*').eq('bill_id', billId),
      supabase.from('merchants').select('*').eq('id', bill.merchant_id).single(),
      supabase.from('shop_settings').select('*').eq('id', 1).single(),
    ])
    setData({ bill, items: items ?? [], merchant, shop })
  }, [billId])

  useEffect(() => {
    load()
  }, [load])

  if (data === null) return <Spinner />
  if (data === false) return <div className="p-6 text-center text-gray-400">{t('noData')}</div>

  const { bill, items, merchant, shop } = data
  const filename = `${shop.shop_name}-Bill${bill.bill_no}-${merchant.name}`.replace(/\s+/g, '_')

  // Open the merchant's WhatsApp chat directly with the bill as a text message.
  function onWhatsapp() {
    const message = billTextMessage({ shop, merchant, bill, items })
    if (!merchant.phone) {
      alert(t('whatsapp') + ' ' + t('phone') + '? ' + merchant.name)
      return
    }
    openWhatsappChat(merchant.phone, message)
  }
  async function onShareImage() {
    setBusy('wa')
    const message = billTextMessage({ shop, merchant, bill, items })
    await shareBillOnWhatsapp({ node: paperRef.current, filename, phone: merchant.phone, message })
    setBusy('')
  }
  async function onPdf() {
    setBusy('pdf')
    await downloadBillPdf(paperRef.current, filename)
    setBusy('')
  }
  async function onPng() {
    setBusy('png')
    await downloadBillPng(paperRef.current, filename)
    setBusy('')
  }

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(`/merchants/${merchant.id}`)} className="text-sm text-gray-400">
        ‹ {t('back')}
      </button>

      <div className="flex justify-center overflow-x-auto">
        <div className="rounded-2xl shadow-md ring-1 ring-brand-100">
          <BillPaper ref={paperRef} shop={shop} merchant={merchant} bill={bill} items={items} />
        </div>
      </div>

      <Button variant="leaf" size="lg" onClick={onWhatsapp} disabled={!!busy}>
        💬 {t('sendWhatsapp')}
      </Button>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="soft" onClick={onShareImage} disabled={!!busy}>
          🖼️ {busy === 'wa' ? '…' : t('downloadImage')}
        </Button>
        <Button variant="soft" onClick={onPdf} disabled={!!busy}>
          📄 {busy === 'pdf' ? '…' : 'PDF'}
        </Button>
        <Button variant="soft" onClick={onPng} disabled={!!busy}>
          ⬇️ {busy === 'png' ? '…' : 'PNG'}
        </Button>
      </div>

      <button
        onClick={async () => {
          if (!confirm(t('confirmDeleteBill'))) return
          await supabase.rpc('delete_bill', { p_bill_id: bill.id })
          navigate(`/merchants/${merchant.id}`, { replace: true })
        }}
        className="mx-auto block py-2 text-sm text-red-400 hover:text-red-600"
      >
        🗑️ {t('deleteBill')}
      </button>
    </div>
  )
}
