import { useLang } from '../context/LanguageContext'

// A pill that switches between Tamil and English.
export default function LanguageToggle() {
  const { lang, setLang } = useLang()
  return (
    <div className="inline-flex rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-brand-100">
      <button
        onClick={() => setLang('ta')}
        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
          lang === 'ta' ? 'bg-brand-600 text-white' : 'text-gray-500'
        }`}
      >
        தமிழ்
      </button>
      <button
        onClick={() => setLang('en')}
        className={`rounded-full px-3 py-1 text-sm font-medium transition ${
          lang === 'en' ? 'bg-brand-600 text-white' : 'text-gray-500'
        }`}
      >
        EN
      </button>
    </div>
  )
}
