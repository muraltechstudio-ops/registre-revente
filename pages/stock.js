import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import StockModal from '../components/StockModal'
import toast from 'react-hot-toast'
import {
  Package,
  Plus,
  Search,
  ShoppingCart,
  Pencil,
  Trash2,
  Box,
  TrendingUp,
  Wallet,
  CalendarCheck,
  X,
  AlertTriangle,
} from 'lucide-react'

/* ──── Constantes ──── */
const ALL_CATEGORIES = [
  'Informatique',
  'Mode',
  'Bijoux',
  'Moto',
  'Papeterie/Bureau',
  'Hygiène/Beauté',
  'Stock existant',
  'Autre',
]

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

const STOCK_LOW_THRESHOLD = 3

/* ──── Squelette ──── */
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-ink/10 rounded ${className}`} />
}

/* ──── Page ──── */
export default function StockPage() {
  const router = useRouter()
  const [stockItems, setStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null) // null = Toutes
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Métriques
  const [metrics, setMetrics] = useState({
    totalStockValue: 0,
    totalBenefit: 0,
    totalSales: 0,
    monthSales: 0,
  })

  /* ──── Chargement ──── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const sb = supabase

      // Stock summary
      const [summaryRes, ventesRes] = await Promise.all([
        sb.from('revente_stock_summary').select('*').order('produit'),
        sb.from('revente_ventes').select('prix_achat_unitaire, prix_revente_unitaire, qte_vendue, date_vente'),
      ])

      if (summaryRes.error) throw summaryRes.error
      if (ventesRes.error) throw ventesRes.error

      // Photos (colonne photo_url peut ne pas exister — on ignore l'erreur)
      let photos = []
      try {
        const { data } = await sb.from('revente_stock').select('id, photo_url')
        photos = data ?? []
      } catch {
        // photo_url n'existe pas encore en base
      }

      const items = (summaryRes.data ?? []).map((item) => ({
        ...item,
        photo_url: photos.find((p) => p.id === item.id)?.photo_url ?? null,
      }))
      setStockItems(items)

      // Métriques
      const ventes = ventesRes.data ?? []
      const totalBenefit = ventes.reduce(
        (sum, v) =>
          sum +
          (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
            v.qte_vendue,
        0,
      )

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const monthSales = ventes.filter((v) => v.date_vente >= monthStart).length

      const totalStockValue = items.reduce(
        (sum, item) => sum + Number.parseFloat(item.valeur_stock_restant ?? 0),
        0,
      )

      setMetrics({ totalStockValue, totalBenefit, totalSales: ventes.length, monthSales })
    } catch (err) {
      console.error('Erreur chargement stock:', err)
      toast.error(err?.message || 'Erreur lors du chargement du stock')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ──── Filtres ──── */
  const filteredItems = useMemo(() => {
    let items = stockItems

    if (activeCategory) {
      items = items.filter((item) => item.categorie === activeCategory)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((item) => item.produit.toLowerCase().includes(q))
    }

    return items
  }, [stockItems, activeCategory, search])

  /* ──── CRUD ──── */
  const handleAdd = async (formData) => {
    const { error } = await supabase.from('revente_stock').insert([formData])
    if (error) throw error
    toast.success('Article ajouté')
    await fetchData()
  }

  const handleEdit = async (formData) => {
    const { error } = await supabase
      .from('revente_stock')
      .update(formData)
      .eq('id', editItem.id)
    if (error) throw error
    toast.success('Article modifié')
    await fetchData()
  }

  const confirmDelete = async (id) => {
    const { error } = await supabase.from('revente_stock').delete().eq('id', id)
    if (error) {
      toast.error("Erreur lors de la suppression")
      return
    }
    toast.success('Article supprimé')
    setDeleteTarget(null)
    await fetchData()
  }

  /* ──── Modal helpers ──── */
  const openAddModal = () => {
    setEditItem(null)
    setModalOpen(true)
  }

  const openEditModal = (item) => {
    setEditItem(item)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditItem(null)
  }

  /* ──── Acheminer vers la vente ──── */
  const goToSell = (id) => {
    router.push(`/ventes?produit=${id}`)
  }

  /* ──── Rendu ──── */
  return (
    <AuthGuard>
      <Layout>
        {/* Titre */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-ink">Stock</h1>
          <hr className="double-rule mt-2" />
        </div>

        {loading ? (
          <StockSkeleton />
        ) : (
          <>
            {/* ══════ BANDEAU KPI ══════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-border p-4 flex items-start gap-3">
                <Wallet className="w-5 h-5 text-sage mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-ink/50 uppercase tracking-wider">Valeur du stock</p>
                  <p className="text-xl font-bold font-mono text-ink mt-0.5">{formatCurrency(metrics.totalStockValue)}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-border p-4 flex items-start gap-3">
                <TrendingUp className={`w-5 h-5 mt-0.5 ${metrics.totalBenefit >= 0 ? 'text-sage' : 'text-terracotta'}`} />
                <div>
                  <p className="text-xs font-medium text-ink/50 uppercase tracking-wider">Bénéfice cumulé</p>
                  <p className={`text-xl font-bold font-mono mt-0.5 ${metrics.totalBenefit >= 0 ? 'text-sage' : 'text-terracotta'}`}>
                    {formatCurrency(metrics.totalBenefit)}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-border p-4 flex items-start gap-3">
                <CalendarCheck className="w-5 h-5 text-amber mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-ink/50 uppercase tracking-wider">Ventes totales</p>
                  <p className="text-xl font-bold font-mono text-ink mt-0.5">{metrics.totalSales}</p>
                </div>
              </div>
              <div className="bg-white rounded-lg border border-border p-4 flex items-start gap-3">
                <ShoppingCart className="w-5 h-5 text-ink/50 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-ink/50 uppercase tracking-wider">Ventes ce mois</p>
                  <p className="text-xl font-bold font-mono text-ink mt-0.5">{metrics.monthSales}</p>
                </div>
              </div>
            </div>

            {/* ══════ BARRE RECHERCHE + BOUTON AJOUTER ══════ */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un produit…"
                  className="w-full pl-9 pr-3 py-2 border border-border bg-white rounded-md text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                />
              </div>
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 bg-sage text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sage-light transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Ajouter un article
              </button>
            </div>

            {/* ══════ CHIPS CATÉGORIES ══════ */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                  activeCategory === null
                    ? 'bg-sage text-white border-sage'
                    : 'bg-white text-ink/60 border-border hover:border-sage/50 hover:text-sage'
                }`}
              >
                Toutes
              </button>
              {ALL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                    activeCategory === cat
                      ? 'bg-sage text-white border-sage'
                      : 'bg-white text-ink/60 border-border hover:border-sage/50 hover:text-sage'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* ══════ ÉTAT VIDE ══════ */}
            {filteredItems.length === 0 ? (
              <EmptyState
                icon={Box}
                title={
                  search || activeCategory
                    ? 'Aucun article ne correspond'
                    : 'Aucun article dans le stock'
                }
                action={
                  search || activeCategory
                    ? null
                    : { label: 'Ajouter mon premier article', onClick: openAddModal }
                }
              />
            ) : (
              <>
                {/* ── Desktop : TABLEAU ── */}
                <div className="hidden sm:block overflow-x-auto bg-white rounded-lg border border-border">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="bg-ink/[0.02]">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-ink/50">Produit</th>
                        <th className="px-4 py-3 text-left font-medium text-ink/50">Catégorie</th>
                        <th className="px-4 py-3 text-right font-medium text-ink/50">Prix achat</th>
                        <th className="px-4 py-3 text-right font-medium text-ink/50">Stock</th>
                        <th className="px-4 py-3 text-right font-medium text-ink/50">Restant</th>
                        <th className="px-4 py-3 text-right font-medium text-ink/50">Prix vente</th>
                        <th className="px-4 py-3 text-right font-medium text-ink/50">Valeur</th>
                        <th className="px-4 py-3 text-center font-medium text-ink/50">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredItems.map((item, idx) => (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            idx % 2 === 0 ? 'bg-white' : 'bg-ink/[0.02]'
                          } hover:bg-sage-pale/50`}
                        >
                          {/* Produit + photo */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <ProductThumb url={item.photo_url} size={36} />
                              <span className="font-medium text-ink whitespace-nowrap">
                                {item.produit}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-ink/60">{item.categorie}</td>
                          <td className="px-4 py-3 text-right font-mono text-ink/70">
                            {formatCurrency(item.prix_achat_unitaire)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-ink">
                            {item.qte_stock}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-mono font-semibold ${item.qte_restante <= STOCK_LOW_THRESHOLD ? 'text-terracotta' : 'text-sage'}`}>
                              {item.qte_restante}
                            </span>
                            {item.qte_restante <= STOCK_LOW_THRESHOLD && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-medium text-terracotta bg-terracotta-pale px-1.5 py-0.5 rounded-sm">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Stock faible
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-ink/70">
                            {formatCurrency(item.prix_revente_unitaire)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-ink">
                            {formatCurrency(item.valeur_stock_restant)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => goToSell(item.id)}
                                className="p-1.5 rounded text-sage hover:bg-sage-pale transition-colors"
                                title="Vendre"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded text-amber hover:bg-amber-pale transition-colors"
                                title="Modifier"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="p-1.5 rounded text-terracotta hover:bg-terracotta-pale transition-colors"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ── Mobile : CARTES ── */}
                <div className="sm:hidden space-y-3">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg border border-border p-4">
                      <div className="flex items-start gap-3">
                        <ProductThumb url={item.photo_url} size={48} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-ink truncate">{item.produit}</p>
                            {item.qte_restante <= STOCK_LOW_THRESHOLD && (
                              <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-terracotta bg-terracotta-pale px-1.5 py-0.5 rounded-sm">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Stock faible
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink/50 mt-0.5">{item.categorie}</p>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                            <span className="text-ink/50">Stock : <strong className="font-mono text-ink">{item.qte_stock}</strong></span>
                            <span className="text-ink/50">Vendue(s) : <strong className="font-mono text-ink">{item.qte_vendue}</strong></span>
                            <span className="text-ink/50">Restante(s) : <strong className={`font-mono ${item.qte_restante <= STOCK_LOW_THRESHOLD ? 'text-terracotta' : 'text-sage'}`}>{item.qte_restante}</strong></span>
                            <span className="text-ink/50">Valeur : <strong className="font-mono text-sage">{formatCurrency(item.valeur_stock_restant)}</strong></span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="text-xs text-ink/50">
                              Achat <span className="font-mono text-ink/70 block">{formatCurrency(item.prix_achat_unitaire)}</span>
                            </div>
                            <div className="text-xs text-ink/50">
                              Vente <span className="font-mono text-ink/70 block">{formatCurrency(item.prix_revente_unitaire)}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                            <button
                              onClick={() => goToSell(item.id)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-white bg-sage rounded-md py-1.5 hover:bg-sage-light transition-colors"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              Vendre
                            </button>
                            <button
                              onClick={() => openEditModal(item)}
                              className="flex items-center justify-center gap-1.5 text-xs font-medium text-amber bg-amber-pale rounded-md px-3 py-1.5 hover:bg-amber/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="flex items-center justify-center gap-1.5 text-xs font-medium text-terracotta bg-terracotta-pale rounded-md px-3 py-1.5 hover:bg-terracotta/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── MODAL AJOUT / ÉDITION ── */}
        <StockModal
          isOpen={modalOpen}
          onClose={closeModal}
          onSave={editItem ? handleEdit : handleAdd}
          item={editItem}
        />

        {/* ── MODAL CONFIRMATION SUPPRESSION ── */}
        <ConfirmDeleteModal
          isOpen={deleteTarget !== null}
          item={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      </Layout>
    </AuthGuard>
  )
}

/* ──── Vignette produit ──── */
function ProductThumb({ url, size }) {
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="rounded-md object-cover border border-border shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-md bg-ink/5 border border-border flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <Package className="w-4 h-4 text-ink/20" />
    </div>
  )
}

/* ──── Modal confirmation suppression ──── */
function ConfirmDeleteModal({ isOpen, item, onConfirm, onCancel }) {
  if (!isOpen || !item) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onCancel}
    >
      <div
        className="bg-paper rounded-lg shadow-lg w-full max-w-sm border border-border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-terracotta-pale flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-terracotta" />
          </div>
          <h3 className="font-serif font-bold text-ink">Supprimer l&apos;article</h3>
        </div>
        <p className="text-sm text-ink/70">
          Es-tu sûr de vouloir supprimer{' '}
          <strong className="text-ink">{item.produit}</strong> ?
          Les ventes liées conserveront l&apos;historique.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-ink/50 hover:text-ink transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(item.id)}
            className="px-5 py-2 text-sm font-medium text-white bg-terracotta rounded-md hover:bg-terracotta-light transition-colors"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  )
}

/* ──── État vide ──── */
function EmptyState({ icon: Icon, title, action }) {
  return (
    <div className="text-center py-16 bg-white rounded-lg border border-border">
      <Icon className="mx-auto w-12 h-12 text-ink/15" />
      <p className="mt-4 text-base font-medium text-ink/50">{title}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 bg-sage text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-sage-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  )
}

/* ──── Squelettes chargement ──── */
function StockSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-border p-4 flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-6 w-28" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-md" />
        ))}
      </div>
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-border/60' : ''}`}
          >
            <Skeleton className="w-9 h-9 rounded-md shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}
