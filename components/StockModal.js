import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATS = ['Informatique','Mode','Bijoux','Moto','Papeterie/Bureau','Hygiène/Beauté','Stock existant','Autre']
const SUGGESTIONS_MARCHE = ['Vinted', 'Leboncoin', 'Leboncoin Pro', 'Vinted Pro', 'Facebook Marketplace', 'TikTok Shop', 'Vestiaire Collective', 'Joli Closet', 'Whatnot']
const EMPTY = { produit: '', categorie: 'Autre', prix_achat_unitaire: '', qte_stock: '', prix_revente_unitaire: '', plateforme_conseillee: '' }
const CFMT = (v) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v)

export default function StockModal({ isOpen, onClose, onSave, item }) {
  const [f, setF] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [pf, setPf] = useState(null)
  const [pp, setPp] = useState(null)
  const [ep, setEp] = useState(null)

  useEffect(() => {
    if (item) {
      setF({
        produit: item.produit ?? '', categorie: item.categorie ?? 'Autre',
        prix_achat_unitaire: item.prix_achat_unitaire?.toString() ?? '',
        qte_stock: item.qte_stock?.toString() ?? '',
        prix_revente_unitaire: item.prix_revente_unitaire?.toString() ?? '',
        plateforme_conseillee: item.plateforme_conseillee || '',
      })
      setEp(item.photo_url ?? null)
    } else { setF(EMPTY); setEp(null) }
    setPf(null); setPp(null)
  }, [item, isOpen])

  const chg = (field) => (e) => setF(p => ({ ...p, [field]: e.target.value }))

  const coutTotalLot = useMemo(() => {
    const pu = Number.parseFloat(f.prix_achat_unitaire)
    const qte = Number.parseInt(f.qte_stock, 10)
    if (isNaN(pu) || isNaN(qte) || qte === 0) return null
    return pu * qte
  }, [f.prix_achat_unitaire, f.qte_stock])

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Photo max 5 Mo'); return }
    setPf(file); setPp(URL.createObjectURL(file))
  }

  const delPhoto = () => { setPf(null); setPp(null); setEp(null) }

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let url = ep
      if (pf) {
        const ext = pf.name.split('.').pop() || 'jpg'
        const fn = `produits/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: ue } = await supabase.storage.from('produits-photos').upload(fn, pf, { cacheControl: '3600', upsert: false })
        if (ue) { toast.error("Erreur upload"); setLoading(false); return }
        url = supabase.storage.from('produits-photos').getPublicUrl(fn).data.publicUrl
      }
      await onSave({
        produit: f.produit, categorie: f.categorie,
        prix_achat_unitaire: parseFloat(f.prix_achat_unitaire),
        qte_stock: parseInt(f.qte_stock, 10),
        prix_revente_unitaire: parseFloat(f.prix_revente_unitaire),
        plateforme_conseillee: f.plateforme_conseillee || null,
        photo_url: url,
      })
      onClose()
    } catch (err) { toast.error("Erreur") }
    finally { setLoading(false) }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="bg-base-900 border border-base-700 rounded-lg p-6 w-full max-w-lg shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-ink-50 font-sans uppercase tracking-wider">
                {item ? "Modifier l'article" : 'Ajouter un article'}
              </h2>
              <button onClick={onClose} className="p-1 rounded-lg text-ink-400 hover:text-ink-50 hover:bg-base-800 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4">
              {/* Photo */}
              <div>
                <label className="block text-xs font-medium text-ink-400 mb-1">Photo <span className="text-ink-400/40">(opt.)</span></label>
                {pp || ep ? (
                  <div className="relative inline-block">
                    <img src={pp || ep} alt="" className="w-24 h-24 rounded-lg object-cover border border-base-700" />
                    <button type="button" onClick={delPhoto} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger text-base-950 flex items-center justify-center shadow hover:bg-danger/80">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-base-700 rounded-lg cursor-pointer hover:border-accent/40 hover:bg-base-800/50 transition-all bg-base-800">
                    <Upload className="w-6 h-6 text-ink-400/20" />
                    <span className="text-[10px] text-ink-400/20 mt-1">Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-400 mb-1">Produit</label>
                <input type="text" required value={f.produit} onChange={chg('produit')} className="input-field w-full" placeholder="iPhone 12 reconditionné" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-400 mb-1">Catégorie</label>
                <select value={f.categorie} onChange={chg('categorie')} className="input-field w-full">{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-400 mb-1">Coût unitaire (€)</label>
                  <input type="number" step="0.01" min="0" required value={f.prix_achat_unitaire} onChange={chg('prix_achat_unitaire')} className="input-field w-full font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-400 mb-1">Qté en stock</label>
                  <input type="number" min="0" required value={f.qte_stock} onChange={chg('qte_stock')} className="input-field w-full font-mono" placeholder="0" />
                </div>
              </div>
              {coutTotalLot !== null && (
                <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3 flex items-center justify-between">
                  <span className="text-xs text-ink-400">Coût total par lot <span className="text-ink-400/40">(calculé)</span></span>
                  <span className="font-mono font-bold text-accent">{CFMT(coutTotalLot)}</span>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-ink-400 mb-1">Prix revente unitaire (€)</label>
                <input type="number" step="0.01" min="0" required value={f.prix_revente_unitaire} onChange={chg('prix_revente_unitaire')} className="input-field w-full font-mono" placeholder="0.00" />
              </div>
              {/* Marketplace — champ libre avec suggestions */}
              <div>
                <label className="block text-xs font-medium text-ink-400 mb-1">Marketplace conseillée</label>
                <input
                  type="text"
                  list="modal-plat-suggestions"
                  value={f.plateforme_conseillee}
                  onChange={chg('plateforme_conseillee')}
                  className="input-field w-full font-sans"
                  placeholder="Ex. Vinted, Leboncoin, ou plusieurs…"
                />
                <datalist id="modal-plat-suggestions">
                  {SUGGESTIONS_MARCHE.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-base-700">
                <button type="button" onClick={onClose} className="btn-ghost">Annuler</button>
                <button type="submit" disabled={loading} className="btn-primary">{loading ? '…' : item ? 'Modifier' : 'Ajouter'}</button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
