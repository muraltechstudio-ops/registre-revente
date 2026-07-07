import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import StockModal from '../components/StockModal'
import toast from 'react-hot-toast'
import {
  Package, Plus, Search, ShoppingCart, Pencil, Trash2, Box, TrendingUp, Wallet,
  CalendarCheck, AlertTriangle, Sparkles, X, GripVertical,
} from 'lucide-react'

/* ──── Constantes ──── */
const ALL_CATEGORIES = [
  'Informatique','Mode','Bijoux','Moto','Papeterie/Bureau','Hygiène/Beauté','Stock existant','Autre',
]
const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
const STOCK_LOW_THRESHOLD = 3

/* ──── Animations ──── */
const containerAnim = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

/* ──── Sous-composants ──── */
function Skeleton({ className }) {
  return <div className={`skeleton-modern ${className}`} />
}

function ProductThumb({ url, size }) {
  if (url) return <img src={url} alt="" className="rounded-xl object-cover border border-border/30 shrink-0" style={{ width: size, height: size }} />
  return (
    <div className="rounded-xl bg-gradient-to-br from-ink/[0.03] to-ink/[0.06] border border-border/30 flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <Package className="w-4 h-4 text-ink/15" />
    </div>
  )
}

function EmptyState({ icon: Icon, title, action }) {
  return (
    <motion.div variants={itemAnim} className="text-center py-16 glass-card rounded-2xl">
      <Icon className="mx-auto w-12 h-12 text-ink/10" />
      <p className="mt-4 text-base font-medium text-ink/40 font-sans">{title}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary mt-5 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" />{action.label}
        </button>
      )}
    </motion.div>
  )
}

/* ──── Page ──── */
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
        supabase.from('revente_stock').select('id, photo_url').catch(() => ({ data: null, error: null })),
        supabase.from('revente_ventes').select('prix_achat_unitaire, prix_revente_unitaire, qte_vendue, date_vente'),
      ])

      const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value.data ?? [] : []
      const photosData = photosRes.status === 'fulfilled' ? photosRes.value?.data ?? [] : []
      const ventesData = ventesRes.status === 'fulfilled' ? ventesRes.value.data ?? [] : []

      const items = summaryData.map((item) => ({
        ...item,
        photo_url: photosData.find((p) => p.id === item.id)?.photo_url ?? null,
      }))
      setStockItems(items)

      const totalBenefit = ventesData.reduce((s, v) => s + (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue, 0)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthSales = ventesData.filter((v) => v.date_vente >= monthStart).length
      const totalStockValue = items.reduce((s, i) => s + Number.parseFloat(i.valeur_stock_restant ?? 0), 0)
      setMetrics({ totalStockValue, totalBenefit, totalSales: ventesData.length, monthSales })
    } catch (err) {
      console.error(err)
      toast.error(err?.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
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
        <motion.div variants={containerAnim} initial="hidden" animate="show">
          {/* Header */}
          <motion.div variants={itemAnim} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-sage-gradient shadow-glow-sage flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold gradient-text">Stock</h1>
              <div className="double-rule mt-2 w-16" />
            </div>
          </motion.div>

          {loading ? <StockSkeleton /> : (
            <>
              {/* KPIs */}
              <motion.div variants={containerAnim} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: Wallet, label: 'Valeur du stock', value: formatCurrency(metrics.totalStockValue), color: 'sage' },
                  { icon: TrendingUp, label: 'Bénéfice cumulé', value: formatCurrency(metrics.totalBenefit), color: metrics.totalBenefit >= 0 ? 'sage' : 'terracotta' },
                  { icon: CalendarCheck, label: 'Ventes totales', value: metrics.totalSales, color: 'amber' },
                  { icon: ShoppingCart, label: 'Ventes ce mois', value: metrics.monthSales, color: 'ink' },
                ].map((kpi, i) => (
                  <motion.div key={i} variants={itemAnim} className="glass-card rounded-2xl p-4 flex items-start gap-3 hover:shadow-glass-lg transition-all duration-300">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br from-ink/[0.03] to-ink/[0.06] flex items-center justify-center`}>
                      <kpi.icon className="w-4.5 h-4.5 text-ink/40" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink/40 uppercase tracking-wider font-sans">{kpi.label}</p>
                      <p className="text-xl font-bold font-mono mt-0.5">{kpi.value}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Search + Add */}
              <motion.div variants={itemAnim} className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/20" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un produit…"
                    className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm" />
                </div>
                <button onClick={openAddModal} className="btn-primary inline-flex items-center gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </motion.div>

              {/* Chips catégories */}
              <motion.div variants={itemAnim} className="flex flex-wrap gap-2 mb-5">
                <button onClick={() => setActiveCategory(null)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                    activeCategory === null ? 'bg-sage text-white border-sage shadow-glow-sage' : 'glass-card text-ink/50 border-border/40 hover:border-sage/40 hover:text-sage'
                  }`}>Toutes</button>
                {ALL_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      activeCategory === cat ? 'bg-sage text-white border-sage shadow-glow-sage' : 'glass-card text-ink/50 border-border/40 hover:border-sage/40 hover:text-sage'
                    }`}>{cat}</button>
                ))}
              </motion.div>

              {/* Empty or table */}
              {filteredItems.length === 0 ? (
                <EmptyState icon={Box} title={search || activeCategory ? 'Aucun article ne correspond' : 'Aucun article dans le stock'}
                  action={search || activeCategory ? null : { label: 'Ajouter mon premier article', onClick: openAddModal }} />
              ) : (
                <>
                  {/* Desktop : TABLEAU COMPACT */}
                  <motion.div variants={itemAnim} className="hidden sm:block glass-card rounded-2xl overflow-hidden">
                    <table className="w-full table-fixed text-xs">
                      <thead><tr className="border-b border-border/30">
                        <th className="w-auto px-3 py-3 text-left font-medium text-ink/40 uppercase tracking-wider font-sans">Produit</th>
                        <th className="w-24 px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider font-sans">Achat</th>
                        <th className="w-20 px-3 py-3 text-center font-medium text-ink/40 uppercase tracking-wider font-sans">Stock</th>
                        <th className="w-24 px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider font-sans">Vente</th>
                        <th className="w-28 px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider font-sans">Valeur</th>
                        <th className="w-28 px-3 py-3 text-center font-medium text-ink/40 uppercase tracking-wider font-sans">Actions</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border/20">
                        {filteredItems.map((item, idx) => {
                          const isLow = item.qte_restante <= STOCK_LOW_THRESHOLD
                          return (
                            <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                              className={`transition-colors ${idx % 2 === 0 ? 'bg-white/40' : 'bg-ink/[0.015]'} hover:bg-sage-pale/30`}>
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="font-medium text-ink truncate">{item.produit}</span>
                                  {item.categorie && <span className="shrink-0 text-[10px] text-ink/30 bg-ink/5 px-1.5 py-0.5 rounded-md font-sans">{item.categorie}</span>}
                                  {isLow && <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-terracotta bg-terracotta/10 px-1.5 py-0.5 rounded-md"><AlertTriangle className="w-2.5 h-2.5" />Faible</span>}
                                </div>
                              </td>
                              <td className="px-3 py-3 text-right font-mono text-ink/60">{formatCurrency(item.prix_achat_unitaire)}</td>
                              <td className="px-3 py-3 text-center"><span className="font-mono font-semibold" style={{ color: isLow ? '#A8432F' : '#274734' }}>{item.qte_restante}</span><span className="font-mono text-ink/30 text-[10px]"> /{item.qte_stock}</span></td>
                              <td className="px-3 py-3 text-right font-mono text-ink/60">{formatCurrency(item.prix_revente_unitaire)}</td>
                              <td className="px-3 py-3 text-right font-mono font-semibold text-ink">{formatCurrency(item.valeur_stock_restant)}</td>
                              <td className="px-3 py-3 text-center">
                                <div className="flex items-center justify-center gap-0.5">
                                  <button onClick={() => goToSell(item.id)} className="p-1.5 rounded-lg text-sage hover:bg-sage/10 transition-all" title="Vendre"><ShoppingCart className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => openEditModal(item)} className="p-1.5 rounded-lg text-amber hover:bg-amber/10 transition-all" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded-lg text-terracotta hover:bg-terracotta/10 transition-all" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </motion.div>

                  {/* Mobile : CARTES */}
                  <div className="sm:hidden space-y-3">
                    {filteredItems.map((item, idx) => {
                      const isLow = item.qte_restante <= STOCK_LOW_THRESHOLD
                      return (
                        <motion.div key={item.id} variants={itemAnim} className="glass-card rounded-2xl p-4">
                          <div className="flex items-start gap-3">
                            <ProductThumb url={item.photo_url} size={48} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-medium text-ink truncate font-sans">{item.produit}</p>
                                {isLow && <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-terracotta bg-terracotta/10 px-1.5 py-0.5 rounded-md"><AlertTriangle className="w-2.5 h-2.5" />Faible</span>}
                              </div>
                              <p className="text-xs text-ink/40 mt-0.5 font-sans">{item.categorie}</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                                <span className="text-ink/40 font-sans">Stock : <strong className="font-mono text-ink">{item.qte_stock}</strong></span>
                                <span className="text-ink/40 font-sans">Restante(s) : <strong className={`font-mono ${isLow ? 'text-terracotta' : 'text-sage'}`}>{item.qte_restante}</strong></span>
                                <span className="text-ink/40 font-sans">Achat : <strong className="font-mono text-ink/70">{formatCurrency(item.prix_achat_unitaire)}</strong></span>
                                <span className="text-ink/40 font-sans">Valeur : <strong className="font-mono text-sage">{formatCurrency(item.valeur_stock_restant)}</strong></span>
                              </div>
                              <div className="flex gap-2 mt-3 pt-3 border-t border-border/20">
                                <button onClick={() => goToSell(item.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-sage-gradient rounded-xl py-2 hover:scale-[1.02] active:scale-[0.98] transition-all"><ShoppingCart className="w-3.5 h-3.5" />Vendre</button>
                                <button onClick={() => openEditModal(item)} className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber bg-amber/10 rounded-xl px-4 py-2 hover:bg-amber/20 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setDeleteTarget(item)} className="flex items-center justify-center gap-1.5 text-xs font-medium text-terracotta bg-terracotta/10 rounded-xl px-4 py-2 hover:bg-terracotta/20 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>

        <StockModal isOpen={modalOpen} onClose={closeModal} onSave={editItem ? handleEdit : handleAdd} item={editItem} />

        {/* Delete confirmation */}
        <DeleteModal isOpen={deleteTarget !== null} item={deleteTarget} onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} />
      </Layout>
    </AuthGuard>
  )
}

/* ──── Delete modal ──── */
function DeleteModal({ isOpen, item, onConfirm, onCancel }) {
  if (!isOpen || !item) return null
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm px-4" onClick={onCancel}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl shadow-glass-lg w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-terracotta" />
          </div>
          <h3 className="font-serif font-bold text-ink">Supprimer l&apos;article</h3>
        </div>
        <p className="text-sm text-ink/60 font-sans">Es-tu sûr de vouloir supprimer <strong className="text-ink">{item.produit}</strong>&nbsp;? Les ventes liées conserveront l&apos;historique.</p>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="btn-ghost">Annuler</button>
          <button onClick={() => onConfirm(item.id)} className="px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-terracotta to-terracotta-light rounded-xl hover:shadow-lg hover:shadow-terracotta/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Supprimer</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function StockSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (<div key={i} className="glass-card rounded-2xl p-5"><Skeleton className="h-14 w-full" /></div>))}
      </div>
      <div className="flex gap-2">{Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-8 w-20 rounded-xl" />))}</div>
      <div className="glass-card rounded-2xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 px-4 py-3.5 ${i > 0 ? 'border-t border-border/20' : ''}`}>
            <Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /><Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
