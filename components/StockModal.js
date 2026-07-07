import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Upload, Package, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'Informatique','Mode','Bijoux','Moto','Papeterie/Bureau','Hygiène/Beauté','Stock existant','Autre',
]

const EMPTY_FORM = { produit: '', categorie: 'Autre', prix_achat_unitaire: '', qte_stock: '', prix_revente_unitaire: '' }

export default function StockModal({ isOpen, onClose, onSave, item }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [existingPhoto, setExistingPhoto] = useState(null)

  useEffect(() => {
    if (item) {
      setForm({
        produit: item.produit ?? '', categorie: item.categorie ?? 'Autre',
        prix_achat_unitaire: item.prix_achat_unitaire?.toString() ?? '',
        qte_stock: item.qte_stock?.toString() ?? '',
        prix_revente_unitaire: item.prix_revente_unitaire?.toString() ?? '',
      })
      setExistingPhoto(item.photo_url ?? null)
    } else {
      setForm(EMPTY_FORM); setExistingPhoto(null)
    }
    setPhotoFile(null); setPhotoPreview(null)
  }, [item, isOpen])

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('La photo ne doit pas dépasser 5 Mo'); return }
    setPhotoFile(file); setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => { setPhotoFile(null); setPhotoPreview(null); setExistingPhoto(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let photoUrl = existingPhoto
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg'
        const fileName = `produits/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('produits-photos').upload(fileName, photoFile, { cacheControl: '3600', upsert: false })
        if (uploadError) { toast.error("Erreur upload photo"); setLoading(false); return }
        const { data: urlData } = supabase.storage.from('produits-photos').getPublicUrl(fileName)
        photoUrl = urlData.publicUrl
      }
      await onSave({
        produit: form.produit, categorie: form.categorie,
        prix_achat_unitaire: parseFloat(form.prix_achat_unitaire),
        qte_stock: parseInt(form.qte_stock, 10),
        prix_revente_unitaire: parseFloat(form.prix_revente_unitaire),
        photo_url: photoUrl,
      })
      onClose()
    } catch (err) { toast.error("Erreur lors de l'enregistrement") }
    finally { setLoading(false) }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={onClose}>
      <div className="card w-full max-w-lg mx-auto p-6 animate-fade-in shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg font-bold text-ink">
            {item ? "Modifier l'article" : 'Ajouter un article'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ink/30 hover:text-ink hover:bg-ink/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1">Photo <span className="text-ink/30">(opt.)</span></label>
            {photoPreview || existingPhoto ? (
              <div className="relative inline-block">
                <img src={photoPreview || existingPhoto} alt="" className="w-24 h-24 rounded-xl object-cover border border-border" />
                <button type="button" onClick={removePhoto} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-terracotta text-white flex items-center justify-center shadow hover:bg-terracotta-light transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border/60 rounded-xl cursor-pointer hover:border-sage/40 hover:bg-sage/5 transition-all bg-white">
                <Upload className="w-6 h-6 text-ink/20" />
                <span className="text-[10px] text-ink/20 mt-1">Ajouter</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            )}
          </div>

          {/* Produit */}
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1">Produit</label>
            <input type="text" required value={form.produit} onChange={handleChange('produit')}
              className="input-field w-full" placeholder="Ex. iPhone 12 reconditionné" />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-ink/60 mb-1">Catégorie</label>
            <select value={form.categorie} onChange={handleChange('categorie')} className="input-field w-full">
              {CATEGORIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>

          {/* Grille prix */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1">Prix achat (€)</label>
              <input type="number" step="0.01" min="0" required value={form.prix_achat_unitaire} onChange={handleChange('prix_achat_unitaire')}
                className="input-field w-full font-mono" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1">Qté en stock</label>
              <input type="number" min="0" required value={form.qte_stock} onChange={handleChange('qte_stock')}
                className="input-field w-full font-mono" placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-ink/60 mb-1">Prix de revente (€)</label>
              <input type="number" step="0.01" min="0" required value={form.prix_revente_unitaire} onChange={handleChange('prix_revente_unitaire')}
                className="input-field w-full font-mono" placeholder="0.00" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border/30">
            <button type="button" onClick={onClose} className="btn-ghost">Annuler</button>
            <button type="submit" disabled={loading} className="btn-sage">
              {loading ? 'Enregistrement…' : item ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
