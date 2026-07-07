import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { LayoutDashboard, Package, Receipt, LogOut, Menu, X, ChevronRight } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/stock', label: 'Stock', icon: Package },
  { href: '/ventes', label: 'Ventes', icon: Receipt },
]

export default function Layout({ children }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null)) }, [])

  const logout = async () => { await supabase.auth.signOut(); router.replace('/login') }
  const active = (h) => router.pathname === h

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-navy px-4 h-14 shadow-md">
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg text-goldlight hover:bg-white/10 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-serif text-base text-goldlight tracking-wide">Registre</span>
        <div className="w-8" />
      </div>

      {open && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar — dark navy distinctive */}
      <aside className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-64 bg-navy flex flex-col transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-xl`}>
        <div className="md:hidden absolute top-2 right-2">
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-goldlight/50 hover:text-goldlight transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brand */}
        <div className="px-6 pt-7 pb-5 border-b border-white/10">
          <Link href="/dashboard" className="font-serif text-xl text-goldlight tracking-wide font-bold">
            Registre
          </Link>
          <p className="font-serif text-xs text-white/30 mt-1 italic">Carnet de revente</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-5 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = active(item.href)
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-gold/15 text-goldlight border-l-2 border-gold'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-goldlight/50" />}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-5 pt-4 border-t border-white/10">
          {user && <p className="text-xs text-white/25 truncate px-4 mb-2">{user.email}</p>}
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-rust/60 hover:text-rust hover:bg-white/5 transition-all duration-150">
            <LogOut className="w-4 h-4 shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-8">{children}</div>
      </main>
    </div>
  )
}
