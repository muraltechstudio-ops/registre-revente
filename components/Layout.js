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
  ChevronRight,
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
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-border/50 px-4 h-14">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-ink hover:bg-ink/5 transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-serif text-lg font-bold gradient-text">Registre</span>
        <div className="w-9" />
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar — toujours visible sur desktop, animé sur mobile */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-64 bg-white/90 backdrop-blur-2xl border-r border-border/50 flex flex-col shadow-lg md:shadow-none transition-transform duration-300 ease-in-out ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        {/* Close button mobile */}
        <button
          onClick={() => setMenuOpen(false)}
          className="md:hidden absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg text-ink/40 hover:bg-ink/5 hover:text-ink transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo + date */}
        <div className="px-5 pt-7 pb-5 border-b border-border/40">
          <Link href="/dashboard" className="font-serif text-xl font-bold tracking-tight">
            <span className="gradient-text">Registre</span>
            <span className="text-ink/40"> de Revente</span>
          </Link>
          <p className="font-serif text-sm text-ink/40 mt-1.5">{formatDate(today)}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'text-white bg-sage-gradient shadow-glow-sage'
                    : 'text-ink/50 hover:text-ink hover:bg-ink/5'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                  !active && 'group-hover:scale-110'
                }`} />
                {item.label}
                {active && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* User info + logout */}
        <div className="px-3 pb-5 pt-4 border-t border-border/40">
          {user && (
            <p className="text-xs text-ink/30 truncate mb-2 px-3 font-mono">{user.email}</p>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-terracotta/60 hover:text-terracotta hover:bg-terracotta/5 transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform duration-200" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
