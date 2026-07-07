import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import {
  LayoutDashboard,
  Package,
  Receipt,
  LogOut,
  Menu,
  X,
  TrendingUp,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/stock', label: 'Stock', icon: Package },
  { href: '/ventes', label: 'Ventes', icon: Receipt },
]

export default function Layout({ children }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null))
  }, [])

  const logout = async () => { await supabase.auth.signOut(); router.replace('/login') }
  const active = (h) => router.pathname === h

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-base-950 text-ink-50">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-base-900 border-b border-base-700 px-4 h-14">
        <button onClick={() => setOpen(true)} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-50 transition-colors">
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-mono text-sm text-ink-400 tracking-wider uppercase">Registre</span>
        <div className="w-8" />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar — CSS transition (pas framer-motion) pour éviter le bug d'inline style */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-50 h-dvh w-60 bg-base-900 border-r border-base-700 flex flex-col transition-transform duration-200 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="md:hidden absolute top-2 right-2">
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-ink-400 hover:text-ink-50"><X className="w-4 h-4" /></button>
        </div>

        {/* Brand */}
        <div className="px-5 pt-7 pb-5 border-b border-base-700">
          <Link href="/dashboard" className="font-mono text-sm tracking-wider uppercase text-ink-50 font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Registre
          </Link>
          <p className="font-mono text-[10px] text-ink-400/60 mt-1.5 uppercase tracking-[0.15em]">Salle des Marchés</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-5 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon
            const isActive = active(item.href)
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-accent/10 text-accent border-l-2 border-accent'
                    : 'text-ink-400 hover:text-ink-50 hover:bg-base-800'
                }`}>
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="px-3 pb-5 pt-4 border-t border-base-700">
          {user && <p className="text-xs text-ink-400/40 truncate px-4 mb-2 font-mono">{user.email}</p>}
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-danger/60 hover:text-danger hover:bg-danger/5 transition-all duration-150">
            <LogOut className="w-4 h-4 shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-h-screen pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">{children}</div>
      </main>
    </div>
  )
}
