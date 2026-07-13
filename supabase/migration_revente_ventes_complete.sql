-- Migration complète : s'assurer que toutes les colonnes de revente_ventes existent
-- Exécuter dans le SQL Editor Supabase (idempotent)
-- Peut être exécuté plusieurs fois sans erreur

alter table revente_ventes add column if not exists statut text not null default 'À expédier';
alter table revente_ventes add column if not exists numero_suivi text;
alter table revente_ventes add column if not exists lien_vente text;
