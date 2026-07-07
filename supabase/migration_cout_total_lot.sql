-- Migration : ajout de cout_total_lot (calculé automatiquement) sur revente_stock
-- Exécuter dans le SQL Editor Supabase (idempotent)

alter table revente_stock add column if not exists cout_total_lot numeric(10,2)
  generated always as (qte_stock * prix_achat_unitaire) stored;
