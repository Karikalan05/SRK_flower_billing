import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LanguageContext'
import LanguageToggle from './LanguageToggle'

const navItems = [
  { to: '/', key: 'home', icon: '🏠', end: true },
  { to: '/billing', key: 'bill', icon: '🧾' },
  { to: '/received', key: 'received', icon: '💰' },
  { to: '/places', key: 'places', icon: '📍' },
  { to: '/settings', key: 'settings', icon: '⚙️' },
]

export default function Layout() {
  const { t } = useLang()
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col bg-brand-50">
      {/* top bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-brand-100 bg-white/90 px-4 py-3 backdrop-blur">
        <img src="/logo.png" alt="" className="h-9 w-9" />
        <div className="flex-1 leading-tight">
          <div className="font-semibold text-brand-700">{t('appName')}</div>
          {profile && (
            <div className="text-xs text-gray-400">
              {profile.full_name || profile.role} · {t(profile.role === 'admin' ? 'admin' : 'staff')}
            </div>
          )}
        </div>
        <LanguageToggle />
        <button
          onClick={handleLogout}
          aria-label={t('logout')}
          className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          ⎋
        </button>
      </header>

      {/* page content */}
      <main className="flex-1 px-4 pb-24 pt-4">
        <Outlet />
      </main>

      {/* bottom nav */}
      <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-md -translate-x-1/2 justify-around border-t border-brand-100 bg-white/95 px-2 py-2 backdrop-blur">
        {navItems.map((item) => (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1 text-xs ${
                isActive ? 'text-brand-700' : 'text-gray-400'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{t(item.key)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
