import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import { isSupabaseConfigured } from '../lib/supabase'
import { Button, Input, Field } from '../components/ui'
import LanguageToggle from '../components/LanguageToggle'

export default function Login() {
  const { signIn } = useAuth()
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const err = await signIn(email.trim(), password)
    setBusy(false)
    if (err) setError(t('wrongLogin'))
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-gradient-to-b from-brand-50 to-brand-100 px-5 py-10">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>

      <img src="/logo.png" alt="SRK Flowers" className="mb-4 h-28 w-28 drop-shadow-sm" />
      <h1 className="text-2xl font-semibold text-brand-700">{t('appName')}</h1>
      <p className="mb-8 text-sm text-gray-500">{t('appTagline')}</p>

      {!isSupabaseConfigured ? (
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center text-sm text-gray-600 shadow-sm">
          <p className="mb-2 text-base font-medium text-brand-700">{t('notConfigured')}</p>
          <p>Open SETUP-GUIDE.md to connect the database (5 minutes).</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <h2 className="text-center text-base font-medium text-gray-600">{t('loginTitle')}</h2>
          <Field label={t('email')}>
            <Input
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label={t('password')}>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-600">{error}</p>
          )}
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? t('loggingIn') : t('login')}
          </Button>
        </form>
      )}
    </div>
  )
}
