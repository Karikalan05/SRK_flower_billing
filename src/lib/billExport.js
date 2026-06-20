import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { money, dateDMY } from './format'

// Capture the on-screen bill element to a high-resolution PNG data URL.
async function capturePng(node) {
  return toPng(node, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true,
  })
}

export async function downloadBillPng(node, filename) {
  const dataUrl = await capturePng(node)
  triggerDownload(dataUrl, `${filename}.png`)
}

export async function downloadBillPdf(node, filename) {
  const dataUrl = await capturePng(node)
  const img = await loadImage(dataUrl)
  // Fit the bill image onto an A4-ish portrait page at the top.
  const pdf = new jsPDF({ unit: 'px', format: [img.width / 2 + 40, img.height / 2 + 40] })
  pdf.addImage(dataUrl, 'PNG', 20, 20, img.width / 2, img.height / 2)
  pdf.save(`${filename}.pdf`)
}

// One-tap WhatsApp share. On Android Chrome, navigator.share with files opens
// the native share sheet (WhatsApp included) so the user just picks the chat.
// Falls back to downloading the image + opening wa.me with a text summary.
export async function shareBillOnWhatsapp({ node, filename, phone, message }) {
  try {
    const dataUrl = await capturePng(node)
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], `${filename}.png`, { type: 'image/png' })

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: message })
      return 'shared'
    }

    // Fallback: download the image so it's in the gallery, then open WhatsApp chat.
    triggerDownload(dataUrl, `${filename}.png`)
    openWhatsappChat(phone, message)
    return 'fallback'
  } catch (err) {
    if (err?.name === 'AbortError') return 'cancelled'
    openWhatsappChat(phone, message)
    return 'fallback'
  }
}

export function openWhatsappChat(phone, message) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = '91' + digits
  const url = digits
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

// A short readable text version of the bill for the WhatsApp message body.
export function billTextMessage({ shop, merchant, bill, items }) {
  const todaysBill = Number(bill.bill_amount ?? bill.grand_total)
  const previousBalance = Number(bill.previous_balance ?? bill.old_balance ?? 0)
  const totalPayable = Number(bill.total_payable ?? bill.grand_total)
  const lines = []
  lines.push(`*${shop.shop_name}*`)
  lines.push(`Bill #${bill.bill_no ?? '-'} · ${dateDMY(bill.bill_date)}`)
  lines.push(`${merchant.name}`)
  lines.push('—')
  items.forEach((it) => {
    lines.push(`${it.flower_name_ta || it.flower_name_en}  ${it.kilo}kg × ${it.rate} = ${money(it.amount)}`)
  })
  lines.push('—')
  lines.push(`மொத்தம் / Total: ${money(bill.items_total)}`)
  if (Number(bill.commission_amount) > 0)
    lines.push(`கமிஷன் / Commission (${Number(bill.commission_percent)}%): ${money(bill.commission_amount)}`)
  if (Number(bill.luggage) > 0) lines.push(`லக்கேஜ் / Luggage: ${money(bill.luggage)}`)
  lines.push(`இன்றைய பில் / Today's Bill: ${money(todaysBill)}`)
  if (previousBalance > 0) lines.push(`பழைய பாக்கி / Previous Balance: ${money(previousBalance)}`)
  lines.push(`*மொத்த பாக்கி / Total Payable: ${money(totalPayable)}*`)
  return lines.join('\n')
}

function triggerDownload(dataUrl, filename) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
