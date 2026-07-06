import { createClient } from '@supabase/supabase-js'

let client = null

/**
 * Retourne un client Supabase créé paresseusement.
 *
 * Seul le vrai client (NEXT_PUBLIC_* définies) est mis en cache.
 * Pendant le build SSR (où les vars peuvent être absentes côté serveur),
 * on renvoie un objet factice NON mis en cache.
 *
 * Au premier appel depuis le navigateur, le vrai client sera créé.
 */
export function getSupabaseClient() {
  // Vrai client déjà créé ? retour direct
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
    return client
  }

  // Pendant le build/SSR : pas de cache, objet factice qui ne crash pas.
  // Le prochain appel (côté navigateur) retentera la création du vrai client.
  return createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
