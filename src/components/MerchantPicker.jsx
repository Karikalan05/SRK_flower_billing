import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { money } from '../lib/format'
import { Card, EmptyState, Spinner, Badge } from './ui'

// Two-step picker: choose a place, then a merchant inside it.
// `title` is the heading; `destination(merchantId)` returns the path to go to.
export default function MerchantPicker({ icon, title, destination }) {
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [places, setPlaces] = useState(null)
  const [merchants, setMerchants] = useState({})
  const [place, setPlace] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('places').select('*').order('sort_order').order('name_en')
      setPlaces(data ?? [])
    }
    load()
  }, [])

  async function openPlace(p) {
    setPlace(p)
    if (!merchants[p.id]) {
      const { data } = await supabase.from('merchants').select('*').eq('place_id', p.id).order('name')
      setMerchants((prev) => ({ ...prev, [p.id]: data ?? [] }))
    }
  }

  if (!places) return <Spinner />

  // step 2: merchants in the chosen place
  if (place) {
    const list = merchants[place.id]
    return (
      <div className="space-y-3">
        <button onClick={() => setPlace(null)} className="text-sm text-gray-400">
          ‹ {t('places')}
        </button>
        <h1 className="text-xl font-semibold text-gray-800">
          {icon} {lang === 'ta' && place.name_ta ? place.name_ta : place.name_en}
        </h1>
        <p className="text-sm text-gray-400">{t('selectMerchant')}</p>
        {!list ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState icon="🧑‍🌾" text={t('noData')} />
        ) : (
          list.map((m) => (
            <Card key={m.id} className="flex items-center gap-3 p-4" onClick={() => navigate(destination(m.id))}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-lg">🧑‍🌾</span>
              <div className="flex-1">
                <div className="font-medium text-gray-800 ta">{m.name}</div>
                <div className="text-xs text-gray-400">{m.phone || t('phone')}</div>
              </div>
              {Number(m.balance) > 0 && <Badge color="red">{money(m.balance)}</Badge>}
              <span className="text-brand-500 text-lg">{icon}</span>
            </Card>
          ))
        )}
      </div>
    )
  }

  // step 1: places
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-gray-800">{icon} {title}</h1>
      <p className="text-sm text-gray-400">{t('selectPlace')}</p>
      {places.length === 0 ? (
        <EmptyState icon="📍" text={lang === 'ta' ? 'முதலில் ஊரை சேர்க்கவும்' : 'Add a place first'} />
      ) : (
        places.map((p) => (
          <Card key={p.id} className="flex items-center gap-3 p-4" onClick={() => openPlace(p)}>
            <span className="text-2xl">📍</span>
            <div className="flex-1 font-medium text-gray-800">
              {lang === 'ta' && p.name_ta ? p.name_ta : p.name_en}
              <span className="ta text-sm text-gray-400"> {lang === 'ta' ? p.name_en : p.name_ta}</span>
            </div>
            <span className="text-gray-300">›</span>
          </Card>
        ))
      )}
    </div>
  )
}
