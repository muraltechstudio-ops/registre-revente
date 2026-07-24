import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import StockModal from '../components/StockModal'
import CountUp from '../components/CountUp'
import MagneticButton from '../components/MagneticButton'
import toast from 'react-hot-toast'
import { Package, Plus, Search, ShoppingCart, Pencil, Trash2, AlertTriangle, Box, Check, X, CalendarDays, Download } from 'lucide-react'

const CATS = ['Informatique','Mode','Bijoux','Moto','Papeterie/Bureau','Hygiène/Beauté','Stock existant','Autre']
const SUGGESTIONS_MARCHE = ['Vinted', 'Leboncoin', 'Leboncoin Pro', 'Vinted Pro', 'Facebook Marketplace', 'TikTok Shop', 'Vestiaire Collective', 'Joli Closet', 'Whatnot']
const CFMT = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
const LOW = 3

const STOCK_EDITABLE = [
  'produit', 'categorie', 'prix_achat_unitaire', 'qte_stock', 'prix_revente_unitaire',
  'plateforme_conseillee', 'date_reception', 'total_recu', 'photo_url',
]

const stripComputed = (obj) => {
  const clean = {}
  for (const key of STOCK_EDITABLE) {
    if (key in obj) clean[key] = obj[key]
  }
  return clean
}

const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

/* ──── Skeleton ──── */
function Skeleton({ className }) {
  return <div className={`bg-base-800 bg-shimmer bg-[length:200%_100%] animate-shimmer rounded-lg ${className}`} />
}

/* ──── Jours badge — avec fallback via created_at ──── */
function JoursBadge({ jours, created_at }) {
  let j = jours
  // Fallback client si la BDD ne renvoie pas jours_en_stock
  if ((j === null || j === undefined) && created_at) {
    const created = new Date(created_at)
    const now = new Date()
    j = Math.floor((now - created) / (1000 * 60 * 60 * 24))
  }
  if (j === null || j === undefined) {
    return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-base-800 text-ink-400/50">—</span>
  }
  if (j <= 15) {
    return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-base-800 text-ink-400">{j} jours</span>
  }
  if (j <= 45) {
    return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20">{j} jours</span>
  }
  return <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-danger/10 text-danger border border-danger/20">{j} jours — à écouler</span>
}

export default function StockPage() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(null)
  const [showEcart, setShowEcart] = useState(false)
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)

  /* ──── Édition inline marketplace ──── */
  const [editingId, setEditingId] = useState(null)
  const [editVal, setEditVal] = useState('')

  /* ──── Édition inline date réception ──── */
  const [dateEditingId, setDateEditingId] = useState(null)
  const [dateEditVal, setDateEditVal] = useState('')

  /* ──── Édition inline total_recu ──── */
  const [recuEditingId, setRecuEditingId] = useState(null)
  const [recuEditVal, setRecuEditVal] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await supabase.from('revente_stock_summary').select('*').order('produit')
      if (r.error) throw new Error(r.error.message)
      let photos = []
      try { const p = await supabase.from('revente_stock').select('id, photo_url'); if (!p.error) photos = p.data ?? [] } catch {}
      setItems((r.data ?? []).map(i => ({
        ...i,
        photo_url: photos.find(p => p.id === i.id)?.photo_url ?? null,
        cout_total_lot: i.cout_total_lot ?? (Number(i.prix_achat_unitaire) * Number(i.qte_stock)),
      })))
    } catch (err) { console.error(err); setError(err.message); toast.error('Erreur: ' + err.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  /* ──── Rafraîchir au retour de la page Ventes ──── */
  useEffect(() => {
    const handleRouteChange = () => { fetch() }
    router.events?.on('routeChangeComplete', handleRouteChange)
    return () => router.events?.off('routeChangeComplete', handleRouteChange)
  }, [router.events, fetch])

  const filtered = useMemo(() => {
    let r = items
    if (cat) r = r.filter(i => i.categorie === cat)
    if (showEcart) r = r.filter(i => i.ecart_reception !== null && i.ecart_reception !== undefined && Number(i.ecart_reception) !== 0)
    if (q.trim()) { const s = q.toLowerCase(); r = r.filter(i => i.produit.toLowerCase().includes(s)) }
    return r
  }, [items, cat, q, showEcart])

  const totals = useMemo(() => ({
    coutTotal: filtered.reduce((s, i) => s + Number(i.cout_total_lot ?? 0), 0),
    totalVente: filtered.reduce((s, i) => s + Number(i.valeur_stock_restant ?? 0), 0),
    profit: filtered.reduce((s, i) => s + Number(i.profit_potentiel ?? 0), 0),
    totalRecu: filtered.reduce((s, i) => s + (i.total_recu !== null && i.total_recu !== undefined ? Number(i.total_recu) : 0), 0),
    qteStock: filtered.reduce((s, i) => s + Number(i.qte_stock ?? 0), 0),
    qteVendue: filtered.reduce((s, i) => s + Number(i.qte_vendue ?? 0), 0),
    qteRestante: filtered.reduce((s, i) => s + Number(i.qte_restante ?? 0), 0),
  }), [filtered])

  const metrics = useMemo(() => ({
    val: items.reduce((s, i) => s + Number(i.valeur_stock_restant ?? 0), 0),
    qty: items.reduce((s, i) => s + Number(i.qte_stock ?? 0), 0),
    rest: items.reduce((s, i) => s + Number(i.qte_restante ?? 0), 0),
    coutTotal: items.reduce((s, i) => s + Number(i.cout_total_lot ?? 0), 0),
  }), [items])

  const addItem = async (fd) => {
    const cleaned = stripComputed(fd)
    const { error } = await supabase.from('revente_stock').insert([cleaned])
    if (error) throw error
    toast.success('Article ajouté')
    await fetch()
  }

  const editItem = async (fd) => {
    const cleaned = stripComputed(fd)
    const { error } = await supabase.from('revente_stock').update(cleaned).eq('id', edit.id)
    if (error) throw error
    toast.success('Article modifié')
    await fetch()
  }

  const removeItem = async (id) => {
    const { error } = await supabase.from('revente_stock').delete().eq('id', id)
    if (error) { toast.error('Erreur'); return }
    toast.success('Article supprimé')
    setDel(null); await fetch()
  }

  /* ──── Sauvegarde inline marketplace ──── */
  const savePlateforme = async (id) => {
    const val = editVal.trim()
    if (!val) { setEditingId(null); return }
    const { error } = await supabase.from('revente_stock').update({ plateforme_conseillee: val }).eq('id', id)
    if (error) { toast.error('Erreur'); return }
    toast.success(`Marketplace: ${val}`)
    setItems(prev => prev.map(i => i.id === id ? { ...i, plateforme_conseillee: val } : i))
    setEditingId(null)
  }

  const startEdit = (item) => {
    setEditingId(item.id); setEditVal(item.plateforme_conseillee || '')
    setTimeout(() => {
      const el = document.getElementById(`plat-input-${item.id}`)
      if (el) { el.focus(); el.select() }
    }, 50)
  }

  const cancelEdit = () => { setEditingId(null); setEditVal('') }

  /* ──── Sauvegarde inline date réception ──── */
  const saveDate = async (id) => {
    const val = dateEditVal || null
    const { error } = await supabase.from('revente_stock').update({ date_reception: val }).eq('id', id)
    if (error) { toast.error('Erreur'); return }
    toast.success('Date mise à jour')
    setDateEditingId(null)
    setItems(prev => prev.map(i => i.id === id ? { ...i, date_reception: val } : i))
  }

  const startDateEdit = (item) => {
    setDateEditingId(item.id); setDateEditVal(item.date_reception || '')
    setTimeout(() => {
      const el = document.getElementById(`date-input-${item.id}`)
      if (el) { el.focus(); el.select() }
    }, 50)
  }

  const cancelDateEdit = () => { setDateEditingId(null); setDateEditVal('') }

  /* ──── Sauvegarde inline total_recu ──── */
  const saveTotalRecu = async (id) => {
    const raw = recuEditVal.trim()
    const val = raw === '' || raw === '-' ? null : parseInt(raw, 10)
    if (isNaN(val) && raw !== '' && raw !== '-') {
      toast.error('Veuillez entrer un nombre valide')
      return
    }
    const { error } = await supabase.from('revente_stock').update({ total_recu: val }).eq('id', id)
    if (error) { toast.error("Erreur lors de l'enregistrement"); return }
    toast.success(val !== null ? `Total reçu: ${val}` : 'Total reçu effacé')
    setRecuEditingId(null)
    setItems(prev => prev.map(i =>
      i.id === id
        ? { ...i, total_recu: val, ecart_reception: val !== null ? val - Number(i.qte_stock) : null }
        : i
    ))
  }

  const startRecuEdit = (item) => {
    setRecuEditingId(item.id)
    setRecuEditVal(item.total_recu !== null && item.total_recu !== undefined ? String(item.total_recu) : '')
    setTimeout(() => {
      const el = document.getElementById(`recu-input-${item.id}`)
      if (el) { el.focus(); el.select() }
    }, 50)
  }

  const cancelRecuEdit = () => { setRecuEditingId(null); setRecuEditVal('') }

  const ecartCount = useMemo(() => items.filter(i => i.ecart_reception !== null && i.ecart_reception !== undefined && Number(i.ecart_reception) !== 0).length, [items])

  return (
    <AuthGuard>
      <Layout>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-accent rounded-full" />
              <h1 className="font-mono text-base tracking-wider uppercase text-ink-50 font-semibold">Stock</h1>
            </div>
            <span className="font-mono text-xs text-ink-400">{items.length} article(s)</span>
          </div>

          {loading ? <StockSkeleton /> : error ? (
            <div className="card-dash p-8 text-center mt-6">
              <AlertTriangle className="w-10 h-10 text-danger mx-auto mb-3" />
              <p className="text-sm text-danger font-medium">Erreur de chargement</p>
              <p className="text-xs text-ink-400 mt-1">{error}</p>
              <button onClick={fetch} className="btn-primary mt-4">Réessayer</button>
            </div>
          ) : (
            <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show" className="mt-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Valeur stock', value: metrics.val, fmt: true },
                  { label: 'En stock', value: metrics.qty },
                  { label: 'Restant', value: metrics.rest },
                  { label: 'Coût total lots', value: metrics.coutTotal, fmt: true },
                ].map((kpi, i) => (
                  <motion.div key={i} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { delay: i * 0.05 } } }}
                    className="card-dash p-4">
                    <p className="section-label mb-1">{kpi.label}</p>
                    <p className="kpi-value text-2xl text-ink-50">
                      {kpi.fmt ? <><span className="text-sm text-ink-400 mr-1">€</span><CountUp end={kpi.value} decimals={2} /></> : <CountUp end={kpi.value} />}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Search + add */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400/30" />
                  <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…" className="input-field w-full pl-10" />
                </div>
                <MagneticButton as="button" onClick={() => { setEdit(null); setModal(true) }} className="btn-primary shrink-0 gap-2">
                  <Plus className="w-4 h-4" /> Ajouter
                </MagneticButton>
                <button onClick={() => {
                  const blob = new Blob([JSON.stringify(items, null, 2)], {type:'application/json'})
                  const url = URL.createObjectURL(blob); const a = document.createElement('a')
                  a.href = url; a.download = 'registre_stock.json'; a.click(); URL.revokeObjectURL(url)
                }} className="bg-base-800 text-ink-400 hover:text-ink-50 hover:bg-base-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 inline-flex items-center gap-2">
                  <Download className="w-4 h-4" /> Export
                </button>
                <button id="btn-recalcul" onClick={async () => {
                  const majPrix = [
                    // Lot 279: 25 maillots — adj 11€ → total 16.97€/25 = 0.68€/u
                    {nom:'25 maillots', pu:0.68, qte:25, cat:'Mode'},
                    // Lot 138: 90 bas maillots — adj 20€ → total 30.86€/90 = 0.34€/u
                    {nom:'90 bas de maillots', pu:0.34, qte:90, cat:'Mode'},
                    // Lot 172: 25 bracelets Œil de Tigre — adj 17€ → total 26.23€/25 = 1.05€/u
                    {nom:'bracelets', pu:1.05, qte:25, cat:'Bijoux'},
                    // Lot 123: 20 hauts Esprit — adj 20€ → total 30.86€/20 = 1.54€/u
                    {nom:'20 hauts', pu:1.54, qte:20, cat:'Mode'},
                    // Lot 343: DXR TANNER S — adj 41€ → total 63.26€/1
                    {nom:'DXR TANNER', pu:63.26, qte:1, cat:'Moto'},
                    // Lot 345: DXR ADAN S — adj 36€ → total 55.55€/1
                    {nom:'DXR ADAN', pu:55.55, qte:1, cat:'Moto'},
                    // Lot 118: 35 hauts maillots Esprit — adj 20€ → total 30.86€/35 = 0.88€/u
                    {nom:'35 hauts de maillots', pu:0.88, qte:35, cat:'Mode'},
                    // Lot 117: 26 bas maillots Esprit — adj 20€ → total 30.86€/26 = 1.19€/u
                    {nom:'26 bas de maillots', pu:1.19, qte:26, cat:'Mode'},
                    // Lot 137: 50 hauts maillots — adj 20€ → total 30.86€/50 = 0.62€/u
                    {nom:'50 hauts de maillots', pu:0.62, qte:50, cat:'Mode'},
                    // Lot 286: 40 colliers — adj 20€ → total 30.86€/40 = 0.77€/u
                    {nom:'colliers', pu:0.77, qte:40, cat:'Bijoux'},
                    // Lot 278: 10 pyjamas Lulu Castagnette — adj 15€ → total 23.15€/10 = 2.31€/u
                    {nom:'pyjamas', pu:2.31, qte:10, cat:'Mode'},
                    // Lot 348: DXR TANNER S (bis) — adj 41€ → total 63.26€/1
                    {nom:'DXR Tanner', pu:63.26, qte:1, cat:'Moto'},
                    // Lot 340: Richa DAYTONA 2 — adj 46€ → total 70.98€/1
                    {nom:'Richa', pu:70.98, qte:1, cat:'Moto'},
                    // Lot 341: DXR ROADTRIP WOMAN 34 — adj 22€ → total 33.95€/1
                    {nom:'ROADTRIP WOMAN', pu:33.95, qte:1, cat:'Moto'},
                    // Lot 136: 18 rideaux — adj 21€ → total 32.40€/18 = 1.80€/u
                    {nom:'rideaux', pu:1.80, qte:18, cat:'Autre'},
                    // Lot 124: 14 jupes Esprit — adj 20€ → total 30.86€/14 = 2.20€/u
                    {nom:'jupes', pu:2.20, qte:14, cat:'Mode'},
                    // Lot 349: Pharao Cedar Waterproof M — adj 39€ → total 60.18€/1
                    {nom:'Pharao', pu:60.18, qte:1, cat:'Moto'},
                    // Lot extra: 31 bas maillots restants — adj inclus dans le 90
                    {nom:'31 bas maillots', pu:0.34, qte:31, cat:'Mode'},
                    // Lot extra: 85 bikinis 2 pièces
                    {nom:'85 bikinis', pu:1.16, qte:85, cat:'Mode'},
                  ]
                  let ok = 0, fails = []
                  for (const m of majPrix) {
                    const item = items.find(i => i.produit.toLowerCase().includes(m.nom) || i.produit.toLowerCase().includes(m.nom.replace(/^\d+\s/,'')))
                    if (!item) { fails.push(m.nom); continue }
                    const {error} = await supabase.from('revente_stock').update({
                      prix_achat_unitaire: m.pu, qte_stock: m.qte, categorie: m.cat
                    }).eq('id', item.id)
                    if (error) fails.push(m.nom + ' ' + error.message)
                    else ok++
                  }
                  alert(ok + ' articles mis à jour' + (fails.length ? '\nÉchecs: ' + fails.join(', ') : ''))
                  await fetch()
                }} className="bg-danger/10 text-danger hover:bg-danger/20 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 inline-flex items-center gap-2">
                  Recalculer coûts réels
                </button>
              </div>

              {/* Chips + filtres */}
              <div className="flex flex-wrap gap-2 mb-5">
                <button onClick={() => setCat(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!cat ? 'bg-accent text-base-950 border-accent' : 'bg-base-800 text-ink-400 border-base-700 hover:border-accent/40'}`}>Tout</button>
                {CATS.map(c => (
                  <button key={c} onClick={() => setCat(cat === c ? null : c)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${cat === c ? 'bg-accent text-base-950 border-accent' : 'bg-base-800 text-ink-400 border-base-700 hover:border-accent/40'}`}>{c}</button>
                ))}
                <button onClick={() => setShowEcart(!showEcart)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showEcart ? 'bg-danger text-base-950 border-danger' : 'bg-base-800 text-ink-400 border-base-700 hover:border-danger/40 hover:text-danger'}`}>
                  Écarts détectés {ecartCount > 0 && <span className="ml-1 font-mono">({ecartCount})</span>}
                </button>
              </div>

              {/* Empty state */}
              {filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-dash p-12 text-center">
                  <Box className="w-10 h-10 text-ink-400/20 mx-auto mb-3" />
                  <p className="text-base font-medium text-ink-400/60">
                    {showEcart ? 'Aucun écart détecté ! ✓' : q || cat ? 'Aucun résultat' : 'Le stock est vide'}
                  </p>
                  {!q && !cat && !showEcart && <button onClick={() => { setEdit(null); setModal(true) }} className="btn-primary mt-5 inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Premier article</button>}
                </motion.div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto card-dash">
                    <table className="min-w-[1350px] w-full text-sm">
                      <thead>
                        <tr className="border-b border-base-700 bg-base-900/50">
                          <th className="text-left px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium min-w-[120px]">Produit</th>
                          <th className="text-center px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[80px]">Total reçu</th>
                          <th className="text-center px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[80px]">Réception</th>
                          <th className="text-center px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[110px]">En stock depuis</th>
                          <th className="text-right px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[90px]">Coût unitaire</th>
                          <th className="text-right px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[90px]">Coût total lot</th>
                          <th className="text-center px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[85px]">Stock</th>
                          <th className="text-right px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[80px]">Vente</th>
                          <th className="text-right px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[80px]">Valeur</th>
                          <th className="text-right px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[80px]">Profit</th>
                          <th className="text-center px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[100px]">Marketplace</th>
                          <th className="text-center px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium w-[80px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-700/50">
                        <AnimatePresence mode="popLayout">
                          {filtered.map((item, idx) => {
                            const isLow = item.qte_restante <= LOW
                            const coutLot = item.cout_total_lot ?? (Number(item.prix_achat_unitaire) * Number(item.qte_stock))
                            const profit = Number(item.profit_potentiel ?? 0)
                            const isProfitPos = profit >= 0
                            const isEditing = editingId === item.id
                            const isDateEditing = dateEditingId === item.id
                            const isRecuEditing = recuEditingId === item.id
                            const ecart = item.ecart_reception !== null && item.ecart_reception !== undefined ? Number(item.ecart_reception) : null
                            const totalRecu = item.total_recu !== null && item.total_recu !== undefined ? Number(item.total_recu) : null
                            return (
                              <motion.tr key={item.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2, delay: idx * 0.02 }} className="hover:bg-base-800/50 transition-colors">
                                <td className="px-3 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-medium text-ink-50 truncate">{item.produit}</span>
                                    {item.categorie && <span className="badge-cat shrink-0">{item.categorie}</span>}
                                    {isLow && (
                                      <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="badge-low inline-flex items-center gap-0.5 shrink-0">
                                        <AlertTriangle className="w-2.5 h-2.5" />Faible
                                      </motion.span>
                                    )}
                                  </div>
                                </td>
                                {/* Total reçu */}
                                <td className="px-3 py-3 text-center">
                                  {isRecuEditing ? (
                                    <div className="flex items-center justify-center gap-0.5">
                                      <input id={`recu-input-${item.id}`} type="number" min="0" value={recuEditVal}
                                        onChange={e => setRecuEditVal(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveTotalRecu(item.id); if (e.key === 'Escape') cancelRecuEdit() }}
                                        onBlur={() => saveTotalRecu(item.id)}
                                        className="w-16 bg-base-800 border border-accent/50 rounded px-2 py-1 text-xs text-ink-50 font-mono text-center outline-none" autoFocus />
                                    </div>
                                  ) : (
                                    <div className="inline-flex flex-col items-center gap-0.5">
                                      <button onClick={() => startRecuEdit(item)} className="text-xs font-mono text-ink-400 hover:text-accent transition-all cursor-pointer border-b border-dotted border-ink-400/30 hover:border-accent/50">
                                        {totalRecu !== null ? totalRecu : '—'}
                                      </button>
                                      {ecart !== null && (
                                        ecart === 0 ? (
                                          <span className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                            <Check className="w-2.5 h-2.5" />Conforme
                                          </span>
                                        ) : ecart > 0 ? (
                                          <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded-full border border-amber-400/20">
                                            +{ecart} reçu en plus
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-medium text-danger bg-danger/10 px-1.5 py-0.5 rounded-full border border-danger/20">
                                            {Math.abs(ecart)} manquant(s)
                                          </span>
                                        )
                                      )}
                                    </div>
                                  )}
                                </td>
                                {/* Réception */}
                                <td className="px-3 py-3 text-center">
                                  {isDateEditing ? (
                                    <div className="flex items-center justify-center gap-0.5">
                                      <input id={`date-input-${item.id}`} type="date" value={dateEditVal}
                                        onChange={e => setDateEditVal(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveDate(item.id); if (e.key === 'Escape') cancelDateEdit() }}
                                        onBlur={() => saveDate(item.id)}
                                        className="w-28 bg-base-800 border border-accent/50 rounded px-2 py-1 text-xs text-ink-50 outline-none" />
                                    </div>
                                  ) : (
                                    <button onClick={() => startDateEdit(item)} className="inline-flex items-center gap-1 text-xs text-ink-400 hover:text-accent transition-all group">
                                      <span>{fmtDate(item.date_reception)}</span>
                                      <CalendarDays className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                  )}
                                </td>
                                {/* En stock depuis — avec fallback created_at */}
                                <td className="px-3 py-3 text-center"><JoursBadge jours={item.jours_en_stock} created_at={item.created_at} /></td>
                                <td className="px-3 py-3 text-right font-mono text-ink-400 whitespace-nowrap">{CFMT(item.prix_achat_unitaire)}</td>
                                <td className="px-3 py-3 text-right font-mono font-semibold text-ink-50 whitespace-nowrap">{CFMT(coutLot)}</td>
                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                  <span className={`font-mono font-semibold ${isLow ? 'text-danger' : 'text-accent'}`}>{item.qte_restante}</span>
                                  <span className="font-mono text-ink-400/40 text-[11px]"> /{item.qte_stock}</span>
                                </td>
                                <td className="px-3 py-3 text-right font-mono text-ink-400 whitespace-nowrap">{CFMT(item.prix_revente_unitaire)}</td>
                                <td className="px-3 py-3 text-right font-mono font-bold text-accent whitespace-nowrap">{CFMT(item.valeur_stock_restant)}</td>
                                <td className={`px-3 py-3 text-right font-mono font-bold whitespace-nowrap ${isProfitPos ? 'text-accent' : 'text-danger'}`}>{CFMT(profit)}</td>
                                {/* Marketplace */}
                                <td className="px-3 py-3 text-center">
                                  {isEditing ? (
                                    <div className="flex items-center justify-center gap-0.5">
                                      <input id={`plat-input-${item.id}`} list="plat-suggestions" value={editVal}
                                        onChange={e => setEditVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') savePlateforme(item.id); if (e.key === 'Escape') cancelEdit() }}
                                        onBlur={() => savePlateforme(item.id)}
                                        className="w-24 bg-base-800 border border-accent/50 rounded px-2 py-1 text-xs text-ink-50 font-sans outline-none" placeholder="Plateforme…" />
                                      <datalist id="plat-suggestions">{SUGGESTIONS_MARCHE.map(s => <option key={s} value={s} />)}</datalist>
                                    </div>
                                  ) : (
                                    <button onClick={() => startEdit(item)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-ink-400 hover:text-accent hover:bg-base-800 transition-all group">
                                      <span className="truncate max-w-[80px]">{item.plateforme_conseillee || '–'}</span>
                                      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </button>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-center">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button onClick={() => router.push(`/ventes?produit=${item.id}`)} className="p-1.5 rounded-lg text-ink-400 hover:text-accent hover:bg-base-800 transition-all" title="Vendre"><ShoppingCart className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => { setEdit(item); setModal(true) }} className="p-1.5 rounded-lg text-ink-400 hover:text-accent hover:bg-base-800 transition-all" title="Modifier"><Pencil className="w-3.5 h-3.5" /></button>
                                    <button onClick={() => setDel(item)} className="p-1.5 rounded-lg text-ink-400 hover:text-danger hover:bg-base-800 transition-all" title="Supprimer"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                                </td>
                              </motion.tr>
                            )
                          })}
                        </AnimatePresence>
                      </tbody>
                      {/* Totaux */}
                      <tfoot>
                        <tr className="border-t-2 border-accent/30 bg-base-900/80">
                          <td className="px-3 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Totaux</td>
                          <td><CountUp end={totals.totalRecu} decimals={0} /></td>
                          <td className="text-center text-xs text-ink-400/40 font-sans">—</td>
                          <td className="text-center text-xs text-ink-400/40 font-sans">—</td>
                          <td className="text-right text-xs text-ink-400/40 font-sans">—</td>
                          <td className="text-right font-mono font-bold text-ink-50"><CountUp end={totals.coutTotal} decimals={2} prefix="€" /></td>
                          <td className="text-center font-mono font-bold text-ink-50">{totals.qteRestante}<span className="font-mono text-ink-400/40 text-[11px]"> /{totals.qteStock}</span></td>
                          <td className="text-right text-xs text-ink-400/40 font-sans">—</td>
                          <td className="text-right font-mono font-bold text-accent"><CountUp end={totals.totalVente} decimals={2} prefix="€" /></td>
                          <td className={`text-right font-mono font-bold ${totals.profit >= 0 ? 'text-accent' : 'text-danger'}`}><CountUp end={totals.profit} decimals={2} prefix="€" /></td>
                          <td className="text-center text-xs text-ink-400/40 font-sans">—</td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-3">
                    <AnimatePresence mode="popLayout">
                      {filtered.map(item => {
                        const isLow = item.qte_restante <= LOW
                        const coutLot = item.cout_total_lot ?? (Number(item.prix_achat_unitaire) * Number(item.qte_stock))
                        const profit = Number(item.profit_potentiel ?? 0)
                        const isProfitPos = profit >= 0
                        const ecart = item.ecart_reception !== null && item.ecart_reception !== undefined ? Number(item.ecart_reception) : null
                        const totalRecu = item.total_recu !== null && item.total_recu !== undefined ? Number(item.total_recu) : null
                        let ecartBadge = null
                        if (ecart !== null) {
                          if (ecart === 0) ecartBadge = <span className="text-[10px] text-accent"><Check className="w-2.5 h-2.5 inline" /> Conforme</span>
                          else if (ecart > 0) ecartBadge = <span className="text-[10px] text-amber-400">+{ecart} reçu en plus</span>
                          else ecartBadge = <span className="text-[10px] text-danger">{Math.abs(ecart)} manquant(s)</span>
                        }
                        return (
                          <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="card-dash p-4">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-ink-50 text-sm">{item.produit}</p>
                              {isLow && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="badge-low inline-flex items-center gap-0.5 shrink-0"><AlertTriangle className="w-2.5 h-2.5" />Faible</motion.span>}
                            </div>
                            <p className="text-xs text-ink-400 mt-0.5">{item.categorie}</p>
                            <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
                              <span className="text-ink-400">Total reçu: <strong className="font-mono text-ink-50">{totalRecu ?? '—'}</strong> {ecartBadge}</span>
                              <span className="text-ink-400">Réception: <strong className="font-mono text-ink-50">{fmtDate(item.date_reception)}</strong></span>
                              <span className="text-ink-400"><JoursBadge jours={item.jours_en_stock} created_at={item.created_at} /></span>
                              <span className="text-ink-400">Stock: <strong className="font-mono text-ink-50">{item.qte_stock}</strong></span>
                              <span className="text-ink-400">Restant: <strong className={`font-mono ${isLow ? 'text-danger' : 'text-accent'}`}>{item.qte_restante}</strong></span>
                              <span className="text-ink-400">Coût unitaire: <strong className="font-mono text-ink-400">{CFMT(item.prix_achat_unitaire)}</strong></span>
                              <span className="text-ink-400">Coût lot: <strong className="font-mono text-ink-50">{CFMT(coutLot)}</strong></span>
                              <span className="text-ink-400">Valeur: <strong className="font-mono text-accent">{CFMT(item.valeur_stock_restant)}</strong></span>
                              <span className="text-ink-400">Profit: <strong className={`font-mono ${isProfitPos ? 'text-accent' : 'text-danger'}`}>{CFMT(profit)}</strong></span>
                              <span className="text-ink-400">Marketplace: <strong className="text-ink-50">{item.plateforme_conseillee || '–'}</strong></span>
                            </div>
                            <div className="flex gap-2 mt-3 pt-3 border-t border-base-700">
                              <button onClick={() => router.push(`/ventes?produit=${item.id}`)} className="flex-1 bg-accent text-base-950 text-xs font-semibold rounded-lg py-2 hover:bg-accent/90 transition-all">Vendre</button>
                              <button onClick={() => { setEdit(item); setModal(true) }} className="bg-base-800 text-ink-400 text-xs font-medium rounded-lg px-4 py-2 hover:text-ink-50 transition-all">Éditer</button>
                              <button onClick={() => setDel(item)} className="bg-base-800 text-ink-400 text-xs font-medium rounded-lg px-4 py-2 hover:text-danger transition-all">Suppr.</button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                    {/* Totaux mobile */}
                    <div className="card-dash p-4 border border-accent/20">
                      <div className="flex justify-between items-center mb-2"><span className="text-xs text-ink-400 font-sans font-medium uppercase tracking-wider">Totaux</span></div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-ink-400">Coût lots</span><p className="font-mono font-bold text-ink-50"><CountUp end={totals.coutTotal} decimals={2} prefix="€" /></p></div>
                        <div><span className="text-ink-400">Vente</span><p className="font-mono font-bold text-accent"><CountUp end={totals.totalVente} decimals={2} prefix="€" /></p></div>
                        <div><span className="text-ink-400">Profit</span><p className={`font-mono font-bold ${totals.profit >= 0 ? 'text-accent' : 'text-danger'}`}><CountUp end={totals.profit} decimals={2} prefix="€" /></p></div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </motion.div>

        <StockModal isOpen={modal} onClose={() => { setModal(false); setEdit(null) }} onSave={edit ? editItem : addItem} item={edit} />

        {/* Delete confirmation */}
        <AnimatePresence>
          {del && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={() => setDel(null)}>
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                className="card-dash p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-danger/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-danger" /></div>
                  <h3 className="font-sans font-semibold text-ink-50">Supprimer {del.produit} ?</h3>
                </div>
                <p className="text-sm text-ink-400">Les ventes liées conserveront l'historique.</p>
                <div className="flex justify-end gap-3 mt-6">
                  <button onClick={() => setDel(null)} className="btn-ghost">Annuler</button>
                  <button onClick={() => removeItem(del.id)} className="px-5 py-2 text-sm font-medium text-base-950 bg-danger rounded-lg hover:bg-danger/80 transition-all">Supprimer</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Layout>
    </AuthGuard>
  )
}

function StockSkeleton() {
  return (
    <div className="space-y-4 mt-6">
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="card-dash p-4"><div className="h-4 w-20 bg-base-800 rounded animate-pulse mb-2" /><div className="h-6 w-24 bg-base-800 rounded animate-pulse" /></div>)}
      </div>
      <div className="card-dash p-4 space-y-3">
        {[1,2,3,4,5].map(i => <div key={i} className="h-12 bg-base-800 rounded animate-pulse" />)}
      </div>
    </div>
  )
}
