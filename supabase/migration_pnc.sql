-- Migration : ajout de la colonne prix_neuf_conseil (Prix Neuf Conseil / prix magasin)
-- pour comparer le prix d'achat au prix de vente neuf en magasin
-- Exécuter dans le SQL Editor Supabase (idempotent)

alter table revente_stock add column if not exists prix_neuf_conseil numeric(10,2)
  check (prix_neuf_conseil >= 0);
