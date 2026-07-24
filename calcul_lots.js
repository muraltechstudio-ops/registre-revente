// Script de mise à jour des prix avec frais 24% + livraison 130€
// Les frais et port sont répartis au prorata du prix d'adjudication de chaque lot

const lots = [
  { id: '279', nom: '25 maillots de bain une et deux pièces', qte: 25, adj: 11 },
  { id: '138', nom: '90 bas de maillots de bain', qte: 90, adj: 20 },
  { id: '172', nom: '25 bracelets Oeil de Tigre pierre naturelle', qte: 25, adj: 17 },
  { id: '123', nom: '20 hauts de marque Esprit', qte: 20, adj: 20 },
  { id: '343', nom: 'Blouson Moto DXR TANNER taille S', qte: 1, adj: 41 },
  { id: '345', nom: 'Blouson Moto DXR ADAN taille S', qte: 1, adj: 36 },
  { id: '118', nom: '35 hauts de maillots de bain marque Esprit', qte: 35, adj: 20 },
  { id: '117', nom: '26 bas de maillots de bain marque Esprit', qte: 26, adj: 20 },
  { id: '137', nom: '50 hauts de maillots de bain', qte: 50, adj: 20 },
  { id: '286', nom: '40 colliers Miss Terre et Access', qte: 40, adj: 20 },
  { id: '278', nom: '10 pyjamas Lulu Castagnette', qte: 10, adj: 15 },
  { id: '348', nom: 'Blouson Moto DXR TANNER taille S (bis)', qte: 1, adj: 41 },
  { id: '340', nom: 'Blouson Moto Richa DAYTONA 2 taille 64', qte: 1, adj: 46 },
  { id: '341', nom: 'Veste Moto DXR ROADTRIP WOMAN taille 34', qte: 1, adj: 22 },
  { id: '136', nom: '18 rideaux divers', qte: 18, adj: 21 },
  { id: '124', nom: '14 jupes/shorts marque Esprit', qte: 14, adj: 20 },
  { id: '349', nom: 'Veste moto Pharao Cedar Waterproof M', qte: 1, adj: 39 },
]

const totalAdj = lots.reduce((s, l) => s + l.adj, 0)
const frais24 = totalAdj * 0.24

console.log('=== CALCUL DES COÛTS RÉELS ===\n')
console.log(`Total adjudication: ${totalAdj.toFixed(2)}€`)
console.log(`Frais commissaire 24%: ${frais24.toFixed(2)}€`)
console.log(`Livraison: 130€`)
console.log(`Total général: ${(totalAdj + frais24 + 130).toFixed(2)}€\n`)

lots.forEach(l => {
  // Au prorata du prix d'adjudication
  const partFrais = (l.adj / totalAdj) * frais24
  const partPort = (l.adj / totalAdj) * 130
  const totalLot = l.adj + partFrais + partPort
  const prixUnitaire = totalLot / l.qte

  console.log(`[Lot ${l.id}] ${l.nom}`)
  console.log(`   ${l.qte} × ${l.adj.toFixed(2)}€ + frais ${partFrais.toFixed(2)}€ + port ${partPort.toFixed(2)}€ = ${totalLot.toFixed(2)}€`)
  console.log(`   → Prix unitaire réel: ${prixUnitaire.toFixed(4)}€ → arrondi: ${prixUnitaire.toFixed(2)}€`)
  console.log()
})
