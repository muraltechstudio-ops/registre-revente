import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabaseClient'
import { exportToCSV } from '../lib/csvExport'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'

const PLATEFORMES = [
  'Vinted',
  'Leboncoin',
  'Facebook Marketplace',
  'TikTok Shop',
  'Temu',
  'Whatnot',
  'Autre',
]

const PLATEFORME_FILTERS = ['Toutes', ...PLATEFORMES]

const EMPTY_SALE_FORM = {
  stock_id: '',
  produit: '',
  categorie: '',
  prix_achat_unitaire: '',
  prix_revente_unitaire: '',
  qte_vendue: 1,
  plateforme: 'Vinted',
  date_vente: '',
  client_nom: '',
  client_prenom: '',
  client_adresse: '',
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

const todayStr = () => new Date().toISOString().split('T')[0]

export default function VentesPage() {
  /* ──── État ──── */
  const [stockItems, setStockItems] = useState([])
  const [ventes, setVentes] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulaire vente
  const [form, setForm] = useState({ ...EMPTY_SALE_FORM, date_vente: todayStr() })

  // Filtres tableau
  const [platformFilter, setPlatformFilter] = useState('Toutes')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  /* ──── Chargement ──── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [stockRes, ventesRes] = await Promise.all([
        supabase.from('revente_stock').select('*').order('produit'),
        supabase
          .from('revente_ventes')
          .select('*')
          .order('date_vente', { ascending: false })
          .limit(1000),
      ])

      if (stockRes.error) throw stockRes.error
      if (ventesRes.error) throw ventesRes.error

      setStockItems(stockRes.data ?? [])
      setVentes(ventesRes.data ?? [])
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

  /* ──── Sélection produit → pré-remplissage ──── */
  const handleProductChange = (stockId) => {
    if (!stockId) {
      setForm((f) => ({
        ...f,
        stock_id: '',
        produit: '',
        categorie: '',
        prix_achat_unitaire: '',
        prix_revente_unitaire: '',
      }))
      return
    }
    const item = stockItems.find((s) => s.id === stockId)
    if (item) {
      setForm((f) => ({
        ...f,
        stock_id: stockId,
        produit: item.produit,
        categorie: item.categorie,
        prix_achat_unitaire: item.prix_achat_unitaire,
        prix_revente_unitaire: item.prix_revente_unitaire,
      }))
    }
  }

  /* ──── Quantité restante (avertissement) ──── */
  const selectedStock = stockItems.find((s) => s.id === form.stock_id)

  const qteRestante = useMemo(() => {
    if (!selectedStock) return 0
    const sumVendue = ventes
      .filter((v) => v.stock_id === form.stock_id)
      .reduce((s, v) => s + v.qte_vendue, 0)
    return selectedStock.qte_stock - sumVendue
  }, [selectedStock, ventes, form.stock_id])

  const exceedsStock = form.stock_id && Number(form.qte_vendue) > qteRestante

  /* ──── Ajouter une vente ──── */
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('revente_ventes').insert([
        {
          stock_id: form.stock_id || null,
          date_vente: form.date_vente,
          produit: form.produit,
          categorie: form.categorie || null,
          prix_achat_unitaire: Number.parseFloat(form.prix_achat_unitaire),
          prix_revente_unitaire: Number.parseFloat(form.prix_revente_unitaire),
          qte_vendue: Number.parseInt(form.qte_vendue, 10),
          plateforme: form.plateforme,
          client_nom: form.client_nom || null,
          client_prenom: form.client_prenom || null,
          client_adresse: form.client_adresse || null,
        },
      ])
      if (error) throw error
      setForm({ ...EMPTY_SALE_FORM, date_vente: todayStr() })
      await fetchData()
    } catch (err) {
      console.error(err)
      alert("Erreur lors de l'enregistrement de la vente")
    }
  }

  /* ──── Supprimer une vente ──── */
  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette vente définitivement ?')) return
    const { error } = await supabase.from('revente_ventes').delete().eq('id', id)
    if (error) {
      alert("Erreur lors de la suppression")
      return
    }
    await fetchData()
  }

  /* ──── Filtrage ──── */
  const filteredVentes = useMemo(
    () =>
      ventes.filter((v) => {
        if (platformFilter !== 'Toutes' && v.plateforme !== platformFilter) return false
        if (dateDebut && v.date_vente < dateDebut) return false
        if (dateFin && v.date_vente > dateFin) return false
        return true
      }),
    [ventes, platformFilter, dateDebut, dateFin],
  )

  const totalBenefit = useMemo(
    () =>
      filteredVentes.reduce((sum, v) => {
        const ben =
          (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
          v.qte_vendue
        return sum + ben
      }, 0),
    [filteredVentes],
  )

  /* ──── Export CSV ──── */
  const handleExportCSV = () => {
    const columns = [
      { key: 'date_vente', label: 'Date', format: (v) => v ?? '' },
      { key: 'produit', label: 'Produit' },
      { key: 'categorie', label: 'Catégorie' },
      { key: 'plateforme', label: 'Plateforme' },
      { key: 'qte_vendue', label: 'Qté vendue' },
      {
        key: 'prix_achat_unitaire',
        label: 'Prix achat unitaire',
        format: (v) => formatCurrency(v),
      },
      {
        key: 'prix_revente_unitaire',
        label: 'Prix vente unitaire',
        format: (v) => formatCurrency(v),
      },
      {
        key: 'benefice_unitaire',
        label: 'Bénéfice unitaire',
        format: (v) => formatCurrency(v),
      },
      {
        key: 'benefice_total',
        label: 'Bénéfice total',
        format: (v) => formatCurrency(v),
      },
      { key: 'client_prenom', label: 'Prénom client' },
      { key: 'client_nom', label: 'Nom client' },
      { key: 'client_adresse', label: 'Adresse client' },
    ]

    const dataToExport = filteredVentes.map((v) => ({
      ...v,
      benefice_unitaire:
        Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire),
      benefice_total:
        (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) *
        v.qte_vendue,
    }))

    exportToCSV({ data: dataToExport, filename: 'ventes.csv', columns })
  }

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
        {/* ══════ FORMULAIRE D'AJOUT ══════ */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-800">Nouvelle vente</h2>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
            {/* Produit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
              <select
                value={form.stock_id}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
              >
                <option value="">— Sélectionner un article —</option>
                {stockItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.produit}
                  </option>
                ))}
              </select>
            </div>

            {/* Prix achat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix d&apos;achat unitaire (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.prix_achat_unitaire}
                onChange={(e) => setForm((f) => ({ ...f, prix_achat_unitaire: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
              />
            </div>

            {/* Prix vente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix de vente unitaire (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.prix_revente_unitaire}
                onChange={(e) => setForm((f) => ({ ...f, prix_revente_unitaire: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
              />
            </div>

            {/* Qté */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité vendue</label>
              <input
                type="number"
                min="1"
                required
                value={form.qte_vendue}
                onChange={(e) => setForm((f) => ({ ...f, qte_vendue: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
              />
              {exceedsStock && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ {qteRestante} restant(s) en stock pour ce produit (dépassement autorisé)
                </p>
              )}
            </div>

            {/* Plateforme */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plateforme</label>
              <select
                value={form.plateforme}
                onChange={(e) => setForm((f) => ({ ...f, plateforme: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
              >
                {PLATEFORMES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={form.date_vente}
                onChange={(e) => setForm((f) => ({ ...f, date_vente: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
              />
            </div>

            {/* Prénom client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom client (opt.)</label>
              <input
                type="text"
                value={form.client_prenom}
                onChange={(e) => setForm((f) => ({ ...f, client_prenom: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
                placeholder="Jean"
              />
            </div>

            {/* Nom client */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom client (opt.)</label>
              <input
                type="text"
                value={form.client_nom}
                onChange={(e) => setForm((f) => ({ ...f, client_nom: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
                placeholder="Dupont"
              />
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse client (opt.)</label>
              <input
                type="text"
                value={form.client_adresse}
                onChange={(e) => setForm((f) => ({ ...f, client_adresse: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
                placeholder="12 rue de Paris, 75001 Paris"
              />
            </div>

            {/* Submit */}
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                className="bg-gray-800 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Enregistrer la vente
              </button>
            </div>
          </form>
        </div>

        {/* ══════ FILTRES ══════ */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Plateforme</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="border border-gray-300 bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
            >
              {PLATEFORME_FILTERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date début</label>
            <input
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date fin</label>
            <input
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 outline-none"
            />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredVentes.length === 0}
            className="bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Exporter en CSV
          </button>
        </div>

        {/* ══════ TABLEAU D'HISTORIQUE ══════ */}
        {filteredVentes.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-500">Aucune vente enregistrée</p>
            <p className="text-sm text-gray-400 mt-1">
              Ajoute ta première vente via le formulaire ci-dessus
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Produit</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Plateforme</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Qté</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Achat</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Vente</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Bénéfice unitaire</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Bénéfice total</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredVentes.map((v) => {
                  const pu = Number.parseFloat(v.prix_achat_unitaire)
                  const pv = Number.parseFloat(v.prix_revente_unitaire)
                  const benU = pv - pu
                  const benT = benU * v.qte_vendue
                  const isBenef = benU >= 0

                  return (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-700">{v.date_vente}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{v.produit}</td>
                      <td className="px-4 py-3 text-gray-600">{v.plateforme}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{v.qte_vendue}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(pu)}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(pv)}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          isBenef ? 'text-profit' : 'text-loss'
                        }`}
                      >
                        {formatCurrency(benU)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          isBenef ? 'text-profit' : 'text-loss'
                        }`}
                      >
                        {formatCurrency(benT)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDelete(v.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                <tr className="font-semibold text-sm">
                  <td colSpan={7} className="px-4 py-3 text-right text-gray-700">
                    Total des lignes filtrées
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${
                      totalBenefit >= 0 ? 'text-profit' : 'text-loss'
                    }`}
                  >
                    {formatCurrency(totalBenefit)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}
