-- Migration : ajout qte_initiale pour figer le coût total lot sur la quantité achetée
-- Exécuter dans le SQL Editor Supabase (idempotent)

alter table revente_stock add column if not exists qte_initiale integer
  check (qte_initiale >= 0);

-- Initialiser qte_initiale avec la valeur actuelle de qte_stock pour les lignes existantes
update revente_stock set qte_initiale = qte_stock where qte_initiale is null;
