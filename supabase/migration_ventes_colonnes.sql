-- Migration : ajout des colonnes suivi et lien aux ventes
-- Exécuter dans le SQL Editor Supabase (idempotent)

alter table revente_ventes add column if not exists numero_suivi text;
alter table revente_ventes add column if not exists lien_vente text;
