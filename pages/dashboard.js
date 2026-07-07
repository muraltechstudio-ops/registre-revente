import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import CountUp from '../components/CountUp'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Wallet, TrendingUp, CalendarCheck, ShoppingCart } from 'lucide-react'

const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const CHART_COLORS = ['#00E5A0','#00A876','#FF5C72','#1B1E25','#2A2E38','#8B92A3']
const CFMT = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

/* ──── Stagger variants ──── */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const itemAnim = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

/* ──── Tooltip style ──── */
const tooltipStyle = {
  contentStyle: { background: '#1B1E25', color: '#F4F5F7', border: '1px solid #2A2E38', borderRadius: '0.5rem', fontSize: '0.75rem', fontFamily: 'var(--font-mono), monospace' },
}

/* ──── Skeleton shimmer ──── */
function Skeleton({ className }) {
  return <div className={`bg-base-800 bg-shimmer bg-[length:200%_100%] animate-shimmer rounded-lg ${className}`} />
}

/* ──── Bento card wrapper ──── */
function BentoCard({ className, children }) {
  return (
    <motion.div variants={itemAnim} className={`card-dash p-5 overflow-hidden ${className}`}>
      {children}
    </motion.div>
  )
}

/* ──── KPI (animated count) ──── */
function KpiCard({ icon: Icon, label, value, color = 'accent', decimal = false }) {
  const numValue = parseFloat(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'))
  const isCurrency = typeof value === 'string' && value.includes('€')

  return (
    <BentoCard className="relative">
      <div className="flex items-start justify-between mb-2">
        <span className="section-label">{label}</span>
        <Icon className="w-4 h-4 text-ink-400" />
      </div>
      <div className={`kpi-value text-4xl sm:text-5xl ${color}`}>
        {isCurrency ? (
          <>
            <span className="text-base text-ink-400 mr-1">€</span>
            <CountUp end={numValue} decimals={2} />
          </>
        ) : (
          <CountUp end={numValue} />
        )}
      </div>
    </BentoCard>
  )
}

/* ──── Page ──── */
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

      // Monthly
      const bm = {}
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        bm[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = { month: MONTHS[d.getMonth()], benefit: 0 }
      }
      ventes.forEach(v => { if (bm[v.date_vente.slice(0, 7)]) bm[v.date_vente.slice(0, 7)].benefit += (Number(v.prix_revente_unitaire) - Number(v.prix_achat_unitaire)) * v.qte_vendue })
      setMonthly(Object.values(bm))

      // Platforms
      const bp = {}
      ventes.forEach(v => { const b = (Number(v.prix_revente_unitaire) - Number(v.prix_achat_unitaire)) * v.qte_vendue; bp[v.plateforme] = (bp[v.plateforme] ?? 0) + b })
      setPlatforms(Object.entries(bp).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value))

      // Top 5
      const bp2 = {}
      ventes.forEach(v => { const b = (Number(v.prix_revente_unitaire) - Number(v.prix_achat_unitaire)) * v.qte_vendue; bp2[v.produit] = (bp2[v.produit] ?? 0) + b })
      setTop(Object.entries(bp2).map(([p, b]) => ({ p, b })).sort((a, b) => b.b - a.b).slice(0, 5))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  const maxTop = useMemo(() => top.length > 0 ? top[0].b : 0, [top])

  if (loading) return (
    <AuthGuard><Layout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[160px]">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className={i === 0 ? 'md:col-span-2 md:row-span-2' : ''} />)}
      </div>
    </Layout></AuthGuard>
  )

  return (
    <AuthGuard>
      <Layout>
        <motion.div variants={container} initial="hidden" animate="show">
          {/* Title */}
          <motion.div variants={itemAnim} className="mb-6 flex items-center gap-3">
            <div className="w-1 h-6 bg-accent rounded-full" />
            <div>
              <h1 className="font-mono text-base tracking-wider uppercase text-ink-50 font-semibold">Tableau de bord</h1>
              <p className="text-xs text-ink-400/60 font-mono uppercase tracking-[0.15em]">Synthèse financière</p>
            </div>
          </motion.div>

          {/* Bento grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-min">

            {/* 1. Bénéfice cumulé — large, avec bar chart en filigrane */}
            <BentoCard className="md:col-span-2 md:row-span-2 relative min-h-[280px]">
              {/* Bar chart in watermark */}
              {monthly.length > 0 && (
                <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly}>
                      <Bar dataKey="benefit" fill="#00E5A0" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <span className="section-label">Bénéfice cumulé</span>
                  <TrendingUp className="w-4 h-4 text-accent" />
                </div>
                <div className="kpi-value text-6xl sm:text-7xl text-accent mb-1">
                  <span className="text-2xl text-ink-400 mr-2 align-middle">€</span>
                  <CountUp end={metrics.benef} decimals={2} />
                </div>
                <p className="text-xs text-ink-400/60 font-mono mt-2">
                  {metrics.msales} vente{metrics.msales !== 1 ? 's' : ''} ce mois
                </p>
              </div>
            </BentoCard>

            {/* 2. Répartition plateforme — pie chart, 2 rows tall */}
            <BentoCard className="md:row-span-2 min-h-[280px]">
              <div className="flex items-center justify-between mb-3">
                <span className="section-label">Par plateforme</span>
              </div>
              {platforms.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-xs text-ink-400/40">Aucune vente</div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={platforms} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                        {platforms.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [CFMT(v), 'Bénéfice']} {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {platforms.map((e, idx) => (
                      <span key={e.name} className="flex items-center gap-1.5 text-[10px] text-ink-400 font-mono uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                        {e.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </BentoCard>

            {/* 3. Valeur du stock */}
            <KpiCard icon={Wallet} label="Valeur stock" value={CFMT(metrics.val)} />

            {/* 4. Bénéfice du mois */}
            <KpiCard icon={CalendarCheck} label="Bénéfice du mois" value={CFMT(metrics.mbenef)} color={metrics.mbenef >= 0 ? 'text-accent' : 'text-danger'} />

            {/* 5. Ventes ce mois */}
            <KpiCard icon={ShoppingCart} label="Ventes ce mois" value={metrics.msales} />

            {/* 6. Bénéfice par mois — bar chart */}
            <BentoCard className="md:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <span className="section-label">Bénéfice net par mois</span>
              </div>
              {monthly.every(d => d.benefit === 0) ? (
                <div className="flex items-center justify-center h-[200px] text-xs text-ink-400/40">Aucune donnée</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2A2E38" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8B92A3' }} axisLine={{ stroke: '#2A2E38' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8B92A3', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `${v}€`} />
                    <Tooltip formatter={(v) => [CFMT(v), 'Bénéfice']} {...tooltipStyle} />
                    <Bar dataKey="benefit" fill="#00E5A0" radius={[3, 3, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </BentoCard>

            {/* 7. Top 5 */}
            <BentoCard className="md:col-span-3">
              <div className="flex items-center justify-between mb-4">
                <span className="section-label">Top 5 articles les plus rentables</span>
              </div>
              {top.length === 0 ? (
                <p className="text-xs text-ink-400/40">Aucune vente</p>
              ) : (
                <AnimatePresence>
                  <div className="space-y-3">
                    {top.map((t, idx) => (
                      <motion.div
                        key={t.p}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-4 pb-3 border-b border-base-700 last:border-0 last:pb-0"
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                          idx === 0 ? 'bg-accent/15 text-accent' : idx === 1 ? 'bg-accent/10 text-accent-dim' : idx === 2 ? 'bg-accent/5 text-ink-400' : 'bg-base-800 text-ink-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink-50 truncate font-sans">{t.p}</p>
                          <div className="w-full h-1.5 bg-base-800 rounded-full mt-1 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${maxTop > 0 ? (t.b / maxTop) * 100 : 0}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className="h-full rounded-full bg-accent"
                            />
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold text-accent shrink-0">
                          <CountUp end={t.b} decimals={0} prefix="€" />
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </BentoCard>
          </div>
        </motion.div>
      </Layout>
    </AuthGuard>
  )
}
