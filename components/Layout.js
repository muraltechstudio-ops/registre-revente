import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { LayoutDashboard, Package, Receipt, LogOut, Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/stock', label: 'Stock', icon: Package },
  { href: '/ventes', label: 'Ventes', icon: Receipt },
]

const MONTHS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre']

function formatDate(date) {
  const d = new Date(date)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export default function Layout({ children }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const isActive = (href) => router.pathname === href
  const today = new Date()

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-paper via-[#F2EFE8] to-paper">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white border-b border-border/40 px-4 h-14">
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 -ml-2 rounded-lg text-ink hover:bg-ink/5 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-base text-ink/80">Registre</span>
        <div className="w-9" />
      </div>

      {/* Mobile overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/10 z-40 md:hidden" onClick={() => setMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-60 bg-white border-r border-border/40 flex flex-col transition-transform duration-200 ease-in-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="md:hidden absolute top-2 right-2">
          <button onClick={() => setMenuOpen(false)} className="p-2 rounded-lg text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Logo */}
        <div className="px-4 pt-6 pb-4 border-b border-border/30">
          <Link href="/dashboard" className="font-serif text-lg font-bold text-ink tracking-tight">
            Registre de Revente
          </Link>
          <p className="text-sm text-ink/40 mt-1">{formatDate(today)}</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 pt-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active ? 'bg-sage text-white shadow-sm' : 'text-ink/50 hover:text-ink hover:bg-ink/5'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-2 pb-4 pt-3 border-t border-border/30">
          {user && <p className="text-xs text-ink/30 truncate px-3 mb-2">{user.email}</p>}
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-terracotta/60 hover:text-terracotta hover:bg-terracotta/5 transition-all duration-150">
            <LogOut className="w-4 h-4 shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8">{children}</div>
      </main>
    </div>
  )
}
