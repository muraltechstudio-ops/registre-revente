import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import StockModal from '../components/StockModal'
import toast from 'react-hot-toast'
import {
  Package, Plus, Search, ShoppingCart, Pencil, Trash2, Box, TrendingUp, Wallet,
  CalendarCheck, AlertTriangle,
} from 'lucide-react'

const ALL_CATEGORIES = ['Informatique','Mode','Bijoux','Moto','Papeterie/Bureau','Hygiène/Beauté','Stock existant','Autre']
const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
const STOCK_LOW_THRESHOLD = 3

function Skeleton({ className }) { return <div className={`skeleton ${className}`} /> }

function ProductThumb({ url, size }) {
  if (url) return <img src={url} alt="" className="rounded-lg object-cover border border-border/40 shrink-0" style={{ width: size, height: size }} />
  return <div className="rounded-lg bg-ink/5 border border-border/30 flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
    <Package className="w-4 h-4 text-ink/20" />
  </div>
}

export default function StockPage() {
  const router = useRouter()
  const [stockItems, setStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [metrics, setMetrics] = useState({ totalStockValue: 0, totalBenefit: 0, totalSales: 0, monthSales: 0 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [summaryRes, photosRes, ventesRes] = await Promise.allSettled([
        supabase.from('revente_stock_summary').select('*').order('produit'),
        supabase.from('revente_stock').select('id, photo_url').catch(() => ({ data: null })),
        supabase.from('revente_ventes').select('prix_achat_unitaire, prix_revente_unitaire, qte_vendue, date_vente'),
      ])
      const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value.data ?? [] : []
      const photosData = photosRes.status === 'fulfilled' ? photosRes.value?.data ?? [] : []
      const ventesData = ventesRes.status === 'fulfilled' ? ventesRes.value.data ?? [] : []
      const items = summaryData.map((item) => ({ ...item, photo_url: photosData.find((p) => p.id === item.id)?.photo_url ?? null }))
      setStockItems(items)
      const totalBenefit = ventesData.reduce((s, v) => s + (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue, 0)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthSales = ventesData.filter((v) => v.date_vente >= monthStart).length
      const totalStockValue = items.reduce((s, i) => s + Number.parseFloat(i.valeur_stock_restant ?? 0), 0)
      setMetrics({ totalStockValue, totalBenefit, totalSales: ventesData.length, monthSales })
    } catch (err) { console.error(err); toast.error(err?.message || 'Erreur lors du chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredItems = useMemo(() => {
    let items = stockItems
    if (activeCategory) items = items.filter((i) => i.categorie === activeCategory)
    if (search.trim()) { const q = search.toLowerCase(); items = items.filter((i) => i.produit.toLowerCase().includes(q)) }
    return items
  }, [stockItems, activeCategory, search])

  const handleAdd = async (fd) => { const { error } = await supabase.from('revente_stock').insert([fd]); if (error) throw error; toast.success('Article ajouté'); await fetchData() }
  const handleEdit = async (fd) => { const { error } = await supabase.from('revente_stock').update(fd).eq('id', editItem.id); if (error) throw error; toast.success('Article modifié'); await fetchData() }
  const confirmDelete = async (id) => { const { error } = await supabase.from('revente_stock').delete().eq('id', id); if (error) { toast.error("Erreur"); return }; toast.success('Article supprimé'); setDeleteTarget(null); await fetchData() }
  const openAddModal = () => { setEditItem(null); setModalOpen(true) }
  const openEditModal = (item) => { setEditItem(item); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditItem(null) }
  const goToSell = (id) => { router.push(`/ventes?produit=${id}`) }

  return (
    <AuthGuard>
      <Layout>
        <h1 className="font-serif text-2xl font-bold text-ink mb-1">Stock</h1>
        <div className="double-rule mb-6 w-16" />

        {loading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card p-5"><Skeleton className="h-14 w-full" /></div>)}
            </div>
            <div className="flex gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-20 rounded-lg" />)}</div>
            <div className="card overflow-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`flex items-center gap-4 px-4 py-3.5 ${i > 0 ? 'border-t border-border/30' : ''}`}>
                  <Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { icon: Wallet, label: 'Valeur du stock', value: formatCurrency(metrics.totalStockValue) },
                { icon: TrendingUp, label: 'Bénéfice cumulé', value: formatCurrency(metrics.totalBenefit), color: metrics.totalBenefit >= 0 ? 'text-ink' : 'text-terracotta' },
                { icon: CalendarCheck, label: 'Ventes totales', value: metrics.totalSales },
                { icon: ShoppingCart, label: 'Ventes ce mois', value: metrics.monthSales },
              ].map((kpi, i) => (
                <div key={i} className="card-hover p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sage/5 flex items-center justify-center shrink-0">
                    <kpi.icon className="w-4.5 h-4.5 text-sage" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink/40 uppercase tracking-wider">{kpi.label}</p>
                    <p className={`text-xl font-bold font-mono mt-0.5 ${kpi.color || 'text-ink'}`}>{kpi.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + Add */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/25" />
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit…"
                  className="input-field w-full pl-10" />
              </div>
              <button onClick={openAddModal} className="btn-sage inline-flex items-center gap-2 shrink-0">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {/* Chips catégories */}
            <div className="flex flex-wrap gap-2 mb-5">
              <button onClick={() => setActiveCategory(null)}
                className={`tab-chip ${activeCategory === null ? 'bg-sage text-white border-sage' : 'bg-white text-ink/50 border-border/50 hover:border-sage/40 hover:text-sage'}`}>Toutes</button>
              {ALL_CATEGORIES.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`tab-chip ${activeCategory === cat ? 'bg-sage text-white border-sage' : 'bg-white text-ink/50 border-border/50 hover:border-sage/40 hover:text-sage'}`}>{cat}</button>
              ))}
            </div>

            {/* Empty or table */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 card">
                <Box className="mx-auto w-12 h-12 text-ink/10" />
                <p className="mt-4 text-base font-medium text-ink/40">
                  {search || activeCategory ? 'Aucun article ne correspond' : 'Aucun article dans le stock'}
                </p>
                {!search && !activeCategory && (
                  <button onClick={openAddModal} className="btn-sage mt-5 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Ajouter mon premier article
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop: TABLEAU */}
                <div className="hidden sm:block card overflow-hidden">
                  <table className="w-full table-fixed text-xs">
                    <thead>
                      <tr className="border-b border-border/30 bg-ink/[0.02]">
                        <th className="w-auto px-3 py-3 text-left font-medium text-ink/40 uppercase tracking-wider">Produit</th>
                        <th className="w-24 px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider">Achat</th>
                        <th className="w-20 px-3 py-3 text-center font-medium text-ink/40 uppercase tracking-wider">Stock</th>
                        <th className="w-24 px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider">Vente</th>
                        <th className="w-28 px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider">Valeur</th>
                        <th className="w-28 px-3 py-3 text-center font-medium text-ink/40 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {filteredItems.map((item, idx) => {
                        const isLow = item.qte_restante <= STOCK_LOW_THRESHOLD
                        return (
                          <tr key={item.id} className={`transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-ink/[0.02]'} hover:bg-sage-pale/40`}>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="font-medium text-ink truncate">{item.produit}</span>
                                {item.categorie && <span className="shrink-0 text-[10px] text-ink/30 bg-ink/5 px-1.5 py-0.5 rounded-md">{item.categorie}</span>}
                                {isLow && <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-terracotta bg-terracotta/10 px-1.5 py-0.5 rounded-md"><AlertTriangle className="w-2.5 h-2.5" />Faible</span>}
                              </div>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-ink/60">{formatCurrency(item.prix_achat_unitaire)}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`font-mono font-semibold ${isLow ? 'text-terracotta' : 'text-sage'}`}>{item.qte_restante}</span>
                              <span className="font-mono text-ink/30 text-[10px]"> /{item.qte_stock}</span>
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-ink/60">{formatCurrency(item.prix_revente_unitaire)}</td>
                            <td className="px-3 py-3 text-right font-mono font-semibold text-ink">{formatCurrency(item.valeur_stock_restant)}</td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button onClick={() => goToSell(item.id)} className="p-1.5 rounded-lg text-sage hover:bg-sage/10 transition-all" title="Vendre"><ShoppingCart className="w-3.5 h-3.5" /></button>
                                <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg text-amber hover:bg-amber/10 transition-all" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg text-terracotta hover:bg-terracotta/10 transition-all" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile: CARTES */}
                <div className="sm:hidden space-y-3">
                  {filteredItems.map((item) => {
                    const isLow = item.qte_restante <= STOCK_LOW_THRESHOLD
                    return (
                      <div key={item.id} className="card p-4 animate-fade-in">
                        <div className="flex items-start gap-3">
                          <ProductThumb url={item.photo_url} size={48} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-ink truncate">{item.produit}</p>
                              {isLow && <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-terracotta bg-terracotta/10 px-1.5 py-0.5 rounded-md"><AlertTriangle className="w-2.5 h-2.5" />Faible</span>}
                            </div>
                            <p className="text-xs text-ink/40 mt-0.5">{item.categorie}</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                              <span>Stock : <strong className="font-mono text-ink">{item.qte_stock}</strong></span>
                              <span>Restante(s) : <strong className={`font-mono ${isLow ? 'text-terracotta' : 'text-sage'}`}>{item.qte_restante}</strong></span>
                              <span>Achat : <strong className="font-mono text-ink/70">{formatCurrency(item.prix_achat_unitaire)}</strong></span>
                              <span>Valeur : <strong className="font-mono text-sage">{formatCurrency(item.valeur_stock_restant)}</strong></span>
                            </div>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                              <button onClick={() => goToSell(item.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-sage rounded-lg py-2 hover:bg-sage-light transition-all"><ShoppingCart className="w-3.5 h-3.5" />Vendre</button>
                              <button onClick={() => openEditModal(item)} className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber bg-amber-pale rounded-lg px-4 py-2 hover:bg-amber/20 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeleteTarget(item)} className="flex items-center justify-center gap-1.5 text-xs font-medium text-terracotta bg-terracotta-pale rounded-lg px-4 py-2 hover:bg-terracotta/20 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        <StockModal isOpen={modalOpen} onClose={closeModal} onSave={editItem ? handleEdit : handleAdd} item={editItem} />

        {/* Delete modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={() => setDeleteTarget(null)}>
            <div className="card w-full max-w-sm p-6 shadow-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-terracotta" /></div>
                <h3 className="font-serif font-bold text-ink">Supprimer l&apos;article</h3>
              </div>
              <p className="text-sm text-ink/60">Es-tu sûr de vouloir supprimer <strong className="text-ink">{deleteTarget.produit}</strong>&nbsp;? Les ventes liées conserveront l&apos;historique.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setDeleteTarget(null)} className="btn-ghost">Annuler</button>
                <button onClick={() => confirmDelete(deleteTarget.id)} className="px-5 py-2 text-sm font-medium text-white bg-terracotta rounded-lg hover:bg-terracotta-light transition-all">Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
