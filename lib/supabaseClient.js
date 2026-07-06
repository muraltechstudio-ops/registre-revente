import { createClient } from '@supabase/supabase-js'

let client = null

/** Retourne le client Supabase — créé au premier appel uniquement,
 *  pour éviter les crashs pendant le build Vercel si les vars
 *  d'environnement ne sont pas encore disponibles à l'import. */
export function getSupabaseClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
        'doivent être définis dans .env.local (ou les variables Vercel).',
    )
  }

  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return client
}

/**
 * Export nommé qui se comporte comme le client Supabase,
 * mais ne le crée qu'au premier accès à une propriété.
 * Usage identique : `supabase.from(...)`, `supabase.auth.getSession()`, etc.
 */
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      return getSupabaseClient()[prop]
    },
  },
)
