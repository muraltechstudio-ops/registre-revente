import { createClient } from '@supabase/supabase-js'

let client = null

/**
 * Retourne un client Supabase créé paresseusement.
 * createClient() n'est appelé qu'au premier appel (jamais à l'import).
 * Pendant le build/SSR les appels ne devraient pas arriver (tout est
 * dans des useEffect), mais au cas où on renvoie un client factice
 * qui ne fait pas planter le build.
 */
export function getSupabaseClient() {
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

  // Build SSR / génération statique — les appels ne devraient pas arriver
  // mais si oui, un client factice évite le crash.
  // En prod navigateur les NEXT_PUBLIC_* sont toujours définies.
  client = createClient('https://placeholder.supabase.co', 'placeholder-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  return client
}
