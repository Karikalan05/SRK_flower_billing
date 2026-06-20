import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Field, Input, Spinner, Badge } from '../components/ui'

export default function Settings() {
  const { t } = useLang()
  const { isAdmin, profile } = useAuth()
  const navigate = useNavigate()
  const [shop, setShop] = useState(null)
  const [users, setUsers] = useState([])
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function load() {
    const [{ data: s }, { data: u }] = await Promise.all([
      supabase.from('shop_settings').select('*').eq('id', 1).single(),
      supabase.from('profiles').select('*').order('created_at'),
    ])
    setShop(s)
    setUsers(u ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  const set = (k) => (e) => setShop({ ...shop, [k]: e.target.value })

  async function saveShop() {
    setBusy(true)
    const { id, updated_at, ...payload } = shop
    await supabase.from('shop_settings').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', 1)
    setBusy(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function toggleRole(u) {
    const newRole = u.role === 'admin' ? 'staff' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', u.id)
    load()
  }

  if (!shop) return <Spinner />

  const readOnly = !isAdmin

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-800">⚙️ {t('settings')}</h1>

      <Card className="flex items-center gap-3 p-4" onClick={() => navigate('/flowers')}>
        <span className="text-2xl">🌸</span>
        <div className="flex-1 font-medium text-gray-800">{t('manageFlowers')}</div>
        <span className="text-gray-300">›</span>
      </Card>

      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-700">{t('shopDetails')}</h2>
          {readOnly && <Badge color="amber">{t('adminOnly')}</Badge>}
        </div>
        <Field label={t('shopName')}>
          <Input value={shop.shop_name} onChange={set('shop_name')} disabled={readOnly} />
        </Field>
        <Field label={t('ownerName')}>
          <Input value={shop.owner_name} onChange={set('owner_name')} disabled={readOnly} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('phone')}>
            <Input value={shop.phone} onChange={set('phone')} disabled={readOnly} />
          </Field>
          <Field label={t('mailId')}>
            <Input value={shop.email} onChange={set('email')} disabled={readOnly} />
          </Field>
        </div>
        <Field label={t('address')}>
          <Input value={shop.address} onChange={set('address')} disabled={readOnly} />
        </Field>
        <Field label={t('website')} hint="https://...">
          <Input value={shop.website} onChange={set('website')} disabled={readOnly} placeholder="https://" />
        </Field>
        <Field label={t('mapLink')} hint="Google Maps link">
          <Input value={shop.map_link} onChange={set('map_link')} disabled={readOnly} placeholder="https://maps.google.com/..." />
        </Field>
        <Field label={t('footerQuote')}>
          <Input className="ta" value={shop.footer_quote} onChange={set('footer_quote')} disabled={readOnly} />
        </Field>
        {!readOnly && (
          <Button onClick={saveShop} disabled={busy} className="w-full">
            {saved ? '✓ ' + t('saved') : t('save')}
          </Button>
        )}
      </Card>

      {/* users */}
      <Card className="space-y-3 p-4">
        <h2 className="font-medium text-gray-700">{t('users')}</h2>
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-2">
            <div className="flex-1">
              <div className="font-medium text-gray-800">{u.full_name || '—'}</div>
              <div className="text-xs text-gray-400">{u.id === profile?.id ? t('yes') === 'Yes' ? 'You' : 'நீங்கள்' : ''}</div>
            </div>
            <Badge color={u.role === 'admin' ? 'brand' : 'gray'}>{t(u.role === 'admin' ? 'admin' : 'staff')}</Badge>
            {isAdmin && u.id !== profile?.id && (
              <button onClick={() => toggleRole(u)} className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-500">
                {u.role === 'admin' ? '↓ ' + t('staff') : '↑ ' + t('admin')}
              </button>
            )}
          </div>
        ))}
        {isAdmin && (
          <p className="rounded-xl bg-brand-50 px-3 py-2 text-xs text-gray-500">
            {t('add')} {t('users').toLowerCase()}: Supabase → Authentication → Users → Add user. (See SETUP-GUIDE.md)
          </p>
        )}
      </Card>

      <p className="pb-4 text-center text-xs text-gray-300">SRK Flowers · v1.0</p>
    </div>
  )
}
