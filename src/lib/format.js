// Round to 2 decimals safely (avoids float drift like 499.99999 -> 500).
// Always use this for every +, -, *, / on money/kilo/rate.
// Sign-aware so negative amounts (advances) round symmetrically.
export function round2(value) {
  const n = Number(value || 0)
  if (!Number.isFinite(n)) return 0
  return (Math.sign(n) * Math.round((Math.abs(n) + Number.EPSILON) * 100)) / 100
}

// Describe a merchant balance: positive = they owe (due), negative = advance.
// Returns { kind: 'due'|'advance'|'zero', value: positive number }
export function balanceParts(value) {
  const b = round2(value)
  if (b > 0.005) return { kind: 'due', value: b }
  if (b < -0.005) return { kind: 'advance', value: -b }
  return { kind: 'zero', value: 0 }
}

// Money in Indian rupee style: ₹1,234.50
export function money(value) {
  const n = round2(value)
  return (
    '₹' +
    n.toLocaleString('en-IN', {
      minimumFractionDigits: n % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  )
}

// Plain number with up to 2 decimals (for kilos, rates)
export function num(value) {
  const n = round2(value)
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

// 2026-06-15 -> 15-06-2026 (easy to read)
export function dateDMY(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

// Today's date as YYYY-MM-DD for <input type="date">
export function todayISO() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

// Build a wa.me link with a pre-filled message. Strips non-digits and
// assumes an Indian number (adds 91) when no country code is present.
export function whatsappLink(phone, message) {
  let digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10) digits = '91' + digits
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}
