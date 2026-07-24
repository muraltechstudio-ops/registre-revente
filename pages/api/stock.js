import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Essai 1: cookie complet
  const allCookies = req.headers.cookie || ''

  // Essai 2: Authorization header
  const authHeader = req.headers.authorization || ''

  // Essai 3: URL hash
  const hash = req.query.hash || ''

  // Debug: afficher tous les cookies bruts
  const cookieList = allCookies.split(';').map(c => c.trim()).filter(Boolean)
  const rawCookies = cookieList.map(c => c.substring(0, 80))

  // Chercher tous les cookies qui mentionnent "supabase" ou "sb-"
  const sbCookies = cookieList.filter(c => c.startsWith('sb-') || c.includes('supabase'))

  res.status(200).json({
    debug: {
      nbCookies: cookieList.length,
      sbCookies: sbCookies.length,
      cookies: rawCookies.slice(0, 20),
      authHeader: authHeader.substring(0, 30) || '(absent)',
      hash: hash.substring(0, 30) || '(absent)',
    }
  })
}
