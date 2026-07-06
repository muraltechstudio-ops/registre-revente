import { useState, useEffect } from 'react'

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

  useEffect(() => {
    if (item) {
      setForm({
        produit: item.produit ?? '',
        categorie: item.categorie ?? 'Autre',
        prix_achat_unitaire: item.prix_achat_unitaire?.toString() ?? '',
        qte_stock: item.qte_stock?.toString() ?? '',
        prix_revente_unitaire: item.prix_revente_unitaire?.toString() ?? '',
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [item, isOpen])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onSave({
        produit: form.produit,
        categorie: form.categorie,
        prix_achat_unitaire: parseFloat(form.prix_achat_unitaire),
        qte_stock: parseInt(form.qte_stock, 10),
        prix_revente_unitaire: parseFloat(form.prix_revente_unitaire),
      })
      onClose()
    } catch (err) {
      alert("Erreur lors de l'enregistrement")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-5">
          {item ? "Modifier l'article" : 'Ajouter un article'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Produit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Produit</label>
            <input
              type="text"
              required
              value={form.produit}
              onChange={handleChange('produit')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none"
              placeholder="Ex. iPhone 12 reconditionné"
            />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select
              value={form.categorie}
              onChange={handleChange('categorie')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Prix achat unitaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix d&apos;achat unitaire (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.prix_achat_unitaire}
              onChange={handleChange('prix_achat_unitaire')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Quantité stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantité en stock</label>
            <input
              type="number"
              min="0"
              required
              value={form.qte_stock}
              onChange={handleChange('qte_stock')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none"
              placeholder="0"
            />
          </div>

          {/* Prix revente unitaire */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix de revente prévu (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.prix_revente_unitaire}
              onChange={handleChange('prix_revente_unitaire')}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-gray-800 rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Enregistrement…' : item ? 'Modifier' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
