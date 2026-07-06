-- Migration : ajout du champ photo_url à revente_stock
-- Exécuter dans le SQL Editor Supabase (idempotent)

alter table revente_stock add column if not exists photo_url text;
