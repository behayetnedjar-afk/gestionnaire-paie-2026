-- =====================================================================
-- 0002 — Synchronisation de la progression du site statique
-- ---------------------------------------------------------------------
-- Le site GitHub Pages enregistre la progression dans le navigateur
-- (clés « gp: » du localStorage). Quand l'apprenant est connecté, ce
-- même contenu JSON est copié dans cette table, une ligne par compte.
--
-- Sécurité : la clé « anon » publiée dans site/assets/config.js ne donne
-- accès qu'à ce que les règles RLS ci-dessous autorisent, c'est-à-dire
-- uniquement la ligne de l'utilisateur connecté (auth.uid()).
-- À exécuter dans Supabase › SQL Editor (une seule fois).
-- =====================================================================

create table if not exists public.progression_sync (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  donnees   jsonb not null default '{}'::jsonb,
  maj_le    timestamptz not null default now(),
  constraint donnees_objet check (jsonb_typeof(donnees) = 'object'),
  constraint donnees_taille check (pg_column_size(donnees) < 2000000)  -- garde-fou ≈ 2 Mo
);

comment on table public.progression_sync is
  'Progression de l''apprenant (copie du localStorage du site statique), une ligne par compte.';

-- Row Level Security : activée ET forcée.
alter table public.progression_sync enable row level security;
alter table public.progression_sync force row level security;

-- Aucun accès pour les visiteurs non connectés.
revoke all on public.progression_sync from anon;
grant select, insert, update, delete on public.progression_sync to authenticated;

drop policy if exists "lecture de sa propre progression" on public.progression_sync;
create policy "lecture de sa propre progression"
  on public.progression_sync for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "création de sa propre progression" on public.progression_sync;
create policy "création de sa propre progression"
  on public.progression_sync for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "mise à jour de sa propre progression" on public.progression_sync;
create policy "mise à jour de sa propre progression"
  on public.progression_sync for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "suppression de sa propre progression" on public.progression_sync;
create policy "suppression de sa propre progression"
  on public.progression_sync for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Date de mise à jour fixée côté serveur (on ne fait pas confiance à l'horloge du navigateur).
create or replace function public.progression_sync_horodater()
returns trigger language plpgsql as $$
begin
  new.maj_le := now();
  return new;
end $$;

drop trigger if exists progression_sync_horodatage on public.progression_sync;
create trigger progression_sync_horodatage
  before insert or update on public.progression_sync
  for each row execute function public.progression_sync_horodater();
