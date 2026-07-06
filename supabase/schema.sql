-- =============================================================================
-- Schema "Registre de Revente" — idempotent (exécutable plusieurs fois sans erreur)
--
--  Ce projet cohabite avec d'autres tables dans le même projet Supabase.
--  Toutes ses tables sont préfixées `revente_` pour éviter tout conflit.
--  Ne touche à aucune table qui ne commence pas par `revente_`.
-- =============================================================================

-- 1. Tables -------------------------------------------------------------------

create table if not exists revente_stock (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  produit             text        not null,
  categorie           text        not null default 'Autre'
                                  check (categorie in (
                                    'Informatique','Mode','Bijoux','Moto',
                                    'Papeterie/Bureau','Hygiène/Beauté',
                                    'Stock existant','Autre'
                                  )),
  prix_achat_unitaire  numeric(10,2) not null check (prix_achat_unitaire >= 0),
  qte_stock           integer     not null check (qte_stock >= 0),
  prix_revente_unitaire numeric(10,2) not null check (prix_revente_unitaire >= 0),
  created_at          timestamptz  default now(),
  updated_at          timestamptz  default now()
);

create table if not exists revente_ventes (
  id                   uuid        primary key default gen_random_uuid(),
  user_id              uuid        not null default auth.uid() references auth.users(id) on delete cascade,
  stock_id             uuid        references revente_stock(id) on delete set null,
  date_vente           date        not null default current_date,
  produit              text        not null,
  categorie            text,
  prix_achat_unitaire   numeric(10,2) not null,
  prix_revente_unitaire  numeric(10,2) not null,
  qte_vendue           integer     not null check (qte_vendue > 0),
  plateforme           text        not null
                                   check (plateforme in (
                                     'Vinted','Leboncoin','Facebook Marketplace',
                                     'TikTok Shop','Temu','Whatnot','Autre'
                                   )),
  client_nom           text,
  client_prenom        text,
  client_adresse       text,
  created_at           timestamptz  default now()
);

-- 2. Indexes de performance ---------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_indexes where indexname = 'idx_revente_ventes_stock_id') then
    create index idx_revente_ventes_stock_id on revente_ventes(stock_id);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_revente_ventes_user_id_date') then
    create index idx_revente_ventes_user_id_date on revente_ventes(user_id, date_vente desc);
  end if;
  if not exists (select 1 from pg_indexes where indexname = 'idx_revente_stock_user_id') then
    create index idx_revente_stock_user_id on revente_stock(user_id);
  end if;
end $$;

-- 3. Trigger updated_at sur revente_stock -------------------------------------

create or replace function update_revente_stock_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_revente_stock_updated_at on revente_stock;
create trigger trg_revente_stock_updated_at
  before update on revente_stock
  for each row
  execute function update_revente_stock_updated_at();

-- 4. Vue pré-calculée revente_stock_summary -----------------------------------
--    Utilise security_invoker pour hériter du RLS des tables sous-jacentes.
--    Si ton Supabase est sur PostgreSQL < 15, remplace la clause
--    "with (security_invoker = true)" par un filtre explicite "where s.user_id = auth.uid()".

create or replace view revente_stock_summary
with (security_invoker = true)
as
select
  s.id,
  s.user_id,
  s.produit,
  s.categorie,
  s.prix_achat_unitaire,
  s.qte_stock,
  coalesce(sum(v.qte_vendue), 0)::integer                                         as qte_vendue,
  (s.qte_stock - coalesce(sum(v.qte_vendue), 0))::integer                         as qte_restante,
  s.prix_revente_unitaire,
  ((s.qte_stock - coalesce(sum(v.qte_vendue), 0)) * s.prix_revente_unitaire)::numeric(10,2) as valeur_stock_restant
from revente_stock s
left join revente_ventes v on v.stock_id = s.id
group by s.id, s.user_id, s.produit, s.categorie, s.prix_achat_unitaire, s.qte_stock, s.prix_revente_unitaire;

-- 5. Row Level Security -------------------------------------------------------

alter table revente_stock enable row level security;
alter table revente_ventes enable row level security;

-- Politiques revente_stock
drop policy if exists "Users can view own stock" on revente_stock;
create policy "Users can view own stock" on revente_stock
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own stock" on revente_stock;
create policy "Users can insert own stock" on revente_stock
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own stock" on revente_stock;
create policy "Users can update own stock" on revente_stock
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own stock" on revente_stock;
create policy "Users can delete own stock" on revente_stock
  for delete using (auth.uid() = user_id);

-- Politiques revente_ventes
drop policy if exists "Users can view own ventes" on revente_ventes;
create policy "Users can view own ventes" on revente_ventes
  for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own ventes" on revente_ventes;
create policy "Users can insert own ventes" on revente_ventes
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own ventes" on revente_ventes;
create policy "Users can update own ventes" on revente_ventes
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own ventes" on revente_ventes;
create policy "Users can delete own ventes" on revente_ventes
  for delete using (auth.uid() = user_id);
