import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Essayer d'extraire le token depuis le cookie Supabase
  const cookies = req.headers.cookie || ''

  // Essaie de trouver un cookie Supabase auth (format: sb-<url>-auth-token)
  const sbCookie = cookies
    .split(';')
    .find(c => c.trim().startsWith('sb-'))

  let user = null
  let token = null

  if (sbCookie) {
    try {
      const val = sbCookie.split('=')[1]
      const parsed = JSON.parse(decodeURIComponent(val))
      token = parsed.access_token
    } catch (e) {}
  }

  // Créer un client avec le token si dispo
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (token) {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    })
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u
  }

  if (!user) {
    // Sans token, on ne peut pas lire les données à cause du RLS
    return res.status(401).json({
      error: 'Non connecté — ouvre cette URL dans un nouvel onglet après t\'être connecté sur le site',
      cookies: Object.fromEntries(
        cookies.split(';').filter(c => c.trim().startsWith('sb-')).map(c => {
          const [k, ...v] = c.trim().split('=')
          return [k, v.join('=').substring(0, 50)]
        })
      )
    })
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  })

  const { data: stock, error: stockErr } = await supabase
    .from('revente_stock')
    .select('*')
    .order('created_at', { ascending: false })

  if (stockErr) {
    return res.status(500).json({ error: stockErr.message })
  }

  const { data: ventes } = await supabase
    .from('revente_ventes')
    .select('*')
    .order('date_vente', { ascending: false })
    .limit(500)

  res.status(200).json({ user: user.email, stock, ventes: ventes || [] })
}
