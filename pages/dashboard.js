import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Wallet, TrendingUp, CalendarCheck, ShoppingCart } from 'lucide-react'

/* ──── Constantes ──── */
const MONTHS_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
]

const CHART_COLORS = ['#3F6B4F', '#C17A2E', '#A8432F', '#5B8C6A', '#D4954A', '#C0604A', '#274734']

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

/* ──── Squelette ──── */
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-ink/10 rounded ${className}`} />
}

/* ──── Mini barre proportionnelle Top 5 ──── */
function MiniBar({ value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full h-2 bg-ink/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-sage transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ──── Page ──── */
export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState({
    totalStockValue: 0,
    totalBenefit: 0,
    monthBenefit: 0,
    monthSales: 0,
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [platformData, setPlatformData] = useState([])
  const [topProducts, setTopProducts] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sb = supabase

      // Stock
      const { data: stockData } = await sb
        .from('revente_stock_summary')
        .select('*')

      // Ventes
      const { data: ventesData } = await sb
        .from('revente_ventes')
        .select('*')
        .order('date_vente', { ascending: false })
        .limit(5000)

      const stock = stockData ?? []
      const ventes = ventesData ?? []

      // ── KPIs ──
      const totalStockValue = stock.reduce(
        (s, i) => s + Number.parseFloat(i.valeur_stock_restant ?? 0),
        0,
      )
      const totalBenefit = ventes.reduce(
        (s, v) =>
          s +
          (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
            v.qte_vendue,
        0,
      )

      // Mois en cours
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0]
      const ventesMonth = ventes.filter((v) => v.date_vente >= currentMonthStart)
      const monthBenefit = ventesMonth.reduce(
        (s, v) =>
          s +
          (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
            v.qte_vendue,
        0,
      )

      setMetrics({
        totalStockValue,
        totalBenefit,
        monthBenefit,
        monthSales: ventesMonth.length,
      })

      // ── Mensuel (12 mois) ──
      const byMonth = {}
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        byMonth[key] = { month: MONTHS_SHORT[d.getMonth()], benefit: 0 }
      }

      ventes.forEach((v) => {
        const key = v.date_vente.slice(0, 7)
        if (byMonth[key]) {
          byMonth[key].benefit +=
            (Number.parseFloat(v.prix_revente_unitaire) -
              Number.parseFloat(v.prix_achat_unitaire)) *
            v.qte_vendue
        }
      })

      setMonthlyData(Object.values(byMonth).reverse())

      // ── Par plateforme ──
      const byPlatform = {}
      ventes.forEach((v) => {
        const ben =
          (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
          v.qte_vendue
        byPlatform[v.plateforme] = (byPlatform[v.plateforme] ?? 0) + ben
      })
      setPlatformData(
        Object.entries(byPlatform)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      )

      // ── Top 5 produits ──
      const byProduct = {}
      ventes.forEach((v) => {
        const ben =
          (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
          v.qte_vendue
        const p = v.produit
        byProduct[p] = (byProduct[p] ?? 0) + ben
      })
      setTopProducts(
        Object.entries(byProduct)
          .map(([produit, benefice]) => ({ produit, benefice }))
          .sort((a, b) => b.benefice - a.benefice)
          .slice(0, 5),
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const maxTopBenefit = useMemo(
    () => (topProducts.length > 0 ? topProducts[0].benefice : 0),
    [topProducts],
  )

  /* ──── Rendu ──── */
  return (
    <AuthGuard>
      <Layout>
        {/* Titre */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-ink">Tableau de bord</h1>
          <hr className="double-rule mt-2" />
        </div>

        {loading ? (
          <div className="space-y-6">
            {/* Squelettes KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg border border-border p-4">
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-7 w-32" />
                </div>
              ))}
            </div>
            {/* Squelettes graphiques */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg border border-border p-5">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-60 w-full" />
              </div>
              <div className="bg-white rounded-lg border border-border p-5">
                <Skeleton className="h-5 w-40 mb-4" />
                <Skeleton className="h-60 w-full" />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ══════ KPI CARDS ══════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard
                icon={Wallet}
                label="Valeur du stock"
                value={formatCurrency(metrics.totalStockValue)}
                color="sage"
              />
              <KpiCard
                icon={TrendingUp}
                label="Bénéfice cumulé"
                value={formatCurrency(metrics.totalBenefit)}
                color={metrics.totalBenefit >= 0 ? 'sage' : 'terracotta'}
              />
              <KpiCard
                icon={CalendarCheck}
                label="Bénéfice du mois"
                value={formatCurrency(metrics.monthBenefit)}
                color={metrics.monthBenefit >= 0 ? 'sage' : 'terracotta'}
              />
              <KpiCard
                icon={ShoppingCart}
                label="Ventes ce mois"
                value={metrics.monthSales}
                color="ink"
              />
            </div>

            {/* ══════ GRAPHIQUES ══════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Barres mensuelles */}
              <div className="bg-white rounded-lg border border-border p-5">
                <h3 className="font-serif font-bold text-ink mb-4">
                  Bénéfice net par mois
                </h3>
                {monthlyData.length === 0 || monthlyData.every((d) => d.benefit === 0) ? (
                  <EmptyChart label="Aucune vente enregistrée sur les 12 derniers mois" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#D8D3C4" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#1C2B24' }}
                        axisLine={{ stroke: '#D8D3C4' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#1C2B24', fontFamily: 'var(--font-mono)' }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                        tickFormatter={(v) => `${v}€`}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(value), 'Bénéfice']}
                        contentStyle={{
                          background: '#1C2B24',
                          color: '#F7F5EF',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontSize: '0.8rem',
                          fontFamily: 'var(--font-mono)',
                        }}
                      />
                      <Bar dataKey="benefit" fill="#3F6B4F" radius={[3, 3, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Anneau plateformes */}
              <div className="bg-white rounded-lg border border-border p-5">
                <h3 className="font-serif font-bold text-ink mb-4">
                  Répartition par plateforme
                </h3>
                {platformData.length === 0 ? (
                  <EmptyChart label="Aucune vente à répartir" />
                ) : (
                  <div className="flex flex-col items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {platformData.map((_entry, idx) => (
                            <Cell
                              key={`cell-${idx}`}
                              fill={CHART_COLORS[idx % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [formatCurrency(value), 'Bénéfice']}
                          contentStyle={{
                            background: '#1C2B24',
                            color: '#F7F5EF',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.8rem',
                            fontFamily: 'var(--font-mono)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-xs text-ink/60">
                      {platformData.map((entry, idx) => (
                        <span key={entry.name} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                          {entry.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ══════ TOP 5 ══════ */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h3 className="font-serif font-bold text-ink mb-4">
                Top 5 articles les plus rentables
              </h3>
              {topProducts.length === 0 ? (
                <p className="text-sm text-ink/40 italic">Aucune vente pour établir un classement</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p, idx) => (
                    <div
                      key={p.produit}
                      className="flex items-center gap-4 pb-3 border-b border-border/50 last:border-0 last:pb-0"
                    >
                      <span className="font-mono text-sm text-ink/30 w-5 text-right">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{p.produit}</p>
                        <MiniBar value={p.benefice} max={maxTopBenefit} />
                      </div>
                      <span className="font-mono text-sm text-sage font-semibold shrink-0">
                        {formatCurrency(p.benefice)}
                      </span>
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

/* ──── Sous-composants ──── */

function KpiCard({ icon: Icon, label, value, color }) {
  const colorMap = {
    sage: 'text-sage',
    terracotta: 'text-terracotta',
    ink: 'text-ink',
  }

  return (
    <div className="bg-white rounded-lg border border-border p-4 flex items-start gap-3">
      <div className={`mt-0.5 ${colorMap[color] ?? 'text-ink'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-ink/50 uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-bold font-mono mt-0.5 ${colorMap[color] ?? 'text-ink'}`}>
          {typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
        </p>
      </div>
    </div>
  )
}

function EmptyChart({ label }) {
  return (
    <div className="flex items-center justify-center h-60 text-sm text-ink/40 italic">
      {label}
    </div>
  )
}
