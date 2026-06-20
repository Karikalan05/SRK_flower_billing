import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { Card, Button, Modal, Field, Input, EmptyState, Spinner } from '../components/ui'

export default function Places() {
  const { t, lang } = useLang()
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [places, setPlaces] = useState(null)
  const [editing, setEditing] = useState(null) // null | {} | place

  async function load() {
    const { data } = await supabase
      .from('places')
      .select('*, merchants(count)')
      .order('sort_order')
      .order('name_en')
    setPlaces(data ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function save(form) {
    const payload = { name_en: form.name_en.trim(), name_ta: form.name_ta.trim() }
    if (editing?.id) {
      await supabase.from('places').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('places').insert(payload)
    }
    setEditing(null)
    load()
  }

  async function remove(place) {
    if (!confirm(t('confirmDelete'))) return
    await supabase.from('places').delete().eq('id', place.id)
    setEditing(null)
    load()
  }

  if (!places) return <Spinner />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">{t('places')}</h1>
        {isAdmin && (
          <Button size="sm" onClick={() => setEditing({})}>
            + {t('add')}
          </Button>
        )}
      </div>

      {places.length === 0 && <EmptyState icon="📍" text={t('noData')} />}

      {places.map((place) => (
        <Card key={place.id} className="flex items-center gap-3 p-4" onClick={() => navigate(`/places/${place.id}`)}>
          <span className="text-2xl">📍</span>
          <div className="flex-1">
            <div className="font-medium text-gray-800">
              {lang === 'ta' && place.name_ta ? place.name_ta : place.name_en}
            </div>
            <div className="text-xs text-gray-400">
              {lang === 'ta' ? place.name_en : place.name_ta} · {place.merchants?.[0]?.count ?? 0} {t('merchants').toLowerCase()}
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditing(place)
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
        <PlaceForm
          place={editing}
          onSave={save}
          onDelete={editing.id ? () => remove(editing) : null}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function PlaceForm({ place, onSave, onDelete, onClose }) {
  const { t } = useLang()
  const [nameEn, setNameEn] = useState(place.name_en || '')
  const [nameTa, setNameTa] = useState(place.name_ta || '')

  return (
    <Modal open onClose={onClose} title={place.id ? t('edit') : t('add') + ' ' + t('place')}>
      <div className="space-y-4">
        <Field label={t('englishName')}>
          <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Cuddalore" />
        </Field>
        <Field label={t('tamilName')}>
          <Input className="ta" value={nameTa} onChange={(e) => setNameTa(e.target.value)} placeholder="கடலூர்" />
        </Field>
        <div className="flex gap-2">
          {onDelete && (
            <Button variant="danger" onClick={onDelete}>
              {t('delete')}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} className="flex-1">
            {t('cancel')}
          </Button>
          <Button onClick={() => onSave({ name_en: nameEn, name_ta: nameTa })} disabled={!nameEn.trim()} className="flex-1">
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
