import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import StockModal from '../components/StockModal'

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

const FILTER_CATEGORIES = ['Toutes', ...ALL_CATEGORIES]

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

export default function StockPage() {
  const [stockItems, setStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('Toutes')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState(null)

  // Métriques
  const [metrics, setMetrics] = useState({
    totalStockValue: 0,
    totalBenefit: 0,
    totalSales: 0,
    byPlatform: {},
  })

  /* ──── Centralisée : recharge tout ──── */
  const supabase = getSupabaseClient

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Vue récapitulative du stock
      const { data: stockData, error: stockErr } = await supabase()
        .from('revente_stock_summary')
        .select('*')
        .order('produit')

      if (stockErr) throw stockErr
      setStockItems(stockData ?? [])

      // 2. Ventes → métriques
      const { data: ventesData, error: ventesErr } = await supabase()
        .from('revente_ventes')
        .select('prix_achat_unitaire, prix_revente_unitaire, qte_vendue, plateforme')

      if (ventesErr) throw ventesErr

      const ventes = ventesData ?? []

      const totalBenefit = ventes.reduce(
        (sum, v) =>
          sum +
          (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
            v.qte_vendue,
        0,
      )

      const byPlatform = ventes.reduce((acc, v) => {
        const ben =
          (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
          v.qte_vendue
        acc[v.plateforme] = (acc[v.plateforme] ?? 0) + ben
        return acc
      }, {})

      const totalStockValue = (stockData ?? []).reduce(
        (sum, item) => sum + Number.parseFloat(item.valeur_stock_restant ?? 0),
        0,
      )

      setMetrics({ totalStockValue, totalBenefit, totalSales: ventes.length, byPlatform })
    } catch (err) {
      console.error(err)
      alert('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ──── CRUD ──── */
  const handleAdd = async (formData) => {
    const { error } = await supabase().from('revente_stock').insert([formData])
    if (error) throw error
    await fetchData()
  }

  const handleEdit = async (formData) => {
    const { error } = await supabase()
      .from('revente_stock')
      .update(formData)
      .eq('id', editItem.id)
    if (error) throw error
    await fetchData()
  }

  const handleDelete = async (id, produit) => {
    if (
      !window.confirm(
        `Supprimer "${produit}" ? Les ventes liées conserveront l'historique (le produit deviendra "Non spécifié").`,
      )
    )
      return
    const { error } = await supabase().from('revente_stock').delete().eq('id', id)
    if (error) {
      alert('Erreur lors de la suppression')
      return
    }
    await fetchData()
  }

  /* ──── Filtrage catégorie ──── */
  const filteredItems =
    categoryFilter === 'Toutes'
      ? stockItems
      : stockItems.filter((item) => item.categorie === categoryFilter)

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

  /* ──── Plateformes du bandeau (top 4) ──── */
  const platformEntries = Object.entries(metrics.byPlatform)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  /* ──── Rendu ──── */
  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-800 rounded-full" />
          </div>
        </Layout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <Layout>
        {/* ── Bandeau de métriques ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Valeur stock */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valeur du stock
            </p>
            <p className="text-2xl font-bold text-gray-800 mt-1">
              {formatCurrency(metrics.totalStockValue)}
            </p>
          </div>

          {/* Bénéfice cumulé */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Bénéfice cumulé
            </p>
            <p className="text-2xl font-bold text-profit mt-1">
              {formatCurrency(metrics.totalBenefit)}
            </p>
          </div>

          {/* Nombre de ventes */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ventes</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{metrics.totalSales}</p>
          </div>

          {/* Par plateforme */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Par plateforme
            </p>
            <div className="mt-1 text-sm text-gray-700 leading-relaxed">
              {platformEntries.length > 0 ? (
                platformEntries.map(([pfx, ben], i) => (
                  <span key={pfx}>
                    {i > 0 && <span className="text-gray-300 mx-1">·</span>}
                    <span>
                      {pfx}: {formatCurrency(ben)}
                    </span>
                  </span>
                ))
              ) : (
                <span className="text-gray-400">Aucune vente</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Barre d'actions ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un article
          </button>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
          >
            {FILTER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ── Tableau ── */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-500">Aucun article</p>
            <p className="text-sm text-gray-400 mt-1">
              Ajoute ton premier lot en cliquant sur &quot;Ajouter un article&quot;
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Catégorie</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Prix achat</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">En stock</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Vendue(s)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Restante(s)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Prix vente</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Valeur stock</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                      {item.produit}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.categorie}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(item.prix_achat_unitaire)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{item.qte_stock}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{item.qte_vendue}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {item.qte_restante}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {formatCurrency(item.prix_revente_unitaire)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(item.valeur_stock_restant)}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-blue-600 hover:text-blue-800 mr-2 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Modifier"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.produit)}
                        className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Supprimer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Modal ── */}
        <StockModal
          isOpen={modalOpen}
          onClose={closeModal}
          onSave={editItem ? handleEdit : handleAdd}
          item={editItem}
        />
      </Layout>
    </AuthGuard>
  )
}
