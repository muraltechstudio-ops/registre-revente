import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { exportToCSV } from '../lib/csvExport'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import toast from 'react-hot-toast'
import {
  Plus,
  Search,
  Download,
  Trash2,
  Receipt,
  Package,
  Building2,
  ChevronDown,
} from 'lucide-react'

/* ──── Constantes ──── */
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

const STATUTS = [
  'À expédier',
  'Expédié',
  'Livré',
  'Litige/Retour',
  'Annulé',
]

const STATUT_FILTERS = ['Tous', ...STATUTS]

const STATUT_STYLES = {
  'À expédier': 'bg-amber-pale text-amber border-amber/20',
  'Expédié': 'bg-blue-100 text-blue-700 border-blue-200',
  'Livré': 'bg-sage-pale text-sage border-sage/20',
  'Litige/Retour': 'bg-terracotta-pale text-terracotta border-terracotta/20',
  'Annulé': 'bg-gray-100 text-gray-500 border-gray-200 line-through',
}

const EMPTY_SALE_FORM = {
  stock_id: '',
  produit: '',
  categorie: '',
  prix_achat_unitaire: '',
  prix_revente_unitaire: '',
  qte_vendue: 1,
  plateforme: 'Vinted',
  statut: 'À expédier',
  date_vente: '',
  client_nom: '',
  client_prenom: '',
  client_adresse: '',
}

const formatCurrency = (value) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)

const todayStr = () => new Date().toISOString().split('T')[0]

/* ──── Squelette ──── */
function Skeleton({ className }) {
  return <div className={`animate-pulse bg-ink/10 rounded ${className}`} />
}

/* ──── Page ──── */
export default function VentesPage() {
  const router = useRouter()

  /* ──── État ──── */
  const [stockItems, setStockItems] = useState([])
  const [ventes, setVentes] = useState([])
  const [loading, setLoading] = useState(true)

  // Formulaire vente
  const [form, setForm] = useState({ ...EMPTY_SALE_FORM, date_vente: todayStr() })
  const [preselectDone, setPreselectDone] = useState(false)

  // Filtres tableau
  const [platformFilter, setPlatformFilter] = useState('Toutes')
  const [statutFilter, setStatutFilter] = useState('Tous')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [searchVente, setSearchVente] = useState('')

  // Menu inline de statut
  const [openStatutId, setOpenStatutId] = useState(null)
  const statutMenuRef = useRef(null)

  /* ──── Fermeture au clic dehors ──── */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statutMenuRef.current && !statutMenuRef.current.contains(e.target)) {
        setOpenStatutId(null)
      }
    }
    if (openStatutId) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openStatutId])

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
      toast.error('Erreur lors du chargement des données')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  /* ──── Pré-sélection ?produit=ID ──── */
  useEffect(() => {
    if (!loading && router.query.produit && !preselectDone) {
      const id = router.query.produit
      const item = stockItems.find((s) => s.id === id)
      if (item) {
        setForm((f) => ({
          ...f,
          stock_id: id,
          produit: item.produit,
          categorie: item.categorie,
          prix_achat_unitaire: item.prix_achat_unitaire,
          prix_revente_unitaire: item.prix_revente_unitaire,
        }))
        setTimeout(() => {
          const qtyInput = document.getElementById('qte_vendue')
          qtyInput?.focus()
        }, 100)
      }
      setPreselectDone(true)
    }
  }, [loading, router.query.produit, stockItems, preselectDone])

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

  /* ──── Quantité restante ──── */
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
          statut: form.statut,
          client_nom: form.client_nom || null,
          client_prenom: form.client_prenom || null,
          client_adresse: form.client_adresse || null,
        },
      ])
      if (error) throw error
      toast.success('Vente enregistrée')
      setForm({ ...EMPTY_SALE_FORM, date_vente: todayStr() })
      setPreselectDone(false)
      await fetchData()
    } catch (err) {
      console.error(err)
      toast.error("Erreur lors de l'enregistrement de la vente")
    }
  }

  /* ──── Mise à jour inline du statut ──── */
  const handleStatutUpdate = async (id, nouveauStatut) => {
    const { error } = await supabase
      .from('revente_ventes')
      .update({ statut: nouveauStatut })
      .eq('id', id)
    if (error) {
      toast.error('Erreur lors de la mise à jour du statut')
      return
    }
    toast.success(`Statut mis à jour : ${nouveauStatut}`)
    setOpenStatutId(null)
    // Mise à jour locale sans rechargement complet
    setVentes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, statut: nouveauStatut } : v)),
    )
  }

  /* ──── Supprimer une vente ──── */
  const handleDelete = async (id) => {
    const { error } = await supabase.from('revente_ventes').delete().eq('id', id)
    if (error) {
      toast.error("Erreur lors de la suppression")
      return
    }
    toast.success('Vente supprimée')
    await fetchData()
  }

  /* ──── Filtrage ──── */
  const filteredVentes = useMemo(
    () =>
      ventes.filter((v) => {
        if (platformFilter !== 'Toutes' && v.plateforme !== platformFilter) return false
        if (statutFilter !== 'Tous' && v.statut !== statutFilter) return false
        if (dateDebut && v.date_vente < dateDebut) return false
        if (dateFin && v.date_vente > dateFin) return false
        if (searchVente.trim()) {
          const q = searchVente.toLowerCase()
          if (!v.produit.toLowerCase().includes(q)) return false
        }
        return true
      }),
    [ventes, platformFilter, statutFilter, dateDebut, dateFin, searchVente],
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
      { key: 'statut', label: 'Statut' },
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
    toast.success('Export téléchargé')
  }

  /* ──── Rendu ──── */
  if (loading) {
    return (
      <AuthGuard>
        <Layout>
          <VentesSkeleton />
        </Layout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <Layout>
        {/* Titre */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-bold text-ink">Ventes</h1>
          <hr className="double-rule mt-2" />
        </div>

        {/* ══════ FORMULAIRE D'AJOUT ══════ */}
        <div className="bg-white rounded-lg border border-border p-4 sm:p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <Plus className="w-5 h-5 text-sage" />
            <h2 className="font-serif text-lg font-bold text-ink">Nouvelle vente</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
              {/* COLONNE GAUCHE : Infos produit & vente */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-ink/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Produit & vente
                </h3>
                {/* Produit */}
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">Produit</label>
                  <select
                    value={form.stock_id}
                    onChange={(e) => handleProductChange(e.target.value)}
                    className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                  >
                    <option value="">— Sélectionner un article —</option>
                    {stockItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.produit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prix achat + vente */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1">Prix achat (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.prix_achat_unitaire}
                      onChange={(e) => setForm((f) => ({ ...f, prix_achat_unitaire: e.target.value }))}
                      className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1">Prix vente (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.prix_revente_unitaire}
                      onChange={(e) => setForm((f) => ({ ...f, prix_revente_unitaire: e.target.value }))}
                      className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Qté + plateforme */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1">Quantité</label>
                    <input
                      id="qte_vendue"
                      type="number"
                      min="1"
                      required
                      value={form.qte_vendue}
                      onChange={(e) => setForm((f) => ({ ...f, qte_vendue: e.target.value }))}
                      className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    />
                    {exceedsStock && (
                      <p className="text-xs text-terracotta mt-1 flex items-center gap-1">
                        ⚠ {qteRestante} restant(s) en stock (dépassement autorisé)
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1">Plateforme</label>
                    <select
                      value={form.plateforme}
                      onChange={(e) => setForm((f) => ({ ...f, plateforme: e.target.value }))}
                      className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    >
                      {PLATEFORMES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Statut + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1">Statut</label>
                    <select
                      value={form.statut}
                      onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                      className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    >
                      {STATUTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/70 mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={form.date_vente}
                      onChange={(e) => setForm((f) => ({ ...f, date_vente: e.target.value }))}
                      className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* COLONNE DROITE : Infos client */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-ink/40 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Client (optionnel)
                </h3>
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={form.client_prenom}
                    onChange={(e) => setForm((f) => ({ ...f, client_prenom: e.target.value }))}
                    className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    placeholder="Jean"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">Nom</label>
                  <input
                    type="text"
                    value={form.client_nom}
                    onChange={(e) => setForm((f) => ({ ...f, client_nom: e.target.value }))}
                    className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    placeholder="Dupont"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink/70 mb-1">Adresse</label>
                  <input
                    type="text"
                    value={form.client_adresse}
                    onChange={(e) => setForm((f) => ({ ...f, client_adresse: e.target.value }))}
                    className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                    placeholder="12 rue de Paris, 75001 Paris"
                  />
                </div>
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full bg-sage text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-sage-light transition-colors"
                  >
                    Enregistrer la vente
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* ══════ FILTRES ══════ */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 items-end">
          {/* Recherche texte */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/30" />
            <input
              type="text"
              value={searchVente}
              onChange={(e) => setSearchVente(e.target.value)}
              placeholder="Rechercher un produit…"
              className="w-full pl-9 pr-3 py-2 border border-border bg-white rounded-md text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Filtre plateforme */}
            <div>
              <label className="block text-xs font-medium text-ink/50 mb-1">Plateforme</label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
              >
                {PLATEFORME_FILTERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {/* Filtre statut */}
            <div>
              <label className="block text-xs font-medium text-ink/50 mb-1">Statut</label>
              <select
                value={statutFilter}
                onChange={(e) => setStatutFilter(e.target.value)}
                className="border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
              >
                {STATUT_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {/* Filtres période */}
            <div>
              <label className="block text-xs font-medium text-ink/50 mb-1">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink/50 mb-1">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
              />
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={filteredVentes.length === 0}
            className="flex items-center gap-2 bg-amber text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-light disabled:opacity-50 transition-colors shrink-0"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>

        {/* ══════ TABLEAU / HISTORIQUE ══════ */}
        {filteredVentes.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border border-border">
            <Receipt className="mx-auto w-12 h-12 text-ink/15" />
            <p className="mt-4 text-base font-medium text-ink/50">Aucune vente enregistrée</p>
            <p className="text-sm text-ink/40 mt-1">
              Ajoute ta première vente via le formulaire ci-dessus
            </p>
          </div>
        ) : (
          <>
            {/* Desktop : tableau */}
            <div className="hidden sm:block overflow-x-auto bg-white rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-ink/[0.02]">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-ink/50">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-ink/50">Produit</th>
                    <th className="px-4 py-3 text-left font-medium text-ink/50">Plateforme</th>
                    <th className="px-4 py-3 text-center font-medium text-ink/50">Statut</th>
                    <th className="px-4 py-3 text-right font-medium text-ink/50">Qté</th>
                    <th className="px-4 py-3 text-right font-medium text-ink/50">Achat</th>
                    <th className="px-4 py-3 text-right font-medium text-ink/50">Vente</th>
                    <th className="px-4 py-3 text-right font-medium text-ink/50">Bénéfice</th>
                    <th className="px-4 py-3 text-right font-medium text-ink/50">Total</th>
                    <th className="px-4 py-3 text-center font-medium text-ink/50"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredVentes.map((v, idx) => {
                    const pu = Number.parseFloat(v.prix_achat_unitaire)
                    const pv = Number.parseFloat(v.prix_revente_unitaire)
                    const benU = pv - pu
                    const benT = benU * v.qte_vendue
                    const isBenef = benU >= 0
                    const statut = v.statut || 'À expédier'

                    return (
                      <tr
                        key={v.id}
                        className={`transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-ink/[0.02]'
                        } hover:bg-sage-pale/50`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-ink/70 whitespace-nowrap">{v.date_vente}</td>
                        <td className="px-4 py-3 font-medium text-ink">{v.produit}</td>
                        <td className="px-4 py-3 text-ink/60">{v.plateforme}</td>
                        {/* Statut avec éditeur inline */}
                        <td className="px-4 py-3 text-center relative">
                          <div className="relative inline-block" ref={openStatutId === v.id ? statutMenuRef : null}>
                            <button
                              onClick={() => setOpenStatutId(openStatutId === v.id ? null : v.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                                STATUT_STYLES[statut] || 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {statut}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {openStatutId === v.id && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 bg-white border border-border rounded-md shadow-lg py-1 min-w-[130px]">
                                {STATUTS.map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => handleStatutUpdate(v.id, s)}
                                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-ink/5 transition-colors ${
                                      s === statut ? 'font-semibold text-ink' : 'text-ink/70'
                                    }`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-ink/70">{v.qte_vendue}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink/70">{formatCurrency(pu)}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink/70">{formatCurrency(pv)}</td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-semibold ${
                            isBenef ? 'text-sage' : 'text-terracotta'
                          }`}
                        >
                          {formatCurrency(benU)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-mono font-semibold ${
                            isBenef ? 'text-sage' : 'text-terracotta'
                          }`}
                        >
                          {formatCurrency(benT)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="p-1.5 rounded text-terracotta hover:bg-terracotta-pale transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-ink/[0.02] border-t-2 border-ink/20">
                  <tr className="font-semibold text-sm">
                    <td colSpan={8} className="px-4 py-3 text-right text-ink/70">
                      Total des lignes filtrées
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono ${
                        totalBenefit >= 0 ? 'text-sage' : 'text-terracotta'
                      }`}
                    >
                      {formatCurrency(totalBenefit)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Mobile : cartes */}
            <div className="sm:hidden space-y-3">
              {filteredVentes.map((v) => {
                const pu = Number.parseFloat(v.prix_achat_unitaire)
                const pv = Number.parseFloat(v.prix_revente_unitaire)
                const benU = pv - pu
                const benT = benU * v.qte_vendue
                const isBenef = benU >= 0
                const statut = v.statut || 'À expédier'

                return (
                  <div key={v.id} className="bg-white rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-ink text-sm">{v.produit}</p>
                        <p className="text-xs text-ink/50 mt-0.5 font-mono">{v.date_vente}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(v.id)}
                        className="p-1 rounded text-terracotta/50 hover:text-terracotta hover:bg-terracotta-pale transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Badge statut + plateforme */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        STATUT_STYLES[statut] || 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {statut}
                      </span>
                      <span className="text-xs text-ink/50">{v.plateforme}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                      <span className="text-ink/50">Qté : <strong className="font-mono text-ink">{v.qte_vendue}</strong></span>
                      <span className="text-ink/50">Achat : <strong className="font-mono text-ink/70">{formatCurrency(pu)}</strong></span>
                      <span className="text-ink/50">Vente : <strong className="font-mono text-ink/70">{formatCurrency(pv)}</strong></span>
                    </div>
                    <div className={`mt-2 pt-2 border-t border-border/50 flex justify-between items-center text-xs font-semibold ${
                      isBenef ? 'text-sage' : 'text-terracotta'
                    }`}>
                      <span>Bénéfice unitaire</span>
                      <span className="font-mono">{formatCurrency(benU)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold mt-0.5">
                      <span className="text-ink/50">Total</span>
                      <span className={`font-mono ${isBenef ? 'text-sage' : 'text-terracotta'}`}>
                        {formatCurrency(benT)}
                      </span>
                    </div>
                  </div>
                )
              })}
              {/* Total mobile */}
              <div className="bg-white rounded-lg border-2 border-sage/30 p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-ink/70">Total lignes filtrées</span>
                  <span
                    className={`font-mono font-bold text-base ${
                      totalBenefit >= 0 ? 'text-sage' : 'text-terracotta'
                    }`}
                  >
                    {formatCurrency(totalBenefit)}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </Layout>
    </AuthGuard>
  )
}

/* ──── Squelette ──── */
function VentesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="bg-white rounded-lg border border-border p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <Skeleton className="h-3 w-28 mb-2" />
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-3 w-20 mb-2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg border border-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-border/60' : ''}`}
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
