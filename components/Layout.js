import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import {
  LayoutDashboard,
  Package,
  Receipt,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/stock', label: 'Stock', icon: Package },
  { href: '/ventes', label: 'Ventes', icon: Receipt },
]

const MONTHS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function formatDate(date) {
  const d = new Date(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function Layout({ children }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user ?? null)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const isActive = (href) => router.pathname === href
  const today = new Date()

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-paper">
      {/* Mobile header bar */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-ink/10 px-4 py-3 sticky top-0 z-50">
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 rounded-md text-ink hover:bg-sage/5 transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-serif text-lg font-bold text-ink">
          Registre de Revente
        </span>
        <div className="w-9" />
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-64 bg-white border-r border-ink/10 flex flex-col transition-transform duration-200 ease-in-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Close button mobile */}
        <button
          onClick={() => setMenuOpen(false)}
          className="md:hidden absolute top-3 right-3 p-1 rounded text-ink/40 hover:text-ink transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Logo + date */}
        <div className="px-5 pt-6 pb-4 border-b border-ink/10">
          <Link
            href="/dashboard"
            className="font-serif text-xl font-bold text-ink tracking-tight"
          >
            Registre de Revente
          </Link>
          <p className="font-serif text-sm text-ink/50 mt-1">{formatDate(today)}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-sage text-white'
                    : 'text-ink/60 hover:bg-ink/5 hover:text-ink'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-3 pb-4 pt-4 border-t border-ink/10">
          {user && (
            <p className="text-xs text-ink/40 truncate mb-2 px-3 font-mono">{user.email}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-md text-sm font-medium text-terracotta hover:bg-terracotta/5 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">{children}</div>
      </main>
    </div>
  )
}
