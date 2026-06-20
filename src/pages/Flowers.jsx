import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLang } from '../context/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { money } from '../lib/format'
import { Card, Button, Modal, Field, Input, Select, EmptyState, Spinner } from '../components/ui'

// A simple master list of flower names (English + Tamil) used by the billing
// screen. No stock — flowers are bought and sold the same day.
export default function Flowers() {
  const { t } = useLang()
  const { isAdmin } = useAuth()
  const [flowers, setFlowers] = useState(null)
  const [categories, setCategories] = useState([])
  const [editing, setEditing] = useState(null)
  const [catOpen, setCatOpen] = useState(false)

  async function load() {
    const [{ data: f }, { data: c }] = await Promise.all([
      supabase.from('flowers').select('*, flower_categories(name_en, name_ta, color)').eq('active', true).order('name_en'),
      supabase.from('flower_categories').select('*').order('sort_order'),
    ])
    setFlowers(f ?? [])
    setCategories(c ?? [])
  }
  useEffect(() => {
    load()
  }, [])

  async function save(form) {
    const payload = {
      name_en: form.name_en.trim(),
      name_ta: form.name_ta.trim(),
      category_id: form.category_id || null,
      default_rate: Number(form.default_rate || 0),
      active: true,
    }
    if (editing?.id) {
      await supabase.from('flowers').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('flowers').insert(payload)
    }
    setEditing(null)
    load()
  }

  async function remove(f) {
    if (!confirm(t('confirmDelete'))) return
    await supabase.from('flowers').update({ active: false }).eq('id', f.id)
    setEditing(null)
    load()
  }

  if (!flowers) return <Spinner />

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">🌸 {t('flowers')}</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <Button size="sm" variant="soft" onClick={() => setCatOpen(true)}>
              {t('categories')}
            </Button>
            <Button size="sm" onClick={() => setEditing({})}>
              + {t('flower')}
            </Button>
          </div>
        )}
      </div>

      {flowers.length === 0 && <EmptyState icon="🌸" text={t('noData')} />}

      {flowers.map((f) => (
        <Card key={f.id} className="flex items-center gap-3 p-4">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-lg"
            style={{ background: (f.flower_categories?.color || '#e91e63') + '22' }}
          >
            🌸
          </span>
          <div className="flex-1">
            <div className="font-medium text-gray-800">
              {f.name_en} <span className="ta text-gray-500">/ {f.name_ta}</span>
            </div>
            {Number(f.default_rate) > 0 && (
              <div className="text-xs text-gray-400">{t('rate')}: {money(f.default_rate)}</div>
            )}
          </div>
          {isAdmin && (
            <button onClick={() => setEditing(f)} className="rounded-lg bg-gray-100 px-3 py-1 text-sm text-gray-500">
              ✏️
            </button>
          )}
        </Card>
      ))}

      {editing && (
        <FlowerForm
          flower={editing}
          categories={categories}
          onSave={save}
          onDelete={editing.id ? () => remove(editing) : null}
          onClose={() => setEditing(null)}
        />
      )}
      {catOpen && (
        <CategoriesModal
          categories={categories}
          onClose={() => setCatOpen(false)}
          onChanged={load}
        />
      )}
    </div>
  )
}

// Admin can rename flower categories (English + Tamil), add and delete them.
function CategoriesModal({ categories, onClose, onChanged }) {
  const { t } = useLang()
  const [rows, setRows] = useState(categories.map((c) => ({ ...c })))
  const [busy, setBusy] = useState(false)

  function setField(id, key, val) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: val } : r)))
  }

  async function saveRow(r) {
    setBusy(true)
    await supabase
      .from('flower_categories')
      .update({ name_en: r.name_en.trim(), name_ta: r.name_ta.trim() })
      .eq('id', r.id)
    setBusy(false)
    onChanged()
  }
  async function addRow() {
    setBusy(true)
    const { data } = await supabase
      .from('flower_categories')
      .insert({ name_en: 'New', name_ta: 'புதியது', sort_order: rows.length + 1 })
      .select()
      .single()
    setBusy(false)
    if (data) setRows((prev) => [...prev, data])
    onChanged()
  }
  async function removeRow(r) {
    if (!confirm(t('confirmDelete'))) return
    await supabase.from('flower_categories').delete().eq('id', r.id)
    setRows((prev) => prev.filter((x) => x.id !== r.id))
    onChanged()
  }

  return (
    <Modal open onClose={onClose} title={t('categories')}>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-2">
            <Input value={r.name_en} onChange={(e) => setField(r.id, 'name_en', e.target.value)} placeholder="English" />
            <Input className="ta" value={r.name_ta} onChange={(e) => setField(r.id, 'name_ta', e.target.value)} placeholder="தமிழ்" />
            <button onClick={() => saveRow(r)} disabled={busy} className="rounded-lg bg-leaf-600 px-2 py-2 text-xs text-white">✓</button>
            <button onClick={() => removeRow(r)} className="px-1 text-gray-300 hover:text-red-500">✕</button>
          </div>
        ))}
        <Button variant="outline" onClick={addRow} disabled={busy} className="w-full">
          + {t('add')}
        </Button>
        <Button variant="ghost" onClick={onClose} className="w-full">{t('close')}</Button>
      </div>
    </Modal>
  )
}

function FlowerForm({ flower, categories, onSave, onDelete, onClose }) {
  const { t } = useLang()
  const [form, setForm] = useState({
    name_en: flower.name_en || '',
    name_ta: flower.name_ta || '',
    category_id: flower.category_id || '',
    default_rate: flower.default_rate ?? '',
  })
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  return (
    <Modal open onClose={onClose} title={flower.id ? t('edit') : t('add') + ' ' + t('flower')}>
      <div className="space-y-3">
        <Field label={t('englishName')}>
          <Input value={form.name_en} onChange={set('name_en')} placeholder="Rose" />
        </Field>
        <Field label={t('tamilName')}>
          <Input className="ta" value={form.name_ta} onChange={set('name_ta')} placeholder="ரோஜா" />
        </Field>
        <Field label={t('category')}>
          <Select value={form.category_id} onChange={set('category_id')}>
            <option value="">{t('none')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en} / {c.name_ta}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('rate')} hint={t('rate') + ' (optional)'}>
          <Input type="number" inputMode="decimal" value={form.default_rate} onChange={set('default_rate')} placeholder="0" />
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
          <Button onClick={() => onSave(form)} disabled={!form.name_en.trim()} className="flex-1">
            {t('save')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
