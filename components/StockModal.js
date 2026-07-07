import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Upload, Package, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATS = ['Informatique','Mode','Bijoux','Moto','Papeterie/Bureau','Hygiène/Beauté','Stock existant','Autre']
const EMPTY = { produit: '', categorie: 'Autre', prix_achat_unitaire: '', qte_stock: '', prix_revente_unitaire: '' }

export default function StockModal({ isOpen, onClose, onSave, item }) {
  const [f, setF] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [pf, setPf] = useState(null)
  const [pp, setPp] = useState(null)
  const [ep, setEp] = useState(null)

  useEffect(() => {
    if (item) {
      setF({ produit: item.produit ?? '', categorie: item.categorie ?? 'Autre', prix_achat_unitaire: item.prix_achat_unitaire?.toString() ?? '', qte_stock: item.qte_stock?.toString() ?? '', prix_revente_unitaire: item.prix_revente_unitaire?.toString() ?? '' })
      setEp(item.photo_url ?? null)
    } else { setF(EMPTY); setEp(null) }
    setPf(null); setPp(null)
  }, [item, isOpen])

  const chg = (field) => (e) => setF(p => ({ ...p, [field]: e.target.value }))

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
      await onSave({ produit: f.produit, categorie: f.categorie, prix_achat_unitaire: parseFloat(f.prix_achat_unitaire), qte_stock: parseInt(f.qte_stock, 10), prix_revente_unitaire: parseFloat(f.prix_revente_unitaire), photo_url: url })
      onClose()
    } catch (err) { toast.error("Erreur") }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="card p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg font-bold text-ink">{item ? "Modifier" : 'Ajouter un article'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-muted/40 hover:text-ink hover:bg-ink/5 transition-all"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Photo <span className="text-muted/40">(opt.)</span></label>
            {pp || ep ? (
              <div className="relative inline-block">
                <img src={pp || ep} alt="" className="w-24 h-24 rounded-xl object-cover border border-border" />
                <button type="button" onClick={delPhoto} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rust text-white flex items-center justify-center shadow hover:bg-rust/80"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-gold/40 hover:bg-gold/5 transition-all bg-white">
                <Upload className="w-6 h-6 text-muted/20" />
                <span className="text-[10px] text-muted/20 mt-1">Photo</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Produit</label>
            <input type="text" required value={f.produit} onChange={chg('produit')} className="input-field w-full" placeholder="iPhone 12 reconditionné" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Catégorie</label>
            <select value={f.categorie} onChange={chg('categorie')} className="input-field w-full">{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-muted mb-1">Achat (€)</label>
              <input type="number" step="0.01" min="0" required value={f.prix_achat_unitaire} onChange={chg('prix_achat_unitaire')} className="input-field w-full font-mono" placeholder="0.00" /></div>
            <div><label className="block text-sm font-medium text-muted mb-1">Qté stock</label>
              <input type="number" min="0" required value={f.qte_stock} onChange={chg('qte_stock')} className="input-field w-full font-mono" placeholder="0" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Prix revente (€)</label>
            <input type="number" step="0.01" min="0" required value={f.prix_revente_unitaire} onChange={chg('prix_revente_unitaire')} className="input-field w-full font-mono" placeholder="0.00" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border/30">
            <button type="button" onClick={onClose} className="btn-ghost">Annuler</button>
            <button type="submit" disabled={loading} className="btn-forest">{loading ? '…' : item ? 'Modifier' : 'Ajouter'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
