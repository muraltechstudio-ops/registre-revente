import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { exportToCSV } from '../lib/csvExport'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import toast from 'react-hot-toast'
import {
  Plus, Search, Download, Trash2, Receipt, Package, Building2, ChevronDown, Sparkles, Link2, Truck, ExternalLink,
} from 'lucide-react'

/* ──── Constantes ──── */
const PLATEFORMES = ['Vinted','Leboncoin','Facebook Marketplace','TikTok Shop','Temu','Whatnot','Autre']
const PLATEFORME_FILTERS = ['Toutes', ...PLATEFORMES]
const STATUTS = ['À expédier','Expédié','Livré','Litige/Retour','Annulé']
const STATUT_FILTERS = ['Tous', ...STATUTS]
const STATUT_STYLES = {
  'À expédier': 'bg-amber-pale text-amber border-amber/20',
  'Expédié': 'bg-blue-100 text-blue-700 border-blue-200',
  'Livré': 'bg-sage-pale text-sage border-sage/20',
  'Litige/Retour': 'bg-terracotta-pale text-terracotta border-terracotta/20',
  'Annulé': 'bg-gray-100 text-gray-400 border-gray-200 line-through',
}
const EMPTY_SALE_FORM = {
  stock_id: '', produit: '', categorie: '', prix_achat_unitaire: '', prix_revente_unitaire: '',
  qte_vendue: 1, plateforme: 'Vinted', statut: 'À expédier', date_vente: '',
  numero_suivi: '', lien_vente: '',
  client_nom: '', client_prenom: '', client_adresse: '',
}
const formatCurrency = (value) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
const todayStr = () => new Date().toISOString().split('T')[0]

/* ──── Animations ──── */
const containerAnim = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const itemAnim = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 24 } },
}

/* ──── Squelette ──── */
function Skeleton({ className }) { return <div className={`skeleton-modern ${className}`} /> }

/* ──── Badge statut ──── */
function StatutBadge({ statut }) {
  return <span className={`badge-modern ${STATUT_STYLES[statut] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{statut}</span>
}

/* ──── Page ──── */
export default function VentesPage() {
  const router = useRouter()
  const [stockItems, setStockItems] = useState([])
  const [ventes, setVentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY_SALE_FORM, date_vente: todayStr() })
  const [preselectDone, setPreselectDone] = useState(false)
  const [platformFilter, setPlatformFilter] = useState('Toutes')
  const [statutFilter, setStatutFilter] = useState('Tous')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [searchVente, setSearchVente] = useState('')
  const [openStatutId, setOpenStatutId] = useState(null)
  const statutMenuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => { if (statutMenuRef.current && !statutMenuRef.current.contains(e.target)) setOpenStatutId(null) }
    if (openStatutId) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openStatutId])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [stockRes, ventesRes] = await Promise.all([
        supabase.from('revente_stock').select('*').order('produit'),
        supabase.from('revente_ventes').select('*').order('date_vente', { ascending: false }).limit(1000),
      ])
      if (stockRes.error) throw stockRes.error
      if (ventesRes.error) throw ventesRes.error
      setStockItems(stockRes.data ?? [])
      setVentes(ventesRes.data ?? [])
    } catch (err) { console.error(err); toast.error('Erreur lors du chargement') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* Pre-select */
  useEffect(() => {
    if (!loading && router.query.produit && !preselectDone) {
      const item = stockItems.find((s) => s.id === router.query.produit)
      if (item) {
        setForm((f) => ({ ...f, stock_id: router.query.produit, produit: item.produit, categorie: item.categorie, prix_achat_unitaire: item.prix_achat_unitaire, prix_revente_unitaire: item.prix_revente_unitaire }))
        setTimeout(() => document.getElementById('qte_vendue')?.focus(), 100)
      }
      setPreselectDone(true)
    }
  }, [loading, router.query.produit, stockItems, preselectDone])

  const handleProductChange = (stockId) => {
    if (!stockId) { setForm((f) => ({ ...f, stock_id: '', produit: '', categorie: '', prix_achat_unitaire: '', prix_revente_unitaire: '' })); return }
    const item = stockItems.find((s) => s.id === stockId)
    if (item) setForm((f) => ({ ...f, stock_id: stockId, produit: item.produit, categorie: item.categorie, prix_achat_unitaire: item.prix_achat_unitaire, prix_revente_unitaire: item.prix_revente_unitaire }))
  }

  const selectedStock = stockItems.find((s) => s.id === form.stock_id)
  const qteRestante = useMemo(() => {
    if (!selectedStock) return 0
    return selectedStock.qte_stock - ventes.filter((v) => v.stock_id === form.stock_id).reduce((s, v) => s + v.qte_vendue, 0)
  }, [selectedStock, ventes, form.stock_id])
  const exceedsStock = form.stock_id && Number(form.qte_vendue) > qteRestante

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('revente_ventes').insert([{
        stock_id: form.stock_id || null, date_vente: form.date_vente, produit: form.produit, categorie: form.categorie || null,
        prix_achat_unitaire: Number.parseFloat(form.prix_achat_unitaire), prix_revente_unitaire: Number.parseFloat(form.prix_revente_unitaire),
        qte_vendue: Number.parseInt(form.qte_vendue, 10), plateforme: form.plateforme, statut: form.statut,
        numero_suivi: form.numero_suivi || null, lien_vente: form.lien_vente || null,
        client_nom: form.client_nom || null, client_prenom: form.client_prenom || null, client_adresse: form.client_adresse || null,
      }])
      if (error) throw error
      toast.success('Vente enregistrée')
      setForm({ ...EMPTY_SALE_FORM, date_vente: todayStr() })
      setPreselectDone(false)
      await fetchData()
    } catch (err) { console.error(err); toast.error("Erreur lors de l'enregistrement") }
  }

  const handleStatutUpdate = async (id, nouveauStatut) => {
    const { error } = await supabase.from('revente_ventes').update({ statut: nouveauStatut }).eq('id', id)
    if (error) { toast.error('Erreur'); return }
    toast.success(`Statut : ${nouveauStatut}`)
    setOpenStatutId(null)
    setVentes((prev) => prev.map((v) => (v.id === id ? { ...v, statut: nouveauStatut } : v)))
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('revente_ventes').delete().eq('id', id)
    if (error) { toast.error("Erreur"); return }
    toast.success('Vente supprimée')
    await fetchData()
  }

  const filteredVentes = useMemo(() =>
    ventes.filter((v) => {
      if (platformFilter !== 'Toutes' && v.plateforme !== platformFilter) return false
      if (statutFilter !== 'Tous' && v.statut !== statutFilter) return false
      if (dateDebut && v.date_vente < dateDebut) return false
      if (dateFin && v.date_vente > dateFin) return false
      if (searchVente.trim() && !v.produit.toLowerCase().includes(searchVente.toLowerCase())) return false
      return true
    }), [ventes, platformFilter, statutFilter, dateDebut, dateFin, searchVente])

  const totalBenefit = useMemo(() =>
    filteredVentes.reduce((sum, v) => sum + (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue, 0),
    [filteredVentes])

  const handleExportCSV = () => {
    const columns = [
      { key: 'date_vente', label: 'Date', format: (v) => v ?? '' },
      { key: 'produit', label: 'Produit' },
      { key: 'categorie', label: 'Catégorie' },
      { key: 'plateforme', label: 'Plateforme' },
      { key: 'statut', label: 'Statut' },
      { key: 'numero_suivi', label: 'N° Suivi' },
      { key: 'lien_vente', label: 'Lien vente' },
      { key: 'qte_vendue', label: 'Qté vendue' },
      { key: 'prix_achat_unitaire', label: 'Prix achat', format: (v) => formatCurrency(v) },
      { key: 'prix_revente_unitaire', label: 'Prix vente', format: (v) => formatCurrency(v) },
      { key: 'benefice_unitaire', label: 'Bénéfice unitaire', format: (v) => formatCurrency(v) },
      { key: 'benefice_total', label: 'Bénéfice total', format: (v) => formatCurrency(v) },
      { key: 'client_prenom', label: 'Prénom client' },
      { key: 'client_nom', label: 'Nom client' },
      { key: 'client_adresse', label: 'Adresse client' },
    ]
    const dataToExport = filteredVentes.map((v) => ({
      ...v,
      benefice_unitaire: Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire),
      benefice_total: (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue,
    }))
    exportToCSV({ data: dataToExport, filename: 'ventes.csv', columns })
    toast.success('Export téléchargé')
  }

  if (loading) return <AuthGuard><Layout><VentesSkeleton /></Layout></AuthGuard>

  return (
    <AuthGuard>
      <Layout>
        <motion.div variants={containerAnim} initial="hidden" animate="show">
          {/* Header */}
          <motion.div variants={itemAnim} className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-amber-gradient shadow-glow-amber flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold gradient-text">Ventes</h1>
              <div className="double-rule mt-2 w-16" />
            </div>
          </motion.div>

          {/* Formulaire */}
          <motion.div variants={itemAnim} className="glass-card rounded-2xl p-4 sm:p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-xl bg-sage-gradient shadow-glow-sage flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-serif text-lg font-bold gradient-text">Nouvelle vente</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                {/* COLONNE GAUCHE */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-ink/30 uppercase tracking-wider flex items-center gap-1.5 font-sans"><Package className="w-3.5 h-3.5" />Produit &amp; vente</h3>
                  {/* Produit */}
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Produit</label>
                    <select value={form.stock_id} onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm">
                      <option value="">— Sélectionner un article —</option>
                      {stockItems.map((item) => (<option key={item.id} value={item.id}>{item.produit}</option>))}
                    </select>
                  </div>
                  {/* Prix achat + vente */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Prix achat (€)</label>
                      <input type="number" step="0.01" min="0" required value={form.prix_achat_unitaire}
                        onChange={(e) => setForm((f) => ({ ...f, prix_achat_unitaire: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Prix vente (€)</label>
                      <input type="number" step="0.01" min="0" required value={form.prix_revente_unitaire}
                        onChange={(e) => setForm((f) => ({ ...f, prix_revente_unitaire: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono" />
                    </div>
                  </div>
                  {/* Qté + plateforme */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Quantité</label>
                      <input id="qte_vendue" type="number" min="1" required value={form.qte_vendue}
                        onChange={(e) => setForm((f) => ({ ...f, qte_vendue: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono" />
                      {exceedsStock && <p className="text-xs text-terracotta mt-1">⚠ {qteRestante} restant(s) (dépassement autorisé)</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Plateforme</label>
                      <select value={form.plateforme} onChange={(e) => setForm((f) => ({ ...f, plateforme: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm">
                        {PLATEFORMES.map((p) => (<option key={p} value={p}>{p}</option>))}
                      </select>
                    </div>
                  </div>
                  {/* Statut + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Statut</label>
                      <select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm">
                        {STATUTS.map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Date</label>
                      <input type="date" required value={form.date_vente}
                        onChange={(e) => setForm((f) => ({ ...f, date_vente: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" />
                    </div>
                  </div>
                  {/* N° Suivi + Lien vente — NOUVEAUX CHAMPS */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-ink/30" /> N° Suivi <span className="text-ink/20">(opt.)</span>
                      </label>
                      <input type="text" value={form.numero_suivi}
                        onChange={(e) => setForm((f) => ({ ...f, numero_suivi: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm font-mono"
                        placeholder="Ex. COL123456789FR" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-ink/30" /> Lien vente <span className="text-ink/20">(opt.)</span>
                      </label>
                      <input type="url" value={form.lien_vente}
                        onChange={(e) => setForm((f) => ({ ...f, lien_vente: e.target.value }))}
                        className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                        placeholder="https://..." />
                    </div>
                  </div>
                </div>

                {/* COLONNE DROITE : Client */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-ink/30 uppercase tracking-wider flex items-center gap-1.5 font-sans"><Building2 className="w-3.5 h-3.5" />Client <span className="text-ink/20 font-normal normal-case">(optionnel)</span></h3>
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Prénom</label>
                    <input type="text" value={form.client_prenom} onChange={(e) => setForm((f) => ({ ...f, client_prenom: e.target.value }))}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" placeholder="Jean" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Nom</label>
                    <input type="text" value={form.client_nom} onChange={(e) => setForm((f) => ({ ...f, client_nom: e.target.value }))}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" placeholder="Dupont" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">Adresse</label>
                    <input type="text" value={form.client_adresse} onChange={(e) => setForm((f) => ({ ...f, client_adresse: e.target.value }))}
                      className="w-full glass-input rounded-xl px-4 py-2.5 text-sm" placeholder="12 rue de Paris, 75001 Paris" />
                  </div>
                  <div className="pt-2">
                    <button type="submit" className="btn-primary w-full !py-3">Enregistrer la vente</button>
                  </div>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Filtres */}
          <motion.div variants={itemAnim} className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 items-end">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/20" />
              <input type="text" value={searchVente} onChange={(e) => setSearchVente(e.target.value)}
                placeholder="Rechercher un produit…" className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-sm" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div>
                <label className="block text-xs font-medium text-ink/40 mb-1 font-sans">Plateforme</label>
                <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}
                  className="glass-input rounded-xl px-3 py-2 text-sm">
                  {PLATEFORME_FILTERS.map((p) => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/40 mb-1 font-sans">Statut</label>
                <select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value)}
                  className="glass-input rounded-xl px-3 py-2 text-sm">
                  {STATUT_FILTERS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/40 mb-1 font-sans">Du</label>
                <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                  className="glass-input rounded-xl px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink/40 mb-1 font-sans">Au</label>
                <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
                  className="glass-input rounded-xl px-3 py-2 text-sm" />
              </div>
            </div>
            <button onClick={handleExportCSV} disabled={filteredVentes.length === 0}
              className="btn-amber inline-flex items-center gap-2 shrink-0 disabled:opacity-50">
              <Download className="w-4 h-4" /> CSV
            </button>
          </motion.div>

          {/* Tableau */}
          {filteredVentes.length === 0 ? (
            <motion.div variants={itemAnim} className="text-center py-16 glass-card rounded-2xl">
              <Receipt className="mx-auto w-12 h-12 text-ink/10" />
              <p className="mt-4 text-base font-medium text-ink/40 font-sans">Aucune vente enregistrée</p>
              <p className="text-sm text-ink/30 mt-1 font-sans">Ajoute ta première vente via le formulaire ci-dessus</p>
            </motion.div>
          ) : (
            <>
              {/* Desktop : tableau */}
              <motion.div variants={itemAnim} className="hidden sm:block glass-card rounded-2xl overflow-hidden">
                <table className="min-w-full text-xs">
                  <thead><tr className="border-b border-border/30">
                    <th className="px-3 py-3 text-left font-medium text-ink/40 uppercase tracking-wider font-sans">Date</th>
                    <th className="px-3 py-3 text-left font-medium text-ink/40 uppercase tracking-wider font-sans">Produit</th>
                    <th className="px-3 py-3 text-center font-medium text-ink/40 uppercase tracking-wider font-sans">Statut</th>
                    <th className="px-3 py-3 text-left font-medium text-ink/40 uppercase tracking-wider font-sans">Plateforme</th>
                    <th className="px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider font-sans">Qté</th>
                    <th className="px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider font-sans">Achat</th>
                    <th className="px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider font-sans">Vente</th>
                    <th className="px-3 py-3 text-right font-medium text-ink/40 uppercase tracking-wider font-sans">Bénéfice</th>
                    <th className="px-3 py-3 text-center font-medium text-ink/40 uppercase tracking-wider font-sans"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-border/20">
                    {filteredVentes.map((v, idx) => {
                      const pu = Number.parseFloat(v.prix_achat_unitaire), pv = Number.parseFloat(v.prix_revente_unitaire)
                      const benU = pv - pu, benT = benU * v.qte_vendue, isBenef = benU >= 0
                      const statut = v.statut || 'À expédier'
                      return (
                        <motion.tr key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                          className={`transition-colors ${idx % 2 === 0 ? 'bg-white/40' : 'bg-ink/[0.015]'} hover:bg-sage-pale/30`}>
                          <td className="px-3 py-3 font-mono text-xs text-ink/50 whitespace-nowrap">{v.date_vente}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-ink">{v.produit}</span>
                              {v.numero_suivi && <span className="shrink-0 text-[10px] text-ink/30 bg-ink/5 px-1.5 py-0.5 rounded-md font-sans flex items-center gap-0.5"><Truck className="w-2.5 h-2.5" />{v.numero_suivi}</span>}
                            </div>
                            {v.lien_vente && (
                              <a href={v.lien_vente} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-sage/60 hover:text-sage flex items-center gap-0.5 mt-0.5 font-sans"
                                onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="w-2.5 h-2.5" />Voir l&apos;annonce
                              </a>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center relative">
                            <div className="relative inline-block" ref={openStatutId === v.id ? statutMenuRef : null}>
                              <button onClick={() => setOpenStatutId(openStatutId === v.id ? null : v.id)}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${STATUT_STYLES[statut] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {statut}<ChevronDown className="w-3 h-3" />
                              </button>
                              {openStatutId === v.id && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 glass-card rounded-xl shadow-glass-lg py-1 min-w-[130px] border border-border/40">
                                  {STATUTS.map((s) => (
                                    <button key={s} onClick={() => handleStatutUpdate(v.id, s)}
                                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-ink/5 transition-colors font-sans ${s === statut ? 'font-semibold text-ink' : 'text-ink/60'}`}>{s}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-ink/50">{v.plateforme}</td>
                          <td className="px-3 py-3 text-right font-mono text-ink/60">{v.qte_vendue}</td>
                          <td className="px-3 py-3 text-right font-mono text-ink/50">{formatCurrency(pu)}</td>
                          <td className="px-3 py-3 text-right font-mono text-ink/50">{formatCurrency(pv)}</td>
                          <td className={`px-3 py-3 text-right font-mono font-semibold ${isBenef ? 'text-sage' : 'text-terracotta'}`}>{formatCurrency(benT)}</td>
                          <td className="px-3 py-3 text-center">
                            <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg text-terracotta/40 hover:text-terracotta hover:bg-terracotta/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                  <tfoot><tr className="border-t-2 border-ink/10 bg-ink/[0.02]">
                    <td colSpan={7} className="px-3 py-3 text-right text-ink/50 font-sans text-xs">Total des lignes filtrées</td>
                    <td className={`px-3 py-3 text-right font-mono font-bold ${totalBenefit >= 0 ? 'text-sage' : 'text-terracotta'}`}>{formatCurrency(totalBenefit)}</td>
                    <td />
                  </tr></tfoot>
                </table>
              </motion.div>

              {/* Mobile : cartes */}
              <div className="sm:hidden space-y-3">
                {filteredVentes.map((v, idx) => {
                  const pu = Number.parseFloat(v.prix_achat_unitaire), pv = Number.parseFloat(v.prix_revente_unitaire)
                  const benU = pv - pu, benT = benU * v.qte_vendue, isBenef = benU >= 0
                  const statut = v.statut || 'À expédier'
                  return (
                    <motion.div key={v.id} variants={itemAnim} className="glass-card rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-ink text-sm font-sans">{v.produit}</p>
                          <p className="text-xs text-ink/40 mt-0.5 font-mono">{v.date_vente}</p>
                        </div>
                        <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg text-terracotta/30 hover:text-terracotta hover:bg-terracotta/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`badge-modern ${STATUT_STYLES[statut] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>{statut}</span>
                        <span className="text-xs text-ink/40 font-sans">{v.plateforme}</span>
                        {v.numero_suivi && <span className="text-[10px] text-ink/30 font-sans flex items-center gap-0.5"><Truck className="w-2.5 h-2.5" />{v.numero_suivi}</span>}
                      </div>
                      {v.lien_vente && (
                        <a href={v.lien_vente} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-sage/60 hover:text-sage flex items-center gap-1 mt-1 font-sans">
                          <ExternalLink className="w-3 h-3" />Voir l&apos;annonce
                        </a>
                      )}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
                        <span className="text-ink/40 font-sans">Qté : <strong className="font-mono text-ink">{v.qte_vendue}</strong></span>
                        <span className="text-ink/40 font-sans">Achat : <strong className="font-mono text-ink/70">{formatCurrency(pu)}</strong></span>
                        <span className="text-ink/40 font-sans">Vente : <strong className="font-mono text-ink/70">{formatCurrency(pv)}</strong></span>
                      </div>
                      <div className={`mt-2 pt-2 border-t border-border/20 flex justify-between items-center text-xs font-semibold ${isBenef ? 'text-sage' : 'text-terracotta'}`}>
                        <span className="font-sans">Bénéfice</span><span className="font-mono">{formatCurrency(benT)}</span>
                      </div>
                    </motion.div>
                  )
                })}
                {/* Total mobile */}
                <motion.div variants={itemAnim} className="glass-card rounded-2xl p-4 border-2 border-sage/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-ink/60 font-sans">Total lignes filtrées</span>
                    <span className={`font-mono font-bold text-lg ${totalBenefit >= 0 ? 'text-sage' : 'text-terracotta'}`}>{formatCurrency(totalBenefit)}</span>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </motion.div>
      </Layout>
    </AuthGuard>
  )
}

function VentesSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />
      <div className="glass-card rounded-2xl p-6"><Skeleton className="h-10 w-full mb-4" /><div className="grid grid-cols-2 gap-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div></div>
      <div className="glass-card rounded-2xl overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex items-center gap-4 px-4 py-3.5 ${i > 0 ? 'border-t border-border/20' : ''}`}>
            <Skeleton className="h-4 w-16" /><Skeleton className="h-4 flex-1" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-10" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
