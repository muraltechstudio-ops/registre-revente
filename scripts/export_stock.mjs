import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://xrnjsgkavaxqoohgjarn.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.argv[2]

if (!supabaseKey) {
  console.log('Usage: node scripts/export_stock.mjs <service_role_key>')
  console.log('Ou: export SUPABASE_SERVICE_KEY=... && node scripts/export_stock.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { headers: { apikey: supabaseKey } }
})

const [stockRes, ventesRes] = await Promise.all([
  supabase.from('revente_stock').select('*').order('produit'),
  supabase.from('revente_ventes').select('*').order('date_vente', { ascending: false }).limit(500),
])

if (stockRes.error) {
  console.error('Erreur stock:', stockRes.error.message)
  process.exit(1)
}

const data = {
  stock: stockRes.data || [],
  ventes: ventesRes.data || [],
}

fs.writeFileSync('stock_export.json', JSON.stringify(data, null, 2))
console.log(`Exporté: ${data.stock.length} articles, ${data.ventes.length} ventes`)
console.log('Fichier: stock_export.json')
