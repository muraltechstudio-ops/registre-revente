/**
 * Script de récupération automatique des Prix Neuf Conseil (PNC)
 *
 * Parcourt les articles du stock dont le PNC est manquant et tente
 * de trouver le prix magasin (neuf) pour chaque article via des
 * recherches web ciblées.
 *
 * Usage :
 *   node scripts/fetch-pnc.js <service_role_key>
 *   ou : set SUPABASE_SERVICE_KEY=... && node scripts/fetch-pnc.js
 *
 * Mode interactif (défaut) : demande confirmation avant chaque mise à jour
 *   node scripts/fetch-pnc.js <key>
 *
 * Mode automatique (--yes) : met à jour sans confirmation
 *   node scripts/fetch-pnc.js <key> --yes
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://xrnjsgkavaxqoohgjarn.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.argv[2]
const autoYes = process.argv.includes('--yes')

if (!supabaseKey) {
  console.log('Usage: node scripts/fetch-pnc.mjs <service_role_key> [--yes]')
  console.log('Ou : set SUPABASE_SERVICE_KEY=... && node scripts/fetch-pnc.mjs [--yes]')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { headers: { apikey: supabaseKey } },
})

/* ───────── Catégories et leurs sources ───────── */

const SOURCES = {
  Moto: {
    site: 'motoblouz.fr',
    searchUrl: (q) =>
      `https://www.motoblouz.com/recherche?q=${encodeURIComponent(q)}`,
    // Pattern pour extraire le prix d'un produit
    pricePattern: null, // sera déterminé dynamiquement
  },
  Mode: {
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q + ' prix neuf')}`,
  },
  Bijoux: {
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q + ' prix')}`,
  },
  Informatique: {
    searchUrl: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(q + ' prix neuf')}`,
  },
  'Papeterie/Bureau': {
    searchUrl: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(q + ' prix')}`,
  },
  'Hygiène/Beauté': {
    searchUrl: (q) =>
      `https://www.google.com/search?q=${encodeURIComponent(q + ' prix')}`,
  },
  Autre: {
    searchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(q + ' prix')}`,
  },
}

/* ───────── Extraction du prix depuis une page HTML motoblouz ───────── */

function extractMotoblouzPrice(html) {
  // Prix affiché dans le HTML motoblouz — patterns observés
  const patterns = [
    /"price"\s*:\s*"([\d.,]+)"/,
    /"price"\s*:\s*([\d.]+)/,
    /<span[^>]*class="[^"]*price[^"]*"[^>]*>([\d.,]+)\s*[€€]/,
    /<div[^>]*class="[^"]*price[^"]*"[^>]*>([\d.,]+)\s*[€€]/,
    /<span[^>]*class="[^"]*product-price[^"]*"[^>]*>([\d.,]+)\s*[€€]/,
    /prix[^<]*?([\d]+[.,]\d{2})\s*[€€]/i,
    /([\d]+[.,]\d{2})\s*[€€]\s*TTC/i,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) {
      const num = parseFloat(m[1].replace(',', '.'))
      if (!isNaN(num) && num > 0) return num
    }
  }
  // Fallback : tente de trouver un nombre proche d'un symbole €
  const euroMatches = html.matchAll(/([\d]+[.,]\d{2})\s*[€€]/g)
  const prices = [...euroMatches].map(m => parseFloat(m[1].replace(',', '.'))).filter(p => p > 1 && p < 5000)
  if (prices.length) return Math.min(...prices)
  return null
}

function extractGooglePrice(html) {
  const patterns = [
    /([\d]+[.,]\d{2})\s*[€€]/,
    /Prix\s*:\s*([\d]+[.,]\d{2})/i,
    /EUR\s*([\d]+[.,]\d{2})/,
    /([\d]+[.,]\d{2})\s*EUR/,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) {
      const num = parseFloat(m[1].replace(',', '.'))
      if (!isNaN(num) && num > 1 && num < 5000) return num
    }
  }
  return null
}

/* ───────── Récupération du prix via fetch ───────── */

async function fetchPriceForItem(item) {
  const { produit, categorie } = item
  const cat = SOURCES[categorie] || SOURCES['Autre']

  // Mots-clés : extraire le nom du produit, ignorer les mots trop courts
  const mots = produit
    .toLowerCase()
    .replace(/[^a-z0-9éèêëàâîïôûùç\s-]/g, '')
    .split(/\s+/)
    .filter((m) => m.length > 2)
    .slice(0, 5)
  const keywords = mots.join(' ')

  let url
  let foundPrice = null
  let source = null

  // --- motoblouz.fr pour la moto ---
  if (categorie === 'Moto') {
    url = `https://www.motoblouz.com/recherche?q=${encodeURIComponent(keywords)}`
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      })
      if (resp.ok) {
        const html = await resp.text()
        foundPrice = extractMotoblouzPrice(html)
        source = 'motoblouz.fr'
      } else {
        console.log(`   ⚠️ motoblouz.fr retourne ${resp.status} pour "${keywords}"`)
      }
    } catch (err) {
      console.log(`   ⚠️ Erreur fetch motoblouz: ${err.message}`)
    }
  }

  // Fallback : recherche web via une source générique
  if (!foundPrice) {
    source = 'recherche web'
    // On essaie plusieurs formulations
    const queries = [
      `${keywords} prix neuf`,
      `${produit.toLowerCase().replace(/[^a-z0-9éèêëàâîïôûùç\s-]/g, '')} achat`,
    ]
    for (const q of queries) {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=fr`
      try {
        const resp = await fetch(searchUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'fr-FR,fr;q=0.9',
          },
        })
        if (resp.ok) {
          const html = await resp.text()
          foundPrice = extractGooglePrice(html)
          if (foundPrice) break
        }
      } catch {
        // On continue
      }
      // Petite pause entre les requêtes
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  return { foundPrice, source, url }
}

/* ───────── Affichage aide ───────── */

function help() {
  console.log(`
Récupération automatique des Prix Neuf Conseil (PNC)

Usage:
  node scripts/fetch-pnc.mjs <service_role_key> [--yes]

Options:
  --yes    Met à jour automatiquement sans demander confirmation

Sources par catégorie:
  - Moto      → motoblouz.fr
  - Mode      → recherche web
  - Bijoux    → recherche web
  - Autre     → recherche web
`)
}

/* ───────── MAIN ───────── */

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  help()
  process.exit(0)
}

console.log('═══════════════════════════════════════════')
console.log(' Récupération des Prix Neuf Conseil (PNC) ')
console.log(` Mode: ${autoYes ? 'AUTOMATIQUE' : 'INTERACTIF (validation par article)'}`)
console.log('═══════════════════════════════════════════\n')

// 1. Récupérer les articles sans PNC
const { data: articles, error } = await supabase
  .from('revente_stock')
  .select('id, produit, prix_achat_unitaire, categorie')
  .is('prix_neuf_conseil', null)
  .order('produit')

if (error) {
  console.error('Erreur Supabase:', error.message)
  process.exit(1)
}

if (!articles || articles.length === 0) {
  console.log('✅ Tous les articles ont déjà un PNC !')
  process.exit(0)
}

console.log(`📦 ${articles.length} article(s) sans PNC à traiter :\n`)

let found = 0
let skipped = 0
let errors_count = 0

for (const item of articles) {
  console.log(`\n🔍 [${item.categorie}] ${item.produit}`)
  console.log(`   Prix d'achat: ${item.prix_achat_unitaire}€`)

  const { foundPrice, source, url } = await fetchPriceForItem(item)

  if (foundPrice) {
    const eco = item.prix_achat_unitaire
      ? ((1 - item.prix_achat_unitaire / foundPrice) * 100).toFixed(0)
      : null
    console.log(`   ✅ Prix trouvé: ${foundPrice.toFixed(2)}€ (${source})${eco ? ` — éco: ${eco}%` : ''}`)

    if (autoYes) {
      // Mode auto
      const { error: updateErr } = await supabase
        .from('revente_stock')
        .update({ prix_neuf_conseil: foundPrice })
        .eq('id', item.id)

      if (updateErr) {
        console.log(`   ❌ Erreur mise à jour: ${updateErr.message}`)
        errors_count++
      } else {
        console.log(`   💾 Mis à jour ✓`)
        found++
      }
    } else {
      // Mode interactif : on propose et on attend la confirmation
      const readline = await ask(
        `   💾 Enregistrer ${foundPrice.toFixed(2)}€ comme PNC ? [O/n/p (personnalisé)] `
      )
      if (readline.toLowerCase() === 'n' || readline.toLowerCase() === 'non') {
        skipped++
        console.log(`   ⏭ Ignoré`)
      } else if (readline.toLowerCase() === 'p') {
        const custom = await ask('   Entrez le prix personnalisé (ou "n" pour ignorer) : ')
        const customPrice = parseFloat(custom.replace(',', '.'))
        if (!isNaN(customPrice) && customPrice > 0) {
          const { error: updateErr } = await supabase
            .from('revente_stock')
            .update({ prix_neuf_conseil: customPrice })
            .eq('id', item.id)
          if (updateErr) {
            console.log(`   ❌ Erreur: ${updateErr.message}`)
            errors_count++
          } else {
            console.log(`   💾 Mis à jour avec ${customPrice}€ ✓`)
            found++
          }
        } else {
          skipped++
          console.log(`   ⏭ Ignoré`)
        }
      } else {
        const { error: updateErr } = await supabase
          .from('revente_stock')
          .update({ prix_neuf_conseil: foundPrice })
          .eq('id', item.id)
        if (updateErr) {
          console.log(`   ❌ Erreur: ${updateErr.message}`)
          errors_count++
        } else {
          console.log(`   💾 Mis à jour ✓`)
          found++
        }
      }
    }
  } else {
    console.log(`   ❌ Aucun prix trouvé pour "${item.produit}"`)
    if (!autoYes) {
      const answer = await ask(
        `   💡 Entrez un prix manuellement (ou "n" pour ignorer) : `
      )
      const customPrice = parseFloat(answer.replace(',', '.'))
      if (!isNaN(customPrice) && customPrice > 0) {
        const { error: updateErr } = await supabase
          .from('revente_stock')
          .update({ prix_neuf_conseil: customPrice })
          .eq('id', item.id)
        if (updateErr) {
          console.log(`   ❌ Erreur: ${updateErr.message}`)
          errors_count++
        } else {
          console.log(`   💾 Mis à jour avec ${customPrice}€ ✓`)
          found++
        }
      } else {
        skipped++
        console.log(`   ⏭ Ignoré`)
      }
    } else {
      errors_count++
    }
  }

  // Pause entre chaque article pour ne pas spammer les serveurs
  await new Promise((r) => setTimeout(r, 1500))
}

console.log('\n═══════════════════════════════════════════')
console.log(' RÉSULTATS')
console.log('═══════════════════════════════════════════')
console.log(`   ✅ Mis à jour: ${found}`)
console.log(`   ⏭ Ignorés:    ${skipped}`)
console.log(`   ❌ Erreurs:    ${errors_count}`)
console.log(`   📦 Restants:   ${articles.length - found - skipped}`)
console.log('═══════════════════════════════════════════\n')

function ask(question) {
  return new Promise((resolve) => {
    process.stdout.write(question)
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim())
    })
  })
}
