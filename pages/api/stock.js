import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  // Le cookie de session est transmis automatiquement via la requête
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return res.status(401).json({ error: 'Non connecté' })
  }

  const { data: stock, error: stockErr } = await supabase
    .from('revente_stock')
    .select('*')
    .order('created_at', { ascending: false })

  if (stockErr) {
    return res.status(500).json({ error: stockErr.message })
  }

  const { data: ventes, error: ventesErr } = await supabase
    .from('revente_ventes')
    .select('*')
    .order('date_vente', { ascending: false })
    .limit(500)

  return res.status(200).json({
    user: user.email,
    stock,
    ventes: ventesErr ? [] : ventes,
  })
}
