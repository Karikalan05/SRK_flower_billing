import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { money } from '../lib/format'
import { Card, Button, Modal, Field, Input, EmptyState, Spinner, Badge } from '../components/ui'

export default function PlaceDetail() {
  const { placeId } = useParams()
  const { t, lang } = useLang()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [place, setPlace] = useState(null)
  const [merchants, setMerchants] = useState(null)
  const [editing, setEditing] = useState(null)

  async function load() {
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('places').select('*').eq('id', placeId).single(),
      supabase.from('merchants').select('*').eq('place_id', placeId).order('name'),
    ])
    setPlace(p)
    setMerchants(m ?? [])
  }
  useEffect(() => {
    load()
  }, [placeId])

  async function save(form) {
    const payload = {
      place_id: placeId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      notes: form.notes.trim(),
      default_commission: Number(form.default_commission || 0),
    }
    if (editing?.id) {
      await supabase.from('merchants').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('merchants').insert(payload)
    }
    setEditing(null)
    load()
  }

  async function remove(m) {
    if (!confirm(t('confirmDelete'))) return
    const { error } = await supabase.from('merchants').delete().eq('id', m.id)
    if (error) {
      alert(t('cannotDeleteMerchant'))
      return
    }
    setEditing(null)
    load()
  }

  if (!merchants) return <Spinner />

  return (
    <div className="space-y-3">
      <button onClick={() => navigate('/places')} className="text-sm text-gray-400">
        ‹ {t('places')}
      </button>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">
          📍 {lang === 'ta' && place?.name_ta ? place.name_ta : place?.name_en}
        </h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setEditing({})}>
            + {t('merchant')}
          </Button>
        )}
      </div>

      {merchants.length === 0 && <EmptyState icon="🧑‍🌾" text={t('noData')} />}

      {merchants.map((m) => (
        <Card key={m.id} className="flex items-center gap-3 p-4" onClick={() => navigate(`/merchants/${m.id}`)}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg">🧑‍🌾</span>
          <div className="flex-1">
            <div className="font-medium text-gray-800 ta">{m.name}</div>
            <div className="text-xs text-gray-400">{m.phone || t('phone')}</div>
          </div>
          {Number(m.balance) > 0 ? (
            <Badge color="red">{money(m.balance)}</Badge>
          ) : (
            <Badge color="green">{t('paid')}</Badge>
          )}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditing(m)
              }}
              className="rounded-full p-2 text-gray-300 hover:bg-gray-100 hover:text-gray-600"
            >
              ✏️
            </button>
          )}
          <span className="text-gray-300">›</span>
        </Card>
      ))}

      {editing && (
        <MerchantForm
          merchant={editing}
          onSave={save}
          onDelete={editing.id ? () => remove(editing) : null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function MerchantForm({ merchant, onSave, onDelete, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({
    name: merchant.name || '',
    phone: merchant.phone || '',
    email: merchant.email || '',
    notes: merchant.notes || '',
    default_commission: merchant.default_commission ?? '',
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <Modal open onClose={onClose} title={merchant.id ? t('edit') : t('add') + ' ' + t('merchant')}>
      <div className="space-y-3">
        <Field label={t('name')}>
          <Input className="ta" value={form.name} onChange={set('name')} placeholder="பெயர்" />
        </Field>
        <Field label={t('whatsapp') + ' / ' + t('phone')}>
          <Input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} placeholder="9876543210" />
        </Field>
        <Field label={t('mailId')}>
          <Input type="email" value={form.email} onChange={set('email')} placeholder="name@email.com" />
        </Field>
        <Field label={t('defaultCommission')} hint={t('addCommission')}>
          <Input type="number" inputMode="decimal" value={form.default_commission} onChange={set('default_commission')} placeholder="0" />
        </Field>
        <Field label={t('notes')}>
          <Input value={form.notes} onChange={set('notes')} />
        </Field>
        <div className="flex gap-2 pt-1">
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              {t('delete')}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {t('cancel')}
          </Button>
          <Button onClick={() => onSave(form)} disabled={!form.name.trim()} className="flex-1">
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
