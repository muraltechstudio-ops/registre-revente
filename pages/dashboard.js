import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Wallet, TrendingUp, CalendarCheck, ShoppingCart, ArrowUpRight } from 'lucide-react'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const CC = ['#2D4A3E','#C89B3C','#A8432F','#4A7A5F','#E8D5A0','#B86540','#1A1F2B']
const CFMT = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ val: 0, benef: 0, mbenef: 0, msales: 0 })
  const [monthly, setMonthly] = useState([])
  const [platforms, setPlatforms] = useState([])
  const [top, setTop] = useState([])

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const [s, v] = await Promise.all([
        supabase.from('revente_stock_summary').select('*'),
        supabase.from('revente_ventes').select('*').order('date_vente', { ascending: false }).limit(5000),
      ])
      const stock = s.data ?? []
      const ventes = v.data ?? []

      const val = stock.reduce((a, i) => a + Number(i.valeur_stock_restant ?? 0), 0)
      const benef = ventes.reduce((a, v) => a + (Number(v.prix_revente_unitaire) - Number(v.prix_achat_unitaire)) * v.qte_vendue, 0)

      const now = new Date()
      const ms = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      const mv = ventes.filter(v => v.date_vente.startsWith(ms))
      const mbenef = mv.reduce((a, v) => a + (Number(v.prix_revente_unitaire) - Number(v.prix_achat_unitaire)) * v.qte_vendue, 0)

      setMetrics({ val, benef, mbenef, msales: mv.length })

      // Monthly chart
      const bm = {}
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        bm[k] = { month: MONTHS[d.getMonth()], benefit: 0 }
      }
      ventes.forEach(v => { if (bm[v.date_vente.slice(0, 7)]) bm[v.date_vente.slice(0, 7)].benefit += (Number(v.prix_revente_unitaire) - Number(v.prix_achat_unitaire)) * v.qte_vendue })
      setMonthly(Object.values(bm))

      // Platforms
      const bp = {}
      ventes.forEach(v => {
        const b = (Number(v.prix_revente_unitaire) - Number(v.prix_achat_unitaire)) * v.qte_vendue
        bp[v.plateforme] = (bp[v.plateforme] ?? 0) + b
      })
      setPlatforms(Object.entries(bp).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value))

      // Top 5
      const bp2 = {}
      ventes.forEach(v => {
        const b = (Number(v.prix_revente_unitaire) - Number(v.prix_achat_unitaire)) * v.qte_vendue
        bp2[v.produit] = (bp2[v.produit] ?? 0) + b
      })
      setTop(Object.entries(bp2).map(([p, b]) => ({ p, b })).sort((a, b) => b.b - a.b).slice(0, 5))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  const maxTop = useMemo(() => top.length > 0 ? top[0].b : 0, [top])

  return (
    <AuthGuard>
      <Layout>
        <h1 className="font-serif text-2xl font-bold text-ink tracking-tight mb-1">Tableau de bord</h1>
        <div className="double-bar mb-6" />

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="card p-5"><div className="h-14 bg-ink/5 rounded animate-pulse" /></div>)}
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[1,2].map(i => <div key={i} className="card p-6"><div className="h-64 bg-ink/5 rounded animate-pulse" /></div>)}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Kpi icon={Wallet} label="Valeur stock" value={CFMT(metrics.val)} />
              <Kpi icon={TrendingUp} label="Bénéfice cumulé" value={CFMT(metrics.benef)} color={metrics.benef >= 0 ? 'text-forest' : 'text-rust'} />
              <Kpi icon={CalendarCheck} label="Bénéfice du mois" value={CFMT(metrics.mbenef)} color={metrics.mbenef >= 0 ? 'text-forest' : 'text-rust'} />
              <Kpi icon={ShoppingCart} label="Ventes ce mois" value={metrics.msales} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h3 className="font-serif font-bold text-ink mb-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  Bénéfice par mois
                </h3>
                {monthly.every(d => d.benefit === 0) ? (
                  <div className="h-64 flex items-center justify-center text-sm text-muted/40 italic">Aucune vente</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D4CDBC" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#1C1715' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#1C1715', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${v}€`} />
                      <Tooltip formatter={v => [CFMT(v), 'Bénéfice']} contentStyle={{ background: '#1C1715', color: '#FCF9F2', border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                      <Bar dataKey="benefit" fill="#2D4A3E" radius={[4,4,0,0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card p-6">
                <h3 className="font-serif font-bold text-ink mb-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  Par plateforme
                </h3>
                {platforms.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-muted/40 italic">Aucune vente</div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie data={platforms} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {platforms.map((_, idx) => <Cell key={idx} fill={CC[idx % CC.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => [CFMT(v), 'Bénéfice']} contentStyle={{ background: '#1C1715', color: '#FCF9F2', border: 'none', borderRadius: '0.5rem' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs text-muted">
                      {platforms.map((e, idx) => (
                        <span key={e.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: CC[idx % CC.length] }} />
                          {e.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="font-serif font-bold text-ink mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-gold" />
                Top 5 articles les plus rentables
              </h3>
              {top.length === 0 ? (
                <p className="text-sm text-muted/40 italic">Aucune vente</p>
              ) : (
                <div className="space-y-4">
                  {top.map((t, idx) => (
                    <div key={t.p} className="flex items-center gap-4 pb-3 border-b border-border/30 last:border-0 last:pb-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        idx === 0 ? 'bg-gold/20 text-gold' : idx === 1 ? 'bg-forest/10 text-forest' : idx === 2 ? 'bg-rust/10 text-rust' : 'bg-ink/5 text-muted'
                      }`}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{t.p}</p>
                        <div className="w-full h-1.5 bg-ink/5 rounded-full mt-1">
                          <div className="h-full rounded-full bg-gradient-to-r from-gold to-forest transition-all" style={{ width: `${maxTop > 0 ? (t.b / maxTop) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-forest shrink-0">{CFMT(t.b)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Layout>
    </AuthGuard>
  )
}

function Kpi({ icon: Icon, label, value, color }) {
  return (
    <div className="card-hover p-5 border-l-4 border-gold">
      <div className="flex items-start gap-4">
        <Icon className="w-5 h-5 text-gold mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted uppercase tracking-wider font-serif">{label}</p>
          <p className={`text-2xl font-bold font-mono mt-0.5 ${color || 'text-ink'}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
