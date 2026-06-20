import { forwardRef } from 'react'
import { money, num, dateDMY } from '../lib/format'

// The actual bill "paper". Rendered on screen AND captured to PNG/PDF.
// Inline styles only (no Tailwind) so html-to-image captures it reliably
// with the exact same look everywhere. All headings are English + Tamil.
const BillPaper = forwardRef(function BillPaper({ shop, merchant, bill, items }, ref) {
  const itemsTotal = Number(bill.items_total)
  const luggage = Number(bill.luggage)
  const commission = Number(bill.commission_amount || 0)
  const commissionPct = Number(bill.commission_percent || 0)
  const todaysBill = Number(bill.bill_amount ?? itemsTotal + commission + luggage)
  const previousBalance = Number(bill.previous_balance ?? bill.old_balance ?? 0)
  const totalPayable = Number(bill.total_payable ?? bill.grand_total)

  return (
    <div
      ref={ref}
      style={{
        width: 380,
        background: '#ffffff',
        color: '#1f2937',
        fontFamily: "'Poppins','Noto Sans Tamil',sans-serif",
        padding: 20,
        boxSizing: 'border-box',
      }}
    >
      {/* header */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #5c8a4a', paddingBottom: 10, marginBottom: 12 }}>
        <img src="/logo.png" alt="" width="60" height="60" style={{ margin: '0 auto', display: 'block' }} />
        <div style={{ fontSize: 20, fontWeight: 700, color: '#5c8a4a' }}>{shop.shop_name}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{shop.owner_name}</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>{shop.address}</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>
          📞 {shop.phone}
          {shop.email ? ` · ${shop.email}` : ''}
        </div>
      </div>

      {/* bill no + date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#46702f', marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>Bill #{bill.bill_no ?? '-'}</span>
        <span style={{ fontWeight: 600 }}>{dateDMY(bill.bill_date)}</span>
      </div>

      {/* merchant */}
      <div style={{ fontSize: 13, marginBottom: 10 }}>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>Name / பெயர்: </span>
        <span style={{ fontWeight: 600 }}>{merchant.name}</span>
      </div>

      {/* items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#eef3e9', color: '#46702f' }}>
            <th style={thLeft}>Flower<br />மலர்</th>
            <th style={th}>Kilo<br />கிலோ</th>
            <th style={th}>Rate<br />விலை</th>
            <th style={thRight}>Total<br />மொத்தம்</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} style={{ borderBottom: '1px solid #ece3d8' }}>
              <td style={tdLeft}>
                <div style={{ fontWeight: 500 }}>{it.flower_name_en}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{it.flower_name_ta}</div>
              </td>
              <td style={td}>{num(it.kilo)}</td>
              <td style={td}>{num(it.rate)}</td>
              <td style={tdRight}>{num(it.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* totals */}
      <div style={{ marginTop: 12, fontSize: 13 }}>
        <Line label="Total Amount / மொத்தம்" value={money(itemsTotal)} />
        {commission > 0 && <Line label={`Commission (${commissionPct}%) / கமிஷன்`} value={money(commission)} />}
        <Line label="Luggage / லக்கேஜ்" value={money(luggage)} />
        <Line label="Today's Bill / இன்றைய பில்" value={money(todaysBill)} />
        {previousBalance > 0 && <Line label="Previous Balance / பழைய பாக்கி" value={money(previousBalance)} red />}
        <div style={{ borderTop: '1px dashed #5c8a4a', margin: '6px 0' }} />
        <Line label="Total Payable / மொத்த பாக்கி" value={money(totalPayable)} big />
      </div>

      {/* footer */}
      <div style={{ marginTop: 16, paddingTop: 10, borderTop: '1px solid #ece3d8', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
        {shop.footer_quote}
      </div>
    </div>
  )
})

const th = { padding: '6px 4px', textAlign: 'center', fontWeight: 600 }
const thLeft = { ...th, textAlign: 'left' }
const thRight = { ...th, textAlign: 'right' }
const td = { padding: '6px 4px', textAlign: 'center' }
const tdLeft = { ...td, textAlign: 'left' }
const tdRight = { ...td, textAlign: 'right', fontWeight: 600 }

function Line({ label, value, big, red, green }) {
  const valueColor = big ? '#5c8a4a' : red ? '#dc2626' : green ? '#2e7d32' : '#1f2937'
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ color: big ? '#1f2937' : '#6b7280', fontWeight: big ? 600 : 400 }}>{label}</span>
      <span style={{ color: valueColor, fontWeight: big ? 700 : 500, fontSize: big ? 16 : 13 }}>
        {value}
      </span>
    </div>
  )
}

export default BillPaper
