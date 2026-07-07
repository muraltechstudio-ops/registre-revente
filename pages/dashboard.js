import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { Wallet, TrendingUp, CalendarCheck, ShoppingCart } from 'lucide-react'

const MONTHS_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
const CHART_COLORS = ['#274734','#C17A2E','#A8432F','#5B8C6A','#D4954A','#C0604A','#3F6B4F']

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

function KpiCard({ icon: Icon, label, value, positive }) {
  return (
    <div className="card-hover p-5 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-sage/5 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-sage" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink/40 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold font-mono mt-0.5 ${positive === false ? 'text-terracotta' : 'text-ink'}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({ totalStockValue: 0, totalBenefit: 0, monthBenefit: 0, monthSales: 0 })
  const [monthlyData, setMonthlyData] = useState([])
  const [platformData, setPlatformData] = useState([])
  const [topProducts, setTopProducts] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [stockRes, ventesRes] = await Promise.all([
        supabase.from('revente_stock_summary').select('*'),
        supabase.from('revente_ventes').select('*').order('date_vente', { ascending: false }).limit(5000),
      ])
      const stock = stockRes.data ?? []
      const ventes = ventesRes.data ?? []

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
        byMonth[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = { month: MONTHS_SHORT[d.getMonth()], benefit: 0 }
      }
      ventes.forEach((v) => {
        const key = v.date_vente.slice(0, 7)
        if (byMonth[key]) byMonth[key].benefit += (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue
      })
      setMonthlyData(Object.values(byMonth).reverse())

      // By platform
      const byPlatform = {}
      ventes.forEach((v) => {
        const b = (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue
        byPlatform[v.plateforme] = (byPlatform[v.plateforme] ?? 0) + b
      })
      setPlatformData(Object.entries(byPlatform).map(([n, v]) => ({ name: n, value: v })).sort((a, b) => b.value - a.value))

      // Top 5
      const byProduct = {}
      ventes.forEach((v) => {
        const b = (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue
        byProduct[v.produit] = (byProduct[v.produit] ?? 0) + b
      })
      setTopProducts(Object.entries(byProduct).map(([p, b]) => ({ produit: p, benefice: b })).sort((a, b) => b.benefice - a.benefice).slice(0, 5))
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  const maxTopBenefit = useMemo(() => topProducts.length > 0 ? topProducts[0].benefice : 0, [topProducts])

  return (
    <AuthGuard>
      <Layout>
        <h1 className="font-serif text-2xl font-bold text-ink mb-1">Tableau de bord</h1>
        <div className="double-rule mb-6 w-32" />

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5"><div className="skeleton h-14 w-full" /></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from({ length: 2 }).map((_, i) => <div key={i} className="card p-6"><div className="skeleton h-64 w-full" /></div>)}
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard icon={Wallet} label="Valeur du stock" value={formatCurrency(metrics.totalStockValue)} />
              <KpiCard icon={TrendingUp} label="Bénéfice cumulé" value={formatCurrency(metrics.totalBenefit)} positive={metrics.totalBenefit >= 0} />
              <KpiCard icon={CalendarCheck} label="Bénéfice du mois" value={formatCurrency(metrics.monthBenefit)} positive={metrics.monthBenefit >= 0} />
              <KpiCard icon={ShoppingCart} label="Ventes ce mois" value={metrics.monthSales} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="card p-6">
                <h3 className="font-semibold text-ink mb-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sage" />
                  Bénéfice net par mois
                </h3>
                {monthlyData.every(d => d.benefit === 0) ? (
                  <div className="flex items-center justify-center h-64 text-sm text-ink/30 italic">Aucune vente sur 12 mois</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D8D3C4" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#1C2B24' }} axisLine={{ stroke: '#D8D3C4' }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#1C2B24', fontFamily: 'monospace' }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `${v}€`} />
                      <Tooltip formatter={(v) => [formatCurrency(v), 'Bénéfice']} contentStyle={{ background: '#1C2B24', color: '#F7F5EF', border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                      <Bar dataKey="benefit" fill="#274734" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-ink mb-5 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber" />
                  Répartition par plateforme
                </h3>
                {platformData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-sm text-ink/30 italic">Aucune vente</div>
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={230}>
                      <PieChart>
                        <Pie data={platformData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                          {platformData.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [formatCurrency(v), 'Bénéfice']} contentStyle={{ background: '#1C2B24', color: '#F7F5EF', border: 'none', borderRadius: '0.5rem', fontSize: '0.8rem' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-ink/50">
                      {platformData.map((e, idx) => (
                        <span key={e.name} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }} />
                          {e.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top 5 */}
            <div className="card p-6">
              <h3 className="font-semibold text-ink mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-terracotta" />
                Top 5 articles les plus rentables
              </h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-ink/30 italic">Aucune vente pour établir un classement</p>
              ) : (
                <div className="space-y-4">
                  {topProducts.map((p, idx) => (
                    <div key={p.produit} className="flex items-center gap-4 pb-3 border-b border-border/30 last:border-0 last:pb-0">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold ${
                        idx === 0 ? 'bg-amber-pale text-amber' :
                        idx === 1 ? 'bg-sage-pale text-sage' :
                        idx === 2 ? 'bg-terracotta-pale text-terracotta' :
                        'bg-ink/5 text-ink/40'
                      }`}>{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{p.produit}</p>
                        <div className="w-full h-1.5 bg-ink/5 rounded-full overflow-hidden mt-1">
                          <div className="h-full rounded-full bg-sage transition-all duration-500" style={{ width: `${maxTopBenefit > 0 ? (p.benefice / maxTopBenefit) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <span className="font-mono text-sm font-bold text-sage shrink-0">{formatCurrency(p.benefice)}</span>
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
