import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { exportToCSV } from '../lib/csvExport'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import MagneticButton from '../components/MagneticButton'
import toast from 'react-hot-toast'
import { Plus, Search, Download, Trash2, Receipt, Package, Building2, ChevronDown, Truck, ExternalLink } from 'lucide-react'

const PLATES = ['Vinted','Leboncoin','Facebook Marketplace','TikTok Shop','Temu','Whatnot','Autre']
const PLATE_F = ['Toutes', ...PLATES]
const STATS = ['À expédier','Expédié','Livré','Litige/Retour','Annulé']
const STAT_F = ['Tous', ...STATS]
const STAT_CLR = {
  'À expédier': 'text-amber-400 border-amber-400/30 bg-amber-400/5',
  'Expédié': 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  'Livré': 'text-accent border-accent/30 bg-accent/5',
  'Litige/Retour': 'text-danger border-danger/30 bg-danger/5',
  'Annulé': 'text-ink-400 border-base-700 bg-base-800',
}
const EMPTY = {
  stock_id: '', produit: '', categorie: '', prix_achat_unitaire: '', prix_revente_unitaire: '',
  qte_vendue: 1, plateforme: 'Vinted', statut: 'À expédier', date_vente: '',
  numero_suivi: '', lien_vente: '', client_nom: '', client_prenom: '', client_adresse: '',
}
const CFMT = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
const TODAY = () => new Date().toISOString().split('T')[0]

function Skeleton({ className }) { return <div className={`bg-base-800 bg-shimmer bg-[length:200%_100%] animate-shimmer rounded-lg ${className}`} /> }

export default function VentesPage() {
  const router = useRouter()
  const [stock, setStock] = useState([])
  const [ventes, setVentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ ...EMPTY, date_vente: TODAY() })
  const [preselect, setPreselect] = useState(false)
  const [pf, setPf] = useState('Toutes')
  const [sf, setSf] = useState('Tous')
  const [d1, setD1] = useState('')
  const [d2, setD2] = useState('')
  const [sq, setSq] = useState('')
  const [openStat, setOpenStat] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenStat(null) }
    if (openStat) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openStat])

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const [sr, vr] = await Promise.all([
        supabase.from('revente_stock').select('*').order('produit'),
        supabase.from('revente_ventes').select('*').order('date_vente', { ascending: false }).limit(2000),
      ])
      if (sr.error) throw new Error(sr.error.message)
      if (vr.error) throw new Error(vr.error.message)
      setStock(sr.data ?? []); setVentes(vr.data ?? [])
    } catch (err) { console.error(err); toast.error('Erreur: ' + err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  useEffect(() => {
    if (!loading && router.query.produit && !preselect) {
      const item = stock.find(s => s.id === router.query.produit)
      if (item) setForm(f => ({ ...f, stock_id: router.query.produit, produit: item.produit, categorie: item.categorie, prix_achat_unitaire: item.prix_achat_unitaire, prix_revente_unitaire: item.prix_revente_unitaire }))
      setPreselect(true)
    }
  }, [loading, router.query.produit, stock, preselect])

  const handleProd = (id) => {
    if (!id) { setForm(f => ({ ...f, stock_id: '', produit: '', categorie: '', prix_achat_unitaire: '', prix_revente_unitaire: '' })); return }
    const item = stock.find(s => s.id === id)
    if (item) setForm(f => ({ ...f, stock_id: id, produit: item.produit, categorie: item.categorie, prix_achat_unitaire: item.prix_achat_unitaire, prix_revente_unitaire: item.prix_revente_unitaire }))
  }

  const selStock = stock.find(s => s.id === form.stock_id)
  const restQ = useMemo(() => {
    if (!selStock) return 0
    return selStock.qte_stock - ventes.filter(v => v.stock_id === form.stock_id).reduce((s, v) => s + v.qte_vendue, 0)
  }, [selStock, ventes, form.stock_id])
  const exceed = form.stock_id && Number(form.qte_vendue) > restQ

  const submit = async (e) => {
    e.preventDefault()
    try {
      // Construire le payload uniquement avec les colonnes garanties
      const payload = {
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
      }

      // Colonnes optionnelles (peuvent ne pas exister en base si les migrations
      // n'ont pas été exécutées) — les envoyer quand même, Supabase ignore
      // les colonnes inexistantes si on utilise un objet JS... en fait non.
      // On les envoie, si la colonne manque l'erreur sera claire.
      if (form.statut) payload.statut = form.statut
      if (form.numero_suivi) payload.numero_suivi = form.numero_suivi
      if (form.lien_vente) payload.lien_vente = form.lien_vente

      const { error } = await supabase.from('revente_ventes').insert([payload])
      if (error) throw new Error(error.message)
      toast.success('Vente enregistrée')
      setForm({ ...EMPTY, date_vente: TODAY() })
      setPreselect(false); await fetch()
    } catch (err) {
      console.error('Erreur insertion vente:', err)
      toast.error('Erreur: ' + err.message + ' — Vérifie que les colonnes statut, numero_suivi et lien_vente existent dans revente_ventes.')
    }
  }

  const updateStat = async (id, s) => {
    const { error } = await supabase.from('revente_ventes').update({ statut: s }).eq('id', id)
    if (error) { toast.error('Erreur'); return }
    toast.success(`Statut: ${s}`)
    setOpenStat(null)
    setVentes(p => p.map(v => v.id === id ? { ...v, statut: s } : v))
  }

  const delVente = async (id) => {
    const { error } = await supabase.from('revente_ventes').delete().eq('id', id)
    if (error) { toast.error('Erreur'); return }
    toast.success('Vente supprimée')
    await fetch()
  }

  const filtered = useMemo(() =>
    ventes.filter(v => {
      if (pf !== 'Toutes' && v.plateforme !== pf) return false
      if (sf !== 'Tous' && v.statut !== sf) return false
      if (d1 && v.date_vente < d1) return false
      if (d2 && v.date_vente > d2) return false
      if (sq.trim() && !v.produit.toLowerCase().includes(sq.toLowerCase())) return false
      return true
    }), [ventes, pf, sf, d1, d2, sq])

  const totalBen = useMemo(() =>
    filtered.reduce((s, v) => s + (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue, 0),
    [filtered])

  const csv = () => {
    const cols = [
      { key: 'date_vente', label: 'Date' }, { key: 'produit', label: 'Produit' },
      { key: 'categorie', label: 'Catégorie' }, { key: 'plateforme', label: 'Plateforme' },
      { key: 'statut', label: 'Statut' }, { key: 'numero_suivi', label: 'N° Suivi' },
      { key: 'lien_vente', label: 'Lien vente' }, { key: 'qte_vendue', label: 'Qté' },
      { key: 'prix_achat_unitaire', label: 'Achat', format: v => CFMT(v) },
      { key: 'prix_revente_unitaire', label: 'Vente', format: v => CFMT(v) },
      { key: 'benefice', label: 'Bénéfice', format: v => CFMT(v) },
      { key: 'client_prenom', label: 'Prénom' }, { key: 'client_nom', label: 'Nom' },
      { key: 'client_adresse', label: 'Adresse' },
    ]
    const data = filtered.map(v => ({ ...v, benefice: (Number.parseFloat(v.prix_revente_unitaire) - Number.parseFloat(v.prix_achat_unitaire)) * v.qte_vendue }))
    exportToCSV({ data, filename: 'ventes.csv', columns: cols })
    toast.success('Export téléchargé')
  }

  if (loading) return <AuthGuard><Layout><VentesSkeleton /></Layout></AuthGuard>

  return (
    <AuthGuard>
      <Layout>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-accent rounded-full" />
            <h1 className="font-mono text-base tracking-wider uppercase text-ink-50 font-semibold">Ventes</h1>
          </div>

          {/* Formulaire */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="card-dash p-4 sm:p-6 mb-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center"><Plus className="w-3.5 h-3.5 text-accent" /></div>
              <h2 className="text-sm font-semibold text-ink-50 font-sans">Nouvelle vente</h2>
            </div>
            <form onSubmit={submit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-4">
                  <p className="section-label">Produit & vente</p>
                  <div>
                    <label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Produit</label>
                    <select value={form.stock_id} onChange={e => handleProd(e.target.value)} className="input-field w-full">
                      <option value="">— Sélectionner —</option>
                      {stock.map(item => <option key={item.id} value={item.id}>{item.produit}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Achat unitaire (€)</label>
                      <input type="number" step="0.01" min="0" required value={form.prix_achat_unitaire} onChange={e => setForm(f => ({ ...f, prix_achat_unitaire: e.target.value }))} className="input-field w-full font-mono" /></div>
                    <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Vente unitaire (€)</label>
                      <input type="number" step="0.01" min="0" required value={form.prix_revente_unitaire} onChange={e => setForm(f => ({ ...f, prix_revente_unitaire: e.target.value }))} className="input-field w-full font-mono" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Quantité</label>
                      <input type="number" min="1" required value={form.qte_vendue} onChange={e => setForm(f => ({ ...f, qte_vendue: e.target.value }))} className="input-field w-full font-mono" />
                      {exceed && <p className="text-xs text-danger mt-1">⚠ {restQ} restant(s)</p>}
                    </div>
                    <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Plateforme</label>
                      <select value={form.plateforme} onChange={e => setForm(f => ({ ...f, plateforme: e.target.value }))} className="input-field w-full">
                        {PLATES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Statut</label>
                      <select value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))} className="input-field w-full">
                        {STATS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Date</label>
                      <input type="date" required value={form.date_vente} onChange={e => setForm(f => ({ ...f, date_vente: e.target.value }))} className="input-field w-full" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-ink-400 mb-1 flex items-center gap-1 font-sans"><Truck className="w-3 h-3" />Suivi <span className="text-ink-400/40">(opt.)</span></label>
                      <input type="text" value={form.numero_suivi} onChange={e => setForm(f => ({ ...f, numero_suivi: e.target.value }))} className="input-field w-full font-mono" placeholder="COL123" />
                    </div>
                    <div><label className="block text-xs font-medium text-ink-400 mb-1 flex items-center gap-1 font-sans"><ExternalLink className="w-3 h-3" />Lien <span className="text-ink-400/40">(opt.)</span></label>
                      <input type="url" value={form.lien_vente} onChange={e => setForm(f => ({ ...f, lien_vente: e.target.value }))} className="input-field w-full" placeholder="https://..." />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="section-label">Client <span className="text-ink-400/40 normal-case">(opt.)</span></p>
                  <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Prénom</label>
                    <input type="text" value={form.client_prenom} onChange={e => setForm(f => ({ ...f, client_prenom: e.target.value }))} className="input-field w-full" placeholder="Jean" /></div>
                  <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Nom</label>
                    <input type="text" value={form.client_nom} onChange={e => setForm(f => ({ ...f, client_nom: e.target.value }))} className="input-field w-full" placeholder="Dupont" /></div>
                  <div><label className="block text-xs font-medium text-ink-400 mb-1 font-sans">Adresse</label>
                    <input type="text" value={form.client_adresse} onChange={e => setForm(f => ({ ...f, client_adresse: e.target.value }))} className="input-field w-full" placeholder="12 rue de Paris" /></div>
                  <div className="pt-2"><MagneticButton as="button" type="submit" className="btn-primary w-full justify-center">Enregistrer</MagneticButton></div>
                </div>
              </div>
            </form>
          </motion.div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-4 items-end">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400/30" />
              <input value={sq} onChange={e => setSq(e.target.value)} placeholder="Rechercher…" className="input-field w-full pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={pf} onChange={e => setPf(e.target.value)} className="input-field text-xs px-3 py-2">{PLATE_F.map(p => <option key={p} value={p}>{p}</option>)}</select>
              <select value={sf} onChange={e => setSf(e.target.value)} className="input-field text-xs px-3 py-2">{STAT_F.map(s => <option key={s} value={s}>{s}</option>)}</select>
              <input type="date" value={d1} onChange={e => setD1(e.target.value)} className="input-field text-xs px-3 py-2" />
              <input type="date" value={d2} onChange={e => setD2(e.target.value)} className="input-field text-xs px-3 py-2" />
            </div>
            <MagneticButton as="button" onClick={csv} disabled={filtered.length === 0} className="btn-primary text-xs gap-2 disabled:opacity-40">
              <Download className="w-3.5 h-3.5" /> CSV
            </MagneticButton>
          </div>

          {filtered.length === 0 ? (
            <div className="card-dash p-12 text-center">
              <Receipt className="w-10 h-10 text-ink-400/20 mx-auto mb-3" />
              <p className="text-sm text-ink-400/60">Aucune vente trouvée</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block card-dash overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-base-700 bg-base-900/50">
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Date</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Produit</th>
                      <th className="text-center px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Statut</th>
                      <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Plateforme</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Qté</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Achat</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Vente</th>
                      <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Bénéfice</th>
                      <th className="text-center px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base-700/50">
                    <AnimatePresence mode="popLayout">
                      {filtered.map((v, idx) => {
                        const pu = Number(v.prix_achat_unitaire), pv = Number(v.prix_revente_unitaire)
                        const bt = (pv - pu) * v.qte_vendue, isB = bt >= 0
                        const st = v.statut || 'À expédier'
                        return (
                          <motion.tr key={v.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.2, delay: idx * 0.02 }} className="hover:bg-base-800/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-xs text-ink-400 whitespace-nowrap">{v.date_vente}</td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-ink-50">{v.produit}</span>
                              {v.numero_suivi && <span className="ml-2 text-[10px] text-ink-400/50 bg-base-800 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><Truck className="w-2.5 h-2.5" />{v.numero_suivi}</span>}
                              {v.lien_vente && <a href={v.lien_vente} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-accent/60 hover:text-accent mt-0.5 flex items-center gap-0.5"><ExternalLink className="w-2.5 h-2.5" />Annonce</a>}
                            </td>
                            <td className="px-4 py-3 text-center relative">
                              <div ref={openStat === v.id ? menuRef : null}>
                                <button onClick={() => setOpenStat(openStat === v.id ? null : v.id)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STAT_CLR[st] || 'text-ink-400 border-base-700 bg-base-800'}`}>
                                  {st}<ChevronDown className="w-3 h-3" />
                                </button>
                                {openStat === v.id && (
                                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 card-dash shadow-lg py-1 min-w-[120px]" onClick={e => e.stopPropagation()}>
                                    {STATS.map(s => (
                                      <button key={s} onClick={() => updateStat(v.id, s)}
                                        className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-base-800 ${s === st ? 'font-bold text-accent' : 'text-ink-400'}`}>{s}</button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-ink-400">{v.plateforme}</td>
                            <td className="px-4 py-3 text-right font-mono text-ink-400">{v.qte_vendue}</td>
                            <td className="px-4 py-3 text-right font-mono text-ink-400">{CFMT(pu)}</td>
                            <td className="px-4 py-3 text-right font-mono text-ink-400">{CFMT(pv)}</td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${isB ? 'text-accent' : 'text-danger'}`}>{CFMT(bt)}</td>
                            <td className="px-4 py-3 text-center">
                              <button onClick={() => delVente(v.id)} className="p-1.5 rounded-lg text-ink-400 hover:text-danger hover:bg-base-800 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </AnimatePresence>
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-base-700 bg-base-900/50">
                      <td colSpan={7} className="px-4 py-3 text-right text-xs text-ink-400">Total lignes filtrées</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${totalBen >= 0 ? 'text-accent' : 'text-danger'}`}>{CFMT(totalBen)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-3">
                <AnimatePresence mode="popLayout">
                  {filtered.map(v => {
                    const pu = Number(v.prix_achat_unitaire), pv = Number(v.prix_revente_unitaire)
                    const bt = (pv - pu) * v.qte_vendue, isB = bt >= 0
                    const st = v.statut || 'À expédier'
                    return (
                      <motion.div key={v.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="card-dash p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-ink-50 text-sm">{v.produit}</p>
                          <button onClick={() => delVente(v.id)} className="p-1 text-ink-400 hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5 font-mono">{v.date_vente}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STAT_CLR[st] || 'text-ink-400 border-base-700 bg-base-800'}`}>{st}</span>
                          <span className="text-xs text-ink-400">{v.plateforme}</span>
                          {v.numero_suivi && <span className="text-[10px] text-ink-400/50 flex items-center gap-0.5"><Truck className="w-2.5 h-2.5" />{v.numero_suivi}</span>}
                        </div>
                        {v.lien_vente && <a href={v.lien_vente} target="_blank" rel="noopener noreferrer" className="text-xs text-accent/60 hover:text-accent flex items-center gap-1 mt-1"><ExternalLink className="w-3 h-3" />Annonce</a>}
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          <span className="text-ink-400">Qté: <strong className="font-mono text-ink-50">{v.qte_vendue}</strong></span>
                          <span className="text-ink-400">Achat: <strong className="font-mono text-ink-400">{CFMT(pu)}</strong></span>
                          <span className="text-ink-400">Vente: <strong className="font-mono text-ink-400">{CFMT(pv)}</strong></span>
                        </div>
                        <div className={`mt-2 pt-2 border-t border-base-700 flex justify-between text-xs font-bold ${isB ? 'text-accent' : 'text-danger'}`}>
                          <span>Bénéfice</span><span className="font-mono">{CFMT(bt)}</span>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
                <div className="card-dash p-4 border border-accent/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-ink-400">Total</span>
                    <span className={`font-mono font-bold text-lg ${totalBen >= 0 ? 'text-accent' : 'text-danger'}`}>{CFMT(totalBen)}</span>
                  </div>
                </div>
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
    <div className="space-y-4">
      <div className="card-dash p-6 space-y-4">
        <div className="h-5 w-40 bg-base-800 rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-base-800 rounded animate-pulse" />)}</div>
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 bg-base-800 rounded animate-pulse" />)}</div>
        </div>
      </div>
      <div className="card-dash p-4 space-y-3">
        {[1,2,3].map(i => <div key={i} className="h-12 bg-base-800 rounded animate-pulse" />)}
      </div>
    </div>
  )
}
