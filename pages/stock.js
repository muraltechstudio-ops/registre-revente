import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import AuthGuard from '../components/AuthGuard'
import Layout from '../components/Layout'
import StockModal from '../components/StockModal'
import toast from 'react-hot-toast'
import { Package, Plus, Search, ShoppingCart, Pencil, Trash2, AlertTriangle, Box, Wallet, TrendingUp } from 'lucide-react'

const CATS = ['Informatique','Mode','Bijoux','Moto','Papeterie/Bureau','Hygiène/Beauté','Stock existant','Autre']
const CFMT = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)
const LOW = 3

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

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Try summary view first, fallback to direct stock query
      let data
      const r = await supabase.from('revente_stock_summary').select('*').order('produit')
      if (r.error) {
        console.warn('Summary view error:', r.error.message)
        const r2 = await supabase.from('revente_stock').select('*').order('produit')
        if (r2.error) throw new Error(r2.error.message)
        data = (r2.data ?? []).map(i => ({
          ...i,
          qte_vendue: 0,
          qte_restante: i.qte_stock,
          valeur_stock_restant: i.qte_stock * Number(i.prix_revente_unitaire),
          cout_total_lot: i.cout_total_lot ?? (i.qte_stock * Number(i.prix_achat_unitaire)),
        }))
      } else {
        data = r.data ?? []
      }

      // Try to get photos
      let photos = []
      try {
        const p = await supabase.from('revente_stock').select('id, photo_url')
        if (!p.error) photos = p.data ?? []
      } catch {}

      // Attach photos + ensure cout_total_lot fallback
      setItems(data.map(i => ({
        ...i,
        photo_url: photos.find(p => p.id === i.id)?.photo_url ?? null,
        cout_total_lot: i.cout_total_lot ?? (Number(i.prix_achat_unitaire) * Number(i.qte_stock)),
      })))
    } catch (err) {
      console.error(err)
      setError(err.message)
      toast.error('Erreur: ' + err.message)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const filtered = useMemo(() => {
    let r = items
    if (cat) r = r.filter(i => i.categorie === cat)
    if (q.trim()) { const s = q.toLowerCase(); r = r.filter(i => i.produit.toLowerCase().includes(s)) }
    return r
  }, [items, cat, q])

  const metrics = useMemo(() => ({
    val: items.reduce((s, i) => s + Number(i.valeur_stock_restant ?? 0), 0),
    qty: items.reduce((s, i) => s + Number(i.qte_stock ?? 0), 0),
    rest: items.reduce((s, i) => s + Number(i.qte_restante ?? 0), 0),
    coutTotal: items.reduce((s, i) => s + Number(i.cout_total_lot ?? 0), 0),
  }), [items])

  const addItem = async (fd) => {
    const { error } = await supabase.from('revente_stock').insert([fd])
    if (error) throw error
    toast.success('Article ajouté')
    await fetch()
  }
  const editItem = async (fd) => {
    const { error } = await supabase.from('revente_stock').update(fd).eq('id', edit.id)
    if (error) throw error
    toast.success('Article modifié')
    await fetch()
  }
  const removeItem = async (id) => {
    const { error } = await supabase.from('revente_stock').delete().eq('id', id)
    if (error) { toast.error('Erreur suppression'); return }
    toast.success('Article supprimé')
    setDel(null); await fetch()
  }

  return (
    <AuthGuard>
      <Layout>
        <div className="flex items-center justify-between mb-2">
          <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">Stock</h1>
          <span className="font-mono text-xs text-muted">{items.length} article(s)</span>
        </div>
        <div className="double-bar mb-6" />

        {loading ? <Skel /> : error ? (
          <div className="card p-8 text-center">
            <AlertTriangle className="w-10 h-10 text-rust mx-auto mb-3" />
            <p className="text-sm text-rust font-medium">Erreur de chargement</p>
            <p className="text-xs text-muted mt-1">{error}</p>
            <button onClick={fetch} className="btn-forest mt-4">Réessayer</button>
          </div>
        ) : (
          <>
            {/* KPI mini */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="card-hover p-4">
                <p className="text-xs text-muted font-serif italic">Valeur stock</p>
                <p className="font-mono text-lg font-bold text-ink mt-1">{CFMT(metrics.val)}</p>
              </div>
              <div className="card-hover p-4">
                <p className="text-xs text-muted font-serif italic">En stock</p>
                <p className="font-mono text-lg font-bold text-ink mt-1">{metrics.qty}</p>
              </div>
              <div className="card-hover p-4">
                <p className="text-xs text-muted font-serif italic">Restant</p>
                <p className="font-mono text-lg font-bold text-ink mt-1">{metrics.rest}</p>
              </div>
              <div className="card-hover p-4">
                <p className="text-xs text-muted font-serif italic">Coût total lots</p>
                <p className="font-mono text-lg font-bold text-ink mt-1">{CFMT(metrics.coutTotal)}</p>
              </div>
            </div>

            {/* Search + add */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted/30" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher…"
                  className="input-field w-full pl-10" />
              </div>
              <button onClick={() => { setEdit(null); setModal(true) }} className="btn-gold shrink-0 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 mb-5">
              <button onClick={() => setCat(null)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  !cat ? 'bg-navy text-goldlight border-navy' : 'bg-card text-muted border-border hover:border-gold/40'}`}>Tout</button>
              {CATS.map(c => (
                <button key={c} onClick={() => setCat(cat === c ? null : c)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    cat === c ? 'bg-navy text-goldlight border-navy' : 'bg-card text-muted border-border hover:border-gold/40'}`}>{c}</button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="card p-12 text-center">
                <Box className="w-10 h-10 text-muted/20 mx-auto mb-3" />
                <p className="text-base font-medium text-muted/60 font-serif italic">
                  {q || cat ? 'Aucun résultat' : 'Le stock est vide'}
                </p>
                {!q && !cat && (
                  <button onClick={() => { setEdit(null); setModal(true) }} className="btn-gold mt-5 inline-flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Premier article
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-ink/[0.02]">
                        <th className="text-left px-4 py-3 font-serif font-bold text-xs text-muted tracking-wider">Produit</th>
                        <th className="text-right px-4 py-3 font-serif font-bold text-xs text-muted tracking-wider">Coût unitaire</th>
                        <th className="text-right px-4 py-3 font-serif font-bold text-xs text-muted tracking-wider">Coût total lot</th>
                        <th className="text-center px-4 py-3 font-serif font-bold text-xs text-muted tracking-wider">Stock</th>
                        <th className="text-right px-4 py-3 font-serif font-bold text-xs text-muted tracking-wider">Vente à l'unité</th>
                        <th className="text-right px-4 py-3 font-serif font-bold text-xs text-muted tracking-wider">Total Vente</th>
                        <th className="text-center px-4 py-3 font-serif font-bold text-xs text-muted tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filtered.map((item, idx) => {
                        const isLow = item.qte_restante <= LOW
                        const coutLot = item.cout_total_lot ?? (Number(item.prix_achat_unitaire) * Number(item.qte_stock))
                        return (
                          <tr key={item.id} className={`${idx % 2 === 0 ? 'bg-card' : 'bg-ink/[0.015]'} hover:bg-gold/5 transition-colors`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <span className="font-medium text-ink">{item.produit}</span>
                                {item.categorie && <span className="text-[10px] bg-ink/5 text-muted px-1.5 py-0.5 rounded">{item.categorie}</span>}
                                {isLow && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-rust bg-rust/10 px-1.5 py-0.5 rounded">
                                    <AlertTriangle className="w-2.5 h-2.5" />Faible
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted">{CFMT(item.prix_achat_unitaire)}</td>
                            <td className="px-4 py-3 text-right font-mono font-semibold text-ink">{CFMT(coutLot)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`font-mono font-semibold ${isLow ? 'text-rust' : 'text-forest'}`}>{item.qte_restante}</span>
                              <span className="font-mono text-muted/40 text-[11px]"> /{item.qte_stock}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted">{CFMT(item.prix_revente_unitaire)}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-ink">{CFMT(item.valeur_stock_restant)}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => router.push(`/ventes?produit=${item.id}`)} className="p-1.5 rounded-lg text-forest hover:bg-forest/10 transition-all"><ShoppingCart className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { setEdit(item); setModal(true) }} className="p-1.5 rounded-lg text-gold hover:bg-gold/10 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setDel(item)} className="p-1.5 rounded-lg text-rust hover:bg-rust/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-3">
                  {filtered.map(item => {
                    const isLow = item.qte_restante <= LOW
                    const coutLot = item.cout_total_lot ?? (Number(item.prix_achat_unitaire) * Number(item.qte_stock))
                    return (
                      <div key={item.id} className="card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-ink text-sm">{item.produit}</p>
                          {isLow && <span className="text-[10px] flex items-center gap-0.5 text-rust bg-rust/10 px-1.5 py-0.5 rounded"><AlertTriangle className="w-2.5 h-2.5" />Faible</span>}
                        </div>
                        <p className="text-xs text-muted mt-0.5">{item.categorie}</p>
                        <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                          <span>Stock: <strong className="font-mono">{item.qte_stock}</strong></span>
                          <span>Restant: <strong className={`font-mono ${isLow ? 'text-rust' : 'text-forest'}`}>{item.qte_restante}</strong></span>
                          <span>Coût unitaire: <strong className="font-mono">{CFMT(item.prix_achat_unitaire)}</strong></span>
                          <span>Coût lot: <strong className="font-mono">{CFMT(coutLot)}</strong></span>
                          <span>Valeur: <strong className="font-mono text-forest">{CFMT(item.valeur_stock_restant)}</strong></span>
                          <span>Vente: <strong className="font-mono">{CFMT(item.prix_revente_unitaire)}</strong></span>
                        </div>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-border/30">
                          <button onClick={() => router.push(`/ventes?produit=${item.id}`)} className="flex-1 bg-forest text-white text-xs font-medium rounded-lg py-2 hover:bg-forestlight transition-all">Vendre</button>
                          <button onClick={() => { setEdit(item); setModal(true) }} className="bg-gold/10 text-gold text-xs font-medium rounded-lg px-4 py-2 hover:bg-gold/20 transition-all">Éditer</button>
                          <button onClick={() => setDel(item)} className="bg-rust/10 text-rust text-xs font-medium rounded-lg px-4 py-2 hover:bg-rust/20 transition-all">Suppr.</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        <StockModal isOpen={modal} onClose={() => { setModal(false); setEdit(null) }} onSave={edit ? editItem : addItem} item={edit} />

        {del && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={() => setDel(null)}>
            <div className="card p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-rust/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-rust" /></div>
                <h3 className="font-serif font-bold text-ink">Supprimer {del.produit} ?</h3>
              </div>
              <p className="text-sm text-muted">Les ventes liées conserveront l&apos;historique.</p>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setDel(null)} className="btn-ghost">Annuler</button>
                <button onClick={() => removeItem(del.id)} className="px-5 py-2 text-sm font-medium text-white bg-rust rounded-lg hover:bg-rust/80 transition-all">Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </AuthGuard>
  )
}

function Skel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <div key={i} className="card p-4"><div className="h-4 w-20 bg-ink/5 rounded animate-pulse mb-2" /><div className="h-6 w-24 bg-ink/5 rounded animate-pulse" /></div>)}
      </div>
      <div className="card p-4 space-y-3">
        {[1,2,3,4].map(i => <div key={i} className="h-10 bg-ink/5 rounded animate-pulse" />)}
      </div>
    </div>
  )
}
