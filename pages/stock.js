import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import StockModal from '../components/StockModal'
import CountUp from '../components/CountUp'
import MagneticButton from '../components/MagneticButton'
import toast from 'react-hot-toast'
import { Package, Plus, Search, ShoppingCart, Pencil, Trash2, AlertTriangle, Box, TrendingUp, ChevronDown } from 'lucide-react'

const CATS = ['Informatique','Mode','Bijoux','Moto','Papeterie/Bureau','Hygiène/Beauté','Stock existant','Autre']
const PLATEFORMES_MARCHE = ['Vinted','Leboncoin','Facebook Marketplace','TikTok Shop','Temu','Whatnot','Vestiaire Collective','Autre']
const CFMT = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
const LOW = 3

/* ──── Skeleton shimmer ──── */
function Skeleton({ className }) {
  return <div className={`bg-base-800 bg-shimmer bg-[length:200%_100%] animate-shimmer rounded-lg ${className}`} />
}

export default function StockPage() {
  const router = useRouter()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState(null)
  const [modal, setModal] = useState(false)
  const [edit, setEdit] = useState(null)
  const [del, setDel] = useState(null)
  const [openPlat, setOpenPlat] = useState(null)
  const platRef = useRef(null)

  /* ──── Fermeture menu inline au clic dehors ──── */
  useEffect(() => {
    const h = (e) => { if (platRef.current && !platRef.current.contains(e.target)) setOpenPlat(null) }
    if (openPlat) document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [openPlat])

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

  const filtered = useMemo(() => {
    let r = items
    if (cat) r = r.filter(i => i.categorie === cat)
    if (q.trim()) { const s = q.toLowerCase(); r = r.filter(i => i.produit.toLowerCase().includes(s)) }
    return r
  }, [items, cat, q])

  /* ──── Totaux sur les lignes filtrées ──── */
  const totals = useMemo(() => ({
    coutTotal: filtered.reduce((s, i) => s + Number(i.cout_total_lot ?? 0), 0),
    totalVente: filtered.reduce((s, i) => s + Number(i.valeur_stock_restant ?? 0), 0),
    profit: filtered.reduce((s, i) => s + Number(i.profit_potentiel ?? 0), 0),
  }), [filtered])

  const metrics = useMemo(() => ({
    val: items.reduce((s, i) => s + Number(i.valeur_stock_restant ?? 0), 0),
    qty: items.reduce((s, i) => s + Number(i.qte_stock ?? 0), 0),
    rest: items.reduce((s, i) => s + Number(i.qte_restante ?? 0), 0),
    coutTotal: items.reduce((s, i) => s + Number(i.cout_total_lot ?? 0), 0),
  }), [items])

  const addItem = async (fd) => { const { error } = await supabase.from('revente_stock').insert([fd]); if (error) throw error; toast.success('Article ajouté'); await fetch() }
  const editItem = async (fd) => { const { error } = await supabase.from('revente_stock').update(fd).eq('id', edit.id); if (error) throw error; toast.success('Article modifié'); await fetch() }
  const removeItem = async (id) => { const { error } = await supabase.from('revente_stock').delete().eq('id', id); if (error) { toast.error('Erreur'); return }; toast.success('Article supprimé'); setDel(null); await fetch() }

  /* ──── Mise à jour inline plateforme_conseillee ──── */
  const handlePlateformeUpdate = async (id, valeur) => {
    const { error } = await supabase.from('revente_stock').update({ plateforme_conseillee: valeur }).eq('id', id)
    if (error) { toast.error('Erreur'); return }
    toast.success(`Marketplace: ${valeur}`)
    setOpenPlat(null)
    setItems(prev => prev.map(i => i.id === id ? { ...i, plateforme_conseillee: valeur } : i))
  }

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
                      {kpi.fmt ? (
                        <><span className="text-sm text-ink-400 mr-1">€</span><CountUp end={kpi.value} decimals={2} /></>
                      ) : <CountUp end={kpi.value} />}
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
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2 mb-5">
                <button onClick={() => setCat(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${!cat ? 'bg-accent text-base-950 border-accent' : 'bg-base-800 text-ink-400 border-base-700 hover:border-accent/40'}`}>Tout</button>
                {CATS.map(c => (
                  <button key={c} onClick={() => setCat(cat === c ? null : c)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${cat === c ? 'bg-accent text-base-950 border-accent' : 'bg-base-800 text-ink-400 border-base-700 hover:border-accent/40'}`}>{c}</button>
                ))}
              </div>

              {/* Empty state */}
              {filtered.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-dash p-12 text-center">
                  <Box className="w-10 h-10 text-ink-400/20 mx-auto mb-3" />
                  <p className="text-base font-medium text-ink-400/60">{q || cat ? 'Aucun résultat' : 'Le stock est vide'}</p>
                  {!q && !cat && <button onClick={() => { setEdit(null); setModal(true) }} className="btn-primary mt-5 inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Premier article</button>}
                </motion.div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block card-dash overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-base-700 bg-base-900/50">
                          <th className="text-left px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Produit</th>
                          <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Coût unitaire</th>
                          <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Coût total lot</th>
                          <th className="text-center px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Stock</th>
                          <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Vente à l'unité</th>
                          <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Total Vente</th>
                          <th className="text-right px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Profit</th>
                          <th className="text-center px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Marketplace</th>
                          <th className="text-center px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-700/50">
                        <AnimatePresence mode="popLayout">
                          {filtered.map((item, idx) => {
                            const isLow = item.qte_restante <= LOW
                            const coutLot = item.cout_total_lot ?? (Number(item.prix_achat_unitaire) * Number(item.qte_stock))
                            const profit = Number(item.profit_potentiel ?? 0)
                            const isProfitPos = profit >= 0
                            return (
                              <motion.tr
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2, delay: idx * 0.02 }}
                                className="hover:bg-base-800/50 transition-colors"
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-medium text-ink-50">{item.produit}</span>
                                    {item.categorie && <span className="badge-cat">{item.categorie}</span>}
                                    {isLow && (
                                      <motion.span
                                        animate={{ opacity: [1, 0.5, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="badge-low inline-flex items-center gap-0.5"
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5" />
                                        Faible
                                      </motion.span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-ink-400">{CFMT(item.prix_achat_unitaire)}</td>
                                <td className="px-4 py-3 text-right font-mono font-semibold text-ink-50">{CFMT(coutLot)}</td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`font-mono font-semibold ${isLow ? 'text-danger' : 'text-accent'}`}>{item.qte_restante}</span>
                                  <span className="font-mono text-ink-400/40 text-[11px]"> /{item.qte_stock}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-ink-400">{CFMT(item.prix_revente_unitaire)}</td>
                                <td className="px-4 py-3 text-right font-mono font-bold text-accent">{CFMT(item.valeur_stock_restant)}</td>
                                {/* Profit */}
                                <td className={`px-4 py-3 text-right font-mono font-bold ${isProfitPos ? 'text-accent' : 'text-danger'}`}>{CFMT(profit)}</td>
                                {/* Marketplace editable inline */}
                                <td className="px-4 py-3 text-center relative">
                                  <div ref={openPlat === item.id ? platRef : null}>
                                    <button
                                      onClick={() => setOpenPlat(openPlat === item.id ? null : item.id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-base-700 bg-base-800 text-ink-400 hover:border-accent/40 hover:text-accent transition-all"
                                    >
                                      {item.plateforme_conseillee || '–'}
                                      <ChevronDown className="w-3 h-3" />
                                    </button>
                                    {openPlat === item.id && (
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 card-dash shadow-lg py-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
                                        {PLATEFORMES_MARCHE.map(p => (
                                          <button key={p} onClick={() => handlePlateformeUpdate(item.id, p)}
                                            className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-base-800 transition-colors ${
                                              (item.plateforme_conseillee || '') === p ? 'font-bold text-accent' : 'text-ink-400'
                                            }`}>{p}</button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
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
                      {/* ── Ligne de totaux ── */}
                      <tfoot>
                        <tr className="border-t-2 border-accent/30 bg-base-900/80">
                          <td className="px-4 py-3 text-xs uppercase tracking-[0.1em] text-ink-400 font-sans font-medium">Totaux</td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-right font-mono font-bold text-ink-50">
                            <CountUp end={totals.coutTotal} decimals={2} prefix="€" />
                          </td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3 text-right font-mono font-bold text-accent">
                            <CountUp end={totals.totalVente} decimals={2} prefix="€" />
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${totals.profit >= 0 ? 'text-accent' : 'text-danger'}`}>
                            <CountUp end={totals.profit} decimals={2} prefix="€" />
                          </td>
                          <td className="px-4 py-3" />
                          <td className="px-4 py-3" />
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
                        return (
                          <motion.div key={item.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                            className="card-dash p-4">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium text-ink-50 text-sm">{item.produit}</p>
                              {isLow && <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="badge-low inline-flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />Faible</motion.span>}
                            </div>
                            <p className="text-xs text-ink-400 mt-0.5">{item.categorie}</p>
                            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
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
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-ink-400 font-sans font-medium uppercase tracking-wider">Totaux</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div>
                          <span className="text-ink-400">Coût lots</span>
                          <p className="font-mono font-bold text-ink-50"><CountUp end={totals.coutTotal} decimals={2} prefix="€" /></p>
                        </div>
                        <div>
                          <span className="text-ink-400">Total Vente</span>
                          <p className="font-mono font-bold text-accent"><CountUp end={totals.totalVente} decimals={2} prefix="€" /></p>
                        </div>
                        <div>
                          <span className="text-ink-400">Profit</span>
                          <p className={`font-mono font-bold ${totals.profit >= 0 ? 'text-accent' : 'text-danger'}`}><CountUp end={totals.profit} decimals={2} prefix="€" /></p>
                        </div>
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
