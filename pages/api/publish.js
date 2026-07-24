import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return res.status(401).json({ error: 'Non connecté' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST uniquement' })
  }

  // Mise à jour des prix d'achat avec les frais + port intégrés
  const updates = [
    { id: 'ad8cdef5-efd1-4f22-b9ce-69c7dd9a09a5', prix_achat_unitaire: 63.26 },   // DXR Kruger Evo (même lot que Tanner)
    { id: 'b32134d7-aaa0-41a2-92a9-e31550de37dd', prix_achat_unitaire: 63.26 },   // idem
    { id: 'a1527dfa-e41c-4f41-b570-3de780b096fd', prix_achat_unitaire: 0.34 },    // 90 bas maillots
    { id: 'f9ca6a4d-0cfd-49b8-b5c6-f86485114d49', prix_achat_unitaire: 1.05 },    // 25 bracelets
    { id: '856b3b85-8d76-47c1-8575-ef040471a396', prix_achat_unitaire: 1.54 },    // hauts Esprit
    { id: '7446bbec-08f8-4314-ae9e-0bde3504739b', prix_achat_unitaire: 63.26 },   // DXR Tanner
    { id: '79654779-fcef-4ea6-98f2-c17064ae4e19', prix_achat_unitaire: 63.26 },   // DXR Buschnell
    { id: '01c9632a-83b9-42a3-853d-608002aacf09', prix_achat_unitaire: 63.26 },   // DXR Kickback
    { id: 'b9b38146-5beb-4234-8ce9-5b5176f57ae4', prix_achat_unitaire: 63.26 },   // DXR Roadtrip
  ]

  for (const u of updates) {
    const { error } = await supabase.from('revente_stock').update({ prix_achat_unitaire: u.prix_achat_unitaire }).eq('id', u.id)
    if (error) console.error(u.id, error.message)
  }

  res.json({ ok: true, count: updates.length, user: user.email })
}
