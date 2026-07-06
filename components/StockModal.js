import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Upload, Package, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  'Informatique',
  'Mode',
  'Bijoux',
  'Moto',
  'Papeterie/Bureau',
  'Hygiène/Beauté',
  'Stock existant',
  'Autre',
]

const EMPTY_FORM = {
  produit: '',
  categorie: 'Autre',
  prix_achat_unitaire: '',
  qte_stock: '',
  prix_revente_unitaire: '',
}

export default function StockModal({ isOpen, onClose, onSave, item }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [existingPhoto, setExistingPhoto] = useState(null)

  useEffect(() => {
    if (item) {
      setForm({
        produit: item.produit ?? '',
        categorie: item.categorie ?? 'Autre',
        prix_achat_unitaire: item.prix_achat_unitaire?.toString() ?? '',
        qte_stock: item.qte_stock?.toString() ?? '',
        prix_revente_unitaire: item.prix_revente_unitaire?.toString() ?? '',
      })
      setExistingPhoto(item.photo_url ?? null)
    } else {
      setForm(EMPTY_FORM)
      setExistingPhoto(null)
    }
    setPhotoFile(null)
    setPhotoPreview(null)
  }, [item, isOpen])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La photo ne doit pas dépasser 5 Mo')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    setExistingPhoto(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let photoUrl = existingPhoto

      // Upload photo si un nouveau fichier est sélectionné
      if (photoFile) {
        const ext = photoFile.name.split('.').pop() || 'jpg'
        const fileName = `produits/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('produits-photos')
          .upload(fileName, photoFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          toast.error("Erreur lors de l'upload de la photo")
          setLoading(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('produits-photos')
          .getPublicUrl(fileName)

        photoUrl = urlData.publicUrl
      }

      await onSave({
        produit: form.produit,
        categorie: form.categorie,
        prix_achat_unitaire: parseFloat(form.prix_achat_unitaire),
        qte_stock: parseInt(form.qte_stock, 10),
        prix_revente_unitaire: parseFloat(form.prix_revente_unitaire),
        photo_url: photoUrl,
      })
      onClose()
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      <div
        className="bg-paper rounded-lg shadow-lg w-full max-w-lg mx-auto p-6 border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg font-bold text-ink">
            {item ? "Modifier l'article" : 'Ajouter un article'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded text-ink/40 hover:text-ink transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-2">Photo (optionnelle)</label>
            {photoPreview || existingPhoto ? (
              <div className="relative inline-block">
                <img
                  src={photoPreview || existingPhoto}
                  alt="Aperçu"
                  className="w-24 h-24 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 bg-terracotta text-white rounded-full p-0.5 shadow hover:bg-terracotta/90 transition-colors"
                  aria-label="Supprimer la photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-sage/50 transition-colors bg-white">
                <Upload className="w-6 h-6 text-ink/30" />
                <span className="text-[10px] text-ink/30 mt-1">Ajouter</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </label>
            )}
          </div>

          {/* Nom du produit */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">Produit</label>
            <input
              type="text"
              required
              value={form.produit}
              onChange={handleChange('produit')}
              className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
              placeholder="Ex. iPhone 12 reconditionné"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-ink/70 mb-1">Catégorie</label>
            <select
              value={form.categorie}
              onChange={handleChange('categorie')}
              className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Prix + Quantités en grille 2 colonnes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">
                Prix achat unitaire (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.prix_achat_unitaire}
                onChange={handleChange('prix_achat_unitaire')}
                className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink/70 mb-1">
                Qté en stock
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.qte_stock}
                onChange={handleChange('qte_stock')}
                className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                placeholder="0"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-sm font-medium text-ink/70 mb-1">
                Prix de revente prévu (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.prix_revente_unitaire}
                onChange={handleChange('prix_revente_unitaire')}
                className="w-full border border-border bg-white rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-sage/30 focus:border-sage outline-none transition-colors"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-ink/60 hover:text-ink transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-sage rounded-md hover:bg-sage-light disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enregistrement…' : item ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
