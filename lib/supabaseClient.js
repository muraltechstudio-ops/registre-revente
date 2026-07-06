import { createClient } from '@supabase/supabase-js'

let client = null

/**
 * Retourne un client Supabase créé paresseusement.
 * Le createClient() n'est appelé qu'au premier appel de cette fonction,
 * pas à l'import du module. Cela permet au build Vercel de compiler
 * (les pages sont statiquement générées côté serveur sans module-level code).
 */
export function getSupabaseClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY doivent être définis.',
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
