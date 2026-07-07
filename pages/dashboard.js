import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Wallet, TrendingUp, CalendarCheck, ShoppingCart, Sparkles } from 'lucide-react'

/* ──── Constantes ──── */
const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const CHART_COLORS = ['#3F6B4F','#C17A2E','#A8432F','#5B8C6A','#D4954A','#C0604A','#274734']

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

/* ──── Animations ──── */
const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const itemAnim = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

/* ──── Sous-composants ──── */
function Skeleton({ className }) {
  return <div className={`skeleton-modern ${className}`} />
}

function MiniBar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="h-full rounded-full bg-gradient-to-r from-sage to-sage-light"
      />
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, color }) {
  const gradients = {
    sage: 'from-sage to-sage-light',
    terracotta: 'from-terracotta to-terracotta-light',
    ink: 'from-ink/60 to-ink',
    amber: 'from-amber to-amber-light',
  }
  return (
    <motion.div variants={itemAnim} className="glass-card rounded-2xl p-5 hover:shadow-glass-lg transition-all duration-300 group">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ink/[0.03] to-ink/[0.06] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
          <Icon className={`w-5 h-5 bg-gradient-to-br ${gradients[color] || gradients.ink} bg-clip-text text-transparent`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink/40 uppercase tracking-wider font-sans">{label}</p>
          <p className="text-2xl font-bold font-mono mt-1">
            {typeof value === 'number' ? (typeof value === 'number' && value.toString().includes('.') ? value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €' : value.toLocaleString('fr-FR')) : value}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ──── Page ──── */
export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ totalStockValue: 0, totalBenefit: 0, monthBenefit: 0, monthSales: 0 })
  const [monthlyData, setMonthlyData] = useState([])
  const [platformData, setPlatformData] = useState([])
  const [topProducts, setTopProducts] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [stockData, ventesData] = await Promise.all([
        supabase.from('revente_stock_summary').select('*'),
        supabase.from('revente_ventes').select('*').order('date_vente', { ascending: false }).limit(5000),
      ])
      const stock = stockData.data ?? []
      const ventes = ventesData.data ?? []

      const totalStockValue = stock.reduce((s, i) => s + Number.parseFloat(i.valeur_stock_restant ?? 0), 0)
      const totalBenefit = ventes.reduce((s, v) => s + (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue, 0)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const ventesMonth = ventes.filter((v) => v.date_vente >= monthStart)
      const monthBenefit = ventesMonth.reduce((s, v) => s + (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue, 0)

      setMetrics({ totalStockValue, totalBenefit, monthBenefit, monthSales: ventesMonth.length })

      // Monthly
      const byMonth = {}
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        byMonth[key] = { month: MONTHS_SHORT[d.getMonth()], benefit: 0 }
      }
      ventes.forEach((v) => {
        const key = v.date_vente.slice(0, 7)
        if (byMonth[key]) byMonth[key].benefit += (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue
      })
      setMonthlyData(Object.values(byMonth).reverse())

      // By platform
      const byPlatform = {}
      ventes.forEach((v) => {
        const ben = (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue
        byPlatform[v.plateforme] = (byPlatform[v.plateforme] ?? 0) + ben
      })
      setPlatformData(Object.entries(byPlatform).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value))

      // Top 5
      const byProduct = {}
      ventes.forEach((v) => {
        const ben = (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue
        byProduct[v.produit] = (byProduct[v.produit] ?? 0) + ben
      })
      setTopProducts(Object.entries(byProduct).map(([produit, benefice]) => ({ produit, benefice })).sort((a, b) => b.benefice - a.benefice).slice(0, 5))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const maxTopBenefit = useMemo(() => topProducts.length > 0 ? topProducts[0].benefice : 0, [topProducts])

  /* ──── Rendu ──── */
  return (
    <AuthGuard>
      <Layout>
        <motion.div variants={container} initial="hidden" animate="show">
          {/* Header */}
          <motion.div variants={itemAnim} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-sage-gradient shadow-glow-sage flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold gradient-text">Tableau de bord</h1>
              <div className="double-rule mt-2 w-24" />
            </div>
          </motion.div>

          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5"><Skeleton className="h-14 w-full" /></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-2xl p-6"><Skeleton className="h-64 w-full" /></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <motion.div variants={container} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <KpiCard icon={Wallet} label="Valeur du stock" value={formatCurrency(metrics.totalStockValue)} color="sage" />
                <KpiCard icon={TrendingUp} label="Bénéfice cumulé" value={formatCurrency(metrics.totalBenefit)} color={metrics.totalBenefit >= 0 ? 'sage' : 'terracotta'} />
                <KpiCard icon={CalendarCheck} label="Bénéfice du mois" value={formatCurrency(metrics.monthBenefit)} color={metrics.monthBenefit >= 0 ? 'amber' : 'terracotta'} />
                <KpiCard icon={ShoppingCart} label="Ventes ce mois" value={metrics.monthSales} color="ink" />
              </motion.div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Bar chart */}
                <motion.div variants={itemAnim} className="glass-card rounded-2xl p-6">
                  <h3 className="font-serif font-bold text-ink mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sage" />
                    Bénéfice net par mois
                  </h3>
                  {monthlyData.every(d => d.benefit === 0) ? (
                    <div className="flex items-center justify-center h-64 text-sm text-ink/30 italic font-sans">Aucune vente sur les 12 derniers mois</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#D8D3C4" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#1C2B24' }} axisLine={{ stroke: '#D8D3C4' }} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#1C2B24', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `${v}€`} />
                        <Tooltip formatter={(value) => [formatCurrency(value), 'Bénéfice']} contentStyle={{ background: 'rgba(28,43,36,0.95)', backdropFilter: 'blur(12px)', color: '#F7F5EF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }} />
                        <Bar dataKey="benefit" fill="#3F6B4F" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </motion.div>

                {/* Pie chart */}
                <motion.div variants={itemAnim} className="glass-card rounded-2xl p-6">
                  <h3 className="font-serif font-bold text-ink mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber" />
                    Répartition par plateforme
                  </h3>
                  {platformData.length === 0 ? (
                    <div className="flex items-center justify-center h-64 text-sm text-ink/30 italic font-sans">Aucune vente à répartir</div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <ResponsiveContainer width="100%" height={230}>
                        <PieChart>
                          <Pie data={platformData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                            {platformData.map((_, idx) => (<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />))}
                          </Pie>
                          <Tooltip formatter={(value) => [formatCurrency(value), 'Bénéfice']} contentStyle={{ background: 'rgba(28,43,36,0.95)', backdropFilter: 'blur(12px)', color: '#F7F5EF', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3 text-xs text-ink/50">
                        {platformData.map((entry, idx) => (
                          <span key={entry.name} className="flex items-center gap-1.5 font-sans">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                            {entry.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Top 5 */}
              <motion.div variants={itemAnim} className="glass-card rounded-2xl p-6">
                <h3 className="font-serif font-bold text-ink mb-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-terracotta" />
                  Top 5 articles les plus rentables
                </h3>
                {topProducts.length === 0 ? (
                  <p className="text-sm text-ink/30 italic font-sans">Aucune vente pour établir un classement</p>
                ) : (
                  <div className="space-y-4">
                    {topProducts.map((p, idx) => (
                      <motion.div
                        key={p.produit}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-center gap-4 pb-3 border-b border-border/30 last:border-0 last:pb-0"
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                          idx === 0 ? 'bg-amber-pale text-amber' :
                          idx === 1 ? 'bg-sage-pale text-sage' :
                          idx === 2 ? 'bg-terracotta-pale text-terracotta' :
                          'bg-ink/5 text-ink/40'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate font-sans">{p.produit}</p>
                          <MiniBar value={p.benefice} max={maxTopBenefit} />
                        </div>
                        <span className="font-mono text-sm font-bold text-sage shrink-0">
                          {formatCurrency(p.benefice)}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </motion.div>
      </Layout>
    </AuthGuard>
  )
}
