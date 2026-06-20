import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { STRINGS } from '../lib/strings'

const LanguageContext = createContext(null)

const STORAGE_KEY = 'srk_lang'

export function LanguageProvider({ children }) {
  // Default to Tamil because most users prefer Tamil.
  const [lang, setLang] = useState(() => localStorage.getItem(STORAGE_KEY) || 'ta')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  // t('total') -> "மொத்தம்" (or English depending on current language)
  const t = useCallback(
    (key) => {
      const entry = STRINGS[key]
      if (!entry) return key
      return entry[lang] ?? entry.en
    },
    [lang],
  )

  // tBoth('total') -> "Total / மொத்தம்"  (used on bills, always shows both)
  const tBoth = useCallback((key) => {
    const entry = STRINGS[key]
    if (!entry) return key
    return `${entry.en} / ${entry.ta}`
  }, [])

  const toggle = useCallback(() => setLang((l) => (l === 'ta' ? 'en' : 'ta')), [])

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggle, t, tBoth }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider')
  return ctx
}
