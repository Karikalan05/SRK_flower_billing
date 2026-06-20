import { forwardRef } from 'react'
import { money, dateDMY, round2 } from '../lib/format'

// Printable merchant ledger statement (captured to PDF).
// rows: [{ date, type:'bill'|'payment', ref, amount }] in date order.
const MerchantStatement = forwardRef(function MerchantStatement(
  { shop, merchant, monthLabel, rows, opening, totalBilled, totalReceived, closing },
  ref,
) {
  let running = round2(opening)
  return (
    <div
      ref={ref}
      style={{
        width: 560,
        background: '#ffffff',
        color: '#1f2937',
        fontFamily: "'Poppins','Noto Sans Tamil',sans-serif",
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '2px solid #5c8a4a', paddingBottom: 12, marginBottom: 14 }}>
        <img src="/logo.png" alt="" width="54" height="54" />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#5c8a4a' }}>{shop.shop_name}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>{shop.phone} · {shop.address}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af' }}>
          <div>Merchant Ledger</div>
          <div>கணக்கு அறிக்கை</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Name / பெயர்</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{merchant.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>Month / மாதம்</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{monthLabel}</div>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: '#eef3e9', color: '#46702f' }}>
            <th style={thLeft}>Date<br />தேதி</th>
            <th style={thLeft}>Type<br />வகை</th>
            <th style={thRight}>Bill<br />பில்</th>
            <th style={thRight}>Paid<br />வந்தது</th>
            <th style={thRight}>Balance<br />பாக்கி</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid #ece3d8', color: '#6b7280' }}>
            <td style={tdLeft} colSpan="4">Opening Balance / தொடக்க பாக்கி</td>
            <td style={tdRight}>{money(opening)}</td>
          </tr>
          {rows.map((r, i) => {
            running = round2(running + (r.type === 'bill' ? r.amount : -r.amount))
            return (
              <tr key={i} style={{ borderBottom: '1px solid #ece3d8' }}>
                <td style={tdLeft}>{dateDMY(r.date)}</td>
                <td style={tdLeft}>{r.type === 'bill' ? `Bill ${r.ref}` : `Payment (${r.ref})`}</td>
                <td style={tdRight}>{r.type === 'bill' ? money(r.amount) : '-'}</td>
                <td style={{ ...tdRight, color: '#2e7d32' }}>{r.type === 'payment' ? money(r.amount) : '-'}</td>
                <td style={tdRight}>{money(running)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 14, fontSize: 13 }}>
        <Line label="Total Billed / மொத்த விற்பனை" value={money(totalBilled)} />
        <Line label="Total Received / மொத்தம் வந்தது" value={money(totalReceived)} green />
        <div style={{ borderTop: '1px dashed #5c8a4a', margin: '8px 0' }} />
        <Line label="Closing Balance / இறுதி பாக்கி" value={money(closing)} big />
      </div>

      <div style={{ marginTop: 18, paddingTop: 10, borderTop: '1px solid #ece3d8', textAlign: 'center', fontSize: 11, color: '#9ca3af' }}>
        {shop.footer_quote}
      </div>
    </div>
  )
})

const thBase = { padding: '7px 6px', fontWeight: 600 }
const thLeft = { ...thBase, textAlign: 'left' }
const thRight = { ...thBase, textAlign: 'right' }
const td = { padding: '7px 6px' }
const tdLeft = { ...td, textAlign: 'left' }
const tdRight = { ...td, textAlign: 'right' }

function Line({ label, value, big, green }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ color: big ? '#1f2937' : '#6b7280', fontWeight: big ? 600 : 400 }}>{label}</span>
      <span style={{ color: big ? '#5c8a4a' : green ? '#2e7d32' : '#1f2937', fontWeight: big ? 700 : 500, fontSize: big ? 16 : 13 }}>
        {value}
      </span>
    </div>
  )
}

export default MerchantStatement
